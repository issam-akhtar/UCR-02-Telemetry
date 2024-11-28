// cmd/telem-server/main.go
package main

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"telem-system/pkg/candecoder"
	"telem-system/pkg/db"
	"telem-system/pkg/processdata"
	"telem-system/pkg/types"
	"telem-system/pkg/utils"

	"github.com/gorilla/websocket"
	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/spf13/viper"
)

// Config struct defines the configuration structure for the application
type Config struct {
	Database struct {
		ConnectionString string `mapstructure:"connection_string"` // Database connection string
	} `mapstructure:"database"`
	WebSocket struct {
		URL string `mapstructure:"url"` // WebSocket server URL
	} `mapstructure:"websocket"`
	Directories struct {
		Output string `mapstructure:"output"` // Directory for output files
	} `mapstructure:"directories"`
	DBCFile  string `mapstructure:"dbc_file"`  // Path to DBC file
	JSONFile string `mapstructure:"json_file"` // Path to JSON file with message definitions
}

// Utility function to log execution time of a function
func trackTime(start time.Time, name string) {
	elapsed := time.Since(start)
	log.Printf("%s took %s", name, elapsed)
}

func main() {
	defer trackTime(time.Now(), "main") // Measure the execution time of main()

	// Configure log format to include timestamps and file details
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Get the current working directory for debugging
	cwd, err := os.Getwd()
	if err != nil {
		log.Fatalf("Failed to get current working directory: %v", err)
	}
	log.Printf("Current working directory: %s", cwd)

	// Load application configuration
	var config Config
	if err := initConfig(&config); err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}
	log.Println("Configuration loaded successfully")

	// Log the absolute path of the JSON file for debugging purposes
	absPath, err := filepath.Abs(config.JSONFile)
	if err != nil {
		log.Printf("Failed to get absolute path of JSON file: %v", err)
	} else {
		log.Printf("Absolute path of JSON file: %s", absPath)
	}

	// Connect to the database
	dbPool, err := db.Connect(config.Database.ConnectionString)
	if err != nil {
		log.Fatalf("Database connection failed: %v", err)
	}
	defer db.ClosePool() // Ensure the database pool is closed when the program exits
	log.Println("Connected to the database successfully")

	// Ensure output directory exists
	setupDirectories(config.Directories.Output)
	log.Printf("Output directory set up at: %s", config.Directories.Output)

	// Load CAN messages and create a mapping
	messages, messageMap, err := candecoder.LoadJSONDefinitions(config.JSONFile)
	if err != nil {
		log.Fatalf("Failed to load messages: %v", err)
	}
	log.Printf("Loaded %d messages from JSON definitions", len(messages))

	// Set selected CAN IDs (default: -1 selects all)
	selectedCANIDs := []int{-1}

	// Create a map of selected CAN IDs for filtering
	selectedCANIDMap := createSelectedCANIDMap(selectedCANIDs, messages)

	// Initialize buffers for cell data
	cellDataBuffers := make(map[float64]*types.Cell_Data)

	// Connect to the WebSocket server and start processing data
	connectToWebSocketServer(dbPool, cellDataBuffers, messageMap, selectedCANIDMap, config.WebSocket.URL)
}

// initConfig initializes the configuration using Viper
func initConfig(cfg *Config) error {
	viper.SetConfigName("config")   // Configuration file name
	viper.SetConfigType("yaml")     // Configuration file type
	viper.AddConfigPath("configs/") // Path to configuration directory

	// Read and parse the configuration file
	if err := viper.ReadInConfig(); err != nil {
		return fmt.Errorf("error reading config file: %v", err)
	}

	// Map configuration to the Config struct
	if err := viper.Unmarshal(cfg); err != nil {
		return fmt.Errorf("unable to decode into struct: %v", err)
	}

	return nil
}

