#!/bin/bash
# Automated Backend Processing Environment Setup Script
# This script:
#   1. Ensures required tools (Go, yq, pg_isready) are installed.
#      Instead of installing Go via apt (which is outdated),
#      it downloads and installs Go version 1.24.0.
#   2. Extracts the database connection string from configs/config.yaml and verifies DB connectivity.
#   3. Downloads Go module dependencies.
#
# Usage:
#   1. Ensure you have root privileges (or use sudo).
#   2. Place this script in your project’s root directory.
#   3. Ensure the configuration file is at "configs/config.yaml".
#   4. Run the script: sudo ./setup_backend.sh
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
log_info()   { echo -e "${GREEN}[INFO] $1${NC}"; }
log_warn()   { echo -e "${YELLOW}[WARN] $1${NC}"; }
error_exit() { echo -e "${RED}[ERROR] $1${NC}"; exit 1; }

log_info "=== Setting up Backend Processing Environment ==="

####################################
# Step 1: Ensure Required Tools Are Installed
####################################

# --- Install Go Version 1.24.0 (overriding any older apt version) ---
GO_DESIRED_VERSION="go1.24.0"
GO_ARCHIVE="${GO_DESIRED_VERSION}.linux-amd64.tar.gz"
GO_DOWNLOAD_URL="https://go.dev/dl/${GO_ARCHIVE}"

if command -v go &>/dev/null; then
    CURRENT_GO_VERSION=$(go version | awk '{print $3}')
    if [[ "$CURRENT_GO_VERSION" != "$GO_DESIRED_VERSION" ]]; then
        log_info "Updating Go from $CURRENT_GO_VERSION to $GO_DESIRED_VERSION..."
        rm -rf /usr/local/go || log_warn "Could not remove /usr/local/go"
        wget -q "$GO_DOWNLOAD_URL" -O /tmp/$GO_ARCHIVE || error_exit "Failed to download Go archive."
        tar -C /usr/local -xzf /tmp/$GO_ARCHIVE || error_exit "Failed to extract Go archive."
        # Add /usr/local/go/bin to system PATH globally if not already done.
        if ! grep -q "/usr/local/go/bin" /etc/profile; then
            echo "export PATH=\$PATH:/usr/local/go/bin" >> /etc/profile
            log_info "Added /usr/local/go/bin to system PATH in /etc/profile."
        fi
        export PATH=$PATH:/usr/local/go/bin
        log_info "Go updated successfully: $(go version)"
    else
        log_info "Go version $GO_DESIRED_VERSION is already installed."
    fi
else
    log_info "Go not found. Installing Go $GO_DESIRED_VERSION..."
    rm -rf /usr/local/go 2>/dev/null || true
    wget -q "$GO_DOWNLOAD_URL" -O /tmp/$GO_ARCHIVE || error_exit "Failed to download Go archive."
    tar -C /usr/local -xzf /tmp/$GO_ARCHIVE || error_exit "Failed to extract Go archive."
    if ! grep -q "/usr/local/go/bin" /etc/profile; then
        echo "export PATH=\$PATH:/usr/local/go/bin" >> /etc/profile
        log_info "Added /usr/local/go/bin to system PATH in /etc/profile."
    fi
    export PATH=$PATH:/usr/local/go/bin
    log_info "Go installation complete: $(go version)"
fi

# --- Source user profile to apply PATH changes immediately (if available) ---
if [ -f "$HOME/.profile" ]; then
    set +u
    source "$HOME/.profile" || log_warn "Failed to source $HOME/.profile"
    set -u
    log_info "Sourced $HOME/.profile to update PATH."
fi

# --- Install yq if missing ---
if ! command -v yq &>/dev/null; then
    log_info "yq not found. Installing yq..."
    wget -q "https://github.com/mikefarah/yq/releases/download/v4.30.5/yq_linux_amd64" -O /usr/local/bin/yq || error_exit "Failed to download yq."
    chmod +x /usr/local/bin/yq || error_exit "Failed to set execute permission on yq."
else
    log_info "yq is already installed."
fi

# --- Install pg_isready if missing ---
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
# Step 3: Install Go Dependencies
####################################
log_info "Downloading Go module dependencies..."
go mod download || error_exit "Failed to download Go dependencies."

####################################
# Final Instructions
####################################
log_info "=== Setup complete! ==="
echo -e "${GREEN}[INFO] To run the sender, execute: go run simulate_sender.go${NC}"
echo -e "${GREEN}[INFO] To run the receiver, execute: go run main.go${NC}"
echo -e "${GREEN}[INFO] Note: The system-wide PATH has been updated in /etc/profile. You may need to re-login or run 'source ~/.profile' to apply changes fully.${NC}"
