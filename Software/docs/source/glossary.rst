Glossary
========

This glossary defines technical terms and acronyms used throughout the UCR-02-Telemetry system documentation.

.. glossary::

   API
      Application Programming Interface - A set of rules and protocols for building and interacting with software applications.

   Batch Processing
      A technique where multiple records are collected and processed as a group rather than individually, improving database write performance.

   CAN
   CAN Bus
      Controller Area Network - A robust vehicle bus standard that allows microcontrollers and devices to communicate with each other without a host computer.

   CSV Mode
      Configuration mode where the backend parses comma-separated value data from files rather than live binary CAN packets. Used for testing and development.

   DBC
   DBC File
      Database CAN file format - A text file that defines the structure of CAN messages, including signal definitions, scaling factors, and units.

   ESP32
      A low-cost, low-power system on a chip microcontroller with integrated Wi-Fi and Bluetooth, used as the telemetry transmission device in the vehicle.

   Frame ID
      A unique identifier (0-2047 for standard frames, up to 536,870,911 for extended frames) that identifies a specific CAN message type.

   Goroutine
      A lightweight thread managed by the Go runtime, allowing concurrent execution of functions.

   Hypertable
      TimescaleDB's optimized table structure for time-series data that automatically partitions data by time for improved query performance.

   Ingest Server
      The WebSocket server component that receives raw telemetry data from the vehicle or simulator (port 9091).

   Live Mode
      Configuration mode where the backend processes binary CAN packets from live vehicle telemetry in real-time.

   Message Type
      A category of telemetry data identified by its frame ID (e.g., motor data, cell voltage, GPS data).

   Non-blocking Send
      A channel operation that attempts to send data but immediately returns if the channel is full, preventing system lockup under high load.

   Protobuf
   Protocol Buffers
      A language-neutral, platform-neutral extensible mechanism for serializing structured data, used for efficient binary message exchange between backend and frontend.

   Signal
      An individual data field within a CAN message (e.g., RPM, temperature, voltage). Each signal has a defined bit position, length, and scaling formula.

   sync.Pool
      A Go standard library type that manages a pool of objects that can be reused to reduce garbage collection pressure and memory allocations.

   Telemetry
      The automated measurement and wireless transmission of data from the vehicle to the monitoring system.

   TimescaleDB
      An open-source time-series database built as a PostgreSQL extension, optimized for fast ingest and complex queries on time-series data.

   WebSocket
      A communication protocol providing full-duplex communication channels over a single TCP connection, used for real-time data streaming.

   WebSocket Hub
      The component that manages WebSocket connections to frontend clients and broadcasts real-time telemetry updates (port 9094).

   Worker Pool
      A concurrency pattern using multiple goroutines to process incoming data jobs in parallel, improving throughput.

Acronyms
--------

.. glossary::

   BMS
      Battery Management System - The electronic system that manages the battery pack.

   ECU
      Electronic Control Unit - An embedded system that controls electrical systems or subsystems in a vehicle.

   FSAE
      Formula SAE - A student design competition organized by SAE International where teams design, build, and compete with small formula-style racing cars.

   GC
      Garbage Collection - Automatic memory management that reclaims memory occupied by objects that are no longer in use.

   GPS
      Global Positioning System - Satellite-based navigation system providing location and time information.

   GUI
      Graphical User Interface - Visual interface that allows users to interact with the application.

   IMU
      Inertial Measurement Unit - Electronic device that measures and reports acceleration, orientation, and angular rates.

   JSON
      JavaScript Object Notation - A lightweight data-interchange format.

   REST
      Representational State Transfer - An architectural style for designing networked applications.

   RPM
      Revolutions Per Minute - Unit of rotational speed.

   RTD
      Read The Docs - A documentation hosting platform; also refers to the Sphinx RTD theme used in this documentation.

   SQL
      Structured Query Language - Language for managing and querying relational databases.

   TCU
      Transmission Control Unit or Telemetry Control Unit - depending on context, manages vehicle transmission or telemetry transmission.

   UI
      User Interface - The space where interactions between humans and machines occur.

   UTC
      Coordinated Universal Time - Primary time standard by which the world regulates clocks and time.

Technical Terms
---------------

