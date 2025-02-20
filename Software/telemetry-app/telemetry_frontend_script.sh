#!/bin/bash
# Enhanced interactive script to set up the telemetry frontend.
# It checks for Node.js and npm, installs dependencies, and optionally runs the frontend.
# Run this script as a normal user. Commands that require elevated privileges use sudo.

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
    if [[ "$answer" =~ ^[Yy]$ ]] || [ -z "$answer" ]; then
        return 0
    else
        return 1
    fi
}

log_info "Starting frontend setup..."

####################################
# Step 1: Check for Node.js
####################################
if ! command -v node &>/dev/null; then
    if ask_yes_no "Node.js not found. Do you want to install Node.js?"; then
        log_info "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash - || error_exit "Failed to run Node.js setup script."
        sudo apt-get install -y nodejs || error_exit "Failed to install Node.js."
    else
        error_exit "Node.js is required. Exiting."
    fi
else
    log_info "Node.js is already installed."
fi

####################################
# Step 2: Check for npm
####################################
if ! command -v npm &>/dev/null; then
    if ask_yes_no "npm not found. Do you want to install npm?"; then
        log_info "Installing npm..."
        sudo apt-get install -y npm || error_exit "Failed to install npm."
    else
        error_exit "npm is required. Exiting."
    fi
else
    log_info "npm is already installed."
fi

####################################
# Step 3: Install Frontend Dependencies
####################################
if ask_yes_no "Do you want to install frontend dependencies?"; then
    log_info "Installing frontend dependencies..."
    npm install || error_exit "Failed to install frontend dependencies."
else
    log_info "Skipping installation of frontend dependencies."
fi

log_info "Frontend setup complete."

####################################
# Final Step: Option to run the frontend
####################################
if ask_yes_no "Would you like to run the frontend now?"; then
    log_info "Starting the frontend..."
    npm run dev || error_exit "Failed to run the frontend."
else
    log_info "Frontend setup is complete. You can run 'npm run dev' later to start the frontend."
fi

