// simulate_sender.go
package main

import (
	"bufio"
	"encoding/binary"
	"flag"
	"fmt"
	"log"
	"math"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"telem-system/internal/config"
	"telem-system/pkg/candecoder"
	"telem-system/pkg/types"
	"time"

	"github.com/gorilla/websocket"
)

var seq uint64 = 0
var oldTime float64 = 0.0

// Command line flags for easier configuration
var (
	configPath = flag.String("config", "../../configs/", "Path to config directory")
	configName = flag.String("configname", "config", "Name of config file without extension")
	configType = flag.String("configtype", "yaml", "Config file type (yaml, json, etc)")
	csvFile    = flag.String("csvfile", "../../testdata/data.csv", "Path to CSV file")
	startLine  = flag.Int("startline", 960000, "Line number to start sending from")
	timeAdjust = flag.Float64("timeadjust", 0.000415, "Time adjustment factor (seconds)")
	liveDelay  = flag.Float64("livedelay", 3, "Delay between messages in live mode (milliseconds)")
)

// safeConn is a thread-safe connection wrapper.
type safeConn struct {
	conn  *websocket.Conn
	mutex sync.Mutex
}

// writeMessage safely writes a message to the websocket connection.
func (s *safeConn) writeMessage(messageType int, data []byte) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	return s.conn.WriteMessage(messageType, data)
}

// close safely closes the websocket connection.
func (s *safeConn) close() error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	return s.conn.Close()
}

// Declare a package-level sync.Once for closing the done channel.
var doneOnce sync.Once

// closeDone safely closes the done channel only once.
func closeDone(done chan struct{}) {
	doneOnce.Do(func() {
		close(done)
	})
}

func main() {
	// Parse command line flags
	flag.Parse()

	// Load configuration
	cfg, err := config.LoadConfig(*configPath, *configName, *configType)
	if err != nil {
		log.Fatalf("Error loading config: %v", err)
	}

	// Construct the telemetry URL using both IP and port from config.
	telemetryURL := fmt.Sprintf("ws://%s:%d/telemetry", cfg.WebSocket.IP, cfg.WebSocket.Port)
	log.Printf("Simulated data sender connecting to %s in mode: %s", telemetryURL, cfg.Mode)

	// Dial the receiver's telemetry WebSocket endpoint.
	conn, _, err := websocket.DefaultDialer.Dial(telemetryURL, nil)
	if err != nil {
		log.Fatalf("Dial error: %v", err)
	}

	// Create thread-safe connection wrapper
	safeConnection := &safeConn{conn: conn}

	// Create a done channel for signaling termination
	done := make(chan struct{})

	// Set up signal handling for graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Handle termination in a separate goroutine.
	go func() {
		<-sigChan
		fmt.Println("\nReceived termination signal, closing connection...")
		// Send a proper close frame using thread-safe wrapper.
		closeMsg := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Sender terminated")
		if err := safeConnection.writeMessage(websocket.CloseMessage, closeMsg); err != nil {
			log.Printf("Error sending close message: %v", err)
		}
		// Close the connection using thread-safe wrapper.
		safeConnection.close()
		// Signal that we're done.
		closeDone(done)
	}()

	// Stream data based on the configured mode.
	switch cfg.Mode {
	case "csv":
		go sendCSV(safeConnection, *csvFile, *timeAdjust, *startLine, done)
	case "live":
		go sendLive(safeConnection, cfg, *liveDelay, done)
	default:
		log.Fatalf("Invalid mode in configuration")
	}

	// Wait for termination.
	<-done
	log.Println("Sender terminated cleanly")
}

// sendCSV reads a CSV file and streams its lines over the WebSocket connection.
// It uses timestamp differences from the CSV to determine sleep times.
func sendCSV(conn *safeConn, filePath string, timeAdjust float64, startLine int, done chan struct{}) {
	file, err := os.Open(filePath)
	if err != nil {
		log.Printf("Error opening CSV file: %v", err)
		closeDone(done)
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	lineCount := 0
	oldTime = 0.0 // Reset the timestamp tracker

	for scanner.Scan() {
		lineCount++

		// Check termination signal on every iteration.
		select {
		case <-done:
			return
		default:
		}

		// Skip lines until reaching the specified start line
		if lineCount < startLine {
			continue
		}

		// Get the current line and split into fields
		line := scanner.Text()
		fields := strings.Split(line, ",") // Assuming CSV is comma-separated

		if len(fields) == 0 {
			continue
		}

		// Parse the timestamp from the first field
		currentTime, err := strconv.ParseFloat(fields[0], 64)
		if err != nil {
			log.Printf("Error parsing time from field '%s': %v", fields[0], err)
			continue
		}

		// Calculate sleep time based on timestamp difference
		if oldTime > 0 {
			// Only sleep if this isn't the first processed line
			sleepTime := currentTime - oldTime - timeAdjust
			if sleepTime < 0 {
				sleepTime = currentTime - oldTime
			}

			fmt.Printf("\rSleeping for: %f seconds", sleepTime)
			time.Sleep(time.Duration(sleepTime * float64(time.Second)))
		}

		// Update the timestamp for the next iteration
		oldTime = currentTime

		// Send the CSV line
		fmt.Printf("\rSending line: %d at timestamp: %f", lineCount, currentTime)
		if err := conn.writeMessage(websocket.TextMessage, []byte(line)); err != nil {
			log.Printf("Error sending CSV line: %v", err)
			closeDone(done)
			return
		}
	}

	// Check for scanner errors.
	if err := scanner.Err(); err != nil {
		log.Printf("Error reading CSV file: %v", err)
		closeDone(done)
		return
	}

	log.Printf("Sent all lines from CSV starting from line %d. Total lines read: %d", startLine, lineCount)
	closeMsg := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "All CSV data sent")
	_ = conn.writeMessage(websocket.CloseMessage, closeMsg)
	closeDone(done)
}

