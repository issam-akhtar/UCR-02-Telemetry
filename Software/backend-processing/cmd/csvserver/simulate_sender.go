// simulate_sender.go
package main

import (
	"bufio"
	"encoding/binary"
	"fmt"
	"log"
	"math"
	"net/http"
	"os"
	"strings"

	"telem-system/internal/config"
	"telem-system/pkg/candecoder"
	"telem-system/pkg/types"

	"github.com/gorilla/websocket"
)

// upgrader upgrades HTTP connections to WebSocket connections.
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// In production, restrict allowed origins as needed.
		return true
	},
}

// seq is a global sequence counter used for generating in‐sequence signal values.
var seq uint64 = 0

func main() {
	// Load configuration (YAML)
	cfg, err := config.LoadConfig("../../configs/", "config", "yaml")
	if err != nil {
		log.Fatalf("Error loading config: %v", err)
	}

	// (We no longer need to seed the random generator.)
	// Determine the listening address from config
	addr := fmt.Sprintf(":%d", cfg.WebSocket.Port)
	log.Printf("Simulated data sender listening on %s in mode: %s", addr, cfg.Mode)

	// Register a single WebSocket endpoint
	http.HandleFunc("/send", func(w http.ResponseWriter, r *http.Request) {
		switch cfg.Mode {
		case "csv":
			sendCSV(w, r)
		case "live":
			sendLive(w, r, cfg)
		default:
			http.Error(w, "Invalid mode in configuration", http.StatusBadRequest)
		}
	})

	// Start the HTTP server
	if err := http.ListenAndServe(addr, nil); err != nil {
		log.Fatalf("ListenAndServe error: %v", err)
	}
}

// sendCSV opens a CSV file and streams its lines over the WebSocket.
func sendCSV(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}
	defer conn.Close()

	filePath := "../../testdata/data.csv"
	file, err := os.Open(filePath)
	if err != nil {
		msg := fmt.Sprintf("Error opening CSV file: %v", err)
		log.Println(msg)
		_ = conn.WriteMessage(websocket.TextMessage, []byte(msg))
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	lineCount := 0
	for scanner.Scan() {
		line := scanner.Text()
		lineCount++
		// Skip header lines if needed (e.g., first 8 lines)
		if lineCount <= 8 {
			continue
		}
		if err := conn.WriteMessage(websocket.TextMessage, []byte(line)); err != nil {
			log.Println("Error sending CSV line:", err)
			return
		}
		//time.Sleep(10 * time.Millisecond) // short delay if needed
	}
	if err := scanner.Err(); err != nil {
		msg := fmt.Sprintf("Error reading CSV file: %v", err)
		log.Println(msg)
		_ = conn.WriteMessage(websocket.TextMessage, []byte(msg))
		return
	}

	closeMsg := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "All CSV data sent")
	_ = conn.WriteMessage(websocket.CloseMessage, closeMsg)
	log.Printf("Sent %d lines from CSV. Connection closed.", lineCount)
}

// sendLive sends simulated CAN packets in a round‑robin loop using sequential data.
func sendLive(w http.ResponseWriter, r *http.Request, cfg *config.Config) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}
	defer conn.Close()

	// Load JSON definitions
	messages, _, err := candecoder.LoadJSONDefinitions(cfg.JSONFile)
	if err != nil {
		log.Fatalf("Error loading JSON definitions: %v", err)
	}

	// Round‑robin loop over all message definitions
	i := 0
	for {
		msgDef := messages[i]
		packet := generateValidCANPacket(msgDef)
		packetStr := byteSliceToHexString(packet)
		if err := conn.WriteMessage(websocket.TextMessage, []byte(packetStr)); err != nil {
			log.Println("Error sending live CAN packet:", err)
			return
		}

		i = (i + 1) % len(messages)
		// Optionally, add a short delay:
		//time.Sleep(10 * time.Millisecond)
	}
}

// generateValidCANPacket creates a CAN packet using sequential values rather than random data.
// For "Cell" signals, values are generated in the range [0, 4) and for others in [-10, 10).
func generateValidCANPacket(msg types.Message) []byte {
	data := make([]byte, msg.Length)

	for _, signal := range msg.Signals {
		var physValue float64
		// Determine base range
		if strings.HasPrefix(strings.ToLower(signal.Name), "cell") {
			// For cell signals: sequence value in [0, 4)
			physValue = float64(seq%4000) / 1000.0
		} else {
			// For other signals: sequence value in [-10, 10)
			physValue = (float64(int(seq%2000) - 1000)) / 100.0
		}
		seq++ // Increment the global sequence counter

		var rawValue uint64
		if signal.IsFloat {
			// Round to 3 decimals and pack as 32-bit float
			physValue = math.Round(physValue*1000) / 1000
			floatVal := float32(physValue)
			rawValue = uint64(math.Float32bits(floatVal))
		} else {
			rawValue = uint64(int64(physValue))
		}

		// Pack the bits into the data buffer
		packBits(data, uint64(signal.Start), uint64(signal.Length), rawValue, signal.ByteOrder)
	}

	// Prepend the frame ID (4 bytes in big-endian)
	packet := make([]byte, 4+msg.Length)
	binary.BigEndian.PutUint32(packet[:4], msg.FrameID)
	copy(packet[4:], data)

	return packet
}

// packBits handles both little_endian and big_endian signals.
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

		// For big-endian signals, place bits starting from the left
		data[byteIndex] |= byte(shiftedValue << (availableBits - bitsToWrite - bitOffset))

		currentBit += bitsToWrite
		bitsRemaining -= bitsToWrite
	}
}

// byteSliceToHexString returns a space-separated hex representation.
func byteSliceToHexString(b []byte) string {
	parts := make([]string, len(b))
	for i, by := range b {
		parts[i] = fmt.Sprintf("%02X", by)
	}
	return strings.Join(parts, " ")
}
