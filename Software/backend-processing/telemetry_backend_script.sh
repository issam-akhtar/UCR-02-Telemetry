#!/bin/bash
# Enhanced interactive script to set up the backend processing environment.
# It checks for required tools, verifies DB connectivity, manages port 9090,
# downloads Go dependencies, optionally runs tests, and builds the backend binary.
# Run this script as root.

set -euo pipefail

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO] $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

error_exit() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

# Prompt for yes/no with default Yes.
ask_yes_no() {
    local prompt_msg="$1"
    read -rp "$prompt_msg (Y/n): " answer
    if [[ "$answer" =~ ^[Yy] ]] || [ -z "$answer" ]; then
        return 0
    else
        return 1
    fi
}

log_info "=== Setting up Backend Processing Environment ==="

####################################
# Step 1: Check & Install Required Tools
####################################
if ! command -v go &>/dev/null; then
    if ask_yes_no "Go not found. Do you want to install Go?"; then
        log_info "Installing Go..."
        apt-get update && apt-get install -y golang-go || error_exit "Failed to install Go."
    else
        error_exit "Go is required. Exiting."
    fi
else
    log_info "Go is already installed."
fi

if ! command -v yq &>/dev/null; then
    if ask_yes_no "yq not found. Do you want to install yq?"; then
        log_info "Installing yq..."
        wget -q "https://github.com/mikefarah/yq/releases/download/v4.30.5/yq_linux_amd64" -O /usr/local/bin/yq || error_exit "Failed to download yq."
        chmod +x /usr/local/bin/yq || error_exit "Failed to set execute permission on yq."
    else
        error_exit "yq is required. Exiting."
    fi
else
    log_info "yq is already installed."
fi

if ! command -v pg_isready &>/dev/null; then
    if ask_yes_no "pg_isready not found. Do you want to install PostgreSQL client utilities?"; then
        log_info "Installing PostgreSQL client utilities..."
        apt-get update && apt-get install -y postgresql-client || error_exit "Failed to install PostgreSQL client utilities."
    else
        error_exit "pg_isready is required. Exiting."
    fi
else
    log_info "pg_isready is installed."
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
log_info "Extracted DB connection string: $DB_CONN"

# Remove protocol and extract host/port.
conn_no_proto="${DB_CONN#postgres://}"
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
log_info "Database host: $HOST, port: $PORT"

log_info "Checking if database server is accepting connections..."
if pg_isready -h "$HOST" -p "$PORT" > /dev/null 2>&1; then
    log_info "Database server is ready."
else
    error_exit "Database server is not accepting connections on $HOST:$PORT."
fi

####################################
# Step 3: Close Port 9090 if In Use
####################################
log_info "Checking if port 9090 is in use..."
if command -v lsof &>/dev/null && lsof -i :9090 &>/dev/null; then
    if ask_yes_no "Port 9090 is in use. Do you want to kill processes using port 9090?"; then
        log_info "Killing processes on port 9090..."
        lsof -t -i:9090 | xargs kill -9 || error_exit "Failed to close port 9090."
        log_info "Port 9090 has been closed."
    else
        log_info "Continuing despite port 9090 being in use."
    fi
else
    log_info "Port 9090 is free."
fi

####################################
# Step 4: Install Go Dependencies & Run Tests
####################################
log_info "Downloading Go module dependencies..."
go mod download || error_exit "Failed to download Go dependencies."

if ask_yes_no "Do you want to run tests (simulate_sender and telemetry server)?"; then
    log_info "Running tests..."
    if [ -d "./cmd/csvserver" ]; then
        log_info "Starting simulated sender..."
        (cd ./cmd/csvserver && go run simulate_sender.go) &
    else
        log_warn "Directory ./cmd/csvserver not found. Skipping simulated sender."
    fi

    if [ -d "./cmd/telemetryserver" ]; then
        log_info "Starting telemetry server..."
        (cd ./cmd/telemetryserver && go run main.go) &
    else
        log_warn "Directory ./cmd/telemetryserver not found. Skipping telemetry server."
    fi

    TEST_DURATION=120
    log_info "Allowing test processes to run for $TEST_DURATION seconds..."
    sleep "$TEST_DURATION"
    log_info "Killing test processes..."
    pkill -f simulate_sender.go || log_warn "Unable to kill simulated sender."
    pkill -f main.go || log_warn "Unable to kill telemetry server."
    log_info "Tests completed."
else
    log_info "Skipping tests."
fi

####################################
# Step 5: Build the Backend Binary
####################################
if ask_yes_no "Do you want to build the backend binary?"; then
    log_info "Building backend binary..."
    go build -o backend ./cmd/telemetryserver || error_exit "Build failed."
    log_info "Backend binary 'backend' built successfully."
else
    log_info "Skipping backend build."
fi

log_info "=== Setup complete. You can now run the backend with './backend' ==="

