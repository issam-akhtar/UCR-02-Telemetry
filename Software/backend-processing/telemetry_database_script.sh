#!/bin/bash
# Automated Telemetry Backend Database Setup Script with TimescaleDB Tuning and Database Reset Option
# This script:
#   1. Installs yq (if missing) to parse the YAML config.
#   2. Reads the database connection string from configs/config.yaml.
#   3. Parses the connection string to extract username, password, host, port, and database name.
#   4. Installs PostgreSQL 16 and the TimescaleDB package for PG16 if they are not already installed.
#   5. Configures TimescaleDB (ensuring it’s added to shared_preload_libraries) and restarts PostgreSQL.
#   6. Runs timescaledb-tune to optimize PostgreSQL configuration.
#   7. If the connection user is "postgres", automatically sets the postgres user's password.
#   8. Checks if the target database exists.
#         - If it does not exist, it is created and the SQL schema is applied.
#         - If it exists, the user is prompted:
#              Press Y to connect to the existing test database (with data), or
#              Press N to drop and recreate the database with empty tables.
#   9. Automatically logs into the target database via psql.
#
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

# Ensure the script is run as root.
if [ "$EUID" -ne 0 ]; then
    error_exit "Please run as root or use sudo."
fi

log_info "=== Telemetry Backend Database Setup Starting ==="

###############################################
# Step 1: Ensure yq is Installed (for YAML parsing)
###############################################
if ! command -v yq &>/dev/null; then
    log_info "yq not found. Installing yq..."
    wget -q "https://github.com/mikefarah/yq/releases/download/v4.30.5/yq_linux_amd64" -O /usr/local/bin/yq || error_exit "Failed to download yq."
    chmod +x /usr/local/bin/yq || error_exit "Failed to set executable permission on yq."
else
    log_info "yq is already installed."
fi

###############################################
# Step 2: Extract DB Connection Info from Config
###############################################
CONFIG_FILE="configs/config.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    error_exit "Configuration file '$CONFIG_FILE' not found."
fi

# Extract the connection string using yq.
DB_CONN=$(yq e '.database.connection_string' "$CONFIG_FILE")
if [ -z "$DB_CONN" ]; then
    error_exit "Database connection string not found in '$CONFIG_FILE'."
fi
log_info "Extracted connection string: $DB_CONN"

###############################################
# Step 3: Parse Connection String
###############################################
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

###############################################
# Step 4: Ensure PostgreSQL 16 is Installed
###############################################
if command -v psql &>/dev/null; then
    PG_VERSION_FULL=$(psql --version | awk '{print $3}') || error_exit "Could not determine PostgreSQL version."
    if [[ $PG_VERSION_FULL != 16* ]]; then
        log_warn "Detected PostgreSQL version $PG_VERSION_FULL. PostgreSQL 16 is required. Installing PostgreSQL 16..."
        apt-get update && apt-get install -y postgresql-16 postgresql-contrib || error_exit "Failed to install PostgreSQL 16."
    else
        log_info "PostgreSQL 16 is already installed."
    fi
else
    log_info "PostgreSQL not found. Installing PostgreSQL 16..."
    apt-get update && apt-get install -y postgresql-16 postgresql-contrib || error_exit "Failed to install PostgreSQL 16."
fi

###############################################
# Step 5: Ensure TimescaleDB is Installed for PostgreSQL 16
###############################################
PKG_NAME="timescaledb-2-postgresql-16"
if dpkg -l | grep -qw "$PKG_NAME"; then
    log_info "TimescaleDB package $PKG_NAME is already installed."
else
    log_info "TimescaleDB package $PKG_NAME not found. Installing TimescaleDB..."
    if [ ! -f /etc/apt/sources.list.d/timescaledb.list ]; then
        apt-get update && apt-get install -y lsb-release || error_exit "Failed to install lsb-release."
        OS_CODENAME=$(lsb_release -cs)
        log_info "Adding TimescaleDB repository for Ubuntu $OS_CODENAME..."
        echo "deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $OS_CODENAME main" > /etc/apt/sources.list.d/timescaledb.list || error_exit "Failed to add TimescaleDB repository."
        wget -qO- https://packagecloud.io/timescale/timescaledb/gpgkey | apt-key add - || error_exit "Failed to add TimescaleDB GPG key."
        apt-get update || error_exit "Failed to update apt repositories."
    fi
    apt-get install -y "$PKG_NAME" || error_exit "TimescaleDB installation failed."
fi

###############################################
# Step 6: Configure TimescaleDB in PostgreSQL
###############################################
PG_CONF="/etc/postgresql/16/main/postgresql.conf"
if [ ! -f "$PG_CONF" ]; then
    error_exit "PostgreSQL configuration file '$PG_CONF' not found."
fi

if grep -E '^[^#]*shared_preload_libraries' "$PG_CONF" | grep -q 'timescaledb'; then
    log_info "TimescaleDB is already configured in PostgreSQL."
else
    log_info "Configuring TimescaleDB in PostgreSQL configuration..."
    if grep -q "^#shared_preload_libraries" "$PG_CONF"; then
        sed -i "s/^#shared_preload_libraries.*/shared_preload_libraries = 'timescaledb'/" "$PG_CONF" || error_exit "Failed to configure shared_preload_libraries."
    elif grep -q "^shared_preload_libraries" "$PG_CONF"; then
        sed -i "s/^\(shared_preload_libraries *= *\)'\(.*\)'/\1'\2, timescaledb'/" "$PG_CONF" || error_exit "Failed to append timescaledb to shared_preload_libraries."
    else
        echo "shared_preload_libraries = 'timescaledb'" >> "$PG_CONF" || error_exit "Failed to add shared_preload_libraries configuration."
    fi
    log_info "Restarting PostgreSQL to apply TimescaleDB configuration..."
    systemctl restart postgresql || error_exit "Failed to restart PostgreSQL after configuration."
fi

###############################################
# Step 7: Run TimescaleDB Tuning
###############################################
if command -v timescaledb-tune &>/dev/null; then
    log_info "Running timescaledb-tune..."
    timescaledb-tune --quiet --yes || log_warn "timescaledb-tune encountered issues."
else
    log_warn "timescaledb-tune not found. Skipping tuning."
fi

###############################################
# Step 8: Start PostgreSQL Service
###############################################
log_info "Starting PostgreSQL service..."
systemctl start postgresql || error_exit "Failed to start PostgreSQL service."

###############################################
# Step 9: Set postgres User Password (if applicable)
###############################################
if [ "$USERNAME" == "postgres" ]; then
    log_info "Updating 'postgres' user password as per config..."
    su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD '$PASSWORD';\"" || error_exit "Failed to update postgres user password."
fi

###############################################
# Step 10: Check and/or (Re)Create Database Based on User Input
###############################################
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

###############################################
# Step 11: Import SQL Schema if Needed
###############################################
if [ "$RESET_DATABASE" -eq 1 ]; then
    log_info "Importing SQL schema from 'db/telem_data.sql' to create empty tables..."
    SQL_FILE="db/telem_data.sql"
    if [ ! -f "$SQL_FILE" ]; then
        error_exit "SQL file '$SQL_FILE' not found."
    fi
    log_info "Loading TimescaleDB extension into database '$DB_NAME'..."
    PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || error_exit "Failed to load TimescaleDB extension."
    PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME" -f "$SQL_FILE" || error_exit "Failed to load SQL schema."
else
    log_info "Skipping SQL schema import. Connecting to the existing test database with data."
fi

###############################################
# Step 12: Automatically Log into the Database
###############################################
log_info "Setup complete. Automatically connecting to the database '$DB_NAME'..."
PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME"
