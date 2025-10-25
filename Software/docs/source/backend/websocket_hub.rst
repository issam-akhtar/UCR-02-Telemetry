WebSocket Hub
============

This document describes the WebSocket hub component of the UCR-02-Telemetry system, which is responsible for broadcasting real-time telemetry data to connected clients.

Introduction
-----------

The WebSocket hub is a critical component that efficiently delivers real-time telemetry updates to frontend clients. It manages client connections, handles connection lifecycle, and broadcasts binary Protobuf messages to all connected clients. The hub is designed for high performance with minimal overhead.

Implementation
------------

The WebSocket hub is implemented in Go using the Gorilla WebSocket library:

* **Connection Management**: Tracks active clients and handles registration/unregistration
* **Broadcasting**: Distributes binary messages to all connected clients
* **Thread Safety**: Uses mutexes to ensure thread-safe operations

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``backend-processing/internal/wsserver/hub.go``
     - Core WebSocket hub implementation that manages client connections and broadcasts messages
   * - ``proto/telemetry.proto``
     - Protocol Buffer definition for binary message format

Hub Structure
-----------

The central data structure is the `Hub` which manages all aspects of the WebSocket server:

.. code-block:: go

    type Hub struct {
        clients     map[*safeConn]bool // Active client connections
        clientsMu   sync.RWMutex       // Mutex for clients map
        Broadcast   chan []byte        // Channel for outbound messages
        Register    chan *safeConn     // Channel for new connections
        Unregister  chan *safeConn     // Channel for closed connections
        clientCount int32              // Current client count
    }

The hub uses channels for its main operations:
- `Register`: Receives new client connections
- `Unregister`: Receives closed client connections
- `Broadcast`: Receives messages to be sent to all clients

Connection Management
------------------

The hub maintains a map of active connections and provides thread-safe access:

.. code-block:: go

    type safeConn struct {
        conn  *websocket.Conn
        mutex sync.Mutex
    }

Each connection is wrapped in a `safeConn` struct that adds a mutex to ensure thread-safe writing to the WebSocket connection.

Client Lifecycle
-------------

1. **Connection Establishment**:
   
   .. code-block:: go
   
       func ServeWS(w http.ResponseWriter, r *http.Request) {
           upgrader := websocket.Upgrader{
               CheckOrigin:     func(r *http.Request) bool { return true },
               ReadBufferSize:  wsReadBufferSize,
               WriteBufferSize: wsWriteBufferSize,
           }
           wsConn, err := upgrader.Upgrade(w, r, nil)
           // Create a safe connection wrapper
           safeConn := &safeConn{conn: wsConn}
           // Register the connection
           WsHub.Register <- safeConn
       }

2. **Registration**:
   
   .. code-block:: go
   
       case conn := <-h.Register:
           h.clientsMu.Lock()
           if h.clientCount >= maxClients {
               h.clientsMu.Unlock()
               conn.conn.Close()
               continue
           }
           h.clientCount++
           h.clients[conn] = true
           h.clientsMu.Unlock()

3. **Unregistration**:
   
   .. code-block:: go
   
       case conn := <-h.Unregister:
           h.clientsMu.Lock()
           if _, ok := h.clients[conn]; ok {
               delete(h.clients, conn)
               conn.conn.Close()
               h.clientCount--
           }
           h.clientsMu.Unlock()

Broadcasting Messages
------------------

The hub efficiently broadcasts messages to all connected clients:

.. code-block:: go

    case message := <-h.Broadcast:
        h.clientsMu.RLock()
        if len(h.clients) == 0 {
            h.clientsMu.RUnlock()
            continue
        }
        conns := make([]*safeConn, 0, len(h.clients))
        for conn := range h.clients {
            conns = append(conns, conn)
        }
        h.clientsMu.RUnlock()

        var failedConns []*safeConn
        for _, conn := range conns {
            if err := conn.writeMessage(websocket.BinaryMessage, message); err != nil {
                failedConns = append(failedConns, conn)
            }
        }

        if len(failedConns) > 0 {
            h.clientsMu.Lock()
            for _, conn := range failedConns {
                delete(h.clients, conn)
                conn.conn.Close()
                h.clientCount--
            }
            h.clientsMu.Unlock()
        }

This process:
1. Takes a snapshot of current connections (using RLock for performance)
2. Attempts to send the message to each client
3. Tracks any failed sends
4. Removes failed connections in a single atomic operation

Performance Optimizations
---------------------

Several optimizations improve WebSocket performance:

* **Non-blocking Channel**: The broadcast channel has a large buffer to prevent blocking:
  
  .. code-block:: go
  
      broadcastBufferSize = 1000 // Buffer 1 seconds of 1000 msg/sec

* **Connection Limits**: Maximum concurrent clients is limited to prevent overload:
  
  .. code-block:: go
  
      maxClients = 25

* **Message Size Limits**: Prevents clients from sending excessively large messages:
  
  .. code-block:: go
  
      maxMessageSize = 8192 // 8 KB

* **Read/Write Buffer Sizes**: Optimized for the expected message patterns:
  
  .. code-block:: go
  
      wsReadBufferSize  = 1024
      wsWriteBufferSize = 4096

* **Thread-Safe Operations**: Careful use of read/write locks to minimize contention

Binary Protobuf Messages
--------------------

The hub is designed to work with binary Protobuf messages, which are generated in the `processdata` package using the protocol buffer definitions in `proto/telemetry.proto`. This provides a compact, efficient wire format for real-time data.

Messages are sent with the `websocket.BinaryMessage` type:

.. code-block:: go

    conn.writeMessage(websocket.BinaryMessage, message)

Integration with Processing Layer
-----------------------------

The WebSocket hub integrates with the data processing layer through a broadcast function:

.. code-block:: go

    // In processdata/processdata.go
    var BroadcastFunc func(msg []byte)

    func broadcastTelemetry(payloadMap map[string]interface{}) {
        // Convert to Protobuf and send to hub
        if BroadcastFunc != nil {
            BroadcastFunc(protoBytes)
        }
    }

    // In main.go
    processdata.BroadcastFunc = func(msg []byte) {
        select {
        case wsserver.WsHub.Broadcast <- msg:
            // Message accepted for broadcast
        default:
            // Channel full, message dropped (backpressure)
        }
    }

This design allows for non-blocking broadcasts with automatic backpressure.

Client-Side Integration
-------------------

The frontend connects to this WebSocket hub using the WebSocket client in `telemetry-app/src/services/websocket.js`, which handles:

1. Connection establishment
2. Binary Protobuf decoding
3. Message routing to appropriate UI components
4. Automatic reconnection
5. Connection status management