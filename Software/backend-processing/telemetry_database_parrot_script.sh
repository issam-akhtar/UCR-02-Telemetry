#!/bin/bash
# Script to set up the telemetry backend database with PostgreSQL and TimescaleDB on Parrot Security (Debian-based).

# 1. Ensure the script is run as root.
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root or use sudo."
    exit 1
fi

error_exit() {
    echo "Error: $1"
    exit 1
}

echo "=== Telemetry Backend Database Setup (Debian-based / Parrot OS) ==="

# 2. Install prerequisites:
echo "[1/9] Installing prerequisite packages..."
apt-get update || error_exit "apt-get update failed."
apt-get install -y gnupg postgresql-common apt-transport-https lsb-release wget || error_exit "Failed to install prerequisites."

# 3. Run the PostgreSQL setup script from PGDG (adds official PostgreSQL repository):
echo "[2/9] Setting up the official PostgreSQL repository..."
if [ -f /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh ]; then
    /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh || echo "Warning: pgdg script encountered issues."
else
    echo "Warning: /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh not found. Continuing..."
fi

# 4. Add the TimescaleDB Debian repository (for Debian 12 bookworm).
#    Parrot 6.x is based on Debian 12, so we override the codename to 'bookworm'.
echo "[3/9] Adding TimescaleDB repository for Debian (bookworm)..."
OS_CODENAME="bookworm"
echo "deb https://packagecloud.io/timescale/timescaledb/debian/ $OS_CODENAME main" | tee /etc/apt/sources.list.d/timescaledb.list

# 5. Add the TimescaleDB GPG key.
wget --quiet -O - https://packagecloud.io/timescale/timescaledb/gpgkey | gpg --dearmor -o /etc/apt/trusted.gpg.d/timescaledb.gpg || error_exit "Failed to add TimescaleDB GPG key."

# 6. Install PostgreSQL and TimescaleDB.
echo "[4/9] Updating repositories and installing PostgreSQL + TimescaleDB..."
apt-get update || error_exit "Failed to update repositories."
# Here we choose PostgreSQL 16 as an example. If you want 17, change to timescaledb-2-postgresql-17, postgresql-client-17, etc.
apt-get install -y postgresql-16 postgresql-client-16 timescaledb-2-postgresql-16 || error_exit "Failed to install PostgreSQL / TimescaleDB."

# 7. Run timescaledb-tune to configure PostgreSQL.
echo "[5/9] Running timescaledb-tune..."
if command -v timescaledb-tune &>/dev/null; then
    timescaledb-tune --quiet --yes || echo "Warning: timescaledb-tune encountered issues."
else
    echo "Warning: timescaledb-tune not found. Please run it manually if needed."
fi

# 8. Ensure PostgreSQL service is running.
echo "[6/9] Starting/restarting PostgreSQL service..."
systemctl restart postgresql || error_exit "Failed to start/restart PostgreSQL service."

# 9. Create the 'telem_data' database if it does not exist.
echo "[7/9] Creating database 'telem_data' if it doesn't exist..."
DB_EXISTS=$(sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'telem_data';" | tr -d '[:space:]')
if [ "$DB_EXISTS" != "1" ]; then
    sudo -u postgres psql -c "CREATE DATABASE telem_data;" || error_exit "Failed to create database 'telem_data'."
    echo "Database 'telem_data' created."
else
    echo "Database 'telem_data' already exists."
fi

# 10. Load the TimescaleDB extension in the telem_data database.
echo "[8/9] Creating TimescaleDB extension in 'telem_data'..."
sudo -u postgres psql -d telem_data -c "CREATE EXTENSION IF NOT EXISTS timescaledb;" || error_exit "Failed to create TimescaleDB extension in 'telem_data'."

# 11. Confirm location of the SQL schema file (telem_data.sql).
echo "[9/9] We will now load your SQL schema."
read -p "Is the file telem_data.sql located in the 'db/' directory relative to this script? (Y/n): " confirm
if [[ "$confirm" =~ ^[Nn] ]]; then
    read -p "Please enter the full path to telem_data.sql: " SQL_FILE
else
    SQL_FILE="db/telem_data.sql"
fi

if [ ! -f "$SQL_FILE" ]; then
    error_exit "SQL file '$SQL_FILE' not found. Please verify the path and try again."
fi

echo "Loading SQL schema from $SQL_FILE into database 'telem_data'..."
sudo -u postgres psql -d telem_data -f "$SQL_FILE" || error_exit "Failed to load SQL schema from $SQL_FILE."

echo "=== Telemetry Backend Database Setup Completed Successfully on Parrot OS (Debian-based) ==="
