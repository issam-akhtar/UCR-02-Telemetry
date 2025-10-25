Architecture Overview
====================

The UCR-02-Telemetry system is a comprehensive data acquisition, processing, and visualization platform designed for Formula SAE Electric racecars. This architecture documentation provides a detailed overview of the system's design, components, and interactions.

System Purpose
-------------

The telemetry system serves several critical purposes:

1. **Real-time Data Monitoring**: Provides live visualization of vehicle performance data during testing and racing.

   * Battery cell voltage and temperature monitoring
   * Motor performance metrics (RPM, temperature, power)
   * Vehicle dynamics (speed, acceleration, wheel slip)
   * Aero package performance data
   * System status and error conditions

2. **Historical Data Analysis**: Stores all telemetry data for post-session analysis and performance optimization.

   * Long-term trend analysis for system performance
   * Session-to-session comparisons
   * Driver performance evaluation
   * System reliability assessment
   * Component lifecycle tracking

3. **Diagnostic Capabilities**: Enables quick identification of potential issues or anomalies in vehicle systems.

   * Real-time alerts for out-of-range values
   * Error code logging and analysis
   * Predictive maintenance indicators
   * System health monitoring
   * Failure mode analysis

4. **Performance Optimization**: Supplies data to improve vehicle setup and racing strategy.

   * Energy usage optimization
   * Thermal management strategies
   * Driving style analysis
   * Setup correlation with performance metrics
   * Track-specific optimization

High-Level Architecture
----------------------

The UCR-02-Telemetry system follows a modern distributed architecture pattern with clear separation of concerns:

.. mermaid::

   flowchart LR
     Device[Device\nESP32/CSV] --> WS[WebSocket\nIngest Server]
     WS --> Decoder[CAN Decoder]
     Decoder --> Processor[Data Processor]
     Processor --> DB[(TimescaleDB)]
     Processor --> WSHub[WebSocket Hub]
     WSHub --> FE[Frontend Application]
     DB --> API[REST API]
     API --> FE

Key System Components
-------------------

The system consists of several distinct components that work together:

1. **Data Sources**:
   - ESP32-based vehicle telemetry units transmitting CAN bus data
   - CSV simulation mode for development and testing

2. **Backend Services**:
   - WebSocket ingest server receiving raw telemetry data
   - CAN decoder for transforming raw bytes into structured signals
   - Data processor for routing, batching, and distributing messages
   - TimescaleDB for efficient time-series data storage
   - WebSocket hub for real-time data broadcasting
   - REST API for historical data queries

3. **Frontend Application**:
   - React/Vite single-page application
   - Protobuf.js for binary message decoding
   - Data visualization components
   - User interface for configuration and control

Technology Stack
---------------

The UCR-02-Telemetry system leverages modern technologies across its stack:

Backend
~~~~~~~

* **Language**: Go (Golang) 1.20+
* **WebSocket**: Gorilla WebSocket library for real-time communication
* **Concurrency**: Go routines and channels for parallel processing
* **Memory Management**: sync.Pool for object reuse and GC optimization

Database
~~~~~~~~

* **Engine**: PostgreSQL 14+ with TimescaleDB 2.x extension
* **Schema**: Hypertables for time-series data optimization
* **Performance**: Partitioning, compression, and retention policies
* **Connection**: pgx driver with connection pooling

API Layer
~~~~~~~~~

* **Router**: Chi router with middleware support
* **WebSocket**: Custom hub implementation for broadcast pattern
* **REST API**: JSON endpoints for historical data access
* **Cross-Origin**: CORS middleware for secure cross-domain requests

Frontend
~~~~~~~~

* **Framework**: React 18+ with functional components and hooks
* **Build System**: Vite for fast development and optimized production builds
* **State Management**: React Context API and custom hooks
* **Visualization**: SVG-based dashboards with 3D model integration
* **Data Handling**: Custom WebSocket client with reconnect logic

Data Serialization
~~~~~~~~~~~~~~~~~

* **Format**: Protocol Buffers (Protobuf) 3
* **Implementation**: protobuf.js for browser decoding
* **Transport**: Binary encoding for network efficiency

Deployment
~~~~~~~~~

* **Containerization**: Docker with multi-stage builds
* **Orchestration**: Docker Compose for service management
* **Networking**: Host network mode for optimal WebSocket performance
* **Configuration**: Environment variables for deployment flexibility

Design Principles
----------------

The architecture follows several key design principles:

Performance-Optimized
~~~~~~~~~~~~~~~~~~~~~

* Memory efficiency through object pooling and reuse
* Batch processing for database operations
* Non-blocking operations for improved throughput
* Minimized garbage collection pressure
* Concurrent processing with worker pools

Resiliency
~~~~~~~~~~

* Backpressure mechanisms to handle traffic spikes
* Graceful degradation under load
* Automatic reconnection for network failures
* Defensive programming with thorough error handling
* Circuit-breaking patterns for external dependencies

Maintainability
~~~~~~~~~~~~~~

* Clear separation of concerns with well-defined component boundaries
* Consistent code organization and naming conventions
* Comprehensive logging and instrumentation
* Minimal cross-component dependencies
* Well-documented interfaces between components

Extensibility
~~~~~~~~~~~~

* Modular design allows for adding new telemetry signals
* Pluggable visualization components
* Configuration-driven behavior where appropriate
* Clear extension points for new features
* Versioned protocols and APIs

Developer Experience
~~~~~~~~~~~~~~~~~~

* Fast development feedback loops
* Comprehensive documentation
* Simple local development setup
* Consistent error messages
* Automated build and test processes
* CSV simulation mode for testing without hardware

The following sections provide more detailed information about specific aspects of the architecture.