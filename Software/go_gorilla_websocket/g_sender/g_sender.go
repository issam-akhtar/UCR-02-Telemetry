// package main

// import (
// 	"bufio"
// 	"fmt"
// 	"log"
// 	"os"
// 	"strings"
// 	"time"

// 	"github.com/gorilla/websocket"
// )

// const (
// 	AckTimeout         = 10 * time.Second // Timeout for acknowledgment
// 	MaxRetries         = 3                // Maximum retries per chunk
// 	RetryDelay         = 2 * time.Second  // Delay between retries
// 	ReconnectThreshold = 2                // Reconnect after this many failed chunks
// 	FileName           = "test.csv"       // Hardcoded CSV file name
// )

// // sendChunkWithAck sends a chunk and waits for an acknowledgment.
// func sendChunkWithAck(conn *websocket.Conn, chunk string) error {
// 	for i := 0; i < MaxRetries; i++ {
// 		// Send the chunk
// 		err := conn.WriteMessage(websocket.TextMessage, []byte(chunk))
// 		if err != nil {
// 			log.Printf("Error sending chunk (attempt %d/%d): %v\n", i+1, MaxRetries, err)
// 			time.Sleep(RetryDelay)
// 			continue
// 		}

// 		// Wait for acknowledgment
// 		conn.SetReadDeadline(time.Now().Add(AckTimeout))
// 		_, ack, err := conn.ReadMessage()
// 		if err == nil && string(ack) == "ACK" {
// 			fmt.Printf("Acknowledgment received for chunk: %s\n", chunk)
// 			return nil // Success
// 		}

// 		if err != nil {
// 			log.Printf("Error receiving acknowledgment (attempt %d/%d): %v\n", i+1, MaxRetries, err)
// 		} else {
// 			log.Printf("Unexpected acknowledgment content: %s, retrying (attempt %d/%d)", string(ack), i+1, MaxRetries)
// 		}
// 		time.Sleep(RetryDelay)
// 	}

// 	return fmt.Errorf("failed to send chunk after %d retries", MaxRetries)
// }

// // reconnect attempts to reconnect to the WebSocket server.
// func reconnect(serverAddr string) (*websocket.Conn, error) {
// 	fmt.Println("Reconnecting to server...")
// 	timeout := time.After(1 * time.Minute)
// 	ticker := time.NewTicker(2 * time.Second)
// 	defer ticker.Stop()

// 	for {
// 		select {
// 		case <-timeout:
// 			return nil, fmt.Errorf("failed to reconnect: timeout reached after 1 minute")
// 		case <-ticker.C:
// 			conn, _, err := websocket.DefaultDialer.Dial(serverAddr, nil)
// 			if err == nil {
// 				fmt.Println("Reconnected to server")
// 				return conn, nil
// 			}
// 			fmt.Printf("Reconnection attempt failed: %v. Retrying...\n", err)
// 		}
// 	}
// }
// //The problem is that there might be a 'stale' websocket connection after theres connection timeouts, where its effectively useless and is in
// // a bad state. This is why a reconnect is needed.

// // promptYesNo asks the user a yes/no question and returns true for yes, false for no.
// func promptYesNo(prompt string) bool {
// 	reader := bufio.NewReader(os.Stdin)
// 	for {
// 		fmt.Printf("%s (yes/no): ", prompt)
// 		response, err := reader.ReadString('\n')
// 		if err != nil {
// 			log.Printf("Error reading input: %v", err)
// 			continue
// 		}
// 		response = strings.TrimSpace(strings.ToLower(response))
// 		if response == "yes" {
// 			return true
// 		} else if response == "no" {
// 			return false
// 		} else {
// 			fmt.Println("Invalid response. Please type 'yes' or 'no'.")
// 		}
// 	}
// }
// // sendCSVFile reads the CSV file and sends its data in 8-byte chunks.
// func sendCSVFile(conn *websocket.Conn, fileName string) error {
// 	file, err := os.Open(fileName)
// 	if err != nil {
// 		return fmt.Errorf("failed to open CSV file: %w", err)
// 	}
// 	defer file.Close()

// 	scanner := bufio.NewScanner(file)
// 	failedChunks := 0
// 	rowIndex := 0

// 	for scanner.Scan() {
// 		row := scanner.Text()

// 		// Split the row into 8-byte chunks
// 		for i := 0; i < len(row); i += 128 {
// 			end := i + 128
// 			if end > len(row) {
// 				end = len(row) // Handle the last chunk if it's smaller than 8 bytes
// 			}

// 			chunk := row[i:end]
// 			fmt.Printf("Sending chunk from row %d: %s\n", rowIndex, chunk)

// 			err = sendChunkWithAck(conn, chunk)
// 			if err != nil {
// 				log.Printf("Failed to send chunk from row %d: %s. Error: %v\n", rowIndex, chunk, err)
// 				failedChunks++
// 				if failedChunks >= ReconnectThreshold {
// 					conn.Close()
// 					conn, err = reconnect("ws://127.0.0.1:9090/ws")
// 					if err != nil {
// 						return fmt.Errorf("reconnection failed: %w", err)
// 					}
// 					failedChunks = 0 // Reset failure counter
// 				}
// 			} else {
// 				failedChunks = 0 // Reset failure counter on success
// 			}
// 		}
// 		rowIndex++
// 	}

// 	if scanner.Err() != nil {
// 		return fmt.Errorf("error reading file: %w", scanner.Err())
// 	}
// 	return nil
// }


