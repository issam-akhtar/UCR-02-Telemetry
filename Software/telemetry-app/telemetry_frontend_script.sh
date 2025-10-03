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
    log_info "Node.js not found. Installing Node.js 20 LTS…"
    sudo install -d -m 0755 /etc/apt/keyrings
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
        | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
        | sudo tee /etc/apt/sources.list.d/nodesource.list >/dev/null
    sudo apt-get update -y
    sudo apt-get install -y nodejs || error_exit "Failed to install Node.js."
    log_info "Installed $(node -v)"
else
    log_info "Node.js is already installed: $(node -v)"
fi


####################################
# Step 2: Check for npm and Install/Update
####################################
if ! command -v npm &>/dev/null; then
    error_exit "npm is missing even though node is installed."
fi
log_info "Current npm: $(npm -v). Updating npm…"
sudo npm -g install npm@latest >/dev/null 2>&1 || true
log_info "npm after update: $(npm -v)"


####################################
# Step 3: Install Frontend Dependencies (with fallback for peer conflicts)
####################################
log_info "Installing frontend dependencies..."
set +e
npm install
STATUS=$?
set -e

if [[ $STATUS -ne 0 ]]; then
    log_warn "npm install failed (likely peer-dependency conflict). Retrying with --legacy-peer-deps..."
    npm install --legacy-peer-deps || error_exit "Failed to install frontend dependencies even with --legacy-peer-deps."
    log_warn "Installed with --legacy-peer-deps. Consider aligning React & library versions."
else
    log_info "Dependencies installed successfully."
fi


####################################
# Step 4: Run the Frontend Automatically
####################################
log_info "Starting the frontend using 'npm run dev'..."
npm run dev || error_exit "Failed to run the frontend."

# End of script

