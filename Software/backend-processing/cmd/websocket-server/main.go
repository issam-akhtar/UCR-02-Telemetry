// server.go
package main

import (
	"bufio"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/websocket"
)

// Define the server address via a command-line flag
var addr = flag.String("addr", "localhost:8081", "http service address")

// Upgrader specifies parameters for upgrading an HTTP connection to a WebSocket connection
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for simplicity; adjust for production.
	},
}

// sendCSV handles WebSocket connections and sends CSV records to the client
func sendCSV(w http.ResponseWriter, r *http.Request) {
	// Upgrade the HTTP connection to a WebSocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println("Upgrade error:", err)
		return
	}
	defer conn.Close()

	// Open the CSV file
	// Update the CSV file path
	file, err := os.Open("../../testdata/data.csv") // Adjust the relative path as needed

	if err != nil {
		log.Println("Error opening CSV file:", err)
		errMsg := fmt.Sprintf("Error opening CSV file: %v", err)
		conn.WriteMessage(websocket.TextMessage, []byte(errMsg))
		return
	}
	defer file.Close()

	// Create a scanner to read the file line-by-line
	scanner := bufio.NewScanner(file)
	lineCount := 0
	for scanner.Scan() {
		line := scanner.Text()
		lineCount++

		// Optionally, skip the first N lines (e.g., headers or metadata)
		if lineCount <= 8 {
			continue
		}

		// Send each line as a WebSocket message
		err := conn.WriteMessage(websocket.TextMessage, []byte(line))
		if err != nil {
			log.Println("Error sending CSV line:", err)
			return
		}

		// Optional: Add a delay to simulate streaming
		// time.Sleep(10 * time.Millisecond)
	}

	// Check for scanner errors
	if err := scanner.Err(); err != nil {
		log.Println("Error reading CSV file:", err)
		errMsg := fmt.Sprintf("Error reading CSV file: %v", err)
		conn.WriteMessage(websocket.TextMessage, []byte(errMsg))
		return
	}

	// Send a proper close message to the client
	closeMessage := websocket.FormatCloseMessage(websocket.CloseNormalClosure, "All data sent")
	err = conn.WriteMessage(websocket.CloseMessage, closeMessage)
	if err != nil {
		log.Println("Error sending close message:", err)
		return
	}

	log.Println("CSV records sent to client and connection closed gracefully.")
}

func main() {
	flag.Parse()
	log.SetFlags(log.LstdFlags)
	http.HandleFunc("/sendCSV", sendCSV)
	log.Printf("WebSocket server started on %s", *addr)
	log.Fatal(http.ListenAndServe(*addr, nil))
}
