// simulate_sender.go
package main

import (
	"bufio"
	"encoding/binary"
	"fmt"
	"log"
	"math"
	"os"
	"strings"
	"time"

	"strconv"
	// "time"

	"telem-system/internal/config"
	"telem-system/pkg/candecoder"
	"telem-system/pkg/types"

	"github.com/gorilla/websocket"
)

var seq uint64 = 0
var oldTime float64 = 0.000
//350.csv start at 700000
//issam.csv at 100000
var filePath string = "../../testdata/issam.csv"
var start int = 110000
func main() {
	// Load configuration
	
	cfg, err := config.LoadConfig("../../configs/", "config", "yaml")
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
	defer conn.Close()

	// Stream data based on the configured mode.
	switch cfg.Mode {
	case "csv":
		sendCSV(conn)
	case "live":
		sendLive(conn, cfg)
	default:
		log.Fatalf("Invalid mode in configuration")
	}
}

// sendCSV reads a CSV file and streams its lines over the WebSocket connection.
func sendCSV(conn *websocket.Conn) {
	//filePath := "../../testdata/data.csv"
	file, err := os.Open(filePath)
	if err != nil {
		log.Printf("Error opening CSV file: %v", err)
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	lineCount := 0
	for scanner.Scan() {
		line := scanner.Text()
		lineCount++
		// Skip header lines if needed (e.g., first 8 lines)
		if lineCount <= start {
			continue
		}
		
		// Split the line into fields
		fields := strings.Split(line, ",") // Assuming CSV is comma-separated
		if len(fields) == 0 {
			continue
		}
		
		// Parse the timestamp from the first field
		currentTime, err := strconv.ParseFloat(fields[0], 64)
		if err != nil {
			log.Printf("Error parsing time: %v", err)
			continue
		}
		
		// Calculate sleep time
		sleepTime := currentTime - oldTime - 0.000415
		if sleepTime < 0 {
			sleepTime = currentTime - oldTime
		}
		
		fmt.Printf("\rstarting sleep: %f", sleepTime)
		// Sleep for the calculated time
		time.Sleep(time.Duration(sleepTime))
		oldTime = currentTime


		fmt.Printf("\rSending line number: %d at %f", lineCount, oldTime)
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			log.Printf("Error sending CSV line: %v", err)
			return
		}
		// Optionally add a delay here if needed.
	}
	if err := scanner.Err(); err != nil {
		log.Printf("Error reading CSV file: %v", err)
		return
	}
	closeMsg := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "All CSV data sent")
	_ = conn.WriteMessage(websocket.CloseMessage, closeMsg)
	log.Printf("Sent %d lines from CSV. Connection closed.", lineCount)
}

// sendLive sends simulated live CAN packets over the WebSocket connection.
func sendLive(conn *websocket.Conn, cfg *config.Config) {
	// Load JSON definitions.
	messages, _, err := candecoder.LoadJSONDefinitions(cfg.JSONFile)
	if err != nil {
		log.Fatalf("Error loading JSON definitions: %v", err)
	}

	// Round-robin loop over all message definitions.
	i := 0
	for {
		msgDef := messages[i]
		packet := generateValidCANPacket(msgDef)
		packetStr := byteSliceToHexString(packet)
		if err := conn.WriteMessage(websocket.TextMessage, []byte(packetStr)); err != nil {
			log.Printf("Error sending live CAN packet: %v", err)
			return
		}
		i = (i + 1) % len(messages)
		// Optionally, add a short delay here if needed.
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

	// Prepend the frame ID (4 bytes in big-endian)
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