// func main() {
// 	serverAddr := "ws://100.124.52.21:9090/ws"

// 	// Establish initial WebSocket connection
// 	conn, _, err := websocket.DefaultDialer.Dial(serverAddr, nil)
// 	if err != nil {
// 		log.Fatal("Error connecting to server:", err)
// 	}
// 	defer conn.Close()

// 	fmt.Println("Connected to server")

// 	// Prompt the user to start sending data
// 	if !promptYesNo("Do you want to start sending data?") {
// 		fmt.Println("Exiting without sending data.")
// 		return
// 	}

// 	// Send the hardcoded CSV file
// 	err = sendCSVFile(conn, FileName)
// 	if err != nil {
// 		log.Fatalf("Failed to send CSV file: %v\n", err)
// 	}

// 	fmt.Println("CSV file sent successfully.")
// }
//
//awab@pop-os:~$ cat client_private.key 
// CHalr3wii9eKOHWqJuO4RcuCqz0xMrFm3zya3lP2mm0=
// awab@pop-os:~$ cat client_public.key 
// sxCYCctekX1lzX/Dg8XnTICoc/MJi09OQBXJIEnnpkI=
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
	MaxRetries         = 3               // Maximum retries per chunk
	RetryDelay         = 2 * time.Second // Delay between retries
	ReconnectThreshold = 2               // Reconnect after this many failed chunks
	FileName           = "test.csv"      // Hardcoded CSV file name
)


// Global accumulators for round-trip time
var (
	totalRTT time.Duration
	rttCount int
)


// sendChunkWithAck sends a chunk, appending a timestamp, then waits for an acknowledgment (ACK).
func sendChunkWithAck(conn *websocket.Conn, chunk string) error {
	for i := 0; i < MaxRetries; i++ {
		// Get current time for round-trip measurement
		sendTime := time.Now()


		// Embed a UnixNano timestamp at the end of the chunk with "|"
		senderTimestamp := sendTime.UnixNano()
		timestampedChunk := fmt.Sprintf("%s|%d", chunk, senderTimestamp)


		// Send the timestamped chunk
		err := conn.WriteMessage(websocket.TextMessage, []byte(timestampedChunk))
		if err != nil {
			log.Printf("Error sending chunk (attempt %d/%d): %v\n", i+1, MaxRetries, err)
			time.Sleep(RetryDelay)
			continue
		}


		// Wait for acknowledgment
		conn.SetReadDeadline(time.Now().Add(AckTimeout))
		_, ack, err := conn.ReadMessage()
		if err == nil && string(ack) == "ACK" {
			// Calculate round-trip time
			rtt := time.Since(sendTime)
			fmt.Printf("[Sender] ACK received for chunk: %s | Round-trip: %v\n", chunk, rtt)


			// Accumulate RTT for average calculation
			totalRTT += rtt
			rttCount++


			return nil // success
		}


		if err != nil {
			log.Printf("Error receiving acknowledgment (attempt %d/%d): %v\n", i+1, MaxRetries, err)
		} else {
			log.Printf("Unexpected acknowledgment content: %s, retrying (attempt %d/%d)",
				string(ack), i+1, MaxRetries)
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


// sendCSVFile reads the CSV file line-by-line, splits lines into 128-byte chunks, and sends them.
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


		// Break each row into 64-byte chunks
		for i := 0; i < len(row); i += 64 {
			end := i + 64
			if end > len(row) {
				end = len(row) // handle last chunk if < 128 bytes
			}


			chunk := row[i:end]
			fmt.Printf("Sending chunk from row %d: %s\n", rowIndex, chunk)


			err = sendChunkWithAck(conn, chunk)
			if err != nil {
				log.Printf("Failed to send chunk from row %d: %s. Error: %v\n", rowIndex, chunk, err)
				failedChunks++
				if failedChunks >= ReconnectThreshold {
					conn.Close()
					conn, err = reconnect("ws://127.0.0.1:9090/ws")
					if err != nil {
						return fmt.Errorf("reconnection failed: %w", err)
					}
					failedChunks = 0
				}
			} else {
				failedChunks = 0
			}
		}
		rowIndex++
	}


	if scanner.Err() != nil {
		return fmt.Errorf("error reading file: %w", scanner.Err())
	}
	return nil
}


func main() {
	// serverAddr := "ws://100.124.52.21:9090/ws" // vpn ip
	serverAddr := "ws://205.206.236.222:9090/ws" //port forwarding ip


	// Connect to the WebSocket server
	conn, _, err := websocket.DefaultDialer.Dial(serverAddr, nil)
	if err != nil {
		log.Fatal("Error connecting to server:", err)
	}
	defer conn.Close()


	fmt.Println("Connected to server")


	// Prompt the user before sending
	if !promptYesNo("Do you want to start sending data?") {
		fmt.Println("Exiting without sending data.")
		return
	}


	// Send the CSV file chunks
	err = sendCSVFile(conn, FileName)
	if err != nil {
		log.Fatalf("Failed to send CSV file: %v\n", err)
	}


	// Print the average RTT before exiting
	if rttCount > 0 {
		avgRTT := totalRTT / time.Duration(rttCount)
		fmt.Printf("Average round-trip time: %v (over %d chunks)\n", avgRTT, rttCount)
	} else {
		fmt.Println("No RTT measurements were recorded.")
	}


	fmt.Println("CSV file sent successfully.")
}




