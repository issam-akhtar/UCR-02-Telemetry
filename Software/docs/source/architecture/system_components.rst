System Components
================

This section provides detailed information about each major component in the UCR-02-Telemetry system, their responsibilities, and interactions.

System Architecture Overview
--------------------------

The following diagram illustrates the overall system architecture:

.. mermaid::

   graph TB
     subgraph "Vehicle/Simulator"
       ESP32[ESP32 CAN Interface]
       CSV[CSV Simulator]
     end
     
     subgraph "Backend Services"
       WS[WebSocket Ingest Server]
       DEC[CAN Decoder]
       PROC[Data Processor]
       HUB[WebSocket Hub]
       API[REST API]
     end
     
     subgraph "Data Storage"
       DB[(TimescaleDB)]
     end
     
     subgraph "Frontend Application"
       FE[React Application]
       VIS[Visualization Components]
       DASH[Dashboard UI]
     end
     
     ESP32 -->|Binary CAN Frames| WS
     CSV -->|CSV Records| WS
     WS -->|Raw Bytes| DEC
     DEC -->|Decoded Signals| PROC
     PROC -->|Batched Records| DB
     PROC -->|Real-time Updates| HUB
     DB -->|Historical Data| API
     HUB -->|Binary Protobuf| FE
     API -->|JSON Responses| FE
     FE --> VIS
     FE --> DASH

Component Architecture
--------------------

The following diagram illustrates the major components of the system and their relationships:

.. mermaid::

   classDiagram
     class WebSocketIngest {
       +HandleConnection(conn)
       -processData(bytes)
     }
     
     class CANDecoder {
       +Decode(bytes) map
       -loadDefinitions()
       -cacheDecodedValues()
     }
     
     class DataProcessor {
       +ProcessFrame(frameID, data)
       +AddToBatch(record)
       -routeByFrameID(frameID)
       -batchInsert()
     }
     
     class TimescaleDB {
       +InsertBatch(records)
       +QueryHistorical(params)
       -hypertables
       -retention policies
     }
     
     class WebSocketHub {
       +Register(client)
       +Unregister(client)
       +Broadcast(message)
       -clients map
     }
     
     class RESTApi {
       +GetHistorical(params)
       +GetStatus()
     }
     
     class FrontendApp {
       +ConnectWebSocket()
       +DecodeMessage(binary)
       +VisualizeData(data)
     }
     
     WebSocketIngest --> CANDecoder: Raw bytes
     CANDecoder --> DataProcessor: Decoded signals
     DataProcessor --> TimescaleDB: Batched records
     DataProcessor --> WebSocketHub: Real-time messages
     TimescaleDB --> RESTApi: Historical data
     WebSocketHub --> FrontendApp: Binary Protobuf
     RESTApi --> FrontendApp: JSON responses

Backend Receiver
--------------

**Purpose**: Receives raw telemetry data via WebSocket connections from vehicles or simulators.

**Key Files**:

.. list-table::
   :widths: 60 40
   :header-rows: 1

   * - File Path
     - Description
   * - ``backend-processing/cmd/telemetryserver/main.go``
     - WebSocket server implementation that receives telemetry data

**Responsibilities**:

* Establishes and manages WebSocket connections
* Receives binary CAN data or CSV rows
* Initial processing and routing of incoming data
* Utilizes sync.Pool for efficient memory management
* Implements worker pool pattern for concurrent processing

**Implementation Details**:

* Uses Gorilla WebSocket library for connection handling
* Maintains a pool of reusable byte slices to minimize garbage collection
* Implements non-blocking job dispatching to worker pool
* Handles both binary mode and CSV simulation mode

CAN Decoder
---------

**Purpose**: Decodes raw CAN frames into structured signal data based on DBC definitions.

**Key Files**:

.. list-table::
   :widths: 60 40
   :header-rows: 1

   * - File Path
     - Description
   * - ``backend-processing/pkg/candecoder/candecoder.go``
     - CAN binary data decoder with DBC-based signal extraction

**Responsibilities**:

* Loads and parses DBC JSON definitions
* Decodes raw CAN frames into signal key-value pairs
* Handles different signal types (numeric, string)
* Caches decoded values for performance

**Implementation Details**:

* Uses a combination of bit manipulation and scaling formulas
* Implements caching to avoid redundant decoding of identical frames
* Uses sync.Pool for map reuse to minimize allocations

Data Processor
------------

**Purpose**: Routes, processes, and distributes decoded telemetry data.

**Key Files**:

