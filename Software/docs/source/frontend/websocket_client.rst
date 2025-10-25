WebSocket Client
==============

This document describes the WebSocket client implementation in the UCR-02-Telemetry frontend application, which handles real-time data communication with the backend.

Introduction
-----------

The WebSocket client is responsible for establishing and maintaining a real-time connection to the backend WebSocket server. It handles reconnection, subscription management, binary message decoding, and distribution of data to interested components.

Implementation
------------

The WebSocket client is implemented as a service class that encapsulates WebSocket functionality and provides a clean interface for other components to consume.

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``telemetry-app/src/services/websocket.js``
     - Core WebSocket service implementation with connection management and subscription handling
   * - ``telemetry-app/src/utils/protobuf.js``
     - Binary Protobuf message loading and decoding functionality
   * - ``telemetry-app/src/hooks/useRealTimeData.js``
     - React hook for subscribing to real-time data streams
   * - ``telemetry-app/src/contexts/WebSocketContext.jsx``
     - React context provider for application-wide WebSocket access

WebSocket Service
---------------

The WebSocket service provides these key features:

* **Connection Management**: Establishes and maintains connection to the backend
* **Auto-Reconnection**: Automatically reconnects on disconnection with exponential backoff
* **Heartbeat Mechanism**: Implements ping/pong heartbeat to detect disconnections
* **Subscription Management**: Allows components to subscribe to specific message types
* **Binary Decoding**: Decodes binary Protobuf messages into JavaScript objects
* **Connection Status**: Provides observable connection state

Connection States
--------------

The WebSocket connection can be in one of these states:

* **DISCONNECTED**: No active connection
* **CONNECTING**: Connection attempt in progress
* **CONNECTED**: Active connection established
* **RECONNECTING**: Connection lost, reconnection in progress
* **ERROR**: Connection error occurred

State Diagram
~~~~~~~~~~~~~

The following state diagram illustrates the WebSocket connection state machine:

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

Connection Lifecycle
-----------------

The WebSocket connection follows this lifecycle:

1. **Initialization**: Service is created with target WebSocket URL
2. **Connection**: `connect()` method initiates connection attempt
3. **Handshake**: WebSocket handshake completes, state changes to CONNECTED
4. **Data Exchange**: Binary messages received and distributed to subscribers
5. **Heartbeat**: Periodic ping/pong messages maintain connection health
6. **Disconnection**: Connection lost due to network issues or server shutdown
7. **Reconnection**: Automatic reconnection attempts with backoff strategy
8. **Termination**: `disconnect()` method manually closes connection

Subscription Model
---------------

The WebSocket service implements a publisher-subscriber pattern:

* Components subscribe to specific message types (e.g., 'cell_voltage', 'motor_temp')
* When a matching message arrives, the service notifies all subscribers for that type
* Subscriptions are managed through unique IDs to prevent memory leaks
* Components must unsubscribe when unmounting to prevent memory leaks

Code Example:

.. code-block:: jsx

   // In a React component
   import { useRealTimeData } from '../hooks/useRealTimeData';
   
   function TemperatureDisplay() {
     // Subscribe to temperature data
     const temperatureData = useRealTimeData('temperature');
     
     return (
       <div>
         Current Temperature: {temperatureData ? temperatureData.value : 'Loading...'}°C
       </div>
     );
   }

Error Handling
------------

The WebSocket service implements robust error handling:

* **Connection Failures**: Automatically retried with exponential backoff
* **Decoding Errors**: Logged and skipped to prevent application crashes
* **Invalid Messages**: Validated before distribution to subscribers
* **Network Changes**: Detects network changes and reconnects if needed

Performance Optimizations
----------------------

The WebSocket implementation includes these performance optimizations:

* **Message Batching**: Processes multiple messages in batches when available
* **Binary Protocol**: Uses binary Protobuf messages for efficient data transfer
* **Selective Updates**: Components only receive messages they subscribe to
* **Throttling**: High-frequency data types can be throttled to prevent UI freezing
* **Pooling**: Object pooling for frequent operations to reduce garbage collection

Browser Compatibility
------------------

The WebSocket implementation is compatible with all modern browsers:

* Chrome 16+
* Firefox 11+
* Safari 7+
* Edge 12+

Known Limitations:

* No WebSocket compression support
* No automatic protocol downgrade for older browsers
* Limited support for very high frequency data streams (>100 messages/second)