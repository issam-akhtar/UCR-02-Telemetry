#!/bin/bash
# Automated Docker Installation Script for Raspberry Pi
# Installs:
#   1. Docker v28
#   2. Docker Compose v2.33
#
# Usage:
#   1. Run the script with root privileges (use sudo).
#   2. sudo ./docker_setup_script.sh
#
# After execution, Docker and Docker Compose should be installed and ready to use.

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

log_info "=== Installing Docker v28 and Docker Compose v2.33 ==="

####################################
# Step 1: Install Docker v28
####################################

log_info "Updating package lists..."
apt-get update -y || error_exit "Failed to update package lists."

log_info "Installing required dependencies..."
apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release software-properties-common || error_exit "Failed to install dependencies."

log_info "Adding Docker's official GPG key..."
curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg || error_exit "Failed to add Docker's GPG key."

log_info "Adding Docker repository..."
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

log_info "Updating package lists again..."
apt-get update -y || error_exit "Failed to update package lists."

log_info "Installing Docker v28..."
apt-get install -y docker-ce=5:28* docker-ce-cli=5:28* containerd.io || error_exit "Failed to install Docker v28."

log_info "Starting and enabling Docker service..."
systemctl enable --now docker || error_exit "Failed to start Docker service."

log_info "Verifying Docker installation..."
docker --version || error_exit "Docker installation verification failed."

####################################
# Step 2: Install Docker Compose v2.33
####################################

DOCKER_COMPOSE_VERSION="2.33.0"
COMPOSE_BINARY_PATH="/usr/local/bin/docker-compose"

# If the os is changed in the future, run 'uname -m' in the terminal and replace whatever comes up with 'aarch64' in the link below 

log_info "Downloading Docker Compose v$DOCKER_COMPOSE_VERSION..."
curl -L "https://github.com/docker/compose/releases/download/v$DOCKER_COMPOSE_VERSION/docker-compose-linux-aarch64" -o "$COMPOSE_BINARY_PATH" || error_exit "Failed to download Docker Compose."

log_info "Setting executable permissions for Docker Compose..."
chmod +x "$COMPOSE_BINARY_PATH" || error_exit "Failed to set permissions for Docker Compose."

log_info "Verifying Docker Compose installation..."
docker compose --version || error_exit "Docker Compose installation verification failed."

####################################
# Final Setup and Instructions
####################################

log_info "Adding current user to the Docker group to allow non-root usage..."
usermod -aG docker $USER || log_warn "Failed to add user to Docker group. You may need to run 'sudo usermod -aG docker $USER' manually and re-login."

log_info "=== Docker and Docker Compose installation complete! ==="
echo -e "${GREEN}[INFO] Docker version: $(docker --version)${NC}"
echo -e "${GREEN}[INFO] Docker Compose version: $(docker compose --version)${NC}"
echo -e "${GREEN}[INFO] You may need to restart for the Docker changes to take effect.${NC}"
