API Endpoints
=============

This document describes the REST API endpoints provided by the UCR-02-Telemetry system for accessing historical telemetry data.

Introduction
------------

The system provides a comprehensive REST API for querying historical telemetry data stored in the database. These endpoints allow frontend applications to retrieve data for specific time periods and perform historical analysis. The API is optimized for performance with efficient pagination and caching mechanisms.

Implementation
--------------

The API endpoints are implemented in Go using the Chi router and are located in the `handlers` package:

* **Router**: Uses the Chi router for route definition
* **Rendering**: Uses the render package for consistent JSON responses
* **Caching**: Implements request-level and response-level caching for performance

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``backend-processing/internal/handlers/historical.go``
     - Implements REST API endpoints for historical data retrieval with pagination
   * - ``cmd/telemetryserver/main.go``
     - Sets up API routes and initializes HTTP server

Available Endpoints
-------------------

All endpoints support pagination via ``page`` and ``limit`` (or ``pageSize``) query parameters.

Endpoint Overview Diagram
~~~~~~~~~~~~~~~~~~~~~~~~~

The following diagram shows the organization of API endpoints by system component:

.. mermaid::

    graph TB
      API[REST API Server Port 9092]       
      API --> BatterySystem
      API --> MotorControl
      API --> NavigationSys
      API --> SensorData
      API --> AeroData
      API --> StrainGauges
      API --> PowerDist       
      BatterySystem[Battery System]
      MotorControl[Motor Controller]
      NavigationSys[Navigation]
      SensorData[Sensors]
      AeroData[Aerodynamics]
      StrainGauges[Strain Gauges]
      PowerDist[Power Distribution]       
      BatterySystem --> cellData[/api/cellData/]
      BatterySystem --> packVoltage[/api/packVoltageData/]
      BatterySystem --> packCurrent[/api/packCurrentData/]
      BatterySystem --> thermData[/api/thermData/]       
      MotorControl --> tcuData[/api/tcuData/]
      MotorControl --> bamocarData[/api/bamocarData/]
      MotorControl --> bamocarTx[/api/bamocarTxData/]
      MotorControl --> bamocarRx[/api/bamocarRxData/]       
      NavigationSys --> gpsData[/api/gpsBestPosData/]
      NavigationSys --> insGPS[/api/insGPSData/]
      NavigationSys --> insIMU[/api/insIMUData/]       
      SensorData --> frontAnalog[/api/frontAnalogData/]
      SensorData --> rearAnalog[/api/rearAnalogData/]
      SensorData --> frontFreq[/api/frontFrequencyData/]
      SensorData --> rearFreq[/api/rearFrequencyData/]
      SensorData --> encoderData[/api/encoderData/]       
      AeroData --> frontAero[/api/frontAeroData/]
      AeroData --> rearAero[/api/rearAeroData/]       
      StrainGauges --> frontSG1[/api/frontStrainGauges1Data/]
      StrainGauges --> frontSG2[/api/frontStrainGauges2Data/]
      StrainGauges --> rearSG1[/api/rearStrainGauges1Data/]
      StrainGauges --> rearSG2[/api/rearStrainGauges2Data/]       
      PowerDist --> pdm1[/api/pdm1Data/]
      PowerDist --> pdmCurrent[/api/pdmCurrentData/]
      PowerDist --> aculv1[/api/aculv1Data/]
      PowerDist --> aculv2[/api/aculv2Data/]
      PowerDist --> aculvFd1[/api/aculvFd1Data/]
      PowerDist --> aculvFd2[/api/aculvFd2Data/]