.. list-table::
   :widths: 60 40
   :header-rows: 1

   * - File Path
     - Description
   * - ``backend-processing/pkg/processdata/processdata.go``
     - Data routing and processing logic with batch management

**Responsibilities**:

* Routes data based on frame ID
* Creates strongly-typed records for each data type
* Manages batch insertion to database
* Builds and sends real-time messages to WebSocket hub
* Implements special handling for high-priority data

**Implementation Details**:

* Uses a switch statement for efficient frame routing
* Maintains batch buffers for different record types
* Implements throttling for high-frequency signals
* Uses concurrent processing for most frame types
* Special synchronous path for cell data (frame IDs 50-57)

TimescaleDB Integration
---------------------

**Purpose**: Provides efficient storage and retrieval of time-series telemetry data.

**Key Files**:

.. list-table::
   :widths: 60 40
   :header-rows: 1

   * - File Path
     - Description
   * - ``backend-processing/pkg/db/db.go``
     - Database connection and batch operations implementation
   * - ``backend-processing/db/telem_data.sql``
     - SQL schema with optimized hypertables for time-series data

**Responsibilities**:

* Establishes and maintains database connection
* Executes batch insertions for different record types
* Provides query interfaces for historical data
* Manages hypertables and compression policies

**Implementation Details**:

* Uses PostgreSQL with TimescaleDB extension
* Creates optimized schema with hypertables for time-series data
* Implements retention policies for efficient storage management
* Uses prepared statements and batch inserts for performance

WebSocket Hub
-----------

**Purpose**: Broadcasts real-time telemetry data to connected frontend clients.

**Key Files**:

.. list-table::
   :widths: 60 40
   :header-rows: 1

   * - File Path
     - Description
   * - ``backend-processing/internal/wsserver/hub.go``
     - WebSocket connection management and broadcast implementation

**Responsibilities**:

* Manages client connections (register/unregister)
* Broadcasts messages to all connected clients
* Implements non-blocking send with backpressure
* Handles client disconnections gracefully

**Implementation Details**:

* Central hub pattern with goroutines for each client
* Uses channels for thread-safe communication
* Implements non-blocking broadcast mechanism
* Uses binary Protobuf for efficient message encoding

REST API
-------

**Purpose**: Provides access to historical telemetry data and system status.

**Key Files**:

.. list-table::
   :widths: 60 40
   :header-rows: 1

   * - File Path
     - Description
   * - ``backend-processing/internal/handlers/historical.go``
     - REST API endpoints for accessing historical telemetry data

**Responsibilities**:

* Handles HTTP requests for historical data
* Implements filtering and pagination
* Formats database results as JSON responses
* Provides system status endpoints

**Implementation Details**:

* Uses Chi router for HTTP routing
* Implements middleware for CORS, logging, etc.
* Provides parameterized queries for data filtering

Frontend Application
-----------------

**Purpose**: Visualizes telemetry data and provides user interface for system interaction.

**Key Files**:

.. list-table::
   :widths: 60 40
   :header-rows: 1

   * - File Path
     - Description
   * - ``telemetry-app/src/App.jsx``
     - Main application entry point and routing
   * - ``telemetry-app/src/services/websocket.js``
     - WebSocket connection management and reconnection logic
   * - ``telemetry-app/src/utils/protobuf.js``
     - Binary Protobuf message decoding
   * - ``telemetry-app/src/cellmappings/``
     - Battery cell visualization components and mapping
   * - ``telemetry-app/src/components/``
     - Reusable UI components and visualizations
   * - ``telemetry-app/src/hooks/``
     - Custom React hooks for data access and state management
   * - ``telemetry-app/src/pages/``
     - Main application views and dashboards

**Responsibilities**:

* Establishes and maintains WebSocket connection
* Decodes binary Protobuf messages
* Visualizes real-time and historical data
* Provides configuration and control interface
* Renders 2D and 3D visualizations of vehicle components
* Manages user preferences and settings
* Implements data export functionality

**Implementation Details**:

* React/Vite single-page application
* Uses Protobuf.js for binary message decoding
* Implements robust WebSocket connection management with:

  * Automatic reconnection with exponential backoff
  * Ping/pong heartbeat mechanism
  * Connection state notifications
  * Message buffering during reconnection

* Uses React context for global state management
* Implements custom hooks for real-time data subscription
* Utilizes SVG for dashboard components
* Integrates 3D models for spatial visualization
* Employs responsive design for different screen sizes
* Implements theme support (light/dark modes)
* Uses React Router for navigation between views
* Custom visualization components for:

  * Battery cell monitoring
  * Motor performance metrics
  * Vehicle dynamics
  * System status dashboard
  * Historical data graphs