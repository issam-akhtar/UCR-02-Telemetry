Database
========

This page documents the telemetry database: schema, initialization, tuning
notes, and where the application code interacts with the DB.

Overview
--------

- Purpose: persistent storage for historical telemetry used by the
  historical REST API and offline analysis. The project ships a production-
  oriented SQL schema tuned for PostgreSQL + TimescaleDB.
- Location of canonical schema: ``Software/backend-processing/db/telem_data.sql``
- Initialization scripts: ``Software/backend-processing/telemetry_database_script.sh``
  and ``Software/backend-processing/telemetry_database_pi_script.sh`` (these
  create the database, load the schema and configure TimescaleDB options).

Key schema details
------------------

- Hypertables: the schema converts each time-series table into a TimescaleDB
  hypertable using a 1-day chunk interval (good balance for high-frequency
  telemetry).
- Tables: many CAN message tables are created (for example ``front_analog``,
  ``pdm_current``, ``cell_data``, ``therm_data``, ``gps_best_pos``) plus
  consolidated batch tables (``cell_data``, ``pack_voltage``, ``pack_current``).
- Indexes: the SQL creates BRIN indexes on timestamps for efficient time-range
  scans and a small set of B-tree indexes (timestamp DESC) for fast access to
  recent values. It also adds a few conditional indexes used by common queries
  (e.g., GPS coords or SOC lookups).
- Compression & retention: the schema enables TimescaleDB compression and
  installs compression policies (compress data older than 3 days) and
  retention policies (default 365 days) via `add_compression_policy` and
  `add_retention_policy` calls.

Requirements
------------

- PostgreSQL (the scripts expect Postgres-compatible server).
- TimescaleDB extension installed and available to the database (the SQL
  calls ``create_hypertable``, ``add_compression_policy`` and related
  functions).

Initialize the database (quick)
-------------------------------

1. Ensure your connection string is set in ``Software/backend-processing/configs/config.yaml``
   under the ``database`` key (``connection_string``).
2. Use the packaged setup script which parses the config and applies the
   schema and tuning commands:

   - For generic Linux: ``Software/backend-processing/telemetry_database_script.sh``
   - For Raspberry Pi setup: ``Software/backend-processing/telemetry_database_pi_script.sh``

3. Alternatively, manually apply the SQL (requires appropriate privileges and
   the TimescaleDB extension):

   psql "<connection-string>" -f Software/backend-processing/db/telem_data.sql

Notes on migrations and schema changes
-------------------------------------

- The repo currently supplies the full SQL schema as one file. For incremental
  changes in production, use a migration tool (recommended: `golang-migrate`,
  `sqitch`, or a CI-driven schema migration pipeline) to apply versioned
  migrations and avoid destructive changes from replacing the roll-forward
  SQL file.
