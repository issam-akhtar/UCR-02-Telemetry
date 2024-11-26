package main

import (
	"bufio"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const (
	AckTimeout         = 10 * time.Second // Timeout for acknowledgment
	MaxRetries         = 3                // Maximum retries per chunk
	RetryDelay         = 2 * time.Second  // Delay between retries
	ReconnectThreshold = 2                // Reconnect after this many failed chunks
	FileName           = "test.csv"       // Hardcoded CSV file name
)

// sendChunkWithAck sends a chunk and waits for an acknowledgment.
func sendChunkWithAck(conn *websocket.Conn, chunk string) error {
	for i := 0; i < MaxRetries; i++ {
		// Send the chunk
		err := conn.WriteMessage(websocket.TextMessage, []byte(chunk))
		if err != nil {
			log.Printf("Error sending chunk (attempt %d/%d): %v\n", i+1, MaxRetries, err)
			time.Sleep(RetryDelay)
			continue
		}

		// Wait for acknowledgment
		conn.SetReadDeadline(time.Now().Add(AckTimeout))
		_, ack, err := conn.ReadMessage()
		if err == nil && string(ack) == "ACK" {
			fmt.Printf("Acknowledgment received for chunk: %s\n", chunk)
			return nil // Success
		}

		if err != nil {
			log.Printf("Error receiving acknowledgment (attempt %d/%d): %v\n", i+1, MaxRetries, err)
		} else {
			log.Printf("Unexpected acknowledgment content: %s, retrying (attempt %d/%d)", string(ack), i+1, MaxRetries)
		}
		time.Sleep(RetryDelay)
	}

	return fmt.Errorf("failed to send chunk after %d retries", MaxRetries)
}

// reconnect attempts to reconnect to the WebSocket server.
func reconnect(serverAddr string) (*websocket.Conn, error) {
	fmt.Println("Reconnecting to server...")
	timeout := time.After(1 * time.Minute)
	ticker := time.NewTicker(2 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-timeout:
			return nil, fmt.Errorf("failed to reconnect: timeout reached after 1 minute")
		case <-ticker.C:
			conn, _, err := websocket.DefaultDialer.Dial(serverAddr, nil)
			if err == nil {
				fmt.Println("Reconnected to server")
				return conn, nil
			}
			fmt.Printf("Reconnection attempt failed: %v. Retrying...\n", err)
		}
	}
}
//The problem is that there might be a 'stale' websocket connection after theres connection timeouts, where its effectively useless and is in
// a bad state. This is why a reconnect is needed.

// promptYesNo asks the user a yes/no question and returns true for yes, false for no.
func promptYesNo(prompt string) bool {
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Printf("%s (yes/no): ", prompt)
		response, err := reader.ReadString('\n')
		if err != nil {
			log.Printf("Error reading input: %v", err)
			continue
		}
		response = strings.TrimSpace(strings.ToLower(response))
		if response == "yes" {
			return true
		} else if response == "no" {
			return false
		} else {
			fmt.Println("Invalid response. Please type 'yes' or 'no'.")
		}
	}
}

// sendCSVFile reads the CSV file and sends its data row by row.
func sendCSVFile(conn *websocket.Conn, fileName string) error {
	file, err := os.Open(fileName)
	if err != nil {
		return fmt.Errorf("failed to open CSV file: %w", err)
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	failedChunks := 0
	rowIndex := 0

	for scanner.Scan() {
		row := scanner.Text()
		fmt.Printf("Sending row %d: %s\n", rowIndex, row)

		err = sendChunkWithAck(conn, row)
		if err != nil {
			log.Printf("Failed to send row %d: %s. Error: %v\n", rowIndex, row, err)
			failedChunks++
			if failedChunks >= ReconnectThreshold {
				conn.Close()
				conn, err = reconnect("ws://127.0.0.1:9090/ws")
				if err != nil {
					return fmt.Errorf("reconnection failed: %w", err)
				}
				failedChunks = 0 // Reset failure counter
			}
		} else {
			failedChunks = 0 // Reset failure counter on success
		}
		rowIndex++
	}

	if scanner.Err() != nil {
		return fmt.Errorf("error reading file: %w", scanner.Err())
	}
	return nil
}

func main() {
	serverAddr := "ws://127.0.0.1:9090/ws"

	// Establish initial WebSocket connection
	conn, _, err := websocket.DefaultDialer.Dial(serverAddr, nil)
	if err != nil {
		log.Fatal("Error connecting to server:", err)
	}
	defer conn.Close()

	fmt.Println("Connected to server")

	// Prompt the user to start sending data
	if !promptYesNo("Do you want to start sending data?") {
		fmt.Println("Exiting without sending data.")
		return
	}

	// Send the hardcoded CSV file
	err = sendCSVFile(conn, FileName)
	if err != nil {
		log.Fatalf("Failed to send CSV file: %v\n", err)
	}

	fmt.Println("CSV file sent successfully.")
}
//