WebSocket Ingest
===============

This document describes the WebSocket ingest server component of the UCR-02-Telemetry system, which is responsible for receiving raw telemetry data from vehicles or simulators.

Introduction
-----------

The WebSocket ingest server is the entry point for all telemetry data into the system. It accepts WebSocket connections from ESP32 devices installed in the vehicle or from the CSV simulation tool, processes the incoming data, and forwards it to the CAN decoder for further processing.

Implementation
------------

The ingest server is implemented in Go using the Gorilla WebSocket library. The main components are:

* **WebSocket Server**: Listens for incoming connections on port 9091
* **Connection Handler**: Manages individual client connections
* **Message Processor**: Processes incoming binary data or CSV rows
* **Worker Pool**: Distributes processing tasks to worker goroutines
* **Memory Management**: Uses sync.Pool for efficient memory utilization

Key Files:

.. list-table::
   :widths: 60 40
   :header-rows: 1

   * - File Path
     - Functional Description
   * - ``backend-processing/cmd/telemetryserver/main.go``
     - Main entry point that initializes the WebSocket server, worker pool, and message processing pipeline

Configuration
-----------

The WebSocket ingest server can be configured through the `config.yaml` file:

* **Port**: WebSocket listening port (default: 9091)
* **Mode**: "csv" or "live" mode selection
* **Buffer Size**: Size of the receive buffer
* **Worker Count**: Number of worker goroutines
* **Logging Level**: Detail level for diagnostic logging

Message Handling
-------------

The ingest server handles messages differently based on the configured mode:

**Live Mode (Binary CAN Data)**:

1. Receives binary WebSocket messages containing CAN frames
2. Parses the frame identifier and data bytes
3. Allocates a buffer from the sync.Pool
4. Dispatches the job to a worker pool
5. Worker decodes and processes the data asynchronously

**CSV Mode (Simulated Data)**:

1. Receives CSV rows with timestamp, frame ID, and data
2. Parses the CSV format into structured data
3. Simulates timing based on timestamps
4. Processes the data through the same pipeline as live data

Performance Considerations
-----------------------

The WebSocket ingest server is designed for high performance:

* **Non-blocking Job Dispatch**: Uses select with default case
* **Memory Pooling**: Minimizes garbage collection pressure
* **Worker Pool**: Distributes load across multiple goroutines
* **Backpressure**: Implements backpressure through job dropping
* **Error Handling**: Robust error handling for connection issues

Monitoring
---------

The ingest server includes several monitoring capabilities:

* **Connection Stats**: Number of active connections
* **Throughput**: Messages received per second
* **Dropped Messages**: Count of dropped messages due to backpressure
* **Error Rates**: Counts of various error types
* **Worker Utilization**: Worker pool utilization metrics