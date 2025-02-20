#!/bin/bash
# Script to set up the backend processing environment.
# It checks for required tools, verifies DB connectivity, manages port usage,
# downloads dependencies, optionally runs tests, and builds the backend binary.

set -euo pipefail

# Function to print error messages and exit.
error_exit() {
    echo "Error: $1"
    exit 1
}

# Function for yes/no prompts (default yes).
ask_yes_no() {
    local prompt_msg="$1"
    read -rp "$prompt_msg (Y/n): " answer
    if [[ "$answer" =~ ^[Yy] ]] || [ -z "$answer" ]; then
        return 0
    else
        return 1
    fi
}

echo "=== Setting up Backend Processing Environment ==="

####################################
# Step 1: Check & Install Required Tools
####################################
# Check for Go.
if ! command -v go &>/dev/null; then
    if ask_yes_no "Go not found. Would you like to install Go?"; then
        apt-get update && apt-get install -y golang-go || error_exit "Failed to install Go."
    else
        error_exit "Go is required. Exiting."
    fi
else
    echo "Go is already installed."
fi

# Check for yq.
if ! command -v yq &>/dev/null; then
    if ask_yes_no "yq not found. Would you like to install yq?"; then
        wget -q "https://github.com/mikefarah/yq/releases/download/v4.30.5/yq_linux_amd64" -O /usr/local/bin/yq || error_exit "Failed to download yq."
        chmod +x /usr/local/bin/yq || error_exit "Failed to set execute permission on yq."
    else
        error_exit "yq is required. Exiting."
    fi
else
    echo "yq is already installed."
fi

# Check for pg_isready.
if ! command -v pg_isready &>/dev/null; then
    if ask_yes_no "pg_isready not found. Would you like to install PostgreSQL client utilities?"; then
        apt-get update && apt-get install -y postgresql-client || error_exit "Failed to install PostgreSQL client utilities."
    else
        error_exit "pg_isready is required. Exiting."
    fi
else
    echo "pg_isready is installed."
fi

####################################
# Step 2: Extract DB Info & Verify Connectivity
####################################
CONFIG_FILE="configs/config.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    error_exit "Configuration file '$CONFIG_FILE' not found."
fi

DB_CONN=$(yq e '.database.connection_string' "$CONFIG_FILE")
if [ -z "$DB_CONN" ]; then
    error_exit "Database connection string not found in '$CONFIG_FILE'."
fi
echo "Extracted DB connection string: $DB_CONN"

# Remove protocol (e.g., "postgres://")
conn_no_proto="${DB_CONN#postgres://}"

# If credentials are provided, remove them.
if [[ "$conn_no_proto" == *"@"* ]]; then
    host_port="${conn_no_proto#*@}"
else
    host_port="$conn_no_proto"
fi
host_port="${host_port%%/*}"
HOST="${host_port%%:*}"
PORT="${host_port#*:}"

if [ -z "$HOST" ] || [ -z "$PORT" ]; then
    error_exit "Failed to parse host or port from the connection string."
fi
echo "Database host: $HOST, port: $PORT"

echo "Checking if database server is accepting connections..."
if pg_isready -h "$HOST" -p "$PORT" > /dev/null 2>&1; then
    echo "Database server is ready."
else
    error_exit "Database server is not accepting connections on $HOST:$PORT."
fi

####################################
# Step 3: Close Port 9090 if In Use
####################################
echo "Checking if port 9090 is in use..."
if command -v lsof &>/dev/null; then
    if lsof -i :9090 &>/dev/null; then
        if ask_yes_no "Port 9090 is in use. Kill processes using port 9090?"; then
            lsof -t -i:9090 | xargs kill -9 || error_exit "Failed to close port 9090."
            echo "Port 9090 has been closed."
        else
            echo "Continuing despite port 9090 being in use."
        fi
    else
        echo "Port 9090 is free."
    fi
else
    echo "Warning: lsof command not found. Skipping port check."
fi

####################################
# Step 4: Install Go Dependencies & Optionally Run Tests
####################################
echo "Downloading Go module dependencies..."
go mod download || error_exit "Failed to download Go dependencies."

if ask_yes_no "Do you want to run tests (simulate_sender and telemetry server)?"; then
    echo "Running tests..."
    # Launch simulated sender.
    if [ -d "./cmd/csvserver" ]; then
        echo "Starting simulated sender..."
        (cd ./cmd/csvserver && go run simulate_sender.go &) || error_exit "Failed to start simulated sender."
        SENDER_PID=$!
        sleep 5
    else
        echo "Directory ./cmd/csvserver not found. Skipping simulated sender."
    fi

    # Launch telemetry server.
    if [ -d "./cmd/telemetryserver" ]; then
        echo "Starting telemetry server..."
        (cd ./cmd/telemetryserver && go run main.go &) || error_exit "Failed to start telemetry server."
        MAIN_PID=$!
    else
        echo "Directory ./cmd/telemetryserver not found. Skipping telemetry server."
    fi

    TEST_DURATION=120
    echo "Allowing test processes to run for $TEST_DURATION seconds..."
    sleep "$TEST_DURATION"

    echo "Killing test processes..."
    if [ -n "${SENDER_PID:-}" ]; then
        kill "$SENDER_PID" || echo "Warning: Unable to kill simulated sender."
    fi
    if [ -n "${MAIN_PID:-}" ]; then
        kill "$MAIN_PID" || echo "Warning: Unable to kill telemetry server."
    fi
    echo "Tests completed."
else
    echo "Skipping tests."
fi

####################################
# Step 5: Build the Backend Binary
####################################
echo "Building backend binary..."
go build -o backend ./cmd/telemetryserver || error_exit "Build failed."
echo "Backend binary 'backend' built successfully."

echo "=== Setup complete. You can now run the backend with './backend' ==="

