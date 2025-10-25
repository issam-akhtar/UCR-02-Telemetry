Data Processing
==============

This document describes the data processing component of the UCR-02-Telemetry system, which is responsible for routing decoded CAN messages, batch processing data for database insertion, and broadcasting real-time updates.

Introduction
-----------

The data processing package is a critical component that handles all telemetry data after it has been decoded from raw CAN frames. It performs several key functions:

1. **Message Routing**: Routes decoded messages based on their CAN frame ID
2. **Data Processing**: Converts decoded values into strongly typed records
3. **Database Batching**: Buffers records for efficient batch insertion into the database
4. **Real-time Broadcasting**: Prepares and broadcasts messages for real-time display

Implementation
------------

The data processing package is implemented in Go and is located in the `processdata` package:

* **Message Router**: The `HandleDataInsertions` function routes messages by frame ID
* **Batch Processors**: Multiple BatchProcessor instances handle different data types
* **Special Frame Handlers**: Special handling for critical data like cell voltage frames (IDs 50-57)

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``backend-processing/pkg/processdata/processdata.go``
     - Core implementation that routes messages, processes data, and manages batch operations
   * - ``backend-processing/pkg/processdata/throttler.go``
     - Implements rate limiting for high-frequency message types
   * - ``backend-processing/pkg/types/types.go``
     - Contains type definitions for all telemetry data structures

BatchProcessor Structure
---------------------

The system uses batch processors to buffer records for efficient database insertion:

.. code-block:: go

    type BatchProcessor struct {
        data          []interface{}
        batchSize     int
        maxWait       time.Duration
        lastFlush     time.Time
        mu            sync.Mutex
        processorFunc func([]interface{})
    }

Each processor:

1. Collects data until a batch size threshold is reached
2. Automatically flushes after a maximum wait time
3. Uses a dedicated processing function for its data type
4. Implements thread-safe batch management with mutexes

Message Routing
-------------

Messages are routed based on frame ID through the `HandleDataInsertions` function:

.. code-block:: go

    func HandleDataInsertions(
        frameID uint32,
        decoded map[string]interface{},
        cellDataBuffers map[float64]*types.Cell_Data,
        recordCount int,
        path string,
    ) {
        switch frameID {
        case 4:
            processPackCurrentData(decoded)
        case 5:
            processPackVoltageData(decoded)
        // Additional cases for other frame IDs
        case 50, 51, 52, 53, 54, 55, 56, 57:
            // Cell data is handled separately for optimal performance
            if cellDataBuffers != nil {
                processCellDataInBuffer(frameID, decoded, cellDataBuffers, path)
            }
        // More cases...
        default:
            // Unrecognized frame; no action taken.
        }
    }


Each frame ID has a dedicated processing function that:
1. Creates a typed record from the decoded data
2. Adds the record to its corresponding batch processor
3. Builds and broadcasts a real-time message

Data Flow
--------

The typical data flow through the processing system is:

1. **CAN Frame Decoding**: Raw CAN frame is decoded into named signals
2. **Message Routing**: `HandleDataInsertions` routes by frame ID
3. **Record Creation**: Signal values are converted to typed records
4. **Batch Collection**: Records are added to type-specific batch processors
5. **Database Storage**: Batches are periodically flushed to the database
6. **Real-time Broadcast**: Messages are formatted and broadcast to WebSocket clients

Special Frame Handling
--------------------

Cell voltage data (frame IDs 50-57) receives special treatment:

1. Bypasses the worker pool for lowest possible latency
2. Uses a shared buffer to aggregate values from multiple frames
3. Processes synchronously to ensure data consistency
4. Broadcasts only when all values are collected

Real-time Broadcasting
-------------------

The system converts processed data to binary Protobuf messages for real-time broadcasting:

.. code-block:: go

    func broadcastTelemetry(payloadMap map[string]interface{}) {
        // Convert map to Protobuf structure
        // Marshal to binary format
        // Send to WebSocket hub
    }

This ensures efficient network utilization and minimal client-side processing.

Performance Optimization
---------------------

Several optimizations improve data processing performance:

* **Batch Processing**: Reduces database load by grouping inserts
* **Non-blocking Sends**: Implements backpressure by dropping messages when overloaded
* **Type-specific Processors**: Optimizes for the unique characteristics of each data type
* **Special Cell Handling**: Provides lowest latency for critical cell voltage data

Adding New Message Types
---------------------

To add support for a new CAN message:

1. Add a new case in `HandleDataInsertions` function
2. Create a processing function with the pattern `processYourData(decoded)`
3. Define a typed record structure in `pkg/types/types.go`
4. Create a batch processor in `InitBatchProcessors`
5. Implement a helper function `AddYourDataToBatch`

These steps ensure consistent processing across all message types.