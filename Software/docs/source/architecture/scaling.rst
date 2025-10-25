Scaling and Performance
======================

This section discusses the performance characteristics of the UCR-02-Telemetry system, its scalability considerations, and strategies for handling increased load.

Performance Characteristics
-------------------------

The UCR-02-Telemetry system is designed to handle high-frequency telemetry data with low latency. Current performance metrics:

* **Ingest Rate**: Can process up to 10,000 CAN frames per second on modest hardware
* **End-to-End Latency**: < 50ms from device transmission to frontend visualization
* **Database Write Performance**: 5,000+ records per second with batch processing
* **Frontend Update Rate**: 60 frames per second for visualization updates

These metrics are achieved through various optimizations detailed below.

Message Type Distribution
~~~~~~~~~~~~~~~~~~~~~~~~~

The following pie chart shows the typical distribution of message types processed by the system during a race session:

.. mermaid::

   pie title Message Type Distribution (Typical Race Session)
       "Cell Voltage Data (50-57)" : 35
       "Motor Controller (TCU)" : 20
       "IMU/GPS Data" : 15
       "Temperature Sensors" : 12
       "Analog Sensors" : 10
       "Aerodynamic Sensors" : 5
       "Other Systems" : 3

.. note::
   Cell voltage data (Frame IDs 50-57) accounts for ~35% of all messages and receives special low-latency processing to ensure battery safety monitoring.

Memory Optimization
------------------

The system employs several memory optimization techniques:

1. **Object Pooling**:

   * Uses `sync.Pool` for frequently allocated objects
   * Reuses byte slices and maps to reduce GC pressure
   * Custom pooling for database batch operations

2. **Zero-Copy Processing**:

   * Minimizes data copying between processing stages
   * Passes references instead of values where possible

3. **Efficient Data Structures**:

   * Uses maps for O(1) lookups in hot paths
   * Optimized structs with proper memory alignment
   * Pre-allocated buffers for common operations

CPU Optimization
---------------

Processing efficiency is achieved through:

1. **Concurrency Model**:

   * Worker pool pattern for parallel processing
   * Dedicated goroutines for specific tasks
   * Careful use of synchronization primitives

2. **Algorithmic Efficiency**:

   * O(1) routing by frame ID
   * Cached computations for repeated operations
   * Minimized type conversions in hot paths

3. **Throttling Mechanisms**:

   * Rate limiting for high-frequency signals
   * Configurable throttling intervals
   * Adaptive throttling based on system load

Database Performance
-------------------

TimescaleDB performance is optimized through:

1. **Hypertable Design**:

   * Time-partitioned tables for efficient queries
   * Automatic partition pruning
   * Optimized chunk sizes (1-3 day intervals)
   * Proper hypertable partitioning by time dimension
   * Careful consideration of chunk size vs. query patterns

2. **Indexing Strategy**:

   * Time-based primary indexes for efficient time range queries
   * Selective secondary indexes for common query patterns
   * Careful index management to avoid overhead
   * Composite indexes for frequent query patterns
   * Partial indexes for specific data subsets

3. **Query Optimization**:

   * Prepared statements for frequent queries
   * Query parameterization to leverage statement cache
   * Execution plan optimization with EXPLAIN ANALYZE
   * Aggregation pushdown to the database layer
   * Query rewriting for improved performance

4. **Compression and Retention**:

   * Automatic compression of older chunks (configured after 7 days)
   * Configurable retention policies (currently 90 days for full resolution)
   * Materialized views for common aggregations
   * Down-sampling for long-term storage
   * Time-based compression policies with different strategies

5. **Connection Management**:

   * Connection pooling to minimize connection overhead
   * Persistent connections for batch operations
   * Proper transaction management
   * Statement timeouts to prevent long-running queries
   * Optimized connection parameters

6. **Schema Optimizations**:

   * Appropriate data types for each column
   * Denormalized design for write performance
   * Column ordering for storage efficiency
   * Constraints and foreign keys where appropriate
   * Minimal use of triggers

