// telemetry/main.go
package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"telem-system/internal/config"
	"telem-system/internal/handlers"
	"telem-system/internal/wsserver"
	"telem-system/pkg/candecoder"
	"telem-system/pkg/db"
	"telem-system/pkg/processdata"
	"telem-system/pkg/types"
	"telem-system/pkg/utils"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v4/pgxpool"
)

// Mutex to protect cellDataBuffers
var cellDataMux sync.Mutex

// trackTime logs the elapsed time for a given operation.
func trackTime(start time.Time, name string) {
	elapsed := time.Since(start)
	log.Printf("%s took %s", name, elapsed)
}

func main() {
	defer trackTime(time.Now(), "Telemetry Server")
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Get current working directory.
	cwd, err := os.Getwd()
	if err != nil {
		log.Fatalf("Failed to get current working directory: %v", err)
	}
	log.Printf("Current working directory: %s", cwd)

	// Load configuration.
	cfg, err := config.LoadConfig("../../configs/", "config", "yaml")
	if err != nil {
		log.Fatalf("Could not load configuration: %v", err)
	}
	log.Println("Configuration loaded successfully")

	// Connect to database.
	dbPool, err := db.Connect(cfg.Database.ConnectionString)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer dbPool.Close()
	log.Println("Connected to the database successfully")

	// Load CAN definitions from JSON.
	messages, messageMap, err := candecoder.LoadJSONDefinitions(cfg.JSONFile)
	if err != nil {
		log.Fatalf("Failed to load messages from JSON: %v", err)
	}
	log.Printf("Loaded %d messages from JSON definitions", len(messages))

	// Build a map of which frame IDs we want to decode.
	selectedCANIDs := []int{-1} // -1 means "decode everything"
	selectedCANIDMap := createSelectedCANIDMap(selectedCANIDs, messages)

	// For partial aggregator usage.
	cellDataBuffers := make(map[float64]*types.Cell_Data)

	// Start WebSocket hub for broadcasting to front-end.
	go wsserver.WsHub.Run()
	http.HandleFunc("/ws", wsserver.ServeWS)

	// Start the backend throttler.
	processdata.StartBackendThrottler()

	// Use the throttled broadcast function so that each translated packet
	// is not immediately sent but instead is buffered and flushed at a fixed rate.
	processdata.BroadcastFunc = processdata.ThrottledBroadcast

	// === User Prompt for a Test WebSocket Connection ===
	var response string
	fmt.Print("Do you want to test connect to the upstream WebSocket (without receiving data)? (y/n): ")
	fmt.Scanln(&response)
	if response == "y" || response == "Y" {
		var dialer websocket.Dialer
		conn, _, err := dialer.Dial(cfg.WebSocket.URL, nil)
		if err != nil {
			log.Printf("Test WebSocket connection failed: %v", err)
		} else {
			log.Println("Test WebSocket connection established successfully.")
			// Close the connection immediately since we're not expecting data.
			conn.Close()
			log.Println("Test WebSocket connection closed.")
		}
	} else {
		log.Println("Skipping test WebSocket connection.")
	}
	// ======================================================

	// Connect to the upstream CSV-pushing WebSocket in a separate goroutine.
	go func() {
		connectToUpstreamWebSocket(dbPool, cfg.WebSocket.URL, messageMap, selectedCANIDMap, cellDataBuffers)
	}()

	// Register API handlers for all endpoints.
	handlers.RegisterHandlers(dbPool)

	// Start HTTP server on port 9000.
	serverAddr := ":9000"
	log.Printf("Telemetry server listening on %s", serverAddr)
	err = http.ListenAndServe(serverAddr, nil)
	if err != nil {
		log.Fatalf("Failed to start Telemetry server: %v", err)
	}
}