Complete Endpoint List
~~~~~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 40 60

   * - Endpoint
     - Description
   * - ``/api/tcuData``
     - TCU (Traction Control Unit) data
   * - ``/api/cellData``
     - Battery cell voltage data (128 cells)
   * - ``/api/thermData``
     - Thermistor temperature data
   * - ``/api/bamocarData``
     - Bamocar motor controller data
   * - ``/api/packCurrentData``
     - Battery pack current measurements
   * - ``/api/packVoltageData``
     - Battery pack voltage measurements
   * - ``/api/gpsBestPosData``
     - GPS position data (latitude, longitude, altitude)
   * - ``/api/insGPSData``
     - INS (Inertial Navigation System) GPS data
   * - ``/api/insIMUData``
     - INS IMU (Inertial Measurement Unit) data
   * - ``/api/frontFrequencyData``
     - Front wheel frequency sensor data
   * - ``/api/rearFrequencyData``
     - Rear wheel frequency sensor data
   * - ``/api/frontAnalogData``
     - Front analog sensor readings
   * - ``/api/rearAnalogData``
     - Rear analog sensor readings
   * - ``/api/frontAeroData``
     - Front aerodynamic sensor data
   * - ``/api/rearAeroData``
     - Rear aerodynamic sensor data
   * - ``/api/encoderData``
     - Encoder sensor data
   * - ``/api/frontStrainGauges1Data``
     - Front strain gauges (set 1)
   * - ``/api/frontStrainGauges2Data``
     - Front strain gauges (set 2)
   * - ``/api/rearStrainGauges1Data``
     - Rear strain gauges (set 1)
   * - ``/api/rearStrainGauges2Data``
     - Rear strain gauges (set 2)
   * - ``/api/bamocarTxData``
     - Bamocar TX transmission data
   * - ``/api/bamocarRxData``
     - Bamocar RX reception data
   * - ``/api/bamoCarReTransmitData``
     - Bamocar retransmission data
   * - ``/api/pdmCurrentData``
     - PDM (Power Distribution Module) current data
   * - ``/api/pdmReTransmitData``
     - PDM retransmission data
   * - ``/api/aculvFd1Data``
     - ACULV (Accumulator Low Voltage) FD1 data
   * - ``/api/aculvFd2Data``
     - ACULV FD2 data
   * - ``/api/aculv1Data``
     - ACULV1 data
   * - ``/api/aculv2Data``
     - ACULV2 data
   * - ``/api/pdm1Data``
     - PDM1 module data

Query Parameters
----------------

All endpoints support the following query parameters:

* **page**: Page number (default: 1)
* **limit** or **pageSize**: Number of records per page (default: 2000, max: 35000)

Example requests:

.. code-block::

    GET /api/cellData?page=1&limit=100
    GET /api/packCurrentData?page=2&pageSize=1000

Response Format
---------------

All endpoints return a JSON array of records, each with a timestamp and data fields specific to that message type:

.. code-block:: json

    [
      {
        "timestamp": "2023-08-21T14:32:15.123Z",
        "field1": 123.45,
        "field2": 67.89
        // Additional fields specific to the message type
      },
      // More records...
    ]

Pagination Implementation
-------------------------

The API uses a generic pagination handler to minimize code duplication:

.. code-block:: go

    func makePaginatedHandler[T any](fetchFunc func(ctx context.Context, limit, offset int) ([]T, error)) http.HandlerFunc {
        return func(w http.ResponseWriter, r *http.Request) {
            // Parse pagination parameters
            limit, offset, err := parsePaginationParams(r)
            // Fetch data from database
            data, err := fetchFunc(ctx, limit, offset)
            // Return the data
            render.JSON(w, r, data)
        }
    }

This allows each endpoint to be defined concisely:

.. code-block:: go

    r.Get("/api/cellData", makePaginatedHandler(queries.FetchCellDataPaginated))

Performance Optimizations
-------------------------

Several optimizations improve API performance:

### 1. Parameter Validation Caching

.. code-block:: go

    // Cache for recently validated params to avoid repeated validations
    var (
        paramsCache      = make(map[string]PaginationParams)
        paramsCacheMutex sync.RWMutex
    )

### 2. Response Caching

.. code-block:: go

    type resultCacheEntry struct {
        data       interface{}
        expiration time.Time
    }

    var (
        resultCache      = make(map[string]resultCacheEntry)
        resultCacheMutex sync.RWMutex
        cacheTTL         = 2 * time.Second // Short TTL for real-time data
    )

### 3. HTTP Cache Headers

.. code-block:: go

    // Set cache control headers to improve client caching
    w.Header().Set("Cache-Control", "private, max-age=2")

### 4. Query Timeouts

.. code-block:: go

    // Set a reasonable timeout for the database query
    ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
    defer cancel()

Error Handling
--------------

The API provides consistent error responses:

.. code-block:: json

    {
      "status": "Invalid request.",
      "error": "invalid page parameter"
    }

Common error scenarios include:
- Invalid pagination parameters
- Database query failures
- Query timeout errors

CORS Support
------------

The API includes Cross-Origin Resource Sharing (CORS) support for frontend integration:

.. code-block:: go

    // Set CORS header
    w.Header().Set("Access-Control-Allow-Origin", "*")

Route Registration
------------------

All API routes are registered with the Chi router in a single function:

.. code-block:: go

    func RegisterRoutes(r chi.Router, queries *db.Queries) {
        r.Get("/api/tcuData", makePaginatedHandler(queries.FetchTCUDataPaginated))
        r.Get("/api/cellData", makePaginatedHandler(queries.FetchCellDataPaginated))
        // Additional routes...
    }

This function is called from the main application startup to initialize all API endpoints.