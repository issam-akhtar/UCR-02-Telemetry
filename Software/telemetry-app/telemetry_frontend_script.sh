#!/bin/bash
# Automated Telemetry Frontend Setup Script
# This script:
#   1. Checks for Node.js and installs it if not found.
#   2. Checks for npm and installs it if not found.
#   3. Installs frontend dependencies.
#   4. Runs the frontend automatically using 'npm run dev'.
#
# Usage:
#   1. Run this script as a normal user (it uses sudo for commands that require elevated privileges).
#   2. Place this script in your project's root directory.
#   3. Ensure that your project contains a valid package.json with the "dev" script.
#   4. Run the script: ./setup_frontend.sh
#
# After execution, the website will automatically start.
#
set -euo pipefail

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'  # No Color

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

log_info "=== Starting Frontend Setup ==="

####################################
# Step 1: Check for Node.js and Install if Missing
####################################
if ! command -v node &>/dev/null; then
    log_info "Node.js not found. Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash - || error_exit "Failed to run Node.js setup script."
    sudo apt-get install -y nodejs || error_exit "Failed to install Node.js."
else
    log_info "Node.js is already installed."
fi

####################################
# Step 2: Check for npm and Install if Missing
####################################
if ! command -v npm &>/dev/null; then
    log_info "npm not found. Installing npm..."
    sudo apt-get install -y npm || error_exit "Failed to install npm."
else
    log_info "npm is already installed."
fi

####################################
# Step 3: Install Frontend Dependencies
####################################
log_info "Installing frontend dependencies..."
npm install || error_exit "Failed to install frontend dependencies."

####################################
# Step 4: Run the Frontend Automatically
####################################
log_info "Starting the frontend using 'npm run dev'..."
npm run dev || error_exit "Failed to run the frontend."

# End of script

