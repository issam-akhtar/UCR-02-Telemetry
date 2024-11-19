package main

import (
	"fmt"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

// MaxRetries defines the maximum number of retries for sending a message.
const MaxRetries = 3

// RetryDelay defines the time to wait between retries.
const RetryDelay = 2 * time.Second

func sendMessageWithRetry(conn *websocket.Conn, messageType int, message []byte) error {
	var err error
	for i := 0; i < MaxRetries; i++ {
		err = conn.WriteMessage(messageType, message)
		if err == nil {
			fmt.Printf("Message sent successfully: %s\n", string(message))
			return nil // Message sent successfully
		}

		log.Printf("Failed to send message (attempt %d/%d): %v\n", i+1, MaxRetries, err)
		time.Sleep(RetryDelay) // Wait before retrying
	}

	return fmt.Errorf("failed to send message after %d retries: %w", MaxRetries, err)
}

func main() {
	serverAddr := "ws://localhost:9090/ws"
	conn, _, err := websocket.DefaultDialer.Dial(serverAddr, nil)
	if err != nil {
		log.Fatal("Error connecting to server:", err)
	}
	defer conn.Close()

	fmt.Println("Connected to server")

	// Example data to send
	message := []byte("Hello, WebSocket!")

	// Attempt to send the message with retry fallback
	err = sendMessageWithRetry(conn, websocket.TextMessage, message)
	if err != nil {
		log.Printf("Final failure to send message: %v\n", err)
	} else {
		fmt.Println("Message successfully sent after retries")
	}
}
