package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all connections for simplicity; customize in production.
	},
}

// Function to write received messages into a file
func writeToFile(fileName string, message []byte) error {
	file, err := os.OpenFile(fileName, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("failed to open file: %w", err)
	}
	defer file.Close()

	_, err = file.Write(message)
	if err != nil {
		return fmt.Errorf("failed to write message to file: %w", err)
	}

	// Add a newline after each chunk to separate data properly
	_, err = file.Write([]byte("\n"))
	if err != nil {
		return fmt.Errorf("failed to write newline to file: %w", err)
	}

	return nil
}

func handleWebSocket(conn *websocket.Conn) {
	fmt.Println("Client connected")
	for {
		// Read message from client
		_, message, err := conn.ReadMessage()
		if err != nil {
			log.Printf("Error reading message: %v\n", err)
			// Exit the loop on serious connection issues
			break
		}

		fmt.Printf("Received: %s\n", string(message))

		// Write the received message into a file
		err = writeToFile("received.csv", message)
		if err != nil {
			log.Printf("Error writing to file: %v\n", err)
			// Skip acknowledgment and continue listening
			continue
		}

		// Send acknowledgment back to the client
		err = conn.WriteMessage(websocket.TextMessage, []byte("ACK"))
		if err != nil {
			log.Printf("Error writing acknowledgment: %v\n", err)
		} else {
			fmt.Printf("Sent acknowledgment for chunk: %s\n", string(message))
		}
	}
}

func main() {
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Println("Error upgrading connection:", err)
			return
		}
		defer conn.Close() // Ensure connection is closed gracefully
		handleWebSocket(conn)
	})

	port := "9090"
	fmt.Printf("Server listening on :%s\n", port)
	log.Fatal(http.ListenAndServe("127.0.0.1:"+port, nil))
}
