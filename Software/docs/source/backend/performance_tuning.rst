Performance Tuning
================

This document describes the performance optimization techniques used in the UCR-02-Telemetry system to handle high-throughput telemetry data efficiently.

Introduction
-----------

The UCR-02-Telemetry system is designed to handle high-volume, real-time telemetry data with minimal latency and resource usage. To achieve this, several performance optimization techniques are employed throughout the codebase, focusing on efficient memory management, concurrency control, and data processing.

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``backend-processing/cmd/telemetryserver/main.go``
     - Worker pool implementation and memory pooling for ingest data
   * - ``backend-processing/pkg/candecoder/candecoder.go``
     - Memory-optimized CAN decoding with map pooling
   * - ``backend-processing/pkg/processdata/processdata.go``
     - Batch processing implementation with throttling
   * - ``backend-processing/internal/wsserver/hub.go``
     - Non-blocking WebSocket broadcast implementation

Memory Management with sync.Pool
------------------------------

One of the most significant optimizations is the use of `sync.Pool` to reduce garbage collection pressure by reusing frequently allocated objects.

### Byte Slice Pooling

.. code-block:: go

    var dataBytePool = sync.Pool{
        New: func() interface{} {
            // Maximum expected message length
            b := make([]byte, 64)
            return &b
        },
    }

    // Usage
    dataBytePtr := dataBytePool.Get().(*[]byte)
    dataBytes := (*dataBytePtr)[:dataLen] // Reslice without allocation

    // Process data...

    // Return to pool when done
    dataBytePool.Put(dataBytePtr)

This prevents allocating a new byte slice for each incoming message, significantly reducing GC overhead.

### Map Pooling in CAN Decoder

.. code-block:: go

    var decodedMapPool = sync.Pool{
        New: func() interface{} {
            return make(map[string]string, 32)
        },
    }

    // Usage
    decodedMap := decodedMapPool.Get().(map[string]string)
    for k := range decodedMap {
        delete(decodedMap, k) // Clear before reuse
    }

    // Fill map with decoded values...

    // Return to pool or pass to next stage

Reusing maps avoids both the allocation cost and the subsequent GC overhead.

### Critical: Proper Pool Usage

It's essential to return objects to the pool on ALL code paths:

.. code-block:: go

    dataBytePtr := dataBytePool.Get().(*[]byte)
    defer dataBytePool.Put(dataBytePtr) // Ensure return even on errors

Or in conditional paths:

.. code-block:: go

    if err != nil {
        dataBytePool.Put(dataBytePtr) // Return on error path
        return
    }
    // Process normally...
    dataBytePool.Put(dataBytePtr) // Return on success path

Non-blocking Channels for Backpressure
-----------------------------------

The system uses non-blocking channel sends to implement automatic backpressure:

.. code-block:: go

    // Non-blocking send to worker pool
    select {
    case jobChan <- dataJob:
        // Job submitted successfully
    default:
        // Channel is full, discard job and return bytes to pool
        dataBytePool.Put(dataBytePtr)
        // Could increment a metrics counter here
    }

This pattern:
1. Attempts to send the job to the worker channel
2. If the channel buffer is full, immediately discards the job
3. Returns pooled resources to prevent leaks
4. Maintains system stability under high load

The same pattern is used for WebSocket broadcasting:

.. code-block:: go

    // In main.go
    processdata.BroadcastFunc = func(msg []byte) {
        select {
        case wsserver.WsHub.Broadcast <- msg:
            // Message accepted for broadcast
        default:
            // Channel full, message dropped
        }
    }

Worker Pool for Parallel Processing
--------------------------------

Performance Timeline
~~~~~~~~~~~~~~~~~~

The following Gantt chart illustrates the typical timing for processing a single telemetry message through the system:

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

.. note::
   Total latency from ingestion to frontend: ~40ms (excluding database batch wait)
   Database inserts happen asynchronously in batches for optimal throughput.

Worker Pool Architecture
~~~~~~~~~~~~~~~~~~~~~

A worker pool distributes processing load across multiple goroutines:

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

Implementation Code
~~~~~~~~~~~~~~~~~

