// csvserver/main.go
package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"

	"github.com/gorilla/websocket"
)

// Mode represents the server's operating mode
type Mode int

const (
	SendCSV Mode = iota
	ConnectOnly
)

// WebSocket upgrader with permissive CORS policy
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// In production, refine this to restrict allowed origins
		return true
	},
}

// Global variable to store the selected mode
var serverMode Mode

// sendCSV handles WebSocket connections and streams CSV data based on the server mode
func sendCSV(w http.ResponseWriter, r *http.Request) {
	// Upgrade the HTTP connection to a WebSocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}
	defer conn.Close()

	log.Printf("New WebSocket connection established from %s", r.RemoteAddr)

	if serverMode == SendCSV {
		// Open the CSV file. Ensure this path is correct.
		filePath := "../../testdata/data.csv"
		file, err := os.Open(filePath)
		if err != nil {
			msg := fmt.Sprintf("Error opening CSV file: %v", err)
			log.Println(msg)

			// Inform the client about the error
			conn.WriteMessage(websocket.TextMessage, []byte(msg))
			return
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		lineCount := 0

		for scanner.Scan() {
			line := scanner.Text()
			lineCount++

			// Skip the first 8 header lines
			if lineCount <= 8 {
				continue
			}

			// Send the CSV line over WebSocket
			err := conn.WriteMessage(websocket.TextMessage, []byte(line))
			if err != nil {
				log.Println("Error sending CSV line:", err)
				return
			}
		}

		// Check for any errors encountered while reading the file
		if err := scanner.Err(); err != nil {
			msg := fmt.Sprintf("Error reading CSV file: %v", err)
			log.Println(msg)
			conn.WriteMessage(websocket.TextMessage, []byte(msg))
			return
		}

		// Notify the client that all data has been sent
		closeMsg := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "All data sent")
		if err := conn.WriteMessage(websocket.CloseMessage, closeMsg); err != nil {
			log.Println("Error sending close message:", err)
			return
		}

		log.Printf("Sent %d lines from CSV. Connection closed.", lineCount)
	} else if serverMode == ConnectOnly {
		// Optionally, you can keep the connection open for further communication
		// or send a welcome message.
		welcomeMsg := "Connected to WebSocket server. CSV data transmission is disabled."
		err := conn.WriteMessage(websocket.TextMessage, []byte(welcomeMsg))
		if err != nil {
			log.Println("Error sending welcome message:", err)
			return
		}

		// Keep the connection alive until the client disconnects
		for {
			// Read message from client (if any)
			_, _, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("Unexpected WebSocket closure: %v", err)
				} else {
					log.Printf("WebSocket connection closed: %v", err)
				}
				break
			}
			// Optionally, handle incoming messages from the client here
		}

		log.Printf("Connection with %s closed gracefully.", r.RemoteAddr)
	}
}

func main() {
	// Define the address to listen on via a command-line flag
	addr := flag.String("addr", "localhost:8081", "http service address")
	flag.Parse()
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// Interactive prompt to choose the server mode
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Println("Select Server Mode:")
		fmt.Println("1. Send CSV data over WebSocket")
		fmt.Println("2. Connect to WebSocket without sending CSV data")
		fmt.Print("Enter choice (1 or 2): ")

		input, err := reader.ReadString('\n')
		if err != nil {
			log.Fatalf("Error reading input: %v", err)
		}

		input = strings.TrimSpace(input)
		if input == "1" {
			serverMode = SendCSV
			break
		} else if input == "2" {
			serverMode = ConnectOnly
			break
		} else {
			fmt.Println("Invalid input. Please enter 1 or 2.\n")
		}
	}

	// Register the WebSocket endpoint
	http.HandleFunc("/sendCSV", sendCSV)
	log.Printf("CSV-pushing WebSocket server listening on %s in mode: %v", *addr, serverMode)

	// Start the HTTP server
	err := http.ListenAndServe(*addr, nil)
	if err != nil {
		log.Fatalf("Failed to start CSV server: %v", err)
	}
}
