Data Flow
=========

This section details the complete data flow through the UCR-02-Telemetry system, from data generation at the source to visualization in the frontend.

End-to-End Data Flow
--------------------

The data in the telemetry system flows through multiple stages, each performing specific transformations:

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

Data Transformations
--------------------

As data moves through the system, it undergoes several transformations:

1. **Raw Binary CAN Data**:

   * Format: Binary bytes representing CAN frames
   * Example: `[0x01, 0x23, 0x45, 0x67, 0x89, 0xAB, 0xCD, 0xEF]`
   * Location: Transmitted from vehicle to ingest server

2. **Decoded Signal Map**:

   * Format: Map of signal names to values
   * Example: `{"RPM": 7500, "EngineTemp": 95.2}`
   * Location: Output from CAN decoder

3. **Typed Records**:

   * Format: Strongly-typed Go structs
   * Example: `&types.BamocarData{RPM: 7500, Temp: 95.2}`
   * Location: Created by data processor

4. **Database Records**:

   * Format: TimescaleDB hypertable rows
   * Location: Stored in database for historical analysis

5. **Protobuf Binary Messages**:

   * Format: Binary-encoded Protobuf messages
   * Location: Transmitted to frontend via WebSocket

6. **Frontend Data Objects**:

   * Format: JavaScript objects
   * Example: `{type: "bamocar_data", payload: {rpm: 7500, temp: 95.2}, time: "2025-10-05T15:30:00Z"}`
   * Location: Decoded in frontend for visualization

Data Batching
-------------

The system uses batch processing to optimize database write performance:

.. mermaid::

   flowchart TD
     subgraph Batch Processing
       A1[Record 1] --> Batch
       A2[Record 2] --> Batch
       A3[Record 3] --> Batch
       Batch --> DB[(TimescaleDB)]
     end

Batch insertion occurs:

* On reaching configured batch size (e.g., 1000 records)
* On reaching configured time interval (e.g., 1 second)
* When flushing is manually triggered

Special Processing Paths
------------------------

The system contains special processing paths for certain data types:

1. **Cell Data (Frame IDs 50-57)**:

   * Bypasses worker pool
   * Direct processing for minimal latency
   * Synchronized processing to aggregate multiple frames

2. **High-Priority Telemetry**:

   * Processed with higher priority in worker pool
   * Immediate broadcast to frontend

Real-Time vs. Historical Data
-----------------------------

The system handles two distinct data flows:

**Real-Time Flow**:

* Optimized for low latency
* Minimizes data transformations
* Binary Protobuf messages for efficient transport
* Uses WebSocket for push-based updates
* Typically 30-60Hz update frequency

**Historical Flow**:

* Optimized for query performance
* TimescaleDB hypertables with compression
* REST API with query parameters
* Pagination and filtering support
* Supports time-range queries with aggregation

Error Handling in Data Flow
---------------------------

The system implements robust error handling at multiple stages of the data flow:

.. mermaid::

   flowchart TD
     A[Ingest Error] -->|Malformed Data| B[Log & Discard]
     C[Decoding Error] -->|Invalid Frame| D[Log & Continue]
     C -->|DBC Mismatch| E[Error Notification]
     F[Processing Error] -->|Missing Signal| G[Use Default Value]
     F -->|Type Conversion| H[Log & Skip Signal]
     I[Database Error] -->|Connection Issue| J[Retry with Backoff]
     I -->|Schema Error| K[Log & Report]
     L[WebSocket Error] -->|Send Failure| M[Drop Message]
     L -->|Connection Loss| N[Auto-Reconnect]

1. **Input Validation**:

   * Checks for valid frame format and length
   * Validates CAN IDs against known definitions
   * Handles malformed input gracefully

2. **Decoding Robustness**:

   * Continues processing despite individual signal decode failures
   * Provides meaningful error context for troubleshooting
   * Falls back to default values where appropriate

3. **Database Error Recovery**:

   * Connection pooling with health checks
   * Automatic reconnection with exponential backoff
   * Transaction management for batch operations
   * Disk buffer for offline operation (future feature)

4. **Frontend Error Handling**:

   * Graceful degradation of visualizations
   * Clear error indicators for signal issues
   * Automatic WebSocket reconnection
   * Cached data display during connectivity issues