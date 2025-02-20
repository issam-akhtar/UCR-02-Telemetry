#!/bin/bash
set -e

echo "Starting frontend setup..."

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js is already installed."
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo "npm not found. Installing npm..."
    sudo apt-get install -y npm
else
    echo "npm is already installed."
fi

echo "Installing frontend dependencies..."
npm install

echo "Frontend setup complete."

# Prompt to run the frontend
read -p "Would you like to run the frontend now? [Y/n] " run_frontend
run_frontend=${run_frontend:-Y}  # Default to Y if no input

if [[ "$run_frontend" =~ ^[Yy]$ ]]; then
    echo "Starting the frontend..."
    npm run dev
else
    echo "Frontend setup is complete. You can run 'npm run dev' later to start the frontend."
fi

