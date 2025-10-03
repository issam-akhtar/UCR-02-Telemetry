#!/usr/bin/env bash
# Automated Backend Processing Environment Setup (Debian 12 / Raspberry Pi 5)
# - Installs Go from official tarball to /usr/local/go and makes it globally available
# - Installs yq and PostgreSQL client (pg_isready) if missing
# - Reads DB connection from configs/config.yaml (or ../backend-processing/configs/config.yaml)
# - Verifies DB readiness and downloads Go module deps
#
# Usage:
#   sudo ./setup_backend.sh
#
set -Eeuo pipefail

############################
# Config (override via env)
############################
: "${GO_VERSION:=1.24.0}"       # desired Go version (just digits, e.g., 1.24.0)
: "${YQ_VERSION:=v4.43.1}"      # stable yq release

############################
# Colors / logging
############################
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log_info(){ echo -e "${GREEN}[INFO] $*${NC}"; }
log_warn(){ echo -e "${YELLOW}[WARN] $*${NC}"; }
log_err(){  echo -e "${RED}[ERROR] $*${NC}"; }
die(){ log_err "$*"; exit 1; }

############################
# Root / sudo handling
############################
SUDO=""
if [[ $EUID -ne 0 ]]; then
  if command -v sudo >/dev/null 2>&1; then
    SUDO="sudo"
  else
    die "Please run as root or install sudo."
  fi
fi

log_info "=== Setting up Backend Processing Environment ==="

############################
# Helpers
############################
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"; }
arch_go() {
  # Map uname -m to Go's arch names
  case "$(uname -m)" in
    aarch64|arm64) echo "arm64" ;;
    x86_64|amd64)  echo "amd64" ;;
    armv7l|armv6l) echo "armv6l" ;;  # uncommon for Pi 5, but included
    *) die "Unsupported architecture: $(uname -m)" ;;
  esac
}
refresh_path() {
  hash -r || true
  export PATH="/usr/local/go/bin:${PATH}"
}

############################
# Base tools
############################
log_info "Installing base tools (curl, wget, tar, ca-certificates)..."
$SUDO apt-get update -y
$SUDO apt-get install -y curl wget tar ca-certificates gnupg >/dev/null

############################
# Install/Upgrade Go
############################
GO_ARCH="$(arch_go)"
GO_TARBALL="go${GO_VERSION}.linux-${GO_ARCH}.tar.gz"
GO_URL="https://go.dev/dl/${GO_TARBALL}"

install_go() {
  local tmp="/tmp/${GO_TARBALL}"
  log_info "Downloading Go ${GO_VERSION} for ${GO_ARCH}..."
  # Verify URL first; helpful if version doesn't exist
  if ! curl -fsI "$GO_URL" >/dev/null 2>&1; then
    die "Go ${GO_VERSION} not found at ${GO_URL}. Set GO_VERSION to an available release."
  fi
  curl -fsSL "$GO_URL" -o "$tmp" || die "Failed to download Go tarball."
  log_info "Removing any existing /usr/local/go ..."
  $SUDO rm -rf /usr/local/go
  log_info "Extracting to /usr/local ..."
  $SUDO tar -C /usr/local -xzf "$tmp"
  # Make globally visible via profile.d and a symlink for non-login shells
  if [[ ! -f /etc/profile.d/go.sh ]] || ! grep -q "/usr/local/go/bin" /etc/profile.d/go.sh; then
    echo 'export PATH=/usr/local/go/bin:$PATH' | $SUDO tee /etc/profile.d/go.sh >/dev/null
  fi
  # Create /usr/bin/go symlink for services/non-interactive shells
  if [[ ! -e /usr/bin/go ]]; then
    $SUDO ln -s /usr/local/go/bin/go /usr/bin/go || true
  fi
  refresh_path
  log_info "Installed $(go version)"
}

if command -v go >/dev/null 2>&1; then
  CURRENT="$(go version | awk '{print $3}' | sed 's/^go//')"
  if [[ "$CURRENT" != "$GO_VERSION" ]]; then
    log_warn "Go $CURRENT found, upgrading to $GO_VERSION ..."
    install_go
  else
    log_info "Go $GO_VERSION already installed."
    # still ensure global availability
    if [[ ! -f /etc/profile.d/go.sh ]]; then
      echo 'export PATH=/usr/local/go/bin:$PATH' | $SUDO tee /etc/profile.d/go.sh >/dev/null
    fi
    if [[ ! -e /usr/bin/go ]]; then
      $SUDO ln -s /usr/local/go/bin/go /usr/bin/go || true
    fi
    refresh_path
  fi