// sendLive sends simulated live CAN packets over the WebSocket connection.
func sendLive(conn *safeConn, cfg *config.Config, delay float64, done chan struct{}) {
	// Load JSON definitions.
	messages, _, err := candecoder.LoadJSONDefinitions(cfg.JSONFile)
	if err != nil {
		log.Fatalf("Error loading JSON definitions: %v", err)
	}

	// Create a ticker only if delay is greater than zero.
	var ticker *time.Ticker
	if delay > 0 {
		ticker = time.NewTicker(time.Duration(delay * float64(time.Millisecond)))
		defer ticker.Stop()
	}

	// Round-robin loop over all message definitions.
	i := 0
	msgCount := 0
	for {
		// Check if we should terminate.
		select {
		case <-done:
			return
		default:
			if delay > 0 {
				<-ticker.C
			}
		}

		msgDef := messages[i]
		packet := generateValidCANPacket(msgDef)
		packetStr := byteSliceToHexString(packet)

		// Use thread-safe method to write message.
		if err := conn.writeMessage(websocket.TextMessage, []byte(packetStr)); err != nil {
			log.Printf("Error sending live CAN packet: %v", err)
			closeDone(done)
			return
		}

		i = (i + 1) % len(messages)
		msgCount++
		if msgCount%1000 == 0 {
			log.Printf("Sent %d CAN packets", msgCount)
		}
	}
}

// generateValidCANPacket creates a CAN packet with sequential values.
func generateValidCANPacket(msg types.Message) []byte {
	data := make([]byte, msg.Length)
	for _, signal := range msg.Signals {
		var physValue float64
		if strings.HasPrefix(strings.ToLower(signal.Name), "cell") {
			// For cell signals: values in [0, 4)
			physValue = float64(seq%4000) / 1000.0
		} else {
			// For other signals: values in [-10, 10)
			physValue = (float64(int(seq%2000) - 1000)) / 100.0
		}
		seq++ // Increment global sequence counter

		var rawValue uint64
		if signal.IsFloat {
			physValue = math.Round(physValue*1000) / 1000
			floatVal := float32(physValue)
			rawValue = uint64(math.Float32bits(floatVal))
		} else {
			rawValue = uint64(int64(physValue))
		}

		// Pack the signal value into the data buffer.
		packBits(data, uint64(signal.Start), uint64(signal.Length), rawValue, signal.ByteOrder)
	}

	// Prepend the frame ID (4 bytes in big-endian).
	packet := make([]byte, 4+msg.Length)
	binary.BigEndian.PutUint32(packet[:4], msg.FrameID)
	copy(packet[4:], data)
	return packet
}

func packBits(data []byte, startBit, length, value uint64, byteOrder string) {
	if strings.EqualFold(byteOrder, "little_endian") {
		packBitsLittleEndian(data, startBit, length, value)
	} else {
		packBitsBigEndian(data, startBit, length, value)
	}
}

func packBitsLittleEndian(data []byte, startBit, length, value uint64) {
	bitsRemaining := length
	currentBit := startBit
	for bitsRemaining > 0 {
		byteIndex := currentBit / 8
		bitOffset := currentBit % 8
		availableBits := 8 - bitOffset
		bitsToWrite := availableBits
		if bitsToWrite > bitsRemaining {
			bitsToWrite = bitsRemaining
		}
		mask := uint64((1 << bitsToWrite) - 1)
		shiftedValue := (value >> (length - bitsRemaining)) & mask
		data[byteIndex] |= byte(shiftedValue << bitOffset)
		currentBit += bitsToWrite
		bitsRemaining -= bitsToWrite
	}
}

func packBitsBigEndian(data []byte, startBit, length, value uint64) {
	bitsRemaining := length
	currentBit := startBit
	for bitsRemaining > 0 {
		byteIndex := currentBit / 8
		bitOffset := currentBit % 8
		availableBits := 8 - bitOffset
		bitsToWrite := availableBits
		if bitsToWrite > bitsRemaining {
			bitsToWrite = bitsRemaining
		}
		mask := uint64((1 << bitsToWrite) - 1)
		shiftedValue := (value >> (length - bitsRemaining)) & mask
		data[byteIndex] |= byte(shiftedValue << (availableBits - bitsToWrite - bitOffset))
		currentBit += bitsToWrite
		bitsRemaining -= bitsToWrite
	}
}

// byteSliceToHexString converts a byte slice to a space-separated hex string.
func byteSliceToHexString(b []byte) string {
	parts := make([]string, len(b))
	for i, by := range b {
		parts[i] = fmt.Sprintf("%02X", by)
	}
	return strings.Join(parts, " ")
}
