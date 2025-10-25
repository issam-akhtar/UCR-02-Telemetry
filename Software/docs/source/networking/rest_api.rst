REST API
========

This document describes the REST API provided by the UCR-02-Telemetry system.

Introduction
-----------

The UCR-02-Telemetry system includes a REST API for accessing historical data, system configuration, and administrative functions. This document provides a comprehensive reference for the API endpoints, request formats, and response structures.

API Basics
--------

Base URL
~~~~~~~

All API endpoints are available at:

``http://{server}:9092/api/v1``

Authentication
~~~~~~~~~~~~

Currently, the API does not require authentication. However, it is recommended to deploy the API behind a reverse proxy with appropriate authentication for production use.

Response Format
~~~~~~~~~~~~

All responses are in JSON format with the following structure:

.. code-block:: json

   {
     "status": "success",
     "data": {
       // Response data here
     }
   }

Error responses use:

.. code-block:: json

   {
     "status": "error",
     "error": "Error message",
     "code": 400
   }

Historical Data Endpoints
----------------------

Get Cell Data
~~~~~~~~~~

Retrieves historical battery cell data.

**Endpoint**: ``GET /api/v1/historical/cell-data``

**Query Parameters**:

* ``start_time`` (required) - Start time in ISO format or Unix timestamp
* ``end_time`` (required) - End time in ISO format or Unix timestamp
* ``cell_ids`` (optional) - Comma-separated list of cell IDs
* ``limit`` (optional) - Maximum number of records (default: 1000)

**Response**:

.. code-block:: json

   {
     "status": "success",
     "data": [
       {
         "cell_id": 1,
         "voltage": 3.85,
         "temperature": 25.4,
         "timestamp": "2023-05-01T12:34:56Z"
       },
       // More records...
     ]
   }

Get Motor Data
~~~~~~~~~~~

Retrieves historical motor controller data.

**Endpoint**: ``GET /api/v1/historical/motor-data``

**Query Parameters**:

* ``start_time`` (required) - Start time in ISO format or Unix timestamp
* ``end_time`` (required) - End time in ISO format or Unix timestamp
* ``limit`` (optional) - Maximum number of records (default: 1000)

**Response**:

.. code-block:: json

   {
     "status": "success",
     "data": [
       {
         "motor_rpm": 3500,
         "motor_current": 120.5,
         "motor_temperature": 65.2,
         "controller_temperature": 55.8,
         "timestamp": "2023-05-01T12:34:56Z"
       },
       // More records...
     ]
   }

Get Vehicle Dynamics
~~~~~~~~~~~~~~~~

Retrieves historical vehicle dynamics data.

**Endpoint**: ``GET /api/v1/historical/vehicle-dynamics``

**Query Parameters**:

* ``start_time`` (required) - Start time in ISO format or Unix timestamp
* ``end_time`` (required) - End time in ISO format or Unix timestamp
* ``limit`` (optional) - Maximum number of records (default: 1000)

**Response**:

.. code-block:: json

   {
     "status": "success",
     "data": [
       {
         "wheel_speed_fl": 25.6,
         "wheel_speed_fr": 25.7,
         "wheel_speed_rl": 25.5,
         "wheel_speed_rr": 25.6,
         "acceleration_x": 0.2,
         "acceleration_y": -0.1,
         "acceleration_z": 1.0,
         "timestamp": "2023-05-01T12:34:56Z"
       },
       // More records...
     ]
   }

System Management Endpoints
------------------------

Get System Status
~~~~~~~~~~~~~~

Returns the current system status.

**Endpoint**: ``GET /api/v1/system/status``

**Response**:

.. code-block:: json

   {
     "status": "success",
     "data": {
       "uptime": 3600,
       "connected_clients": 5,
       "messages_processed": 250000,
       "database_status": "connected",
       "cpu_usage": 15.2,
       "memory_usage": 256.5
     }
   }

Update Configuration
~~~~~~~~~~~~~~~~

Updates system configuration parameters.

**Endpoint**: ``POST /api/v1/system/config``

**Request Body**:

.. code-block:: json

   {
     "websocket": {
       "port": 9091
     },
     "database": {
       "batch_size": 200
     }
   }

**Response**:

.. code-block:: json

   {
     "status": "success",
     "data": {
       "updated": ["websocket.port", "database.batch_size"]
     }
   }

API Implementation
---------------

The API is implemented in ``internal/handlers/historical.go`` using the Gin web framework.

Code Example:

.. code-block:: go

   // GetCellData returns historical cell data
   func (h *Handler) GetCellData(c *gin.Context) {
       startTime, endTime, err := parseTimeRange(c)
       if err != nil {
           c.JSON(http.StatusBadRequest, gin.H{
               "status": "error",
               "error":  err.Error(),
               "code":   http.StatusBadRequest,
           })
           return
       }
       
       cellIDs, _ := parseIntArray(c.Query("cell_ids"))
       limit := parseLimit(c.Query("limit"))
       
       data, err := h.DB.GetCellData(startTime, endTime, cellIDs, limit)
       if err != nil {
           c.JSON(http.StatusInternalServerError, gin.H{
               "status": "error",
               "error":  "Database error",
               "code":   http.StatusInternalServerError,
           })
           return
       }
       
       c.JSON(http.StatusOK, gin.H{
           "status": "success",
           "data":   data,
       })
   }

API Versioning
-----------

The API uses versioning in the URL path (``/api/v1/``) to allow for future changes without breaking existing clients. If breaking changes are needed, a new version will be created (e.g., ``/api/v2/``).

Rate Limiting
----------

The API implements rate limiting to prevent abuse:

* **IP-based limits** - 60 requests per minute per IP
* **Endpoint-specific limits** - Historical data endpoints have lower limits

Extending the API
--------------

To add new API endpoints:

1. Create a new handler function in ``internal/handlers/historical.go``
2. Add the route in ``cmd/telemetryserver/main.go``
3. Implement the database query in ``pkg/db/db.go``
4. Update this documentation

Client Examples
------------

Fetch cell data using curl:

.. code-block:: bash

   curl "http://localhost:9092/api/v1/historical/cell-data?start_time=2023-05-01T00:00:00Z&end_time=2023-05-01T12:00:00Z&cell_ids=1,2,3&limit=10"

Fetch system status using JavaScript:

.. code-block:: javascript

   fetch('http://localhost:9092/api/v1/system/status')
     .then(response => response.json())
     .then(data => console.log(data));