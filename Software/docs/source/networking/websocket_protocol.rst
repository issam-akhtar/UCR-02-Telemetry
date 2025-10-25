WebSocket Protocol
=================

This document describes the WebSocket protocols used in the UCR-02-Telemetry system.

Introduction
-----------

The UCR-02-Telemetry system uses WebSockets for both data ingest and real-time data delivery to clients. This document details the WebSocket protocols, message formats, and best practices.

WebSocket Endpoints
----------------

The system provides three primary WebSocket endpoints:

1. **Raw Telemetry Ingest**: ``ws://{server}:9091/telemetry``
   - For receiving raw telemetry data from devices
   - Accepts binary CAN data or CSV formatted data

2. **Live Data Feed**: ``ws://{server}:9094/ws``
   - For frontend clients to receive real-time telemetry updates
   - Sends binary Protobuf-encoded messages

3. **Admin Channel**: ``ws://{server}:9092/admin``
   - For administrative commands and status updates
   - Uses JSON-formatted messages

Raw Telemetry Ingest Protocol
--------------------------

Message Format
~~~~~~~~~~~

For binary mode (``mode: "live"`` in config):

.. code-block:: text

   [4 bytes timestamp] [2 bytes ID] [1 byte length] [0-8 bytes data]

For CSV mode (``mode: "csv"`` in config):

.. code-block:: text

   timestamp,id,data
   1621234567.123,100,0102030405060708

Connection Handling
~~~~~~~~~~~~~~~~

The ingest WebSocket server:

1. Accepts connections on port 9091
2. Authenticates clients (if configured)
3. Processes incoming messages
4. Provides minimal feedback via ping/pong messages

Error Handling
~~~~~~~~~~~

The server responds to errors with a close frame containing an error code:

* **1000** - Normal closure
* **1002** - Protocol error (malformed message)
* **1008** - Policy violation (authentication failure)
* **1011** - Server error (internal processing error)

Live Data Feed Protocol
--------------------

Communication Flow
~~~~~~~~~~~~~~~

The following sequence diagram shows the complete WebSocket communication flow:

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

Protobuf Message Format
~~~~~~~~~~~~~~~~~~~~

All messages use the TelemetryMessage Protobuf format:

.. code-block:: protobuf

   message TelemetryMessage {
     string type = 1;
     google.protobuf.Struct payload = 2;
     string time = 3;
   }

The ``type`` field indicates the message type, such as:

* ``cell_data`` - Battery cell information
* ``motor_data`` - Motor controller data
* ``vehicle_dynamics`` - Vehicle dynamics information
* ``system_status`` - System status updates

Subscription Model
~~~~~~~~~~~~~~~

Clients can subscribe to specific message types:

.. code-block:: javascript

   // Send subscription message
   ws.send(JSON.stringify({
     action: "subscribe",
     topics: ["cell_data", "motor_data"]
   }));

Connection Management
~~~~~~~~~~~~~~~~~~

The WebSocket hub implements:

* **Client tracking** - Maintains a list of connected clients
* **Broadcast functionality** - Sends messages to all subscribers
* **Backpressure handling** - Drops messages when clients can't keep up
* **Ping/pong mechanism** - Detects disconnected clients

Code Example (Client)
~~~~~~~~~~~~~~~~~

.. code-block:: javascript

   // From telemetry-app/src/services/websocket.js
   class TelemetryWebSocket {
     constructor(url) {
       this.url = url;
       this.connectionAttempts = 0;
       this.connect();
     }
     
     connect() {
       this.ws = new WebSocket(this.url);
       
       this.ws.onopen = () => {
         this.connectionState = ConnectionState.CONNECTED;
         this.startPingPongCycle();
       };
       
       this.ws.onmessage = (event) => {
         const data = event.data;
         this.handleMessage(data);
       };
       
       this.ws.onclose = () => {
         this.reconnect();
       };
     }
     
     // Additional methods omitted for brevity
   }

Security Considerations
--------------------

The WebSocket servers implement several security measures:

* **Origin checking** - Validates the origin of WebSocket connections
* **Rate limiting** - Prevents DoS attacks by limiting connection frequency
* **Message size limits** - Prevents oversized message attacks
* **Authentication** - Optional token-based authentication

Best Practices
-----------

When working with the WebSocket protocol:

1. **Handle reconnections** - Implement exponential backoff for reconnections
2. **Process messages asynchronously** - Don't block the WebSocket event loop
3. **Implement ping/pong** - Keep connections alive and detect disconnections
4. **Handle binary data efficiently** - Use typed arrays for binary data
5. **Validate message format** - Check message format before processing