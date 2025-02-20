#!/bin/bash
# Script to set up the telemetry backend database with PostgreSQL and TimescaleDB.
# This version reads the database connection string from config.yaml, extracts
# connection details, installs missing dependencies, and asks for confirmation
# before making changes that might affect an existing setup.

set -euo pipefail

# Ensure the script is run as root.
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root or use sudo."
    exit 1
fi

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

echo "=== Telemetry Backend Database Setup ==="

####################################
# Step 1: Check & Install yq
####################################
if ! command -v yq &>/dev/null; then
    if ask_yes_no "yq not found. Would you like to install yq?"; then
        echo "Downloading yq..."
        wget -q "https://github.com/mikefarah/yq/releases/download/v4.30.5/yq_linux_amd64" -O /usr/local/bin/yq || error_exit "Failed to download yq."
        chmod +x /usr/local/bin/yq || error_exit "Failed to set execute permission on yq."
    else
        error_exit "yq is required. Exiting."
    fi
else
    echo "yq is already installed."
fi

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
echo "Extracted connection string: $DB_CONN"

####################################
# Step 3: Parse Connection String
####################################
# Expected format: postgres://username:password@host:port/database?sslmode=disable
decode_url() {
    python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.argv[1]))" "$1"
}

conn_no_proto="${DB_CONN#postgres://}"

USERNAME="${conn_no_proto%%:*}"
rest="${conn_no_proto#*:}"
PASSWORD_ENC="${rest%%@*}"
PASSWORD=$(decode_url "$PASSWORD_ENC")
rest="${rest#*@}"
HOST_PORT="${rest%%/*}"
HOST="${HOST_PORT%%:*}"
PORT="${HOST_PORT#*:}"
DB_NAME_RAW="${rest#*/}"
DB_NAME="${DB_NAME_RAW%%\?*}"

echo "Parsed connection details:"
echo "  Username: $USERNAME"
echo "  Password: [hidden]"
echo "  Host: $HOST"
echo "  Port: $PORT"
echo "  Database: $DB_NAME"

####################################
# Step 4: Check & Install PostgreSQL
####################################
if ! command -v psql &>/dev/null; then
    if ask_yes_no "PostgreSQL not found. Install PostgreSQL?"; then
        apt-get update && apt-get install -y postgresql postgresql-contrib || error_exit "PostgreSQL installation failed."
    else
        error_exit "PostgreSQL is required. Exiting."
    fi
else
    echo "PostgreSQL is already installed."
fi

####################################
# Step 5: Get PostgreSQL Version
####################################
PG_VERSION_FULL=$(psql --version | awk '{print $3}') || error_exit "Could not determine PostgreSQL version."
PG_MAJOR=$(echo "$PG_VERSION_FULL" | cut -d. -f1)
echo "Detected PostgreSQL version: $PG_VERSION_FULL (Major: $PG_MAJOR)"

####################################
# Step 6: Check & Install TimescaleDB
####################################
PKG_NAME="timescaledb-2-postgresql-$PG_MAJOR"
if dpkg -l | grep -qw "$PKG_NAME"; then
    echo "TimescaleDB package $PKG_NAME is already installed."
else
    if ask_yes_no "TimescaleDB package $PKG_NAME not found. Install TimescaleDB?"; then
        if [ ! -f /etc/apt/sources.list.d/timescaledb.list ]; then
            if ! command -v lsb_release &>/dev/null; then
                error_exit "lsb_release command not found. Cannot determine OS codename."
            fi
            OS_CODENAME=$(lsb_release -cs)
            echo "Adding TimescaleDB repository for Ubuntu $OS_CODENAME..."
            echo "deb https://packagecloud.io/timescale/timescaledb/ubuntu/ $OS_CODENAME main" | tee /etc/apt/sources.list.d/timescaledb.list
            wget -qO- https://packagecloud.io/timescale/timescaledb/gpgkey | apt-key add - || error_exit "Failed to add TimescaleDB GPG key."
            apt-get update || error_exit "Failed to update apt repositories after adding TimescaleDB repo."
        fi
        apt-get install -y "$PKG_NAME" || error_exit "TimescaleDB installation failed."
    else
        error_exit "TimescaleDB is required for telemetry. Exiting."
    fi
fi

####################################
# Step 7: Run TimescaleDB Tuning
####################################
if ask_yes_no "Would you like to run timescaledb-tune? (This may modify PostgreSQL configuration)"; then
    if command -v timescaledb-tune &>/dev/null; then
        timescaledb-tune --quiet --yes || echo "Warning: timescaledb-tune encountered issues."
    else
        echo "Warning: timescaledb-tune not found. Please run it manually if needed."
    fi
else
    echo "Skipping timescaledb-tune."
fi

####################################
# Step 8: Start PostgreSQL Service
####################################
echo "Starting PostgreSQL service..."
systemctl start postgresql || error_exit "Failed to start PostgreSQL service."

####################################
# Step 8.5: Set postgres User Password
####################################
if ask_yes_no "Do you want to set the 'postgres' user password to match the configuration?"; then
    su - postgres -c "psql -c \"ALTER USER postgres WITH PASSWORD '$PASSWORD';\"" || error_exit "Failed to update postgres user password."
else
    echo "Skipping update of postgres user password."
fi

####################################
# Step 9: Create the Database if Not Exists
####################################
echo "Checking for database '$DB_NAME'..."
DB_EXISTS=$(PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d postgres -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | tr -d '[:space:]') || true
if [ "$DB_EXISTS" != "1" ]; then
    echo "Creating database '$DB_NAME'..."
    PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" || error_exit "Failed to create database '$DB_NAME'."
    echo "Database '$DB_NAME' created."
else
    echo "Database '$DB_NAME' already exists."
fi

####################################
# Step 10: Load TimescaleDB Extension
####################################
echo "Loading TimescaleDB extension into database '$DB_NAME'..."
PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || error_exit "Failed to load TimescaleDB extension."

####################################
# Step 11: Load SQL Schema
####################################
if ask_yes_no "Is the SQL schema file (telem_data.sql) located in the 'db/' directory relative to this script?"; then
    SQL_FILE="db/telem_data.sql"
else
    read -rp "Please enter the full path to telem_data.sql: " SQL_FILE
fi

if [ ! -f "$SQL_FILE" ]; then
    error_exit "SQL file '$SQL_FILE' not found. Please verify the path and try again."
fi

echo "Loading SQL schema from $SQL_FILE into database '$DB_NAME'..."
PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME" -f "$SQL_FILE" || error_exit "Failed to load SQL schema."

####################################
# Step 12: Option to Log into psql
####################################
if ask_yes_no "Do you want to log into psql for database '$DB_NAME'?"; then
    echo "Logging into psql..."
    PGPASSWORD="$PASSWORD" psql -U "$USERNAME" -h "$HOST" -p "$PORT" -d "$DB_NAME"
else
    echo "Setup complete. Exiting."
fi

echo "=== Telemetry Backend Database Setup Completed Successfully ==="