// connectToWebSocketServer connects to a WebSocket server and processes incoming data
func connectToWebSocketServer(dbPool *pgxpool.Pool, cellDataBuffers map[float64]*types.Cell_Data, messageMap map[uint32]types.Message, selectedCANIDMap map[uint32]bool, wsURL string) {
	// Establish a WebSocket connection
	var dialer websocket.Dialer
	conn, _, err := dialer.Dial(wsURL, nil)
	if err != nil {
		log.Fatalf("Failed to connect to WebSocket server: %v", err)
	}
	defer func() {
		if err := conn.Close(); err != nil {
			log.Printf("Error closing WebSocket connection: %v", err)
		}
	}()

	// Initialize counters for records and decoding
	lineCount := 0
	recordCount, decodedCount := 0, 0

	// Start reading messages from the WebSocket
	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
				break // Normal WebSocket closure
			}
			log.Printf("Error reading message: %v", err)
			break
		}

		lineCount++ // Increment line count for logging

		// Parse the WebSocket message as CSV
		csvReader := csv.NewReader(strings.NewReader(string(msg)))
		csvReader.FieldsPerRecord = -1

		record, err := csvReader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			continue
		}

		// Skip records that are incomplete or invalid
		if shouldSkipRecord(record) {
			continue
		}

		// Extract and validate the Frame ID from the record
		frameID, err := parseFrameID(record)
		if err != nil {
			continue
		}

		// Filter records based on selected CAN IDs
		if !selectedCANIDMap[frameID] {
			continue
		}

		// Retrieve the message definition for the Frame ID
		message, exists := messageMap[frameID]
		if !exists {
			continue
		}

		// Extract and validate the data bytes
		data, err := extractDataBytes(record, message.Length)
		if err != nil {
			continue
		}

		// Decode the CAN message
		decodedSignalsMap, err := candecoder.DecodeMessage(data, message)
		if err != nil {
			continue
		}

		// Handle data insertions for further processing
		processdata.HandleDataInsertions(frameID, decodedSignalsMap, cellDataBuffers, recordCount, "WebSocket data")

		decodedCount++
		recordCount++
	}

	// Log the summary of processed data
	log.Printf("Processed data | Total records: %d | Decoded records: %d", recordCount, decodedCount)

	// Process remaining cell data
	processdata.HandleRemainingCellData(cellDataBuffers, recordCount, "WebSocket data")
}

// setupDirectories ensures that the output directory exists
func setupDirectories(outputDir string) {
	if err := os.MkdirAll(outputDir, os.ModePerm); err != nil {
		log.Fatalf("Failed to create Output directory: %v", err)
	}
}

// createSelectedCANIDMap creates a map of selected CAN IDs for filtering
func createSelectedCANIDMap(selectedCANIDs []int, messages []types.Message) map[uint32]bool {
	includeAll := false
	for _, id := range selectedCANIDs {
		if id == -1 {
			includeAll = true
			break
		}
	}

	if includeAll {
		selectedCANIDs = []int{}
		for _, msg := range messages {
			selectedCANIDs = append(selectedCANIDs, int(msg.FrameID))
		}
	} else {
		selectedCANIDs = utils.RemoveSentinelValue(selectedCANIDs, -1)
	}

	selectedCANIDMap := make(map[uint32]bool)
	for _, id := range selectedCANIDs {
		selectedCANIDMap[uint32(id)] = true
	}
	return selectedCANIDMap
}

// shouldSkipRecord determines whether a record should be skipped
func shouldSkipRecord(record []string) bool {
	if len(record) == 0 {
		return true // Skip empty records
	}
	record = utils.RemoveEmptyFields(record)
	if len(record) < 5 {
		return true
	}
	return false
}

// parseFrameID extracts the Frame ID from a record
func parseFrameID(record []string) (uint32, error) {
	if len(record) < 3 { // Ensure enough fields exist
		return 0, fmt.Errorf("record too short to extract Frame ID")
	}
	idStr := record[2] // Frame ID is in the 3rd field
	frameID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		// Attempt hexadecimal parsing if decimal fails
		frameIDHex, errHex := strconv.ParseUint(idStr, 16, 32)
		if errHex != nil {
			return 0, fmt.Errorf("invalid Frame ID '%s': %v", idStr, err)
		}
		return uint32(frameIDHex), nil
	}
	return uint32(frameID), nil
}

// extractDataBytes extracts the data bytes from a record
func extractDataBytes(record []string, messageLength int) ([]byte, error) {
	dataBytesStartIndex := 5 // Data bytes start from index 5
	dataBytesEndIndex := dataBytesStartIndex + messageLength

	if len(record) < dataBytesEndIndex {
		return nil, fmt.Errorf("not enough data bytes, expected %d, got %d", messageLength, len(record)-dataBytesStartIndex)
	}

	dataBytesStr := record[dataBytesStartIndex:dataBytesEndIndex]
	data, err := parseDataBytes(dataBytesStr, messageLength)
	if err != nil {
		return nil, err
	}
	return data, nil
}

// parseDataBytes converts hex string slices to byte slices
func parseDataBytes(dataBytesStr []string, messageLength int) ([]byte, error) {
	data := make([]byte, len(dataBytesStr))
	for i, byteStr := range dataBytesStr {
		if byteStr == "" {
			continue // Skip empty fields
		}
		byteVal, err := strconv.ParseUint(byteStr, 16, 8)
		if err != nil {
			return nil, fmt.Errorf("invalid data byte '%s': %v", byteStr, err)
		}
		data[i] = byte(byteVal)
	}

	// Pad the data to match the message length if necessary
	if len(data) < messageLength {
		paddedData := make([]byte, messageLength)
		copy(paddedData, data)
		data = paddedData
	}
	return data, nil
}
