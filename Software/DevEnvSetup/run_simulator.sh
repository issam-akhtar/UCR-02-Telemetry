#!/bin/bash

# Navigate to the backend-processing directory
cd "$(dirname "$0")/../backend-processing" || exit

# Check if go.mod exists, initialize if missing
if [ ! -f "go.mod" ]; then
    echo "[INFO] Initializing Go module..."
    go mod init telem-system
fi

# Ensure dependencies are installed
echo "[INFO] Tidying up Go modules..."
go mod tidy

# Fetch missing dependencies
echo "[INFO] Fetching dependencies..."
go get github.com/gorilla/websocket

# Run the Go script
echo "[INFO] Running simulate_sender.go..."
cd ./cmd/csvserver
go run simulate_sender.go