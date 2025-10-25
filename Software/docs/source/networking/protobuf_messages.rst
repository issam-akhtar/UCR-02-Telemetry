Protocol Buffer Integration
=========================

This section describes how Protocol Buffers (Protobuf) are used for binary message serialization in the UCR-02-Telemetry system.

Protocol Buffers Overview
------------------------

Protocol Buffers are Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data. The UCR-02-Telemetry system uses Protocol Buffers for efficient binary serialization of messages between the backend and frontend.

Key Benefits
~~~~~~~~~~~

* **Compact Binary Format**: Smaller payload size compared to JSON (30-40% smaller)
* **Schema Definition**: Strong typing ensures consistent data format
* **Cross-Language Support**: Works in both Go (backend) and JavaScript (frontend)
* **Performance**: Faster serialization/deserialization than JSON

Message Structure
---------------

The telemetry system uses a simple message structure defined in ``telemetry.proto``:

.. code-block:: protobuf

   syntax = "proto3";

   package telemetry;

   option go_package = "telem-system/proto";

   import "google/protobuf/struct.proto";

   // TelemetryMessage is a unified message that carries a type, payload and time.
   // The payload is represented using a google.protobuf.Struct.
   message TelemetryMessage {
     string type = 1;
     google.protobuf.Struct payload = 2;
     string time = 3;
   }

This design uses ``google.protobuf.Struct`` as a flexible container for different types of telemetry data.

Implementation Details
--------------------

Backend (Go)
~~~~~~~~~~~

In the backend, Protocol Buffers are used to create binary messages for WebSocket transmission:

.. code-block:: go

   import "telem-system/proto"
   import "google.golang.org/protobuf/types/known/structpb"

   // Create payload
   payload, err := structpb.NewStruct(map[string]interface{}{
       "rpm": 7500,
       "temp": 95.2,
   })

   // Create message
   message := &proto.TelemetryMessage{
       Type:    "bamocar_data",
       Payload: payload,
       Time:    time.Now().Format(time.RFC3339),
   }

   // Serialize to binary
   data, err := proto.Marshal(message)

   // Send via WebSocket
   client.Send(data)

Frontend (JavaScript)
~~~~~~~~~~~~~~~~~~

The frontend uses protobuf.js to decode binary messages:

.. code-block:: javascript

   import { loadTelemetryProto, decodeTelemetryMessage } from '../utils/protobuf';

   // Load proto definitions
   const protoRoot = await loadTelemetryProto();

   // Handle WebSocket message
   socket.onmessage = (event) => {
       try {
           // Get binary data
           const buffer = event.data;
           
           // Decode using protobuf
           const message = decodeTelemetryMessage(protoRoot, buffer);
           
           // Process decoded message
           processMessage(message.type, message.payload, message.time);
       } catch (error) {
           console.error("Error decoding message:", error);
       }
   };

Loading Protocol Definitions
--------------------------

The frontend must load Protocol Buffer definitions in the correct order:

1. First load ``struct.proto`` from Google's Protobuf library
2. Then load ``telemetry.proto`` which imports struct.proto

.. code-block:: javascript

   export const loadTelemetryProto = async () => {
     try {
       // Load struct.proto first
       const root = await protobuf.load('/proto/google/protobuf/struct.proto');
       
       // Then load telemetry.proto which depends on struct.proto
       await root.load('/proto/telemetry.proto');
    
       return root;
     } catch (error) {
       console.error("Proto loading failed:", error);
       throw error;
     }
   };

Differences from gRPC
-------------------

It's important to note that while the system uses Protocol Buffers for message serialization, it does **not** use gRPC:

* **Direct WebSocket Transport**: Messages are sent directly over WebSockets rather than using gRPC's HTTP/2 transport
* **No Remote Procedure Calls**: There are no RPC service definitions in the .proto files
* **Custom Message Handling**: The system implements custom message routing rather than using gRPC's service-based approach
* **Browser Compatibility**: This approach avoids browser compatibility issues that can arise with gRPC-web

Message Types
-----------

Common message types transmitted in the system include:

* ``cell_data``: Battery cell voltage information
* ``bamocar_data``: Motor controller data
* ``gps_data``: GPS position information
* ``imu_data``: Inertial measurement unit data
* ``system_status``: System status and error information

Each type uses the same ``TelemetryMessage`` wrapper with a type-specific payload structure.

Debugging Protocol Buffer Messages
-----------------------------

For debugging binary Protobuf messages, you can use the ``protoc`` command-line tool:

.. code-block:: bash

   # Save a binary message to a file
   # Then decode it using protoc
   protoc --decode_raw < message.bin

This will output the message structure without requiring the .proto definitions.