- If you add new telemetry messages, update both the decoder mappings
  (``configs/*.json`` or convert a new DBC) and the schema/migration which
  creates the table or hypertable for that message.

How the app uses the DB
-----------------------

- Backend DB helper: ``Software/backend-processing/pkg/db/db.go`` contains
  connection helpers and query functions used by the historical handlers.
- REST handler: ``Software/backend-processing/internal/handlers/historical.go``
  reads time ranges and returns timestamp/value pairs for charts.

Performance tuning notes
------------------------

- Chunk interval: currently 1-day chunks. For very high-frequency signals
  or large installations you may want smaller chunks; test query workloads
  before changing.
- BRIN indexes: very cheap for append-only time-series; keep them for most
  large tables. Add additional B-tree indexes for frequent point queries.
- Compression: the current policy compresses data older than 3 days. If
  operational patterns need recent detailed access older than 3 days, raise
  the threshold.

Troubleshooting
---------------

- "create_hypertable" not found: ensure TimescaleDB extension is installed
  and the extension is created in the target database (``CREATE EXTENSION IF
  NOT EXISTS timescaledb;``).
- Long-running schema application: large imports or policy installations may
  require elevated maintenance windows; test on a staging DB first.

Next steps / improvements
------------------------

- Add a migrations folder and a migration tool to apply incremental schema
  changes safely from CI.
- Provide a smaller development schema (SQLite or stripped-down Postgres
  schema) for local dev to avoid requiring Timescale in dev environments.
- Document common query examples used by the historical API and example
  scripts to validate retention/compression behavior.

See also
--------

- Schema file: ``Software/backend-processing/db/telem_data.sql``
- DB init scripts: ``Software/backend-processing/telemetry_database_script.sh``
  and ``Software/backend-processing/telemetry_database_pi_script.sh``
- Backend DB code: ``Software/backend-processing/pkg/db/db.go``
- Historical API handler: ``Software/backend-processing/internal/handlers/historical.go``

Query examples
--------------

Below are common queries you can run with `psql` or from the backend to
support the historical API and ad-hoc analysis. Adjust table and column
names to match your local schema and needs.

1) Get the most recent sample for a table (pack voltage):

  SELECT *
  FROM pack_voltage
  ORDER BY timestamp DESC
  LIMIT 1;

2) Query a time range for a single table (last hour):

  SELECT timestamp, voltage
  FROM pack_voltage
  WHERE timestamp >= now() - INTERVAL '1 hour'
  ORDER BY timestamp ASC;

3) Downsample with time_bucket (1-minute buckets) and compute avg/max:

  SELECT time_bucket('1 minute', timestamp) AS minute,
       AVG(voltage) AS avg_voltage,
       MAX(voltage) AS max_voltage
  FROM pack_voltage
  WHERE timestamp >= now() - INTERVAL '6 hours'
  GROUP BY minute
  ORDER BY minute ASC;

4) Aggregate multiple signals using a UNION (example: pack_voltage + pack_current)

  SELECT 'voltage' AS signal, timestamp, voltage AS value
  FROM pack_voltage
  WHERE timestamp BETWEEN '2025-01-01' AND '2025-01-02'
  UNION ALL
  SELECT 'current' AS signal, timestamp, current AS value
  FROM pack_current
  WHERE timestamp BETWEEN '2025-01-01' AND '2025-01-02'
  ORDER BY timestamp ASC;

5) Use a time-range + last value per signal using DISTINCT ON (fast recent snapshot):

  SELECT DISTINCT ON (signal_name) signal_name, timestamp, value
  FROM (
    -- example: a table that stores signal_name/value pairs (if you have one)
    SELECT 'pack_voltage' AS signal_name, timestamp, voltage AS value FROM pack_voltage
    UNION ALL
    SELECT 'pack_current' AS signal_name, timestamp, current AS value FROM pack_current
  ) t
  ORDER BY signal_name, timestamp DESC;

6) Example downsampling query the backend might run for charts (time_bucket + interpolation):

  SELECT bucket AS ts,
       AVG(value) AS avg_value
  FROM (
    SELECT time_bucket('10 seconds', timestamp) AS bucket, voltage AS value
    FROM pack_voltage
    WHERE timestamp BETWEEN $1 AND $2
  ) s
  GROUP BY bucket
  ORDER BY bucket ASC;

7) Check compression and retention policies (TimescaleDB helper views):

  -- List compression policies
  SELECT * FROM timescaledb_information.compress_chunks;

  -- Show retention (continuous aggregate / policy info not centralized; check job tables):
  SELECT * FROM timescaledb_information.hypertables;

8) Recreate hypertable / check hypertable status (if needed):

  -- Check if hypertable exists
  SELECT * FROM timescaledb_information.hypertables WHERE hypertable_name = 'pack_voltage';

9) Quick API-style example (how the historical handler typically queries):

  -- Pseudocode used by handlers: select timestamp,value where signal and time range
  SELECT timestamp, <signal_column> AS value
  FROM <table_for_signal>
  WHERE timestamp BETWEEN $from AND $to
  ORDER BY timestamp ASC
  LIMIT $max_points;

Notes on practical usage
------------------------

- Parameterize queries from the backend to avoid SQL injection and to let
  the DB reuse execution plans.
- For very large ranges, prefer server-side downsampling (time_bucket +
  aggregate) to reduce payload size and processing on the client.
- When querying many signals simultaneously, consider writing a small
  aggregation function that pivots or streams results to avoid huge memory
  use in the backend.

