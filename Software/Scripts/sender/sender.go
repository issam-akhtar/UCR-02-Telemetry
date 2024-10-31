package main

import (
    "bufio"
    "log"
    "os"
    "github.com/brutella/can"
)

func main() {
    // Open the CSV file as a plain text file
    file, err := os.Open("test_day_2_057.csv")
    if err != nil {
        log.Fatalf("Failed to open CSV file: %v", err)
    }
    defer file.Close()

    // Initialize the CAN bus
    bus, err := can.NewBusForInterfaceWithName("vcan0")
    if err != nil {
        log.Fatalf("Failed to create CAN bus: %v", err)
    }
    defer bus.Disconnect()

    // Connect and start publishing
    go bus.ConnectAndPublish()

    scanner := bufio.NewScanner(file)
    for scanner.Scan() {
        // Get the line of text
        line := scanner.Text()

        // Send line data in 8-byte chunks
        for i := 0; i < len(line); i += 8 {
            chunk := [8]byte{}
            copy(chunk[:], line[i:min(i+8, len(line))])

            frame := can.Frame{
                ID:     0x123,
                Length: uint8(len(chunk)),
                Data:   chunk,
            }

            if err := bus.Publish(frame); err != nil {
                log.Fatalf("Failed to send CAN frame: %v", err)
            }
        }
    }

    if err := scanner.Err(); err != nil {
        log.Fatalf("Error reading CSV file: %v", err)
    }

    log.Println("CSV data sent successfully!")
}

// Helper function to return the minimum of two integers
func min(a, b int) int {
    if a < b {
        return a
    }
    return b
}