Example TimescaleDB configuration settings:

.. code-block:: sql

   -- Increase background workers for compression and maintenance
   ALTER DATABASE telem_db SET timescaledb.max_background_workers = 16;

   -- Increase batch size for better insert performance
   ALTER DATABASE telem_db SET timescaledb.max_insert_batch_size = 10000;

   -- Configure compression for cell_data hypertable
   SELECT add_compression_policy('cell_data', INTERVAL '7 days');

   -- Configure data retention
   SELECT add_retention_policy('cell_data', INTERVAL '90 days');

Network Optimization
-------------------

Efficient network utilization is achieved through:

1. **Protocol Selection**:

   * Binary Protocol Buffers instead of JSON
   * WebSockets for persistent connections
   * Minimized protocol overhead

2. **Payload Optimization**:

   * Compression for larger payloads
   * Delta encoding where applicable
   * Batched updates

3. **Connection Management**:

   * Connection pooling for database
   * Keep-alive mechanisms for WebSockets
   * Graceful reconnection handling

Scaling Strategies
-----------------

The system can scale to handle increased load through several strategies:

Vertical Scaling
~~~~~~~~~~~~~~~

* Increase server resources (CPU, memory)
* Optimize database configuration for available resources
* Tune Go garbage collector parameters
* Increase batch sizes and worker pool sizes

Horizontal Scaling
~~~~~~~~~~~~~~~~

* **Database Layer**:

   * TimescaleDB can be deployed in multi-node configuration
   * Read replicas for query offloading

* **Application Layer**:

   * Multiple ingest servers behind load balancer
   * Consistent hashing for WebSocket connections

* **Hybrid Approach**:

   * Vertical scaling for most components
   * Horizontal scaling for database

Performance Monitoring
---------------------

The system includes built-in performance monitoring:

1. **Metrics Collection**:

   * Request rate and latency tracking
   * Memory and CPU utilization
   * Database query performance
   * Message processing rates

2. **Logging Strategy**:

   * Structured logging with contextual information
   * Log levels for different environments
   * Performance-critical logs

3. **Alerting**:

   * Threshold-based alerts for key metrics
   * Error rate monitoring
   * System health checks

Load Testing Results
-------------------

The system has been tested under various load conditions:

.. list-table::
   :header-rows: 1
   :widths: 20 15 10 15 15 25

   * - Scenario
     - Ingest Rate
     - Clients
     - CPU Usage
     - Memory Usage
     - Observations
   * - Normal Operation
     - 1,000 fps
     - 5
     - 15%
     - 200MB
     - Stable, no issues
   * - High Frequency
     - 5,000 fps
     - 5
     - 45%
     - 350MB
     - Stable, minimal latency
   * - Maximum Throughput
     - 10,000 fps
     - 5
     - 80%
     - 500MB
     - Some message dropping
   * - Many Clients
     - 1,000 fps
     - 50
     - 50%
     - 400MB
     - Stable, increased latency
   * - Burst Load
     - 20,000 fps
     - 5
     - 95%
     - 600MB
     - Temporary backpressure

*Note: Tests performed on a 4-core, 8GB RAM server with SSD storage*

Performance Tuning Recommendations
---------------------------------

For optimal performance in different environments:

1. **Development Environment**:

   * Default configuration is sufficient
   * Disable throttling for easier debugging

2. **Testing Environment**:

   * Increase worker pool to 4-8 workers
   * Batch size of 500-1000 records
   * 1-second flush interval

3. **Production Environment**:

   * Worker pool: CPU cores × 2
   * Batch size: 2000-5000 records
   * Flush interval: 200-500ms
   * Increase connection pool sizes
   * Tune TimescaleDB for available resources

4. **Resource-Constrained Environment** (e.g., Raspberry Pi):

   * Reduce worker pool to 2
   * Smaller batch sizes (200-500)
   * Longer flush intervals (2-5 seconds)
   * Enable aggressive throttling