.. glossary::

   Backpressure
      A resistance or force opposing the flow of data through a system. In this system, backpressure is managed by dropping messages when buffers are full.

   Batch Size
      The number of records collected before flushing to the database. Default is typically 100-1000 records depending on the data type.

   Cell Data
      Battery cell voltage and temperature measurements. Frame IDs 50-57 are reserved for cell data and receive special low-latency processing.

   Decoder
      Component that transforms raw binary CAN frame data into structured signal values using DBC definitions.

   Hot Path
      A code path that is executed very frequently and thus benefits significantly from optimization.

   Max Wait Time
      Maximum duration before a batch is flushed to the database, regardless of batch size. Typically 1-5 seconds.

   Object Pooling
      A design pattern that reuses objects instead of creating and destroying them, reducing memory allocation overhead.

   Scaling Factor
      A multiplier applied to raw signal values to convert them to engineering units (e.g., raw value * 0.1 = degrees Celsius).

   Signal Extraction
      The process of reading specific bits from a CAN frame to obtain a signal's raw value.

   Time-Series Data
      Data points indexed in time order, such as sensor readings collected over time.

System Diagrams Gallery
-----------------------

This section contains all the diagrams used throughout the UCR-02-Telemetry documentation, organized by topic. These diagrams provide visual representations of the system architecture, data flows, and component interactions.

.. tip::
   
   View and download all diagrams from the interactive gallery:
   
   `🖼️ Open Diagram Gallery <../../exported_diagrams/index.html>`_
   
   The gallery includes both SVG (vector) and PNG (high-resolution) versions of every diagram for use in 
   presentations, reports, or other documentation.

.. note::

   **Exporting Diagrams for External Use**
   
   To regenerate the diagram exports, run the export script from the ``docs/`` directory:
   
   .. code-block:: bash
   
      python3 export_diagrams.py
   
   **Prerequisites:** Install mermaid-cli first with ``npm install -g @mermaid-js/mermaid-cli``
   
   This will create an ``exported_diagrams/`` directory with high-quality vector (SVG) and raster (PNG) versions 
   of every diagram, along with an interactive HTML gallery (``index.html``) for easy browsing and downloading.

Architecture Diagrams
~~~~~~~~~~~~~~~~~~~~~

System Architecture Overview
^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Complete system architecture showing all major components and their connections.

*See full context in:* :doc:`architecture/system_components`

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

Component Class Diagram
^^^^^^^^^^^^^^^^^^^^^^^

Object-oriented view of system components and their relationships.

*See full context in:* :doc:`architecture/system_components`

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

Message Type Distribution
^^^^^^^^^^^^^^^^^^^^^^^^^^

Pie chart showing typical message distribution during a race session.

*See full context in:* :doc:`architecture/scaling`

.. mermaid::

   pie title Message Type Distribution (Typical Race Session)
       "Cell Voltage Data (50-57)" : 35
       "Motor Controller (TCU)" : 20
       "IMU/GPS Data" : 15
       "Temperature Sensors" : 12
       "Analog Sensors" : 10
       "Aerodynamic Sensors" : 5
       "Other Systems" : 3

Data Flow Diagrams
~~~~~~~~~~~~~~~~~~

End-to-End Data Flow Sequence
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Complete sequence diagram showing data flow from device to frontend.

*See full context in:* :doc:`architecture/data_flow`

.. mermaid::

   sequenceDiagram
       participant Device as ESP32/CSV Simulator
       participant Ingest as WebSocket Ingest Server
       participant Decoder as CAN Decoder
       participant Processor as Data Processor
       participant DB as TimescaleDB
       participant Hub as WebSocket Hub
       participant Frontend as Frontend Application
       
       Device->>Ingest: Raw CAN Frame (Binary)
       Ingest->>Decoder: Raw Bytes
       Decoder->>Processor: Decoded Signal Map
       
       alt Special Frame IDs (50-57)
           Processor->>DB: Direct Batch Insert
           Processor->>Hub: Real-time Message
       else Other Frames
           Processor->>DB: Add to Batch
           Processor->>Hub: Real-time Message
       end
       
       DB-->>Frontend: Historical Data (via REST API)
       Hub->>Frontend: Real-time Binary Protobuf
       Frontend->>Frontend: Decode & Visualize

WebSocket Communication Flow
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Detailed sequence showing WebSocket protocol interactions.

*See full context in:* :doc:`networking/websocket_protocol`

.. mermaid::

   sequenceDiagram
       participant Device as ESP32/Simulator
       participant Ingest as Ingest Server<br/>(port 9091)
       participant Processor as Data Processor
       participant Hub as WebSocket Hub<br/>(port 9094)
       participant Frontend as Frontend Client
       participant DB as TimescaleDB
       
       Note over Device,Frontend: Connection Establishment
       Frontend->>Hub: WebSocket Connect
       Hub-->>Frontend: Connection Accepted
       
       Note over Device,Frontend: Data Ingestion & Processing
       Device->>Ingest: Binary CAN Frame
       Ingest->>Processor: Raw Bytes
       Processor->>Processor: Decode CAN
       Processor->>DB: Batch Insert
       Processor->>Hub: Protobuf Message
       
       Note over Device,Frontend: Real-time Broadcasting
       Hub->>Hub: Check Subscribers
       Hub->>Frontend: Binary Protobuf
       Frontend->>Frontend: Decode Message
       Frontend->>Frontend: Update UI
       
       Note over Device,Frontend: Heartbeat Mechanism
       loop Every 15 seconds
           Frontend->>Hub: Ping
           Hub-->>Frontend: Pong
       end
       
       Note over Device,Frontend: Connection Teardown
       Frontend->>Hub: Disconnect
       Hub-->>Frontend: Connection Closed

