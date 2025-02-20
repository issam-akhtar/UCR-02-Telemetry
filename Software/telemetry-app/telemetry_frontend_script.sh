#!/bin/bash
# Script to set up the telemetry frontend.
# It checks for Node.js and npm, installs dependencies, and optionally runs the frontend.

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

echo "=== Frontend Setup ==="

####################################
# Step 1: Check & Install Node.js
####################################
if ! command -v node &>/dev/null; then
    if ask_yes_no "Node.js not found. Would you like to install Node.js?"; then
        if ! command -v curl &>/dev/null; then
            error_exit "curl is required to install Node.js."
        fi
        curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash - || error_exit "Failed to run Node.js setup script."
        apt-get install -y nodejs || error_exit "Node.js installation failed."
    else
        error_exit "Node.js is required. Exiting."
    fi
else
    echo "Node.js is already installed."
fi

####################################
# Step 2: Check & Install npm
####################################
if ! command -v npm &>/dev/null; then
    if ask_yes_no "npm not found. Would you like to install npm?"; then
        apt-get install -y npm || error_exit "npm installation failed."
    else
        error_exit "npm is required. Exiting."
    fi
else
    echo "npm is already installed."
fi

####################################
# Step 3: Install Frontend Dependencies
####################################
if [ -f "package.json" ]; then
    echo "Installing frontend dependencies..."
    npm install || error_exit "Failed to install frontend dependencies."
else
    error_exit "package.json not found. Please run this script from the project root."
fi

####################################
# Step 4: Optionally Run the Frontend
####################################
if ask_yes_no "Would you like to run the frontend now?"; then
    echo "Starting the frontend..."
    npm run dev || error_exit "Failed to start the frontend."
else
    echo "Frontend setup complete. You can later run 'npm run dev' to start the frontend."
fi

echo "=== Frontend Setup Completed ==="

