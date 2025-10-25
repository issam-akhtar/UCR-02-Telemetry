Protobuf Integration
===================

This document describes how the UCR-02-Telemetry frontend application integrates with Protocol Buffers (Protobuf) for efficient binary message handling.

Introduction
-----------

Protocol Buffers (Protobuf) is a language-neutral, platform-neutral, extensible mechanism for serializing structured data. The UCR-02-Telemetry system uses Protobuf for efficient binary message exchange between the backend and frontend.

Benefits of using Protobuf include:

* **Compact Size**: Binary format is significantly smaller than JSON
* **Parsing Efficiency**: Faster parsing than text-based formats
* **Schema Definition**: Strongly typed message structure
* **Forward/Backward Compatibility**: Easy to evolve message formats
* **Cross-Language Support**: Works consistently across different languages

Implementation
--------------

The frontend uses Protobuf.js, a pure JavaScript implementation of Protocol Buffers, to decode binary messages received from the WebSocket connection.

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``telemetry-app/src/utils/protobuf.js``
     - Protobuf loading and message decoding utilities
   * - ``telemetry-app/public/proto/telemetry.proto``
     - Protobuf message definitions for telemetry data
   * - ``telemetry-app/public/proto/google/protobuf/struct.proto``
     - Google's struct.proto dependency for dynamic values

Message Structure
----------------

The telemetry messages follow this Protobuf structure:

.. code-block:: protobuf

   message TelemetryMessage {
     string type = 1;
     google.protobuf.Struct payload = 2;
     string time = 3;
   }

This structure provides:

* **type**: Identifies the message type (e.g., 'cell_voltage', 'motor_temp')
* **payload**: Contains the actual telemetry data as a dynamic structure
* **time**: Timestamp when the message was created

Loading Process
---------------

The frontend loads Protobuf definitions in this sequence:

1. Load Google's struct.proto first (dependency)
2. Load telemetry.proto which depends on struct.proto
3. Cache the loaded definitions for future use
4. Handle any loading errors gracefully

Code Example:

.. code-block:: javascript

   export const loadTelemetryProto = async () => {
     if (cachedRoot) return cachedRoot;
     
     try {
       const root = await protobuf.load('/proto/google/protobuf/struct.proto');
       await root.load('/proto/telemetry.proto');
       cachedRoot = root;
       return root;
     } catch (error) {
       console.error("Proto loading failed:", error);
       cachedRoot = null;
       throw error;
     }
   };

Decoding Process
---------------

Binary messages from the WebSocket are decoded following these steps:

1. Get the message type from the Protobuf root
2. Verify the message is a valid binary buffer
3. Decode the binary data into a JavaScript object
4. Transform any special values (timestamps, enums)
5. Return the decoded message

Error Handling
-------------

The Protobuf implementation includes robust error handling:

* **Invalid Messages**: Validation before decoding attempts
* **Schema Mismatch**: Detection of incompatible message formats
* **Loading Failures**: Recovery mechanisms for proto file loading issues
* **Malformed Data**: Graceful handling of corrupt binary messages

Performance Optimizations
-----------------------

Several optimizations improve Protobuf handling performance:

* **Root Caching**: The Protobuf root is cached after first load
* **Message Reuse**: Message types are cached for repeated use
* **Lazy Loading**: Proto files are loaded only when needed
* **Binary Format**: Keep data in binary format as long as possible
* **Minimal Transformation**: Only transform values when necessary

Browser Compatibility
-------------------

The Protobuf.js library is compatible with all modern browsers:

* Chrome 5+
* Firefox 4+
* Safari 5+
* Edge 12+

Development Workflow
------------------

When updating Protobuf message definitions:

1. Update the .proto files in backend-processing/proto/
2. Copy the updated .proto files to telemetry-app/public/proto/
3. Ensure any new message types have corresponding frontend handlers
4. Test with the updated schema to verify compatibility

Testing Protobuf Messages
----------------------

To debug Protobuf messages:

* Use browser DevTools to inspect binary WebSocket frames
* Enable debugging in the WebSocket service to log decoded messages
* Use the `protoc --decode_raw` command-line tool to inspect binary messages
* Check for schema mismatch errors in the console

Common Issues and Solutions
-----------------------

* **"Cannot read property 'TelemetryMessage' of undefined"**: Ensure telemetry.proto is loaded correctly
* **"Illegal wire type"**: Binary message format doesn't match schema definition
* **"Required field missing"**: A required field is not present in the message
* **"Invalid bytes value"**: Corrupted binary data in the message
* **"Proto file not found"**: Check that proto files are in the correct public directory location