Backend Diagrams
~~~~~~~~~~~~~~~~

Database Entity Relationship Diagram
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Schema showing key database tables and their structures.

*See full context in:* :doc:`backend/database`

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

Processing Timeline (Gantt Chart)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

Timing breakdown for processing a single telemetry message.

*See full context in:* :doc:`backend/performance_tuning`

.. mermaid::

   gantt
       title Telemetry Message Processing Timeline
       dateFormat SSS
       axisFormat %L ms
       
       section Ingestion
       WebSocket Receive           :a1, 000, 5ms
       Pool Allocation            :a2, after a1, 2ms
       
       section Worker Pool
       Queue Wait                 :a3, after a2, 10ms
       Worker Assignment          :a4, after a3, 1ms
       
       section Decoding
       DBC Lookup                 :a5, after a4, 3ms
       Bit Extraction             :a6, after a5, 5ms
       Value Scaling              :a7, after a6, 2ms
       
       section Processing
       Route by Frame ID          :a8, after a7, 1ms
       Create Typed Record        :a9, after a8, 2ms
       Add to Batch              :a10, after a9, 3ms
       
       section Broadcasting
       Protobuf Encoding         :a11, after a9, 8ms
       Hub Broadcast             :a12, after a11, 2ms
       
       section Storage
       Batch Collection          :a13, after a10, 50ms
       Database Insert           :a14, after a13, 150ms

Worker Pool Architecture
^^^^^^^^^^^^^^^^^^^^^^^^

Flowchart showing concurrent message processing architecture.

*See full context in:* :doc:`backend/performance_tuning`

.. mermaid::

   flowchart TB
       subgraph Ingestion
           WS[WebSocket<br/>Receiver]
       end
       
       subgraph Worker Pool
           Q[Job Queue<br/>Channel]
           W1[Worker 1]
           W2[Worker 2]
           W3[Worker 3]
           W4[Worker N]
       end
       
       subgraph Processing
           DEC[CAN Decoder]
           PROC[Data Processor]
       end
       
       subgraph Output
           DB[(Database<br/>Batch)]
           HUB[WebSocket<br/>Hub]
       end
       
       WS -->|Non-blocking| Q
       Q --> W1
       Q --> W2
       Q --> W3
       Q --> W4
       W1 --> DEC
       W2 --> DEC
       W3 --> DEC
       W4 --> DEC
       DEC --> PROC
       PROC --> DB
       PROC --> HUB

Frontend Diagrams
~~~~~~~~~~~~~~~~~

WebSocket Connection State Machine
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

State diagram showing all possible connection states and transitions.

*See full context in:* :doc:`frontend/websocket_client`

.. mermaid::

   stateDiagram-v2
       [*] --> DISCONNECTED
       
       DISCONNECTED --> CONNECTING: connect()
       
       CONNECTING --> CONNECTED: Connection Success
       CONNECTING --> ERROR: Connection Failed
       CONNECTING --> DISCONNECTED: Manual Cancel
       
       CONNECTED --> DISCONNECTED: disconnect()
       CONNECTED --> RECONNECTING: Connection Lost
       CONNECTED --> CONNECTED: Ping/Pong Success
       
       RECONNECTING --> CONNECTED: Reconnection Success
       RECONNECTING --> ERROR: Max Retries Exceeded
       RECONNECTING --> DISCONNECTED: Manual Cancel
       
       ERROR --> CONNECTING: Retry
       ERROR --> DISCONNECTED: Give Up
       
       note right of CONNECTED
           Heartbeat active
           Messages flowing
           Subscribers notified
       end note
       
       note right of RECONNECTING
           Exponential backoff
           Attempt counter
           Max 3 retries
       end note

Related Resources
-----------------

For more detailed information on specific topics:

* **CAN Bus**: See :doc:`integration/can_messages` and :doc:`backend/can_decoder`
* **Database**: See :doc:`backend/database` for TimescaleDB and hypertable details
* **Performance**: See :doc:`backend/performance_tuning` for sync.Pool and optimization techniques
* **Protobuf**: See :doc:`frontend/protobuf_integration` and :doc:`networking/protobuf_messages`
* **WebSockets**: See :doc:`networking/websocket_protocol` for communication details
* **Diagrams**: This documentation uses Mermaid for all diagrams - see above for types and examples
