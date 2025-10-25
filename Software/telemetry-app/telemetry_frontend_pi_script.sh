#!/usr/bin/env bash
# Hardened Frontend Setup for Debian 12 (bookworm) on Raspberry Pi 5 (ARM64)
# - Installs Node.js (default 20.x LTS) via NodeSource
# - Ensures build tools for native modules
# - Installs deps with npm (uses npm ci if lockfile exists)
# - Runs "npm run dev" (optionally inside tmux with -d)

set -Eeuo pipefail

# -------- Config --------
: "${NODE_MAJOR:=20}"      # Change to 22 if you prefer Node 22 LTS: NODE_MAJOR=22 ./script.sh
DETACH=false               # set to true with -d flag

# -------- Colors & logging --------
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log_info(){ echo -e "${GREEN}[INFO] $*${NC}"; }
log_warn(){ echo -e "${YELLOW}[WARN] $*${NC}"; }
log_err(){  echo -e "${RED}[ERROR] $*${NC}"; }
die(){ log_err "$*"; exit 1; }

usage() {
  cat <<EOF
Usage: $0 [-d]
  -d   Run "npm run dev" inside a tmux session ("frontend-dev") and detach
       (good for keeping the server alive after the script exits)
Environment:
  NODE_MAJOR   Node.js major version to install via NodeSource (default: 20)
EOF
}

while getopts ":dh" opt; do
  case "$opt" in
    d) DETACH=true ;;
    h|\?) usage; exit 0 ;;
  esac
done

log_info "=== Frontend Setup (Debian 12 on Raspberry Pi 5) ==="
log_info "Requested Node.js major: ${NODE_MAJOR}"
if [[ "$(uname -m)" != "aarch64" ]]; then
  log_warn "This device isn't reporting aarch64. Detected: $(uname -m). Continuing anyway."
fi

# -------- Pre-flight checks --------
command -v sudo >/dev/null 2>&1 || die "sudo not found. Install it first: su -c 'apt-get update && apt-get install -y sudo'"

if ! ping -c1 -W2 deb.debian.org >/dev/null 2>&1; then
  log_warn "Network check failed for deb.debian.org. Proceeding, but apt operations may fail."
fi

# Ensure we're in a Node project
[[ -f package.json ]] || die "No package.json in current directory. Run this from your project's root."

# Validate "dev" script exists
if ! jq -r '.scripts.dev // empty' package.json >/dev/null 2>&1; then
  # fallback without jq: quick grep
  if ! grep -q '"dev"\s*:' package.json; then
    die 'package.json has no "dev" script. Add one (e.g., "dev": "vite", "dev": "next dev", etc.).'
  fi
fi

# -------- Base packages --------
log_info "Installing base tools (curl, ca-certificates, build essentials)..."
sudo apt-get update -y
sudo apt-get install -y curl ca-certificates gnupg \
  build-essential python3 make g++ pkg-config jq || die "Failed to install base tools."

# -------- Node.js via NodeSource (bookworm) --------
install_nodesource_repo() {
  local keyring="/etc/apt/keyrings/nodesource.gpg"
  local repo="deb [signed-by=${keyring}] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main"

  # Many guides use a nodistro repo now, which NodeSource resolves appropriately.
  sudo mkdir -p /etc/apt/keyrings
  curl -fsSL "https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key" | sudo gpg --dearmor -o "${keyring}"
  echo "${repo}" | sudo tee /etc/apt/sources.list.d/nodesource.list >/dev/null
  sudo apt-get update -y
}

need_node_install=true
if command -v node >/dev/null 2>&1; then
  CURRENT="$(node -v | sed 's/^v//')"
  MAJOR="${CURRENT%%.*}"
  if [[ "${MAJOR}" =~ ^[0-9]+$ ]] && (( MAJOR >= NODE_MAJOR )); then
    need_node_install=false
    log_info "Node.js v${CURRENT} already satisfies >= ${NODE_MAJOR}.x"
  else
    log_warn "Node.js v${CURRENT} < ${NODE_MAJOR}.x; upgrading..."
  fi
else
  log_info "Node.js not found; installing Node ${NODE_MAJOR}.x..."
fi

if $need_node_install; then
  install_nodesource_repo
  sudo apt-get install -y nodejs || die "Failed to install Node.js ${NODE_MAJOR}.x"
fi

# Confirm node & npm
command -v node >/dev/null 2>&1 || die "Node.js not available after install."
command -v npm  >/dev/null 2>&1 || die "npm not available after install."

log_info "Node: $(node -v)"
log_info "npm:  $(npm -v)"

# -------- Install project deps --------
if [[ -f package-lock.json ]]; then
  log_info "Found package-lock.json ? using 'npm ci' for a clean, reproducible install..."
  npm ci --legacy-peer-deps|| die "npm ci failed. Try deleting node_modules and re-running."
else
  log_info "No package-lock.json ? using 'npm install'..."
  npm install --legacy-peer-deps || die "npm install failed. Check error logs above."
fi

# -------- Run the dev server --------
if $DETACH; then
  if ! command -v tmux >/dev/null 2>&1; then
    log_info "Installing tmux to run in background..."
    sudo apt-get install -y tmux || die "Failed to install tmux."
  fi
  SESSION="frontend-dev"
  log_info "Starting 'npm run dev' inside tmux session '${SESSION}'..."
  # Kill old session if it exists
  tmux has-session -t "${SESSION}" 2>/dev/null && tmux kill-session -t "${SESSION}"
  tmux new-session -d -s "${SESSION}" "npm run dev"
  log_info "Dev server started in tmux. Attach with: tmux attach -t ${SESSION}"
else
  log_info "Starting the frontend in the foreground with 'npm run dev'..."
  npm run dev || die "'npm run dev' exited with an error."
fi

