#!/bin/bash
# Improved interactive script to set up the telemetry backend database with PostgreSQL and TimescaleDB.
# Reads the connection string from configs/config.yaml and applies the necessary configuration.
# Run as root.

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
    if [[ "$answer" =~ ^[Yy] ]] || [ -z "$answer" ]; then
        return 0
    else
        return 1
    fi
}

# Ensure the script is run as root.
if [ "$EUID" -ne 0 ]; then
    error_exit "Please run as root or use sudo."
fi

log_info "=== Telemetry Backend Database Setup ==="

#############################
# Helper: Install a Command
#############################
install_if_missing() {
    local cmd=$1
    local install_cmd=$2
    if ! command -v "$cmd" &>/dev/null; then
        if ask_yes_no "$cmd not found. Do you want to install $cmd?"; then
            log_info "Installing $cmd..."
            eval "$install_cmd" || error_exit "Installation of $cmd failed."
        else
            error_exit "$cmd is required. Exiting."
        fi
    else
        log_info "$cmd is already installed."
    fi
}

####################################
# Step 1: Install yq if Missing
####################################
install_if_missing "yq" 'wget -q "https://github.com/mikefarah/yq/releases/download/v4.30.5/yq_linux_amd64" -O /usr/local/bin/yq && chmod +x /usr/local/bin/yq'

####################################
# Step 2: Extract DB Connection Info
####################################
CONFIG_FILE="configs/config.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    error_exit "Configuration file '$CONFIG_FILE' not found."
fi

DB_CONN=$(yq e '.database.connection_string' "$CONFIG_FILE")
if [ -z "$DB_CONN" ]; then
    error_exit "Database connection string not found in '$CONFIG_FILE'."
fi
log_info "Extracted connection string: $DB_CONN"

####################################
# Step 3: Parse Connection String
####################################
# Expected format: postgres://username:password@host:port/database?sslmode=disable
decode_url() {
    python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$1"
}

parse_connection() {
    local conn=$1
    local no_proto="${conn#postgres://}"
    USERNAME="${no_proto%%:*}"
    local rest="${no_proto#*:}"
    local pass_enc="${rest%%@*}"
    PASSWORD=$(decode_url "$pass_enc")
    rest="${rest#*@}"
    local host_port="${rest%%/*}"
    HOST="${host_port%%:*}"
    PORT="${host_port#*:}"
    local db_raw="${rest#*/}"
    DB_NAME="${db_raw%%\?*}"
}

parse_connection "$DB_CONN"

log_info "Parsed connection details:"
echo "  Username: $USERNAME"
echo "  Password: [hidden]"
echo "  Host: $HOST"
echo "  Port: $PORT"
echo "  Database: $DB_NAME"

####################################
# Step 4: Install PostgreSQL if Missing
####################################
install_if_missing "psql" 'apt-get update && apt-get install -y postgresql postgresql-contrib'

####################################
# Step 5: Get PostgreSQL Version
####################################
PG_VERSION_FULL=$(psql --version | awk '{print $3}') || error_exit "Could not determine PostgreSQL version."
PG_MAJOR=$(echo "$PG_VERSION_FULL" | cut -d. -f1)
log_info "Detected PostgreSQL version: $PG_VERSION_FULL (Major: $PG_MAJOR)"

####################################
# Step 6: Install TimescaleDB if Missing
####################################
PKG_NAME="timescaledb-2-postgresql-$PG_MAJOR"
if dpkg -l | grep -qw "$PKG_NAME"; then
    log_info "TimescaleDB package $PKG_NAME is already installed."
else
    if ask_yes_no "TimescaleDB package $PKG_NAME not found. Do you want to install TimescaleDB?"; then
        log_info "Installing TimescaleDB package $PKG_NAME..."
        if [ ! -f /etc/apt/sources.list.d/timescaledb.list ]; then
            install_if_missing "lsb_release" "apt-get update && apt-get install -y lsb-release"
            OS_CODENAME=$(lsb_release -cs)
            log_info "Adding TimescaleDB repository for Ubuntu $OS_CODENAME..."
            echo "deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $OS_CODENAME main" | tee /etc/apt/sources.list.d/timescaledb.list
            wget -qO- https://packagecloud.io/timescale/timescaledb/gpgkey | apt-key add - || error_exit "Failed to add TimescaleDB GPG key."
            apt-get update || error_exit "Failed to update apt repositories."
        fi
        apt-get install -y "$PKG_NAME" || error_exit "TimescaleDB installation failed."
    else
        error_exit "TimescaleDB is required for telemetry. Exiting."
    fi
fi

####################################
# Step 7: Run TimescaleDB Tuning (Optional)
####################################
if ask_yes_no "Do you want to run timescaledb-tune? (This may modify PostgreSQL configuration)"; then
    if command -v timescaledb-tune &>/dev/null; then
        log_info "Running timescaledb-tune..."
        timescaledb-tune --quiet --yes || log_warn "timescaledb-tune encountered issues."
    else
        log_warn "timescaledb-tune not found. Please run it manually if needed."
    fi
else
    log_info "Skipping timescaledb-tune."
fi

####################################
# Step 8: Start PostgreSQL Service
####################################
log_info "Starting PostgreSQL service..."
systemctl start postgresql || error_exit "Failed to start PostgreSQL service."

####################################
# Step 9: Set postgres User Password (Optional)
####################################
if ask_yes_no "Do you want to set the 'postgres' user password as specified in the config?"; then
    log_info "Setting 'postgres' user password..."
    su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD '$PASSWORD';\"" || error_exit "Failed to update postgres user password."
else
    log_info "Skipping update of postgres user password."
fi

####################################
# Step 10: Create Database if It Does Not Exist
####################################
log_info "Checking for database '$DB_NAME'..."
DB_EXISTS=$(PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | tr -d '[:space:]') || true
if [ "$DB_EXISTS" != "1" ]; then
    if ask_yes_no "Database '$DB_NAME' does not exist. Create it?"; then
        log_info "Creating database '$DB_NAME'..."
        PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" || error_exit "Failed to create database '$DB_NAME'."
        log_info "Database '$DB_NAME' created."
    else
        error_exit "Database '$DB_NAME' is required. Exiting."
    fi
else
    log_info "Database '$DB_NAME' already exists."
fi

####################################
# Step 11: Load TimescaleDB Extension & SQL Schema
####################################
log_info "Loading TimescaleDB extension into database '$DB_NAME'..."
PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || error_exit "Failed to load TimescaleDB extension."

SQL_FILE="db/telem_data.sql"
if [ ! -f "$SQL_FILE" ]; then
    error_exit "SQL file '$SQL_FILE' not found."
fi

if ask_yes_no "Load SQL schema from $SQL_FILE into database '$DB_NAME'?"; then
    log_info "Loading SQL schema..."
    PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME" -f "$SQL_FILE" || error_exit "Failed to load SQL schema."
else
    log_info "Skipping SQL schema load."
fi

####################################
# Final Step: Option to Connect to psql
####################################
if ask_yes_no "Do you want to connect to psql for database '$DB_NAME'?"; then
    log_info "Connecting to psql..."
    PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME"
else
    log_info "Setup complete. Exiting."
fi

log_info "=== Telemetry Backend Database Setup Completed Successfully ==="

