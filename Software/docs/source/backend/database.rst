Database
========

This document describes the database component of the UCR-02-Telemetry system, which uses TimescaleDB for efficient storage and retrieval of time-series telemetry data.

Introduction
-----------

The database layer of the UCR-02-Telemetry system is built on PostgreSQL with the TimescaleDB extension, optimized for storing and querying large volumes of time-series data. The design focuses on:

1. **Performance**: Optimized for high-throughput writes and efficient reads
2. **Compression**: Automatic data compression for efficient storage utilization
3. **Retention**: Configurable data retention policies for data lifecycle management
4. **Hypertables**: Time-partitioned tables for improved query performance

Database Schema
-------------

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``backend-processing/db/telem_data.sql``
     - SQL schema definition with table structures, indexes, and TimescaleDB hypertable configuration
   * - ``backend-processing/pkg/db/db.go``
     - Database connection and operations implementation including batch insertions and query functions

Entity Relationship Diagram
~~~~~~~~~~~~~~~~~~~~~~~~~~~

The following ER diagram shows the key database tables and their relationships:

.. mermaid::

   erDiagram
       CELL_DATA {
           timestamptz timestamp PK
           int cell_id
           float voltage
           float temperature
       }
       PACK_VOLTAGE {
           timestamptz timestamp PK
           float voltage
       }
       PACK_CURRENT {
           timestamptz timestamp PK
           float current
       }
       THERM_DATA {
           timestamptz timestamp PK
           int therm_id
           float temperature
       }
       BAMOCAR_DATA {
           timestamptz timestamp PK
           int rpm
           float torque
           float temperature
       }
       GPS_DATA {
           timestamptz timestamp PK
           float latitude
           float longitude
           float altitude
           float speed
       }
       IMU_DATA {
           timestamptz timestamp PK
           float accel_x
           float accel_y
           float accel_z
           float gyro_x
           float gyro_y
           float gyro_z
       }

.. note::
   All tables use TimescaleDB hypertables with time-based partitioning for optimal performance.

Tables Overview
~~~~~~~~~~~~~~~

The database schema is defined in `backend-processing/db/telem_data.sql` and contains tables for each telemetry data type:

* **cell_data**: Battery cell voltages (128 cells)
* **therm_data**: Thermistor temperature readings
* **pack_voltage**: Battery pack voltage
* **pack_current**: Battery pack current
* **tcu1**: Traction Control Unit data
* **tcu2**: Additional TCU data (Bamocar)
* **front_analog** and **rear_analog**: Analog sensor readings
* **front_aero** and **rear_aero**: Aerodynamic sensor data
* **gps_best_pos**: GPS position data
* **ins_gps** and **ins_imu**: Inertial navigation system data
* and more...

Each table includes a timestamp column and relevant data fields for that message type. For example:

.. code-block:: sql

    CREATE TABLE IF NOT EXISTS pack_voltage (
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        voltage DOUBLE PRECISION
    );

TimescaleDB Configuration
---------------------

The schema leverages TimescaleDB's time-series optimizations:

### Hypertables

Tables are converted to hypertables for time-based partitioning:

.. code-block:: sql

    SELECT create_hypertable('cell_data', 'timestamp', chunk_time_interval => INTERVAL '1 day');

This partitions data into one-day chunks, improving insertion and query performance.

### Compression

Older data is automatically compressed to save storage space:

.. code-block:: sql

    ALTER TABLE cell_data SET (timescaledb.compress, timescaledb.compress_segmentby = '');
    SELECT add_compression_policy('cell_data', INTERVAL '3 days');

This compresses data older than three days.

### Retention Policies

Data is automatically removed after a specified period:

.. code-block:: sql

    SELECT add_retention_policy('cell_data', INTERVAL '365 days');

This automatically removes data older than one year.

### Optimized Indexes

The schema uses a mix of index types for different query patterns:

* **BRIN indexes** for efficient time-range scans:
  
  .. code-block:: sql
  
      CREATE INDEX IF NOT EXISTS brin_cell_data_timestamp ON cell_data USING brin(timestamp);

* **B-tree indexes** for point queries and sorting:
  
  .. code-block:: sql
  
      CREATE INDEX IF NOT EXISTS idx_cell_data_timestamp_desc ON cell_data(timestamp DESC);

Database Operations
----------------

The `backend-processing/pkg/db/db.go` file provides functions for interacting with the database:

### Connection Management

.. code-block:: go

    func Connect(connStr string) (*sql.DB, error) {
        db, err := sql.Open("pgx", connStr)
        if err != nil {
            return nil, err
        }
        // Set connection pool settings
        db.SetMaxOpenConns(15)
        db.SetMaxIdleConns(5)
        DB = db
        return db, nil
    }

### Batch Operations

The database layer uses batch operations for efficient data insertion:

.. code-block:: go

    func InsertCellDataBatch(ctx context.Context, batch []types.Cell_Data) error {
        // Start a transaction
        tx, err := DB.BeginTx(ctx, nil)
        if err != nil {
            return err
        }
        defer tx.Rollback()

        // Prepare statement once
        stmt, err := tx.PrepareContext(ctx, `INSERT INTO cell_data (...) VALUES (...)`)
        if err != nil {
            return err
        }
        defer stmt.Close()

        // Insert each record in the batch
        for _, data := range batch {
            _, err := stmt.ExecContext(ctx, /* parameters */)
            if err != nil {
                return err
            }
        }

        // Commit the transaction
        return tx.Commit()
    }

### Query Operations

The database layer provides functions for retrieving historical data:

.. code-block:: go

    func (q *Queries) FetchCellDataPaginated(ctx context.Context, limit, offset int) ([]types.Cell_Data, error) {
        query := `
            SELECT timestamp, cell1, cell2, /* ... */
            FROM cell_data
            ORDER BY timestamp ASC
            LIMIT $1 OFFSET $2
        `
        rows, err := q.db.QueryContext(ctx, query, limit, offset)
        // Process rows and return results
    }

Performance Considerations
-----------------------

The database implementation includes several performance optimizations:

* **Connection Pooling**: Limited number of database connections to prevent overload
* **Prepared Statements**: Reused within transactions to reduce parsing overhead
* **Batch Inserts**: Multiple records inserted in a single transaction
* **Hypertable Chunking**: Data partitioned by time for improved query efficiency
* **Automatic Compression**: Older data compressed to reduce storage requirements
* **Optimized Indexes**: Appropriate index types for different query patterns

Adding New Data Types
------------------

To add support for a new telemetry data type:

1. Add a new table definition in `telem_data.sql`
2. Convert it to a hypertable with appropriate settings
3. Add compression and retention policies
4. Create appropriate indexes
5. Define a Go struct in `pkg/types/types.go`
6. Implement batch insert and query functions in `pkg/db/db.go`