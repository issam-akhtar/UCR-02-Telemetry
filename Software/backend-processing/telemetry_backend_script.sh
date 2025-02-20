#!/bin/bash
# setup_backend.sh
# This script sets up the backend processing environment on a new computer.
# It will:
#   1. Check for and install required tools (Go, yq, pg_isready).
#   2. Read the configuration from configs/config.yaml and verify the database is reachable.
#   3. Close port 9090 if it is in use.
#   4. Download Go module dependencies.
#   5. Optionally run tests by launching simulate_sender and the telemetry server.
#   6. Build the backend binary from cmd/telemetryserver.
#
# Run this script from the repository's root.
# (It may need to be run as root or with sudo.)

set -e

############################################
# Function to print error messages and exit #
############################################
function error_exit {
    echo "Error: $1"
    exit 1
}

echo "=== Setting up Backend Processing Environment ==="

####################################
# 1. Check & Install Required Tools #
####################################

# Check for Go; if missing, install via apt-get.
if ! command -v go &>/dev/null; then
    echo "Go not found. Installing Go..."
    apt-get update && apt-get install -y golang-go || error_exit "Failed to install Go."
else
    echo "Go is installed."
fi

# Check for yq; if missing, download and install it.
if ! command -v yq &>/dev/null; then
    echo "yq not found. Installing yq..."
    wget -q "https://github.com/mikefarah/yq/releases/download/v4.30.5/yq_linux_amd64" -O /usr/local/bin/yq || error_exit "Failed to download yq."
    chmod +x /usr/local/bin/yq
else
    echo "yq is installed."
fi

# Check for pg_isready; if missing, install PostgreSQL client utilities.
if ! command -v pg_isready &>/dev/null; then
    echo "pg_isready not found. Installing PostgreSQL client utilities..."
    apt-get update && apt-get install -y postgresql-client || error_exit "Failed to install PostgreSQL client utilities."
else
    echo "pg_isready is installed."
fi

##############################################
# 2. Extract DB Info and Verify DB Server    #
##############################################

CONFIG_FILE="configs/config.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    error_exit "Configuration file '$CONFIG_FILE' not found."
fi

# Extract the DB connection string.
DB_CONN=$(yq e '.database.connection_string' "$CONFIG_FILE")
if [ -z "$DB_CONN" ]; then
    error_exit "Database connection string not found in '$CONFIG_FILE'."
fi
echo "Extracted DB connection string: $DB_CONN"

# Parse host and port using similar logic as in the database script.
# Remove the protocol (e.g., "postgres://")
conn_no_proto="${DB_CONN#postgres://}"

# Remove credentials (if any) by taking everything after the '@'.
if [[ "$conn_no_proto" == *"@"* ]]; then
    host_port="${conn_no_proto#*@}"
else
    host_port="$conn_no_proto"
fi
# Extract the host and port from the portion before the first '/'
host_port="${host_port%%/*}"

# Now extract host and port separately.
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

##############################################
# 3. Close Port 9090 if It Is In Use         #
##############################################
echo "Checking if port 9090 is in use..."
if lsof -i :9090 &>/dev/null; then
    echo "Port 9090 is in use. Attempting to close it..."
    lsof -t -i:9090 | xargs kill -9 || error_exit "Failed to close port 9090."
    echo "Port 9090 has been closed."
else
    echo "Port 9090 is free."
fi

#############################################
# 4. Install Go Dependencies and Optionally Run Tests  #
#############################################

echo "Downloading Go module dependencies..."
go mod download || error_exit "Failed to download Go dependencies."

read -p "Do you want to run tests (simulate_sender and telemetry server)? (Y/n): " run_tests
if [[ "$run_tests" =~ ^[Yy] || -z "$run_tests" ]]; then
    echo "Running tests..."
    # Launch the simulated sender from cmd/csvserver.
    echo "Starting simulated sender..."
    cd ./cmd/csvserver/ || error_exit "Failed to change directory to ./cmd/csvserver/"
    go run simulate_sender.go &
    SENDER_PID=$!
    sleep 5  # Allow simulated sender to start

    # Launch the telemetry server from cmd/telemetryserver.
    echo "Starting telemetry server (main)..."
    cd ../telemetryserver/ || error_exit "Failed to change directory to ./cmd/telemetryserver/"
    go run main.go &
    MAIN_PID=$!

    TEST_DURATION=120
    echo "Allowing test processes to run for $TEST_DURATION seconds..."
    sleep "$TEST_DURATION"

    echo "Killing test processes..."
    kill $SENDER_PID $MAIN_PID || echo "Warning: Unable to kill one or more test processes."
    echo "Tests completed."
else
    echo "Skipping tests."
fi

#########################################
# 5. Build the Backend Binary           #
#########################################

echo "Building backend binary..."
# Build from the telemetry server package.
go build -o backend ./cmd/telemetryserver || error_exit "Build failed."
echo "Backend binary 'backend' built successfully."

echo "=== Setup complete. You can now run the backend with './backend' ==="

