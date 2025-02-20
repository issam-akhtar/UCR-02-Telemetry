// main.go
// ----------------------------------------------------------------------
// Telemetry System Server Entry Point
//
// This file initializes the Telemetry System server. It loads the
// configuration, connects to the database, loads the CAN message
// definitions, starts the WebSocket hub for real‑time messaging, and
// launches the HTTP API server.
// ----------------------------------------------------------------------

package main

import (
	"encoding/csv"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"telem-system/internal/config"
	"telem-system/internal/handlers"
	"telem-system/internal/wsserver"
	"telem-system/pkg/candecoder"
	"telem-system/pkg/db"
	"telem-system/pkg/processdata"
	"telem-system/pkg/types"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/gorilla/websocket"
)

func main() {
	start := time.Now()
	// Log startup time once the server is up.
	defer log.Printf("Telemetry Server started in %s", time.Since(start))
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Load configuration from file.
	cfg, err := config.LoadConfig("../../configs/", "config", "yaml")
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to the database.
	dbPool, err := db.Connect(cfg.Database.ConnectionString)
	if err != nil {
		log.Fatalf("Database connection error: %v", err)
	}
	defer dbPool.Close()

	// Initialize the database query helper.
	queries := db.New(dbPool)

	// Load CAN definitions from JSON.
	messages, messageMap, err := candecoder.LoadJSONDefinitions(cfg.JSONFile)
	if err != nil {
		log.Fatalf("Failed to load JSON definitions: %v", err)
	}
	log.Printf("Loaded %d messages", len(messages))

	// Start the WebSocket hub.
	go wsserver.WsHub.Run()

	// Create the router and register API endpoints.
	r := chi.NewRouter()
	r.Use(middleware.Logger)

	// Serve the Protobuf schema file so the frontend can load it.
	r.Get("/proto/telemetry.proto", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "../../proto/telemetry.proto")
	})

	// (Optional: add similar routes for any other dependency proto files if needed.)

	r.Get("/ws", wsserver.ServeWS)
	handlers.RegisterRoutes(r, queries)

	// Create a persistent aggregator for cell data.
	cellDataBuffers := make(map[float64]*types.Cell_Data)

	// Initialize and set the broadcast throttler.
	processdata.InitThrottler(cfg.ThrottlerInterval)
	processdata.BroadcastFunc = processdata.ThrottledBroadcast

	// Launch the upstream WebSocket connection based on mode.
	switch cfg.Mode {
	case "live":
		go connectToUpstreamWebSocketLive(cfg, messageMap, cellDataBuffers)
	default: // "csv" mode
		go connectToUpstreamWebSocketCSV(cfg, messageMap, cellDataBuffers)
	}

	// Start the HTTP API server.
	serverAddr := ":9000"
	log.Printf("Server listening on %s", serverAddr)
	if err := http.ListenAndServe(serverAddr, r); err != nil {
		log.Fatalf("HTTP server error: %v", err)
	}
}

// isRowEmpty returns true if all fields in the record are empty.
func isRowEmpty(record []string) bool {
	for _, field := range record {
		if strings.TrimSpace(field) != "" {
			return false
		}
	}
	return true
}

// connectToUpstreamWebSocketCSV continuously connects to the CSV source WebSocket,
// decodes CSV rows into CAN messages, and processes them.
func connectToUpstreamWebSocketCSV(
	cfg *config.Config,
	messageMap map[uint32]types.Message,
	cellDataBuffers map[float64]*types.Cell_Data,
) {
	for {
		log.Printf("Connecting to CSV WebSocket at: %s", cfg.WebSocket.URL)
		conn, _, err := websocket.DefaultDialer.Dial(cfg.WebSocket.URL, nil)
		if err != nil {
			time.Sleep(5 * time.Second)
			continue
		}

		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				break
			}

			r := csv.NewReader(strings.NewReader(string(msg)))
			record, err := r.Read()
			if err != nil || isRowEmpty(record) {
				continue
			}

			// Ensure record has at least 3 columns to extract frameID.
			if len(record) < 3 {
				continue
			}

			frameID, err := strconv.Atoi(record[2])
			if err != nil {
				continue
			}

			msgDef, exists := messageMap[uint32(frameID)]
			if !exists {
				continue
			}

			dataLen := msgDef.Length
			if len(record) < 5+dataLen {
				continue
			}

			dataFields := record[5 : 5+dataLen]
			dataBytes := make([]byte, dataLen)
			for i, field := range dataFields {
				field = strings.TrimSpace(field)
				if field == "" {
					dataBytes[i] = 0
					continue
				}
				b, err := strconv.ParseUint(field, 16, 8)
				if err != nil {
					continue
				}
				dataBytes[i] = byte(b)
			}

			// Handle cell data frames separately.
			if frameID >= 50 && frameID <= 57 {
				decoded, err := candecoder.DecodeMessage(dataBytes, msgDef)
				if err != nil {
					continue
				}
				offset := (frameID - 50) * len(msgDef.Signals)
				adjusted := make(map[string]string)
				for i, sig := range msgDef.Signals {
					if val, ok := decoded[sig.Name]; ok {
						adjusted["Cell"+strconv.Itoa(offset+i+1)] = val
					}
				}
				processdata.HandleDataInsertions(uint32(frameID), adjusted, cellDataBuffers, 0, "csv")
			} else {
				decoded, err := candecoder.DecodeMessage(dataBytes, msgDef)
				if err != nil {
					continue
				}
				processdata.HandleDataInsertions(uint32(frameID), decoded, cellDataBuffers, 0, "csv")
			}
		}

		conn.Close()
		log.Println("Reconnecting to CSV WebSocket...")
	}
}

// connectToUpstreamWebSocketLive continuously connects to the live source WebSocket,
// decodes live CAN packets, and processes them.
func connectToUpstreamWebSocketLive(
	cfg *config.Config,
	messageMap map[uint32]types.Message,
	cellDataBuffers map[float64]*types.Cell_Data,
) {
	for {
		log.Printf("Connecting to Live WebSocket at: %s", cfg.WebSocket.URL)
		conn, _, err := websocket.DefaultDialer.Dial(cfg.WebSocket.URL, nil)
		if err != nil {
			time.Sleep(5 * time.Second)
			continue
		}

		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				break
			}
			packetStr := string(msg)
			data, err := candecoder.ParseLiveCANPacket(packetStr)
			if err != nil || len(data) < 4 {
				continue
			}

			// First 4 bytes contain the frameID.
			frameID := uint32(data[0])<<24 | uint32(data[1])<<16 | uint32(data[2])<<8 | uint32(data[3])

			msgDef, exists := messageMap[frameID]
			if !exists {
				continue
			}

			// Pad data if shorter than expected.
			if len(data) < msgDef.Length {
				pad := make([]byte, msgDef.Length-len(data))
				data = append(data, pad...)
			}

			decoded, err := candecoder.DecodeMessage(data, msgDef)
			if err != nil {
				continue
			}

			// For cell data frames, adjust the cell signal names.
			if frameID >= 50 && frameID <= 57 {
				offset := int(frameID-50) * len(msgDef.Signals)
				adjusted := make(map[string]string)
				for i, sig := range msgDef.Signals {
					if val, ok := decoded[sig.Name]; ok {
						adjusted["Cell"+strconv.Itoa(offset+i+1)] = val
					}
				}
				decoded = adjusted
			}

			processdata.HandleDataInsertions(frameID, decoded, cellDataBuffers, 0, "live")
		}

		conn.Close()
		log.Println("Reconnecting to Live WebSocket...")
	}
}
