Design Decisions
================

This section explains the key architectural decisions made during the development of the UCR-02-Telemetry system, the rationale behind them and their implications.

Communication Protocol Decisions
--------------------------------

**Decision**: WebSockets for real-time data with Protobuf encoding

**Rationale**:

* **Full-Duplex**: WebSockets provide full-duplex communication for real-time updates
* **Efficiency**: Binary Protobuf encoding reduces payload size compared to JSON (30-40% smaller)
* **Schema Definition**: Strong typing with Protocol Buffers ensures consistent data format
* **Cross-Language Support**: Protobuf works across multiple languages (Go, JavaScript)

**Alternatives Considered**:

* **REST API with Polling**: Rejected due to higher latency and network overhead
* **Server-Sent Events**: Considered but WebSockets offered more flexibility
* **JSON over WebSockets**: Rejected due to larger payload size and parsing overhead
* **MQTT**: Considered but WebSockets offered better browser support and simpler integration

Performance Optimization Decisions
---------------------------------

Memory Management with sync.Pool
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Decision**: Use Go's `sync.Pool` for byte slices and maps in the telemetry server and CAN decoder.

**Rationale**:

* Minimizes garbage collection pressure during high-frequency data processing
* Reduces memory allocations in hot paths
* Improves overall throughput and latency

**Implementation**:

.. code-block:: go

   var dataBytePool = sync.Pool{
       New: func() interface{} {
           b := make([]byte, 64)
           return &b
       }
   }

   // Usage
   dataBytes := dataBytePool.Get().(*[]byte)
   defer dataBytePool.Put(dataBytes)

**Trade-offs**:

* Increased code complexity
* Risk of memory leaks if objects aren't returned to pool
* Requires careful error handling to ensure objects are always returned

Non-blocking Channel Operations
~~~~~~~~~~~~~~~~~~~~~~~~~~

**Decision**: Use non-blocking sends on channels with intentional message dropping under load.

**Rationale**:

* Prevents system lockup during load spikes
* Implements backpressure to maintain system stability
* Prioritizes real-time data over completeness

**Implementation**:

.. code-block:: go

   select {
   case jobChan <- dataJob:
       // Job accepted
   default:
       // Channel full, drop job and return buffer to pool
       dataBytePool.Put(dataJob.data)
   }

**Trade-offs**:

* Potential data loss during high load
* May miss important telemetry during overload
* Complicates monitoring and debugging

Batch Database Operations
~~~~~~~~~~~~~~~~~~~~~~

**Decision**: Use batched database operations instead of individual inserts.

**Rationale**:

* Dramatically improves database write throughput
* Reduces database connection overhead
* Optimizes network usage between application and database

**Implementation**:

* Accumulate records in memory batches
* Flush batches based on size or time thresholds
* Use bulk insert operations

**Trade-offs**:

* Increased memory usage for batched data
* Slight increase in data latency
* Added complexity for batch management

Database Design Decisions
------------------------

TimescaleDB Selection
~~~~~~~~~~~~~~~~~~~~

**Decision**: Use PostgreSQL with TimescaleDB extension instead of other time-series databases.

**Rationale**:

* Combines SQL query flexibility with time-series optimization
* Mature ecosystem with robust tooling
* Supports hypertables for efficient time-partitioned storage
* Built-in compression and retention policies

**Implementation**:

* Hypertables for all telemetry data
* Compression policies for older data
* Retention policies for automatic data management

**Trade-offs**:

* Requires more configuration than some NoSQL alternatives
* Potentially higher resource requirements
* Learning curve for TimescaleDB-specific features

Schema Design
~~~~~~~~~~~~

**Decision**: Create separate hypertables for different telemetry types instead of a unified table.

**Rationale**:

* Allows for type-specific optimizations
* Improves query performance by reducing table size
* Enables different retention policies for different data types

**Implementation**:

* Type-specific tables (cell_data, bamocar_data, etc.)
* Common timestamp column for time-based queries
* Foreign key relationships where appropriate

**Trade-offs**:

* Increased schema complexity
* More tables to manage
* Requires joins for some cross-type queries

Communication Protocol Decisions
------------------------------

Protocol Buffers for Real-time Data
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

**Decision**: Use Protocol Buffers (Protobuf) instead of JSON for real-time data transmission.

**Rationale**:

* More efficient binary format reduces network bandwidth
* Schema-based serialization ensures type safety
* Better performance for high-frequency updates
* Cross-language compatibility

**Implementation**:

* Define message schemas in .proto files
* Generate code for both backend and frontend
* Use binary encoding for WebSocket messages

**Trade-offs**:

* Added complexity compared to JSON
* Requires code generation step
* Less human-readable for debugging

WebSocket for Real-time Updates
~~~~~~~~~~~~~~~~~~~~~~~~~~

**Decision**: Use WebSockets instead of HTTP polling or Server-Sent Events.

**Rationale**:

* Full-duplex communication enables true push updates
* Lower latency than polling approaches
* Better handling of connection state
* Support for binary data transmission

**Implementation**:

* Separate WebSocket servers for ingest and frontend
* Hub pattern for efficient broadcasting
* Connection management with auto-reconnect

**Trade-offs**:

* More complex connection management
* Potential firewall/proxy issues
* Requires careful handling of disconnections

Frontend Architecture Decisions
----------------------------

React with Vite
~~~~~~~~~~~~

**Decision**: Use React with Vite build system instead of other frontend frameworks.

**Rationale**:

* Component-based architecture suits visualization needs
* Strong ecosystem and community support
* Vite provides fast development experience
* Good performance for real-time updates

**Implementation**:

* Single-page application architecture
* Component-based visualization modules
* Context API for state management

**Trade-offs**:

* Learning curve for React
* Bundle size considerations
* Potential performance issues with large datasets

### 3D/SVG Visualization Strategy

**Decision**: Use SVG for most visualizations with 3D models for specific components.

**Rationale**:

* SVG provides better performance for 2D visualizations
* 3D models enhance understanding of spatial data
* Mixed approach balances performance and visual clarity

**Implementation**:

* SVG-based dashboards for gauges and charts
* 3D models for battery segments and vehicle components

**Trade-offs**:

* Increased complexity with mixed visualization types
* Performance considerations for 3D rendering
* Higher asset management overhead

Deployment Decisions
-------------------

Docker with Host Networking
~~~~~~~~~~~~~~~~~~~~~~~~

**Decision**: Deploy using Docker with host networking mode.

**Rationale**:

* Simplifies WebSocket communication between services
* Avoids port mapping complexities
* Enables direct access to host network interfaces

**Implementation**:

* Docker Compose for multi-container setup
* Host network mode for frontend and backend containers
* Environment variables for configuration

**Trade-offs**:

* Reduced network isolation
* Less portability across environments
* Potential port conflicts with host services