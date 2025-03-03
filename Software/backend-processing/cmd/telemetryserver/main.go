// main.go
// Telemetry System Receiver Entry Point
package main

import (
	"encoding/csv"
	"fmt"
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

// isRowEmpty returns true if all fields in the CSV record are empty.
func isRowEmpty(record []string) bool {
	for _, field := range record {
		if strings.TrimSpace(field) != "" {
			return false
		}
	}
	return true
}

// telemetryHandler upgrades an HTTP connection to WebSocket and immediately listens for telemetry data.
func telemetryHandler(w http.ResponseWriter, r *http.Request, cfg *config.Config, messageMap map[uint32]types.Message, cellDataBuffers map[float64]*types.Cell_Data) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Telemetry WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	// Process incoming messages based on the mode.
	if cfg.Mode == "csv" {
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				log.Println("Telemetry CSV read error:", err)
				break
			}
			csvReader := csv.NewReader(strings.NewReader(string(msg)))
			record, err := csvReader.Read()
			if err != nil || isRowEmpty(record) {
				continue
			}
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
	} else if cfg.Mode == "live" {
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				log.Println("Telemetry Live read error:", err)
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
	}
}

func main() {
	start := time.Now()
	defer log.Printf("Telemetry Server started in %s", time.Since(start))
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Load configuration.
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

	// Load CAN definitions.
	messages, messageMap, err := candecoder.LoadJSONDefinitions(cfg.JSONFile)
	if err != nil {
		log.Fatalf("Failed to load JSON definitions: %v", err)
	}
	log.Printf("Loaded %d messages", len(messages))

	// Start the WebSocket hub.
	go wsserver.WsHub.Run()

	// Create a persistent aggregator for cell data.
	cellDataBuffers := make(map[float64]*types.Cell_Data)

	// Initialize the broadcast throttler.
	processdata.InitThrottler(cfg.ThrottlerInterval)
	processdata.BroadcastFunc = processdata.ThrottledBroadcast

	// ---------------------
	// REST API Server on port cfg.APIPort (9092)
	// ---------------------
	apiRouter := chi.NewRouter()
	apiRouter.Use(middleware.Logger)

	// Serve the Protobuf schema.
	apiRouter.Get("/proto/telemetry.proto", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "../../proto/telemetry.proto")
	})

	// Register additional API endpoints.
	handlers.RegisterRoutes(apiRouter, queries)

	go func() {
		apiAddr := ":" + cfg.APIPort
		log.Printf("API server listening on %s", apiAddr)
		if err := http.ListenAndServe(apiAddr, apiRouter); err != nil {
			log.Fatalf("API server error: %v", err)
		}
	}()

	// ---------------------
	// Raw Telemetry WebSocket Server on port cfg.WebSocket.Port (9091)
	// ---------------------
	telemetryMux := http.NewServeMux()
	telemetryMux.HandleFunc("/telemetry", func(w http.ResponseWriter, r *http.Request) {
		telemetryHandler(w, r, cfg, messageMap, cellDataBuffers)
	})
	telemetryAddr := fmt.Sprintf(":%d", cfg.WebSocket.Port)
	log.Printf("Raw Telemetry WS server listening on %s", telemetryAddr)
	go func() {
		if err := http.ListenAndServe(telemetryAddr, telemetryMux); err != nil {
			log.Fatalf("Raw Telemetry WS server error: %v", err)
		}
	}()

	// ---------------------
	// Live Data WebSocket Server on port cfg.LiveWSPort (9094)
	// ---------------------
	liveWsMux := http.NewServeMux()
	liveWsMux.HandleFunc("/ws", wsserver.ServeWS)
	liveWsAddr := fmt.Sprintf(":%d", cfg.LiveWSPort)
	log.Printf("Live Data WS server listening on %s", liveWsAddr)
	if err := http.ListenAndServe(liveWsAddr, liveWsMux); err != nil {
		log.Fatalf("Live Data WS server error: %v", err)
	}
}
