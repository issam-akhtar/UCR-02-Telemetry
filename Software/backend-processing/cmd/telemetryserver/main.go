// main.go
// Telemetry System Receiver Entry Point
package main

import (
	"bytes"
	"context"
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"telem-system/internal/config"
	"telem-system/internal/handlers"
	"telem-system/internal/wsserver"
	"telem-system/pkg/candecoder"
	"telem-system/pkg/db"
	"telem-system/pkg/processdata"
	"telem-system/pkg/types"
	"time"

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

// Global variables for synchronization and pooling
var (
	cellDataMutex sync.RWMutex
	dataBytePool  = sync.Pool{
		New: func() interface{} {
			// Maximum expected message length
			b := make([]byte, 64)
			return &b
		},
	}
	// Map to track cell data entries
	cellDataBuffers = make(map[float64]*types.Cell_Data)
)

// Define a job structure for worker pool
type dataJob struct {
	frameID   uint32
	data      []byte // Use directly from pool when possible
	msgDef    types.Message
	mode      string
	timestamp time.Time
}

// processCellData handles the special case for frame IDs 50-57 (cell data).
func processCellData(frameID uint32, decoded map[string]string, msgDef types.Message, mode string) {
	offset := int(frameID-50) * len(msgDef.Signals)
	adjusted := make(map[string]string)
	for i, sig := range msgDef.Signals {
		if val, ok := decoded[sig.Name]; ok {
			adjusted["Cell"+strconv.Itoa(offset+i+1)] = val
		}
	}

	// Process data under lock
	cellDataMutex.Lock()
	defer cellDataMutex.Unlock()

	// Use key 0 as the aggregator
	if _, ok := cellDataBuffers[0]; !ok {
		cellDataBuffers[0] = &types.Cell_Data{}
	}

	processdata.HandleDataInsertions(uint32(frameID), adjusted, cellDataBuffers, 0, mode)

	// If we've processed all cell frames, broadcast and prepare for batch DB insert
	if frameID == 57 {
		agg := cellDataBuffers[0]
		agg.Timestamp = time.Now()

		// Send to batch processor instead of direct DB insertion
		processdata.AddCellDataToBatch(*agg)

		// Broadcast for real-time display
		processdata.BroadcastCells(agg)

		// Reset for next batch of cell data
		delete(cellDataBuffers, 0)
	}
}

// telemetryHandler upgrades an HTTP connection to WebSocket and immediately listens for telemetry data.
func telemetryHandler(w http.ResponseWriter, r *http.Request, cfg *config.Config, messageMap map[uint32]types.Message,
	jobChan chan<- dataJob) {
	upgrader := websocket.Upgrader{
		CheckOrigin:     func(r *http.Request) bool { return true },
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	// Process incoming messages based on the mode.
	if cfg.Mode == "csv" {
		// Reuse buffer and CSV reader for efficiency
		var buffer bytes.Buffer
		csvReader := csv.NewReader(&buffer)

		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}

			buffer.Reset()
			buffer.Write(msg)
			csvReader = csv.NewReader(&buffer)
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

			// Get byte slice from pool
			dataBytePtr := dataBytePool.Get().(*[]byte)
			dataBytes := (*dataBytePtr)[:dataLen] // Reslice without allocation
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

			// Decode directly instead of using worker pool for special frame IDs
			if frameID >= 50 && frameID <= 57 {
				// Process cell data frames immediately for lowest latency
				decoded, err := candecoder.DecodeMessage(dataBytes, msgDef)
				if err == nil {
					processCellData(uint32(frameID), decoded, msgDef, "csv")
				}
				dataBytePool.Put(dataBytePtr) // Return to pool
			} else {
				// Send other frames to worker pool
				// Use non-blocking send to prevent backpressure
				select {
				case jobChan <- dataJob{
					frameID:   uint32(frameID),
					data:      *dataBytePtr, // Use directly from pool
					msgDef:    msgDef,
					mode:      "csv",
					timestamp: time.Now(),
				}:
					// Job submitted successfully
				default:
					// Channel is full, discard job and return bytes to pool
					dataBytePool.Put(dataBytePtr)
					// Could increment a metrics counter here
				}
			}
		}
	} else if cfg.Mode == "live" {
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				return
			}

			// Work directly with bytes instead of converting to string
			data, err := candecoder.ParseLiveCANPacket(string(msg))
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
			messageData := data[4:]

			// Get buffer from pool for messageData
			dataBytePtr := dataBytePool.Get().(*[]byte)
			paddedData := (*dataBytePtr)[:msgDef.Length] // Reslice without allocation

			// Copy message data to padded buffer
			copy(paddedData, messageData)
			if len(messageData) < msgDef.Length {
				// Zero out the rest
				for i := len(messageData); i < msgDef.Length; i++ {
					paddedData[i] = 0
				}
			}

			// Decode directly instead of using worker pool for special frame IDs
			if frameID >= 50 && frameID <= 57 {
				// Process cell data frames immediately for lowest latency
				decoded, err := candecoder.DecodeMessage(paddedData, msgDef)
				if err == nil {
					processCellData(frameID, decoded, msgDef, "live")
				}
				dataBytePool.Put(dataBytePtr) // Return to pool
			} else {
				// Use non-blocking send to prevent backpressure
				select {
				case jobChan <- dataJob{
					frameID:   frameID,
					data:      *dataBytePtr, // Use directly from pool
					msgDef:    msgDef,
					mode:      "live",
					timestamp: time.Now(),
				}:
					// Job submitted successfully
				default:
					// Channel is full, discard job and return bytes to pool
					dataBytePool.Put(dataBytePtr)
					// Could increment a metrics counter here
				}
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

	// Log the network configuration for clarity
	log.Println("=== UCR TELEMETRY SYSTEM CONFIGURATION ===")
	log.Printf("Mode: %s", cfg.Mode)
	log.Printf("Network Configuration:")
	log.Printf("  Host IP: %s", cfg.Network.HostIP)
	log.Printf("  Ports:")
	log.Printf("    - Raw Telemetry WebSocket: %d (car/sender connects here)", cfg.Network.Ports.RawTelemetryWS)
	log.Printf("    - REST API: %d (frontend queries data here)", cfg.Network.Ports.RestAPI)
	log.Printf("    - Live Data WebSocket: %d (frontend receives real-time data here)", cfg.Network.Ports.LiveDataWS)
	log.Println("=========================================")

	// Connect to the database with context awareness
	dbConn, err := db.Connect(cfg.Database.ConnectionString)
	if err != nil {
		log.Fatalf("Database connection error: %v", err)
	}

	// Ensure db is closed properly on shutdown
	go func() {
		<-dbCtx.Done()
		log.Println("Closing database connection pool...")
		dbConn.Close()
	}()

	// Initialize the database query helper
	queries := db.New(dbConn)

	// Load CAN definitions
	messages, messageMap, err := candecoder.LoadJSONDefinitions(cfg.JSONFile)
	if err != nil {
		log.Fatalf("Failed to load JSON definitions: %v", err)
	}
	log.Printf("Loaded %d messages", len(messages))

	// Start the WebSocket hub
	go wsserver.WsHub.Run()

	// Initialize batch processors with their own context
	batchCtx, batchCancel := context.WithCancel(ctx)
	defer batchCancel()

	// Initialize batch processors for different data types
	processdata.InitBatchProcessors(batchCtx, 35, 250*time.Millisecond) // Batch size and max wait time

	// Disable throttling for maximum throughput
	processdata.InitThrottler(cfg.ThrottlerInterval, 0) // Disable throttling
	processdata.BroadcastFunc = processdata.ThrottledBroadcast

	// Create worker pool for data processing - fixed size for Raspberry Pi
	numWorkers := 3                     // Using 3 workers as in original
	jobChan := make(chan dataJob, 1000) // Larger buffer to prevent blocking on spikes

	// Start worker pool
	for i := 0; i < numWorkers; i++ {
		go func() {
			for job := range jobChan {
				// Get job from channel
				decoded, err := candecoder.DecodeMessage(job.data, job.msgDef)
				if err != nil {
					// Return byte slice to pool
					byteSlice := job.data
					dataBytePtr := &byteSlice
					dataBytePool.Put(dataBytePtr)
					continue
				}

				// Process decoded data - handle all except cell data (50-57)
				// Cell data is processed directly in telemetryHandler
				if job.frameID < 50 || job.frameID > 57 {
					processdata.HandleDataInsertions(job.frameID, decoded, nil, 0, job.mode)
				}

				// Return byte slice to pool
				byteSlice := job.data
				dataBytePtr := &byteSlice
				dataBytePool.Put(dataBytePtr)
			}
		}()
	}

	// ---------------------
	// REST API Server on port from config (e.g., 9092)
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
		Addr:    fmt.Sprintf(":%d", cfg.Network.Ports.RestAPI),
		Handler: apiRouter,
	}

	go func() {
		log.Printf("REST API server listening on port %d", cfg.Network.Ports.RestAPI)
		if err := apiServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("API server error: %v", err)
		}
	}()

	// ---------------------
	// Raw Telemetry WebSocket Server on port from config (e.g., 9091)
	// ---------------------
	telemetryMux := http.NewServeMux()
	telemetryMux.HandleFunc("/telemetry", func(w http.ResponseWriter, r *http.Request) {
		telemetryHandler(w, r, cfg, messageMap, jobChan)
	})

	telemetryServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Network.Ports.RawTelemetryWS),
		Handler: telemetryMux,
	}

	go func() {
		log.Printf("Raw Telemetry WebSocket server listening on port %d", cfg.Network.Ports.RawTelemetryWS)
		if err := telemetryServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Raw Telemetry WS server error: %v", err)
		}
	}()

	// ---------------------
	// Live Data WebSocket Server on port from config (e.g., 9094)
	// ---------------------
	liveWsMux := http.NewServeMux()
	liveWsMux.HandleFunc("/ws", wsserver.ServeWS)

	liveDataServer := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Network.Ports.LiveDataWS),
		Handler: liveWsMux,
	}

	// Wait for termination signal in a separate goroutine
	go func() {
		<-signalChan
		log.Println("Received termination signal. Initiating graceful shutdown...")

		// Cancel batch context to flush any pending writes
		batchCancel()

		// Allow some time for batch writes to complete
		time.Sleep(100 * time.Millisecond)

		// Shutdown all servers gracefully
		apiServer.Shutdown(context.Background())
		telemetryServer.Shutdown(context.Background())
		liveDataServer.Shutdown(context.Background())

		// Close job channel to stop workers
		close(jobChan)

		cancel() // Cancel the main context
	}()

	log.Printf("Live Data WebSocket server listening on port %d", cfg.Network.Ports.LiveDataWS)
	if err := liveDataServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("Live Data WS server error: %v", err)
	}

	log.Printf("Telemetry Server completed in %s", time.Since(start))
}