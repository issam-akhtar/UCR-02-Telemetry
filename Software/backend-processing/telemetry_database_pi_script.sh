#!/bin/bash
# Automated Telemetry Backend Database Setup Script for Debian GNU/Linux 12 on Raspberry Pi 5
#
# This script automatically:
#   1. Installs dependencies (yq, PostgreSQL, TimescaleDB) if missing.
#   2. Extracts the database connection string from configs/config.yaml.
#   3. Parses the connection string to extract username, password, host, port, and database name.
#   4. Ensures PostgreSQL is installed.
#   5. Installs the appropriate TimescaleDB package.
#   6. Runs timescaledb-tune to optimize PostgreSQL configuration.
#   7. Starts PostgreSQL and sets the 'postgres' user password if applicable.
#   8. Checks if the target database exists.
#         - If it does not exist, the database is created.
#         - If it exists, the user is prompted:
#             Press Y to connect to the existing test database (with data), or
#             Press N to drop it and create a new empty database.
#   9. If a new database is created, the SQL schema from db/telem_data.sql is loaded.
#  10. Automatically connects to the target database via psql.
#
# Run as root.
set -euo pipefail

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'  # No Color

# Logging functions
log_info()   { echo -e "${GREEN}[INFO] $1${NC}"; }
log_warn()   { echo -e "${YELLOW}[WARN] $1${NC}"; }
error_exit() { echo -e "${RED}[ERROR] $1${NC}"; exit 1; }

# Ensure the script is run as root.
if [ "$EUID" -ne 0 ]; then
    error_exit "Please run as root or use sudo."
fi

log_info "=== Telemetry Backend Database Setup Starting ==="

####################################
# Step 1: Ensure yq is Installed
####################################
if ! command -v yq &>/dev/null; then
    log_info "yq not found. Installing yq..."
    ARCH=$(uname -m)
    if [[ "$ARCH" == "x86_64" ]]; then
        YQ_BINARY="yq_linux_amd64"
    elif [[ "$ARCH" == "aarch64" ]]; then
        YQ_BINARY="yq_linux_arm64"
    else
        error_exit "Unsupported architecture: $ARCH"
    fi
    wget -q "https://github.com/mikefarah/yq/releases/download/v4.30.5/${YQ_BINARY}" -O /usr/local/bin/yq || error_exit "Failed to download yq."
    chmod +x /usr/local/bin/yq || error_exit "Failed to set executable permission on yq."
else
    log_info "yq is already installed."
fi

####################################
# Step 2: Extract DB Connection Info
####################################
CONFIG_FILE="../backend-processing/configs/config.yaml"
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
# Step 4: Ensure PostgreSQL is Installed
####################################
if ! command -v psql &>/dev/null; then
    log_info "psql not found. Installing PostgreSQL..."
    apt-get update && apt-get install -y postgresql postgresql-contrib || error_exit "Failed to install PostgreSQL."
else
    log_info "psql is already installed."
fi

####################################
# Step 5: Determine PostgreSQL Version & Install TimescaleDB
####################################
PG_VERSION_FULL=$(psql --version | awk '{print $3}') || error_exit "Could not determine PostgreSQL version."
PG_MAJOR=$(echo "$PG_VERSION_FULL" | cut -d. -f1)
log_info "Detected PostgreSQL version: $PG_VERSION_FULL (Major: $PG_MAJOR)"
PKG_NAME="timescaledb-2-postgresql-$PG_MAJOR"
if dpkg -l | grep -qw "$PKG_NAME"; then
    log_info "TimescaleDB package $PKG_NAME is already installed."
else
    log_info "Installing TimescaleDB package $PKG_NAME..."
    if [ ! -f /etc/apt/sources.list.d/timescaledb.list ]; then
        apt-get update && apt-get install -y lsb-release apt-transport-https || error_exit "Failed to install prerequisites."
        OS_CODENAME=$(lsb_release -cs)
        log_info "Adding TimescaleDB repository for Debian $OS_CODENAME..."
        echo "deb https://packagecloud.io/timescale/timescaledb/debian/ $OS_CODENAME main" > /etc/apt/sources.list.d/timescaledb.list || error_exit "Failed to add TimescaleDB repository."
        wget -qO- https://packagecloud.io/timescale/timescaledb/gpgkey | apt-key add - || error_exit "Failed to add TimescaleDB GPG key."
        apt-get update || error_exit "Failed to update apt repositories."
    fi
    apt-get install -y "$PKG_NAME" || error_exit "TimescaleDB installation failed."
fi

####################################
# Step 6: Run TimescaleDB Tuning
####################################
if command -v timescaledb-tune &>/dev/null; then
    log_info "Running timescaledb-tune..."
    timescaledb-tune --quiet --yes || log_warn "timescaledb-tune encountered issues."
else
    log_warn "timescaledb-tune not found. Skipping tuning."
fi

####################################
# Step 7: Start PostgreSQL Service
####################################
log_info "Starting PostgreSQL service..."
systemctl start postgresql || error_exit "Failed to start PostgreSQL service."

####################################
# Step 8: Set 'postgres' User Password (if applicable)
####################################
if [ "$USERNAME" == "postgres" ]; then
    log_info "Updating 'postgres' user password..."
    su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD '$PASSWORD';\"" || error_exit "Failed to update postgres user password."
fi

####################################
# Step 9: Check and/or (Re)Create Database Based on User Input
####################################
log_info "Checking if database '$DB_NAME' exists..."
DB_EXISTS=$(PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | tr -d '[:space:]') || true

if [ "$DB_EXISTS" != "1" ]; then
    log_info "Database '$DB_NAME' does not exist. Creating it..."
    PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" || error_exit "Failed to create database '$DB_NAME'."
    RESET_DATABASE=1
else
    log_info "Database '$DB_NAME' already exists."
    read -p "The test database '$DB_NAME' already exists with data. Press Y to connect to it, or N to delete it and create a new empty database: " choice
    if [[ "$choice" =~ ^[Yy]$ ]]; then
         log_info "User chose to connect to the existing test database."
         RESET_DATABASE=0
    elif [[ "$choice" =~ ^[Nn]$ ]]; then
         log_info "User chose to drop the existing test database and create a new one."
         PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d postgres -c "DROP DATABASE \"$DB_NAME\";" || error_exit "Failed to drop database '$DB_NAME'."
         PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" || error_exit "Failed to create database '$DB_NAME'."
         RESET_DATABASE=1
    else
         log_warn "Invalid choice. Defaulting to connecting to the existing test database."
         RESET_DATABASE=0
    fi
fi

####################################
# Step 10: Load SQL Schema if Needed
####################################
if [ "$RESET_DATABASE" -eq 1 ]; then
    log_info "Loading SQL schema from 'db/telem_data.sql' to create empty tables..."
    SQL_FILE="db/telem_data.sql"
    if [ ! -f "$SQL_FILE" ]; then
        error_exit "SQL file '$SQL_FILE' not found."
    fi
    # Load the TimescaleDB extension first.
    PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || error_exit "Failed to load TimescaleDB extension."
    PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME" -f "$SQL_FILE" || error_exit "Failed to load SQL schema."
else
    log_info "Skipping SQL schema load. Connecting to existing test database with data."
fi

####################################
# Final Step: Automatically Connect to psql
####################################
log_info "Setup complete. Connecting to psql for database '$DB_NAME'..."
exec env PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME"
