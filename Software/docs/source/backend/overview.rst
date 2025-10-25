Backend Overview
================

The UCR-02-Telemetry system backend is a high-performance Go application designed to receive, decode, process, store, and broadcast telemetry data from the vehicle. This overview provides a comprehensive introduction to the backend architecture and its components.

System Architecture
------------------

The backend follows a modular architecture with clear separation of concerns:

    * Device (ESP32 or CSV simulator)
    * WebSocket ingest (/telemetry, port 9091)
    * CAN decoder (decode binary data into signals)
    * Data processor (route, process, and batch)
    * TimescaleDB (historical storage)
    * Live WebSocket hub (binary Protobuf)
    * Frontend (telemetry-app)

Key Components
-------------

WebSocket Ingest Server
~~~~~~~~~~~~~~~~~~~~~~~

* **Location**: ``cmd/telemetryserver/main.go``
* **Purpose**: Receives raw telemetry data from the vehicle or simulator
* **Features**:

  * Handles both CSV and binary CAN frame formats
  * Uses worker pool for parallel processing
  * Implements memory pooling for efficiency
  * Provides special handling for critical cell voltage data

CAN Decoder
~~~~~~~~~~

* **Location**: ``pkg/candecoder/candecoder.go``
* **Purpose**: Transforms binary CAN data into structured signal values
* **Features**:

  * Loads signal definitions from JSON-converted DBC files
  * Applies bit manipulation and scaling formulas
  * Implements efficient caching for performance
  * Uses memory pooling for map reuse

Data Processor
~~~~~~~~~~~~

* **Location**: ``pkg/processdata/processdata.go``
* **Purpose**: Routes and processes decoded messages
* **Features**:

  * Routes messages by frame ID
  * Creates typed records from decoded signals
  * Implements batch processing for database operations
  * Broadcasts real-time updates to WebSocket clients

Database Integration
~~~~~~~~~~~~~~~~~~

* **Location**: ``pkg/db/db.go`` and ``db/telem_data.sql``
* **Purpose**: Stores historical telemetry data
* **Features**:

  * Uses TimescaleDB for optimized time-series storage
  * Implements hypertables for efficient partitioning
  * Provides batch insertion for performance
  * Supports data compression and retention policies

WebSocket Hub
~~~~~~~~~~~

* **Location**: ``internal/wsserver/hub.go``
* **Purpose**: Broadcasts real-time data to frontend clients
* **Features**:

  * Manages client connections
  * Distributes binary Protobuf messages
  * Implements efficient broadcasting
  * Handles connection lifecycle

REST API
~~~~~~~

* **Location**: ``internal/handlers/historical.go``
* **Purpose**: Provides access to historical data
* **Features**:

  * Offers paginated endpoints for each data type
  * Implements request and response caching
  * Uses a generic handler pattern to minimize duplication
  * Provides comprehensive error handling

Data Flow
--------

1. **Raw Data Reception**:
   - Vehicle or simulator sends raw telemetry data via WebSocket
   - Server receives data in CSV or binary format

2. **Decoding**:
   - CAN frame is identified by frame ID
   - Binary data is decoded into named signals using DBC definitions
   - Scaling and unit conversion is applied

3. **Processing**:
   - Decoded signals are routed by frame ID
   - Data is converted into typed records
   - Special handling is applied for critical data (e.g., cell voltages)

4. **Storage**:
   - Records are collected into type-specific batches
   - Batches are periodically flushed to the database
   - TimescaleDB stores data in optimized hypertables

5. **Real-time Broadcasting**:
   - Processed data is converted to Protobuf format
   - Binary messages are broadcast to all connected clients
   - Frontend receives and visualizes the data

6. **Historical Access**:
   - Frontend requests historical data via REST API
   - Paginated queries retrieve data from the database
   - Results are returned as JSON for visualization

Startup Sequence
--------------

1. Load configuration from ``configs/config.yaml``
2. Connect to TimescaleDB database
3. Load CAN message definitions from JSON file
4. Initialize batch processors for each data type
5. Start WebSocket hub for real-time broadcasting
6. Start worker pool for parallel processing
7. Start WebSocket ingest server for raw data reception
8. Start REST API server for historical data access

Performance Considerations
------------------------

The backend is heavily optimized for performance:

- **Memory Management**: Uses ``sync.Pool`` for object reuse
- **Concurrency**: Worker pool for parallel processing
- **Backpressure**: Non-blocking channels to handle overload
- **Batching**: Groups database operations for efficiency
- **Caching**: Multiple levels of caching for frequently accessed data
- **Database Optimization**: TimescaleDB features for time-series data

Configuration
-----------

The system is highly configurable through ``configs/config.yaml``:

- **Database**: Connection string and settings
- **WebSocket**: Ports and endpoints for data reception and broadcasting
- **Processing Mode**: CSV or live binary mode
- **Signal Definitions**: Paths to DBC and JSON files

Development Environment
--------------------

To start the backend in development mode:

.. code-block:: bash

   cd backend-processing/cmd/telemetryserver
   go run main.go

For testing, you can use the CSV simulator:

.. code-block:: bash

   cd backend-processing/cmd/csvserver
   go run simulate_sender.go -csvfile ../../testdata/data.csv

Integration with Frontend
----------------------

The backend integrates with the frontend through:

1. **Live WebSocket**: Binary Protobuf messages for real-time updates
2. **REST API**: JSON endpoints for historical data retrieval

The frontend (``telemetry-app``) connects to these interfaces to provide a comprehensive visualization of both real-time and historical data.