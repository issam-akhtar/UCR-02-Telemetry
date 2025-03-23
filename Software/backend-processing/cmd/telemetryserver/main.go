// main.go
// Telemetry System Receiver Entry Point
package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"
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
	"github.com/go-chi/cors"
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

// processCellData handles the special case for frame IDs 50-57 (cell data).
func processCellData(frameID uint32, decoded map[string]string, msgDef types.Message, cellDataBuffers map[float64]*types.Cell_Data, mode string) {
	offset := int(frameID-50) * len(msgDef.Signals)
	adjusted := make(map[string]string)
	for i, sig := range msgDef.Signals {
		if val, ok := decoded[sig.Name]; ok {
			adjusted["Cell"+strconv.Itoa(offset+i+1)] = val
		}
	}

	// Maintain original behavior with type casting based on mode
	if mode == "csv" {
		processdata.HandleDataInsertions(uint32(frameID), adjusted, cellDataBuffers, 0, mode)
	} else {
		processdata.HandleDataInsertions(frameID, adjusted, cellDataBuffers, 0, mode)
	}
}

// telemetryHandler upgrades an HTTP connection to WebSocket and immediately listens for telemetry data.
func telemetryHandler(w http.ResponseWriter, r *http.Request, cfg *config.Config, messageMap map[uint32]types.Message, cellDataBuffers map[float64]*types.Cell_Data) {
	upgrader := websocket.Upgrader{
		CheckOrigin:     func(r *http.Request) bool { return true },
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Telemetry WebSocket upgrade error:", err)
		return
	}
	defer conn.Close()

	// Removed timeouts and ping ticker to keep connection always active

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

			decoded, err := candecoder.DecodeMessage(dataBytes, msgDef)
			if err != nil {
				continue
			}

			if frameID >= 50 && frameID <= 57 {
				processCellData(uint32(frameID), decoded, msgDef, cellDataBuffers, "csv")
			} else {
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

			// First 4 bytes contain the frameID
			frameID := uint32(data[0])<<24 | uint32(data[1])<<16 | uint32(data[2])<<8 | uint32(data[3])

			msgDef, exists := messageMap[frameID]
			if !exists {
				continue
			}

			// Pad data if shorter than expected
			if len(data) < msgDef.Length+4 {
				pad := make([]byte, msgDef.Length+4-len(data))
				data = append(data, pad...)
			}

			decoded, err := candecoder.DecodeMessage(data[4:], msgDef)
			if err != nil {
				continue
			}

			if frameID >= 50 && frameID <= 57 {
				processCellData(frameID, decoded, msgDef, cellDataBuffers, "live")
			} else {
				processdata.HandleDataInsertions(frameID, decoded, cellDataBuffers, 0, "live")
			}
		}
	}
}

func main() {
	start := time.Now()
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Create a context that will be used to signal shutdown
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Use this context for database connection or other lifecycle-managed components.
	dbCtx := ctx

	// Handle OS signals for graceful shutdown
	signalChan := make(chan os.Signal, 1)
	signal.Notify(signalChan, os.Interrupt, syscall.SIGTERM)

	// Load configuration
	cfg, err := config.LoadConfig("../../configs/", "config", "yaml")
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Connect to the database with context awareness
	dbPool, err := db.Connect(cfg.Database.ConnectionString)
	if err != nil {
		log.Fatalf("Database connection error: %v", err)
	}

	// Ensure db is closed properly on shutdown
	go func() {
		<-dbCtx.Done()
		log.Println("Closing database connection pool...")
		dbPool.Close()
	}()

	// Initialize the database query helper
	queries := db.New(dbPool)

	// Load CAN definitions
	messages, messageMap, err := candecoder.LoadJSONDefinitions(cfg.JSONFile)
	if err != nil {
		log.Fatalf("Failed to load JSON definitions: %v", err)
	}
	log.Printf("Loaded %d messages", len(messages))

	// Start the WebSocket hub
	go wsserver.WsHub.Run()

	// Create a persistent aggregator for cell data
	cellDataBuffers := make(map[float64]*types.Cell_Data)

	// Initialize the broadcast throttler
	processdata.InitThrottler(cfg.ThrottlerInterval)
	processdata.BroadcastFunc = processdata.ThrottledBroadcast

	// ---------------------
	// REST API Server on port cfg.APIPort (e.g., 9092)
	// ---------------------
	apiRouter := chi.NewRouter()
	apiRouter.Use(middleware.Logger)
	apiRouter.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: false,
		MaxAge:           300, // 5 minutes
	}))

	// Register additional API endpoints
	handlers.RegisterRoutes(apiRouter, queries)

	apiServer := &http.Server{
		Addr:    ":" + cfg.APIPort,
		Handler: apiRouter,
		// Timeouts removed for persistent connection
	}

	go func() {
		log.Printf("API server listening on %s", apiServer.Addr)
		if err := apiServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("API server error: %v", err)
		}
	}()

	// ---------------------
	// Raw Telemetry WebSocket Server on port cfg.WebSocket.Port (e.g., 9091)
	// ---------------------
	telemetryMux := http.NewServeMux()
	telemetryMux.HandleFunc("/telemetry", func(w http.ResponseWriter, r *http.Request) {
		telemetryHandler(w, r, cfg, messageMap, cellDataBuffers)
	})

	telemetryServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.WebSocket.Port),
		Handler: telemetryMux,
		// Timeouts removed for persistent connection
	}

	go func() {
		log.Printf("Raw Telemetry WS server listening on %s", telemetryServer.Addr)
		if err := telemetryServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Raw Telemetry WS server error: %v", err)
		}
	}()

	// ---------------------
	// Live Data WebSocket Server on port cfg.LiveWSPort (e.g., 9094)
	// ---------------------
	liveWsMux := http.NewServeMux()
	liveWsMux.HandleFunc("/ws", wsserver.ServeWS)

	liveDataServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.LiveWSPort),
		Handler: liveWsMux,
		// Timeouts removed for persistent connection
	}

	// Wait for termination signal in a separate goroutine
	go func() {
		<-signalChan
		log.Println("Received termination signal. Initiating graceful shutdown...")

		// Shutdown all servers gracefully using a background context (no timeout)
		if err := apiServer.Shutdown(context.Background()); err != nil {
			log.Printf("API server shutdown error: %v", err)
		}

		if err := telemetryServer.Shutdown(context.Background()); err != nil {
			log.Printf("Telemetry server shutdown error: %v", err)
		}

		if err := liveDataServer.Shutdown(context.Background()); err != nil {
			log.Printf("Live data server shutdown error: %v", err)
		}

		cancel() // Cancel the main context
	}()

	log.Printf("Live Data WS server listening on %s", liveDataServer.Addr)
	if err := liveDataServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Live Data WS server error: %v", err)
	}

	log.Printf("Telemetry Server completed in %s", time.Since(start))
}