.. code-block:: go

    // Create worker pool
    jobChan := make(chan dataJob, workerQueueSize)
    for i := 0; i < workerCount; i++ {
        go worker(jobChan, &wg)
    }

    // Worker function
    func worker(jobChan <-chan dataJob, wg *sync.WaitGroup) {
        wg.Add(1)
        defer wg.Done()
        
        for job := range jobChan {
            // Process job...
            decoded, err := candecoder.DecodeMessage(job.data, job.msgDef)
            if err == nil {
                processdata.HandleDataInsertions(job.frameID, decoded, nil, 0, job.mode)
            }
            
            // Return pooled resources
            dataBytePool.Put(&job.data)
        }
    }

This enables parallel processing of telemetry messages while controlling concurrency.

Batch Processing for Database Operations
-------------------------------------

Database operations use batching to minimize I/O overhead:

.. code-block:: go

    // In processdata.go
    func AddCellDataToBatch(data types.Cell_Data) {
        cellBatchProcessor.mu.Lock()
        defer cellBatchProcessor.mu.Unlock()
        
        cellBatchProcessor.data = append(cellBatchProcessor.data, data)
        
        // Flush if batch size threshold reached or timeout elapsed
        if len(cellBatchProcessor.data) >= cellBatchProcessor.batchSize ||
           time.Since(cellBatchProcessor.lastFlush) >= cellBatchProcessor.maxWait {
            go cellBatchProcessor.processorFunc(cellBatchProcessor.data)
            cellBatchProcessor.data = make([]interface{}, 0, cellBatchProcessor.batchSize)
            cellBatchProcessor.lastFlush = time.Now()
        }
    }

This batches multiple records into a single database transaction, dramatically reducing I/O overhead.

Special Frame Handling for Critical Data
-------------------------------------

Cell voltage data (frames 50-57) receives special handling for lowest possible latency:

.. code-block:: go

    // In main.go
    if frameID >= 50 && frameID <= 57 {
        // Process cell data frames immediately for lowest latency
        decoded, err := candecoder.DecodeMessage(dataBytes, msgDef)
        if err == nil {
            processCellData(uint32(frameID), decoded, msgDef, "csv")
        }
        dataBytePool.Put(dataBytePtr) // Return to pool
    } else {
        // Send other frames to worker pool
        // ...
    }

This bypasses the worker pool for critical data that requires minimal latency.

Efficient Data Structures
----------------------

The system uses efficient data structures optimized for its access patterns:

1. **Maps for O(1) lookups**: Used for message definitions keyed by frame ID
2. **Slices for sequential access**: Used for batch processing and buffering
3. **Channels for concurrent communication**: Used for worker pools and broadcasting
4. **Mutex protection for shared resources**: Used to protect maps and batches

Cache-Friendly Code
----------------

The code is optimized to be cache-friendly:

1. **Localized data access**: Related data is kept together
2. **Minimized pointer chasing**: Direct value access where possible
3. **Batch processing**: Sequential memory access patterns
4. **Fixed-size buffers**: Preallocated to avoid resizing

Database Optimizations
-------------------

The database layer includes several optimizations:

1. **Connection pooling**: Limited number of connections with `db.SetMaxOpenConns(15)`
2. **Prepared statements**: Reused within transactions to reduce parsing overhead
3. **TimescaleDB hypertables**: Time-partitioned tables for efficient queries
4. **BRIN indexes**: Block Range INdexes for time-series data
5. **Data compression**: Automatic compression of older data

WebSocket Optimizations
-------------------

The WebSocket server is optimized for high-throughput broadcasting:

1. **Binary Protobuf messages**: Compact binary format
2. **Non-blocking broadcast**: Prevents slow clients from affecting the system
3. **Connection limits**: Prevents resource exhaustion (`maxClients = 25`)
4. **Buffer size tuning**: Optimized read/write buffer sizes

API Performance Optimizations
--------------------------

The REST API includes performance optimizations:

1. **Response caching**: Short-lived in-memory cache for identical queries
2. **Query timeouts**: Prevents long-running queries
3. **Parameter validation caching**: Reuses validated pagination parameters
4. **HTTP cache headers**: Instructs clients to cache responses

Conclusion
---------

These performance optimizations work together to create a system capable of handling high-throughput telemetry data with minimal latency and resource usage. The careful management of memory, concurrency, and I/O operations ensures the system remains stable and responsive under various load conditions.