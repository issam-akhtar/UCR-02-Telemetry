#!/bin/bash
# Script to set up the telemetry backend database with PostgreSQL and TimescaleDB.
# This version reads the database connection string from config.yaml, extracts
# the connection details (username, password, host, port, and database name),
# and uses them for creation, extension loading, and schema setup.
# At the end, it asks if you want to log into psql for the configured database.

# Ensure the script is run as root.
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root or use sudo."
    exit 1
fi

# Function to print error messages and exit.
function error_exit {
    echo "Error: $1"
    exit 1
}

echo "=== Telemetry Backend Database Setup ==="

# -------------------------------
# Step 1: Install and Verify yq
# -------------------------------
if ! command -v yq &>/dev/null; then
    echo "yq not found. Installing yq..."
    wget https://github.com/mikefarah/yq/releases/download/v4.30.5/yq_linux_amd64 -O /usr/local/bin/yq || error_exit "Failed to download yq."
    chmod +x /usr/local/bin/yq
else
    echo "yq is installed."
fi

# -------------------------------
# Step 2: Extract DB Connection Info
# -------------------------------
CONFIG_FILE="configs/config.yaml"
if [ ! -f "$CONFIG_FILE" ]; then
    error_exit "Configuration file $CONFIG_FILE not found."
fi

DB_CONN=$(yq e '.database.connection_string' "$CONFIG_FILE")
if [ -z "$DB_CONN" ]; then
    error_exit "Database connection string not found in $CONFIG_FILE."
fi
echo "Extracted connection string: $DB_CONN"

# -------------------------------
# Step 3: Parse Connection String
# -------------------------------
# Expected format: postgres://username:password@host:port/database?sslmode=disable

# Function to decode URL-encoded strings using python3
decode_url() {
    python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$1"
}

# Remove protocol prefix (e.g., "postgres://")
conn_no_proto="${DB_CONN#postgres://}"

# Extract username (up to the first colon)
USERNAME="${conn_no_proto%%:*}"

# Remove username and colon from the string
rest="${conn_no_proto#*:}"

# Extract password (up to the '@')
PASSWORD_ENC="${rest%%@*}"
# Decode password to handle URL encoding (e.g., %40 -> @)
PASSWORD=$(decode_url "$PASSWORD_ENC")

# Remove password and '@'
rest="${rest#*@}"

# Extract host and port (up to the first '/')
HOST_PORT="${rest%%/*}"
HOST="${HOST_PORT%%:*}"
PORT="${HOST_PORT#*:}"

# Extract database name from after the first '/' and before any '?'.
DB_NAME_RAW="${rest#*/}"
DB_NAME="${DB_NAME_RAW%%\?*}"

echo "Parsed connection details:"
echo "  Username: $USERNAME"
echo "  Password: [hidden]"
echo "  Host: $HOST"
echo "  Port: $PORT"
echo "  Database: $DB_NAME"

# -------------------------------
# Step 4: Check/Install PostgreSQL
# -------------------------------
if ! command -v psql &>/dev/null; then
    echo "[1/8] PostgreSQL not found. Installing PostgreSQL..."
    apt-get update && apt-get install -y postgresql postgresql-contrib || error_exit "PostgreSQL installation failed."
else
    echo "[1/8] PostgreSQL is already installed."
fi

# -------------------------------
# Step 5: Get PostgreSQL Version
# -------------------------------
PG_VERSION_FULL=$(psql --version | awk '{print $3}')
PG_MAJOR=$(echo "$PG_VERSION_FULL" | cut -d. -f1)
echo "[2/8] Detected PostgreSQL version: $PG_VERSION_FULL (Major: $PG_MAJOR)"

# -------------------------------
# Step 6: Check/Install TimescaleDB
# -------------------------------
PKG_NAME="timescaledb-2-postgresql-$PG_MAJOR"
if dpkg -l | grep -qw "$PKG_NAME"; then
    echo "[3/8] TimescaleDB package $PKG_NAME is already installed."
else
    echo "[3/8] TimescaleDB package $PKG_NAME not found. Installing TimescaleDB..."
    # Add TimescaleDB repository if not already added.
    if [ ! -f /etc/apt/sources.list.d/timescaledb.list ]; then
        OS_CODENAME=$(lsb_release -cs)
        echo "Adding TimescaleDB repository for Ubuntu $OS_CODENAME..."
        echo "deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $OS_CODENAME main" | tee /etc/apt/sources.list.d/timescaledb.list
        wget -qO- https://packagecloud.io/timescale/timescaledb/gpgkey | apt-key add -
        apt-get update || error_exit "Failed to update apt repositories after adding TimescaleDB repo."
    fi
    apt-get install -y "$PKG_NAME" || error_exit "TimescaleDB installation failed."
fi

# -------------------------------
# Step 7: Run TimescaleDB Tuning
# -------------------------------
echo "[4/8] Running timescaledb-tune..."
if command -v timescaledb-tune &>/dev/null; then
    timescaledb-tune --quiet --yes || echo "Warning: timescaledb-tune encountered issues."
else
    echo "Warning: timescaledb-tune not found. Please run it manually if needed."
fi

# -------------------------------
# Step 8: Start PostgreSQL Service
# -------------------------------
echo "[5/8] Starting PostgreSQL service..."
systemctl start postgresql || error_exit "Failed to start PostgreSQL service."

# -------------------------------
# Step 9: Create the Database if It Doesn't Exist
# -------------------------------
echo "[6/8] Creating database '$DB_NAME' if it doesn't exist..."
# Connect to the default "postgres" database to check/create the target database.
DB_EXISTS=$(PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | tr -d '[:space:]')
if [ "$DB_EXISTS" != "1" ]; then
    PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" || error_exit "Failed to create database '$DB_NAME'."
    echo "Database '$DB_NAME' created."
else
    echo "Database '$DB_NAME' already exists."
fi

# -------------------------------
# Step 10: Load TimescaleDB Extension
# -------------------------------
echo "[7/8] Loading TimescaleDB extension in database '$DB_NAME'..."
PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || error_exit "Failed to create TimescaleDB extension in '$DB_NAME'."

# -------------------------------
# Step 11: Load SQL Schema
# -------------------------------
read -p "Is the file telem_data.sql located in the 'db/' directory relative to this script? (Y/n): " confirm
if [[ "$confirm" =~ ^[Nn] ]]; then
    read -p "Please enter the full path to telem_data.sql: " SQL_FILE
else
    SQL_FILE="db/telem_data.sql"
fi

if [ ! -f "$SQL_FILE" ]; then
    error_exit "SQL file '$SQL_FILE' not found. Please verify the path and try again."
fi

echo "[8/8] Loading SQL schema from $SQL_FILE into database '$DB_NAME'..."
PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME" -f "$SQL_FILE" || error_exit "Failed to load SQL schema from $SQL_FILE."

echo "=== Telemetry Backend Database Setup Completed Successfully ==="

# -------------------------------
# Step 12: Prompt to Log into psql
# -------------------------------
read -p "Do you want to log into psql for database '$DB_NAME'? (Y/n): " login_choice
if [[ "$login_choice" =~ ^[Yy] || -z "$login_choice" ]]; then
    echo "Logging into psql..."
    PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME"
else
    echo "Setup complete. Exiting."
fi