else
  log_info "Go not found; installing $GO_VERSION ..."
  install_go
fi

require_cmd go

############################
# Install yq
############################
if ! command -v yq >/dev/null 2>&1; then
  log_info "Installing yq ${YQ_VERSION} ..."
  $SUDO curl -fsSL "https://github.com/mikefarah/yq/releases/download/${YQ_VERSION}/yq_linux_${GO_ARCH}" \
    -o /usr/local/bin/yq || die "Failed to download yq."
  $SUDO chmod +x /usr/local/bin/yq
else
  log_info "yq already installed ($(yq --version))"
fi

############################
# Install pg_isready (postgresql-client)
############################
if ! command -v pg_isready >/dev/null 2>&1; then
  log_info "Installing PostgreSQL client utilities ..."
  $SUDO apt-get install -y postgresql-client >/dev/null || die "Failed to install postgresql-client."
else
  log_info "pg_isready is present."
fi

############################
# Locate config file
############################
CONFIG_CANDIDATES=(
  "configs/config.yaml"
  "../backend-processing/configs/config.yaml"
)
CONFIG_FILE=""
for c in "${CONFIG_CANDIDATES[@]}"; do
  if [[ -f "$c" ]]; then CONFIG_FILE="$c"; break; fi
done
[[ -n "$CONFIG_FILE" ]] || die "Could not find configs/config.yaml (checked: ${CONFIG_CANDIDATES[*]}). Run from your project root."

############################
# Extract DB connection & verify readiness
############################
log_info "Reading DB connection string from: $CONFIG_FILE"
DB_CONN="$(yq e '.database.connection_string' "$CONFIG_FILE")"
[[ -n "${DB_CONN}" && "${DB_CONN}" != "null" ]] || die "Database connection string missing in $CONFIG_FILE"

log_info "Extracted DB connection string: $DB_CONN"

# Parse host:port from postgres URL (supports user:pass@host:port/db)
conn_no_proto="${DB_CONN#postgres://}"
conn_no_proto="${conn_no_proto#postgresql://}"
if [[ "$conn_no_proto" == *"@"* ]]; then
  host_port="${conn_no_proto#*@}"
else
  host_port="$conn_no_proto"
fi
host_port="${host_port%%/*}"
HOST="${host_port%%:*}"
PORT="${host_port#*:}"

[[ -n "$HOST" && -n "$PORT" && "$HOST" != "$PORT" ]] || die "Failed to parse host or port from connection string."

log_info "Checking database readiness on ${HOST}:${PORT} ..."
if pg_isready -h "$HOST" -p "$PORT" >/dev/null 2>&1; then
  log_info "Database is accepting connections."
else
  die "Database is not accepting connections at ${HOST}:${PORT}."
fi

############################
# Download Go module deps
############################
# Decide project dir for 'go mod download'
BACKEND_DIRS=(
  "."                                # if you're already inside backend-processing
  "../backend-processing"            # common monorepo layout
)
TARGET_DIR=""
for d in "${BACKEND_DIRS[@]}"; do
  if [[ -f "${d}/go.mod" ]]; then TARGET_DIR="$d"; break; fi
done
[[ -n "$TARGET_DIR" ]] || die "Could not find go.mod (checked: ${BACKEND_DIRS[*]}). Run from backend root."

log_info "Downloading Go modules in: ${TARGET_DIR}"
pushd "$TARGET_DIR" >/dev/null
go env -w GOMODCACHE="${HOME}/go/pkg/mod" >/dev/null 2>&1 || true  # keeps cache in user home
go mod download
popd >/dev/null

############################
# Done
############################
log_info "=== Setup complete! ==="
echo -e "${GREEN}To run the sender:${NC} (from ${TARGET_DIR})  ${GREEN}go run simulate_sender.go${NC}"
echo -e "${GREEN}To run the receiver:${NC} (from ${TARGET_DIR}) ${GREEN}go run main.go${NC}"
echo -e "${YELLOW}Note:${NC} Go is installed system-wide at /usr/local/go."
echo -e "  - PATH is exported via ${GREEN}/etc/profile.d/go.sh${NC} and a ${GREEN}/usr/bin/go${NC} symlink is in place."
echo -e "  - New shells inherit PATH automatically; for the current shell, it's already loaded."
