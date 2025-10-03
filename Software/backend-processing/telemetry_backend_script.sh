#!/bin/bash
# Automated Backend Processing Environment Setup Script (Go + zsh-safe)
set -euo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log_info(){ echo -e "${GREEN}[INFO] $1${NC}"; }
log_warn(){ echo -e "${YELLOW}[WARN] $1${NC}"; }
error_exit(){ echo -e "${RED}[ERROR] $1${NC}"; exit 1; }

log_info "=== Setting up Backend Processing Environment ==="

# Identify invoking (non-root) user for shell dotfiles
ORIG_USER="${SUDO_USER:-$USER}"
USER_HOME="$(getent passwd "$ORIG_USER" | cut -d: -f6 || echo "$HOME")"

####################################
# Step 1: Go 1.24.0 install (global)
####################################
GO_VER="go1.24.0"
GO_TGZ="${GO_VER}.linux-amd64.tar.gz"
GO_URL="https://go.dev/dl/${GO_TGZ}"

log_info "Installing ${GO_VER}…"
rm -rf /usr/local/go
curl -fsSL "$GO_URL" -o "/tmp/${GO_TGZ}" || error_exit "Failed to download ${GO_TGZ}"
tar -C /usr/local -xzf "/tmp/${GO_TGZ}" || error_exit "Failed to extract Go"
rm -f "/tmp/${GO_TGZ}"

# Make Go visible to all shells via profile.d
log_info "Configuring PATH for all users…"
cat >/etc/profile.d/golang.sh <<'EOF'
# Golang global path
export GOROOT=/usr/local/go
export GOPATH="${HOME}/go"
export PATH="$PATH:/usr/local/go/bin:${GOPATH}/bin"
EOF
chmod 644 /etc/profile.d/golang.sh

# Also ensure /usr/local/bin/go exists (commonly in PATH already)
ln -sf /usr/local/go/bin/go /usr/local/bin/go

# Update the invoking zsh user configs so zsh picks it up immediately on next shell
for f in ".zshrc" ".zprofile"; do
  TARGET="${USER_HOME}/${f}"
  if ! grep -qs '/usr/local/go/bin' "$TARGET" 2>/dev/null; then
    mkdir -p "$(dirname "$TARGET")"
    echo 'export GOROOT=/usr/local/go'           | tee -a "$TARGET" >/dev/null
    echo 'export GOPATH="$HOME/go"'              | tee -a "$TARGET" >/dev/null
    echo 'export PATH="$PATH:/usr/local/go/bin:$GOPATH/bin"' | tee -a "$TARGET" >/dev/null
    chown "$ORIG_USER":"$ORIG_USER" "$TARGET" || true
  fi
done

# Make Go available in *this* script’s environment too
export GOROOT=/usr/local/go
export GOPATH="${USER_HOME}/go"
export PATH="$PATH:/usr/local/go/bin:${GOPATH}/bin"

# Verify
log_info "Go installed: $(go version)"

####################################
# Step 2: Ensure yq
####################################
if ! command -v yq &>/dev/null; then
  log_info "Installing yq…"
  curl -fsSL "https://github.com/mikefarah/yq/releases/download/v4.30.5/yq_linux_amd64" -o /usr/local/bin/yq
  chmod +x /usr/local/bin/yq
else
  log_info "yq already present: $(yq --version)"
fi

####################################
# Step 3: Ensure pg_isready (PostgreSQL client)
####################################
if ! command -v pg_isready &>/dev/null; then
  log_info "Installing PostgreSQL client utilities…"
  apt-get update && apt-get install -y postgresql-client
else
  log_info "pg_isready is present."
fi

####################################
# Step 4: Read DB config & check readiness
####################################
CONFIG_FILE="configs/config.yaml"
[[ -f "$CONFIG_FILE" ]] || error_exit "Missing $CONFIG_FILE"

DB_CONN="$(yq e '.database.connection_string' "$CONFIG_FILE")"
[[ -n "$DB_CONN" ]] || error_exit "Empty database.connection_string in config"

log_info "Extracted DB connection: $DB_CONN"

conn_no_proto="${DB_CONN#postgres://}"
host_port="${conn_no_proto#*@}"; host_port="${host_port%%/*}"
HOST="${host_port%%:*}"; PORT="${host_port#*:}"
[[ -n "$HOST" && -n "$PORT" ]] || error_exit "Failed to parse host/port"

log_info "Checking DB readiness on $HOST:$PORT…"
pg_isready -h "$HOST" -p "$PORT" >/dev/null || error_exit "DB not accepting connections"

####################################
# Step 5: Go modules download
####################################
log_info "Downloading Go module dependencies…"
go mod download

####################################
# Final instructions
####################################
log_info "=== Setup complete! ==="
echo -e "${GREEN}Run sender:  go run simulate_sender.go${NC}"
echo -e "${GREEN}Run receiver: go run main.go${NC}"
echo -e "${YELLOW}If zsh still doesn't see 'go', open a new terminal or run: 'exec zsh' or 'source ~/.zshrc'.${NC}"
