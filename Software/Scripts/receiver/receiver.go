package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"
    "github.com/brutella/can"
)

// Define a custom handler that implements can.Handler
type CSVReceiver struct {
    file *os.File
}

// Implement the Handle method for the CSVReceiver
func (receiver *CSVReceiver) Handle(frame can.Frame) {
    log.Printf("Received frame: ID=%x, Data=%x\n", frame.ID, frame.Data)

    // Write frame data to file immediately
    if _, err := receiver.file.Write(frame.Data[:]); err != nil {
        log.Fatalf("Failed to write frame data to CSV file: %v", err)
    }

    // Flush data to disk to ensure it's written immediately
    if err := receiver.file.Sync(); err != nil {
        log.Fatalf("Failed to flush data to CSV file: %v", err)
    }
}
//ABOVE FUNCTION CAN DO REAL TIME DATA PROCESSING

func main() {
    // Open file to write received data
    file, err := os.Create("received_data.csv")
    if err != nil {
        log.Fatalf("Failed to create CSV file: %v", err)
    }
    defer file.Close()

    // Initialize the CAN bus
    bus, err := can.NewBusForInterfaceWithName("vcan1")
    if err != nil {
        log.Fatalf("Failed to create CAN bus: %v", err)
    }
    defer bus.Disconnect()

    // Create a new CSVReceiver handler
    receiver := &CSVReceiver{
        file: file,
    }

    // Subscribe to the bus with the custom handler (no return value)
    bus.Subscribe(receiver)

    // Connect the CAN bus after subscribing
    go func() {
        if err := bus.ConnectAndPublish(); err != nil {
            log.Fatalf("Failed to connect CAN bus: %v", err)
        }
    }()

    // Setup channel to listen for an interrupt signal
    stop := make(chan os.Signal, 1)
    signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)

    // Keep the program running until interrupted
    log.Println("Receiver is running. Waiting for CAN frames...")

    // Block until a signal is received
    <-stop

    log.Println("Receiver stopped. Data should be in received_data.csv")
}





//