func connectToUpstreamWebSocket(
	dbPool *pgxpool.Pool,
	wsURL string,
	messageMap map[uint32]types.Message,
	selectedCANIDMap map[uint32]bool,
	cellDataBuffers map[float64]*types.Cell_Data,
) {
	for {
		log.Printf("Connecting to WebSocket server at: %s", wsURL)
		var dialer websocket.Dialer
		conn, _, err := dialer.Dial(wsURL, nil)
		if err != nil {
			log.Printf("WebSocket connection failed: %v. Retrying in 5 seconds...", err)
			time.Sleep(5 * time.Second)
			continue
		}

		recordsChan := make(chan []string, 10000)
		var wg sync.WaitGroup

		// Start a pool of workers for processing CSV lines concurrently
		numWorkers := 10
		for i := 0; i < numWorkers; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for record := range recordsChan {
					processSingleRecord(record, messageMap, selectedCANIDMap, cellDataBuffers)
				}
			}()
		}

		lineCount := 0

		// Read messages until the WebSocket closes
		for {
			_, msg, err := conn.ReadMessage()
			if err != nil {
				// Check for normal or expected close codes
				if websocket.IsCloseError(err,
					websocket.CloseNormalClosure,
					websocket.CloseGoingAway,
					websocket.CloseAbnormalClosure,
				) {
					log.Printf("WebSocket closed: %v", err)
				} else {
					log.Printf("Error reading message from upstream: %v", err)
				}
				break
			}

			lineCount++

			// Parse a single CSV line from the received message
			record := utils.ParseCSVLine(string(msg))
			if len(record) == 0 {
				continue
			}

			// Skip the first 8 header lines
			if lineCount <= 8 {
				continue
			}

			// Send record to the processing worker pool
			recordsChan <- record
		}

		// Close the channel and wait for worker goroutines to finish
		close(recordsChan)
		wg.Wait()

		// Handle any remaining aggregator data
		processdata.HandleRemainingCellData(cellDataBuffers, lineCount, "WebSocket data")

		// Explicitly close the connection to allow reconnection
		conn.Close()
		log.Printf("Finished processing all data from upstream. Total lines processed: %d", lineCount)

		log.Println("Reconnecting to WebSocket server after disconnection...")
	}
}

// shouldSkipRecord determines if a CSV record should be skipped
func shouldSkipRecord(record []string) bool {
	if len(record) == 0 {
		return true
	}
	record = utils.RemoveEmptyFields(record)
	// Typically expect at least: [Time, Channel, ID, Flags, DLC, Data0...]
	if len(record) < 5 {
		return true
	}
	return false
}

// parseFrameID attempts to parse the frame ID from string to uint32
func parseFrameID(idStr string) (uint32, error) {
	// Try decimal first
	decVal, err := strconv.ParseUint(idStr, 10, 32)
	if err == nil {
		return uint32(decVal), nil
	}
	// Otherwise try hex
	hexVal, errHex := strconv.ParseUint(idStr, 16, 32)
	if errHex != nil {
		return 0, fmt.Errorf("invalid frame ID '%s'", idStr)
	}
	return uint32(hexVal), nil
}

// extractDataBytes slices out the “Data0..DataN” columns and parses them from hex
func extractDataBytes(record []string, length int) ([]byte, error) {
	startIndex := 5
	endIndex := startIndex + length
	if len(record) < endIndex {
		return nil, fmt.Errorf("not enough data in record")
	}

	dataStr := record[startIndex:endIndex]
	data := make([]byte, len(dataStr))
	for i, s := range dataStr {
		val, err := strconv.ParseUint(s, 16, 8)
		if err != nil {
			return nil, fmt.Errorf("invalid data byte: %v", err)
		}
		data[i] = byte(val)
	}
	return data, nil
}

// createSelectedCANIDMap builds a set of allowable CAN IDs.  -1 means “include all”.
func createSelectedCANIDMap(selectedCANIDs []int, messages []types.Message) map[uint32]bool {
	includeAll := false
	for _, id := range selectedCANIDs {
		if id == -1 {
			includeAll = true
			break
		}
	}

	result := make(map[uint32]bool)
	if includeAll {
		for _, m := range messages {
			result[m.FrameID] = true
		}
		return result
	}

	for _, id := range selectedCANIDs {
		result[uint32(id)] = true
	}
	return result
}

func processSingleRecord(
	record []string,
	messageMap map[uint32]types.Message,
	selectedCANIDMap map[uint32]bool,
	cellDataBuffers map[float64]*types.Cell_Data,
) {
	// Skip if record is empty or has fewer than 5 fields
	if shouldSkipRecord(record) {
		return
	}

	// The record columns:  0=Time, 1=Channel, 2=ID, 3=Flags, 4=DLC, 5=D0, ...
	frameID, err := parseFrameID(record[2])
	if err != nil {
		// If ID can't be parsed, skip
		return
	}

	// If user only wants certain CAN IDs, skip others
	if !selectedCANIDMap[frameID] {
		return
	}

	msgDef, exists := messageMap[frameID]
	if !exists {
		// We have no definition for this CAN ID
		return
	}

	// Extract N data bytes, according to message definition
	dataBytes, err := extractDataBytes(record, msgDef.Length)
	if err != nil {
		return
	}

	// Decode signal values
	decoded, err := candecoder.DecodeMessage(dataBytes, msgDef)
	if err != nil {
		return
	}

	// Simulate some processing time (optional, remove in production)
	time.Sleep(20 * time.Millisecond)

	// Lock cellDataBuffers while inserting
	cellDataMux.Lock()
	processdata.HandleDataInsertions(frameID, decoded, cellDataBuffers, 0, "WebSocket data")
	cellDataMux.Unlock()
}
