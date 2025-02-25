#!/bin/bash
# Automated Backend Processing Environment Setup Script for Debian GNU/Linux 12 on Raspberry Pi 5
#
# This script:
#   1. Checks for required tools (go, yq, pg_isready) and installs any missing ones.
#   2. Extracts the database connection string from configs/config.yaml and verifies DB connectivity.
#   3. Closes port 9090 if it is in use.
#   4. Downloads Go module dependencies.
#
# Usage:
#   1. Ensure you have root privileges (or use sudo).
#   2. Place this script in your project?s root directory.
#   3. Ensure the configuration file is at "configs/config.yaml".
#   4. Run the script: sudo ./setup_backend_processing_debian.sh
#
# After successful execution, the script prints instructions to run the sender and receiver.
#
set -euo pipefail

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging functions
log_info() { echo -e "${GREEN}[INFO] $1${NC}"; }
log_warn() { echo -e "${YELLOW}[WARN] $1${NC}"; }
error_exit() { echo -e "${RED}[ERROR] $1${NC}"; exit 1; }

log_info "=== Setting up Backend Processing Environment on Debian GNU/Linux 12 ==="

####################################
# Step 1: Check & Install Required Tools
####################################
if ! command -v go &>/dev/null; then
    log_info "Go not found. Installing Go..."
    apt-get update && apt-get install -y golang-go || error_exit "Failed to install Go."
else
    log_info "Go is already installed."
fi

if ! command -v yq &>/dev/null; then
    log_info "yq not found. Installing yq..."
    ARCH=$(uname -m)
    if [[ "$ARCH" == "x86_64" ]]; then
        YQ_BINARY="yq_linux_amd64"
    elif [[ "$ARCH" == "aarch64" ]]; then
        YQ_BINARY="yq_linux_arm64"
    else
        error_exit "Unsupported architecture: $ARCH"
    fi
    wget -q "https://github.com/mikefarah/yq/releases/download/v4.30.5/${YQ_BINARY}" -O /usr/local/bin/yq || error_exit "Failed to download yq."
    chmod +x /usr/local/bin/yq || error_exit "Failed to set execute permission on yq."
else
    log_info "yq is already installed."
fi

if ! command -v pg_isready &>/dev/null; then
    log_info "pg_isready not found. Installing PostgreSQL client utilities..."
    apt-get update && apt-get install -y postgresql-client || error_exit "Failed to install PostgreSQL client utilities."
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
    log_info "Port 9090 is in use. Killing processes on port 9090..."
    lsof -t -i:9090 | xargs kill -9 || error_exit "Failed to close port 9090."
    log_info "Port 9090 has been closed."
else
    log_info "Port 9090 is free."
fi

####################################
# Step 4: Install Go Dependencies
####################################
log_info "Downloading Go module dependencies..."
go mod download || error_exit "Failed to download Go dependencies."

####################################
# Final Instructions
####################################
log_info "=== Setup complete! ==="
echo -e "${GREEN}[INFO] To run the sender, execute: go run simulate_sender.go${NC}"
echo -e "${GREEN}[INFO] To run the receiver, execute: go run main.go${NC}"

