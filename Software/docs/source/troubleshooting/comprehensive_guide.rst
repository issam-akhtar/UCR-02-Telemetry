Comprehensive Troubleshooting Guide
====================================

This document provides comprehensive troubleshooting guidance for all components of the UCR-02-Telemetry system.

Quick Diagnostic Checklist
-------------------------

Use this checklist to quickly identify which component is causing issues:

☐ **Backend server running?** Check with ``lsof -i :9091,9092,9094``

☐ **Database accessible?** Test with ``psql -h localhost -U username -d telem_db -c "SELECT 1;"``

☐ **Data source active?** Check ESP32 connection or CSV simulator running

☐ **Frontend loading?** Check browser console (F12) for errors

☐ **WebSocket connected?** Look at Network Status Bar in frontend

☐ **Network issues?** Check firewall rules and port availability

Live Graphs Not Updating (MOST COMMON ISSUE)
-------------------------------------------

This is one of the most frequently encountered issues. Follow this detailed troubleshooting process:

Symptoms
~~~~~~~

* Real-time graphs display "No data to graph"
* Charts are visible but frozen/not updating
* Some charts update while others don't
* Data appears on "WS Data" page but not on graphs

Root Cause Analysis
~~~~~~~~~~~~~~~~~

The live graph system has multiple dependencies that must all work correctly:

.. code-block:: text

   Data Source (ESP32/Simulator)
        ↓
   Backend WebSocket Ingest (port 9091)
        ↓
   CAN Decoder + Data Processing
        ↓
   Database Storage (TimescaleDB)
        ↓
   Live WebSocket Hub (port 9094)
        ↓
   Frontend WebSocket Client
        ↓
   Protobuf Decoder
        ↓
   React Chart Components
        ↓
   Plotly Rendering

Step-by-Step Debugging
~~~~~~~~~~~~~~~~~~~~

**Step 1: Verify WebSocket Connection**

Check the Network Status Bar at the top of the frontend:

* **Green "WebSocket: Connected"**: WebSocket is working → Go to Step 2
* **Red "WebSocket: Disconnected"**: Connection problem → See `WebSocket Connection Issues`_

.. code-block:: bash

   # Check if backend WebSocket server is running
   lsof -i :9094
   
   # Should show something like:
   # telemetry  12345  user  7u  IPv6  0x... TCP *:9094 (LISTEN)

**Step 2: Verify Data Flow to Backend**

Check if backend is receiving data from the data source:

.. code-block:: bash

   # Check backend logs for incoming data
   # Look for messages like:
   # "Received message with frameID: 100"
   # "Processing data job"

If no data in backend logs:

* Check ESP32 is powered on and connected to network
* Verify ESP32 is sending to correct WebSocket URL
* For CSV simulation: Ensure simulator is running with correct file path

.. code-block:: bash

   # Start CSV simulator if needed
   cd backend-processing/cmd/csvserver
   go run simulate_sender.go -csvfile ../../testdata/data.csv

**Step 3: Check Raw WebSocket Messages**

Navigate to the "WS Data" page in the frontend:

* **Messages appearing**: Backend is broadcasting → Go to Step 4
* **No messages**: Backend not broadcasting → Check backend processing

.. code-block:: javascript

   // Messages should look like:
   {
     "type": "tcu",
     "payload": {
       "fields": {
         "motor_rpm": {"numberValue": 3500},
         "motor_temp": {"numberValue": 65.2}
       }
     },
     "time": "2025-10-16T12:34:56.789Z"
   }

**Step 4: Verify Chart Type Subscription**

Charts must subscribe to correct data types. Check browser console:

.. code-block:: javascript

   // Should see messages like:
   // "Subscribed to: tcu"
   // "Subscribed to: cell"

Common chart types and their corresponding data:

* ``tcu`` - TCU/Motor controller data
* ``cell`` - Battery cell voltages
* ``pack_voltage`` - Pack voltage data
* ``pack_current`` - Pack current data
* ``ins_imu`` - IMU sensor data
* ``ins_gps`` - GPS data
* ``therm`` - Thermal/temperature data

**Step 5: Check for Protobuf Decoding Errors**

Open browser console (F12) and look for errors:

.. code-block:: text

   # Common Protobuf errors:
   "Failed to decode message"
   "Cannot read property 'decode' of undefined"
   "Protobuf type not found"

If you see Protobuf errors:

1. Check Network tab → verify ``telemetry.proto`` and ``struct.proto`` loaded
2. Verify proto files are in ``public/proto/`` directory
3. Check that struct.proto loads BEFORE telemetry.proto

.. code-block:: javascript

   // In protobuf.js, loading sequence must be:
   await root.load('/proto/struct.proto');  // FIRST
   await root.load('/proto/telemetry.proto'); // SECOND

**Step 6: Verify Chart Not Paused**

On the Real-Time Graphs page, check the button in the top right:

* **Shows "Pause"**: Chart is active
* **Shows "Resume"**: Chart is paused → Click to resume

**Step 7: Check Chart Settings**

Click the gear icon (⚙️) in the top right to open Chart Settings:

* **Update Interval**: Should be 100-500ms (100ms recommended)
* **Real Time Window**: Should be at least 10000ms (10 seconds)
* **Line Width**: Usually 2-3 pixels

.. code-block:: javascript

   // Good settings:
   {
     updateInterval: 100,     // Update every 100ms
     window: 30000,          // Show last 30 seconds
     lineWidth: 2            // 2 pixel lines
   }

**Step 8: Check Browser Performance**

If too many charts are displayed, browser may struggle:

* Reduce number of active charts (uncheck some in Graph Selector)
* Increase update interval to 200-500ms
* Check browser DevTools → Performance tab for frame rate
* Close other browser tabs consuming resources

**Step 9: Verify Data Format**

If all else fails, check the actual data structure on WS Data page:

Expected structure:

.. code-block:: javascript

   {
     "type": "tcu",                    // Must match chart subscription
     "payload": {
       "fields": {                     // Must have 'fields' object
         "motor_rpm": {
           "numberValue": 3500         // Numeric data
         },
         "motor_temp": {
           "numberValue": 65.2
         }
       }
     },
     "time": "2025-10-16T12:34:56Z"   // Must have valid timestamp
   }

If format is incorrect, issue is in backend ``processdata.go`` where Protobuf messages are created.

Common Fixes for Live Graphs
~~~~~~~~~~~~~~~~~~~~~~~~~~

**Fix 1: Restart Backend Server**

Often the simplest solution:

.. code-block:: bash

   # Stop backend (Ctrl+C)
   # Restart backend
   cd backend-processing/cmd/telemetryserver
   go run main.go

**Fix 2: Clear Browser Cache**

Protobuf definitions might be cached:

1. Open DevTools (F12)
2. Right-click refresh button
3. Select "Empty Cache and Hard Reload"

**Fix 3: Verify DBC Configuration**

If specific message types aren't working:

.. code-block:: bash

   # Check if DBC has the frame ID definition
   cat backend-processing/configs/UCR-01.json | grep "frameID"
   
   # If missing, regenerate DBC JSON:
   python scripts/convert_dbc_to_json.py \
     --dbc=configs/UCR-01.dbc \
     --output=configs/UCR-01.json

**Fix 4: Check Backend Processing**

Verify the frame ID has a handler in ``processdata.go``:

.. code-block:: go

   // In processdata.go, check for case statement:
   switch frameID {
   case 100:  // Your frame ID
       processTCUData(decoded)
   // ... other cases
   }

Backend Issues
-------------

Server Won't Start
~~~~~~~~~~~~~~~

**Symptoms**:

* Server exits immediately with error
* "Address already in use" error
* "Could not read config file" error

**Solutions**:

1. **Port Already in Use**

   .. code-block:: bash
   
      # Find process using the port
      lsof -i :9091
      lsof -i :9092
      lsof -i :9094
      
      # Kill the process
      kill -9 <PID>

2. **Configuration File Missing**

   .. code-block:: bash
   
      # Verify config.yaml exists
      ls backend-processing/configs/config.yaml
      
      # Check working directory
      pwd
      # Should be in backend-processing/cmd/telemetryserver
      
      # If running from different directory, adjust config path

3. **Database Connection Failed**

   .. code-block:: bash
   
      # Check database is running
      docker ps | grep postgres
      
      # Test database connection
      psql -h localhost -U username -d telem_db -c "SELECT 1;"
      
      # If fails, start database:
      cd DevEnvSetup
      docker-compose up -d db

No Data Being Processed
~~~~~~~~~~~~~~~~~~~~

**Symptoms**:

* Server running but database remains empty
* No real-time updates despite WebSocket connected
* Backend logs show no incoming data

**Solutions**:

1. **Data Source Not Connected**

   Check ESP32:
   
   * Verify power and network connection
   * Check ESP32 serial monitor for errors
   * Verify WebSocket URL points to backend server
   
   Check CSV Simulator:
   
   .. code-block:: bash
   
      cd backend-processing/cmd/csvserver
      go run simulate_sender.go -csvfile ../../testdata/data.csv
      
      # Should see output:
      # "Connected to WebSocket"
      # "Sending data..."

2. **DBC Configuration Issues**

   .. code-block:: bash
   
      # Verify DBC JSON exists and is valid
      cat backend-processing/configs/UCR-01.json | python -m json.tool
      
      # Should show valid JSON structure
      # If error, regenerate:
      python scripts/convert_dbc_to_json.py \
        --dbc=configs/UCR-01.dbc \
        --output=configs/UCR-01.json

3. **Worker Pool Not Processing**

   Check backend logs for:
   
   * "Processing data job" messages
   * "Batch flush" messages
   
   If absent, check worker pool initialization in ``main.go``

Database Issues
--------------

Connection Failures
~~~~~~~~~~~~~~~~

**Symptoms**:

* "Failed to connect to database" in backend logs
* "Connection refused" errors
* Timeout errors

**Solutions**:

1. **Database Not Running**

   .. code-block:: bash
   
      # Check if PostgreSQL/TimescaleDB is running
      docker ps
      
      # Should show timescaledb container
      # If not running:
      cd DevEnvSetup
      docker-compose up -d db

2. **Incorrect Connection String**

   Check ``backend-processing/configs/config.yaml``:
   
   .. code-block:: yaml
   
      database:
        connection_string: "postgresql://username:password@localhost:5432/telem_db"
   
   Verify:
   
   * Correct username/password
   * Correct host (localhost or container name)
   * Correct port (5432)
   * Correct database name (telem_db)

3. **Network/Firewall Issues**

   .. code-block:: bash
   
      # Test database reachability
      pg_isready -h localhost -p 5432
      
      # If fails, check firewall:
      # macOS: System Preferences → Security → Firewall
      # Linux: sudo ufw status

Data Not Being Stored
~~~~~~~~~~~~~~~~~~~

**Symptoms**:

* Backend running without errors
* No data in database tables
* Historical graphs show "No data available"

**Solutions**:

1. **Table Schema Issues**

   .. code-block:: bash
   
      # Connect to database
      psql -h localhost -U username -d telem_db
      
      # List tables
      \dt
      
      # Check table structure
      \d cell_data
      \d tcu_data
      
      # If tables missing, recreate from schema:
      psql -h localhost -U username -d telem_db -f backend-processing/db/telem_data.sql

2. **Insert Failures**

   Enable verbose logging in ``db.go`` to see insert errors
   
   Check for:
   
   * Data type mismatches
   * Constraint violations
   * Transaction rollbacks

3. **Batch Not Flushing**

   Check backend logs for "Batch flush" messages
   
   If batches not flushing:
   
   * Verify batch size setting in config
   * Check batch timer is running
   * Ensure processdata functions call ``AddToBatch()`` helpers

Frontend Issues
--------------

WebSocket Connection Issues
~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**:

* Network Status Bar shows "Disconnected"
* No real-time data updates
* "WebSocket closed" errors in console

**Solutions**:

1. **Backend Not Running**

   .. code-block:: bash
   
      # Check if WebSocket server is listening
      lsof -i :9094
      
      # If not, start backend:
      cd backend-processing/cmd/telemetryserver
      go run main.go

2. **Wrong WebSocket URL**

   Check ``telemetry-app/src/services/websocket.js``:
   
   .. code-block:: javascript
   
      // Should use correct port
      const wsService = new WebSocketService(
        `ws://${window.location.hostname}:9094/ws`
      );
   
   Verify:
   
   * Port 9094 matches backend config
   * Path is ``/ws``
   * Using ``ws://`` not ``wss://`` (unless TLS configured)

3. **CORS Issues**

   If accessing from different host, check backend CORS settings
   
   In ``cmd/telemetryserver/main.go``, verify CORS allows origin

4. **Browser Extensions Blocking**

   Try in Incognito/Private mode to rule out browser extensions

Protobuf Errors
~~~~~~~~~~~~~

**Symptoms**:

* "Failed to decode message" in console
* Data not rendering despite WebSocket connected
* "Type not found" errors

**Solutions**:

1. **Proto Files Not Loaded**

   Check browser Network tab:
   
   * ``/proto/struct.proto`` should load successfully (200 status)
   * ``/proto/telemetry.proto`` should load successfully (200 status)
   
   If 404 errors:
   
   * Verify files exist in ``telemetry-app/public/proto/``
   * Restart frontend dev server

2. **Wrong Loading Order**

   In ``utils/protobuf.js``, ensure:
   
   .. code-block:: javascript
   
      // MUST load struct.proto FIRST
      await root.load('/proto/struct.proto');
      // THEN load telemetry.proto
      await root.load('/proto/telemetry.proto');

3. **Version Mismatch**

   Ensure frontend and backend use same Protobuf definitions:
   
   .. code-block:: bash
   
      # Compare proto files
      diff backend-processing/proto/telemetry.proto \
           telemetry-app/public/proto/telemetry.proto
      
      # Should be identical

Charts Not Rendering
~~~~~~~~~~~~~~~~~

**Symptoms**:

* Blank chart areas
* "Cannot read property" errors
* Charts show briefly then disappear

**Solutions**:

1. **Missing Dependencies**

   .. code-block:: bash
   
      cd telemetry-app
      npm install
      
      # Verify plotly.js is installed
      npm list plotly.js-dist-min

2. **Browser Compatibility**

   Plotly.js requires modern browser
   
   * Chrome/Edge 90+
   * Firefox 88+
   * Safari 14+

3. **Performance Issues**

   * Reduce number of displayed charts
   * Increase update interval
   * Lower chart resolution in settings

CSV Simulation Issues
-------------------

Simulator Not Sending Data
~~~~~~~~~~~~~~~~~~~~~~~~

**Symptoms**:

* Simulator runs but no backend activity
* "Connection refused" errors
* "CSV file not found" errors

**Solutions**:

1. **CSV Format Issues**

   Verify CSV file format:
   
   .. code-block:: text
   
      timestamp,id,data
      1634567890.123,100,0102030405060708
      1634567890.234,101,1A2B3C4D5E6F7089
   
   Requirements:
   
   * Header row: ``timestamp,id,data``
   * Timestamp: Unix time with milliseconds
   * ID: Decimal CAN frame ID
   * Data: Hex bytes (no spaces, no 0x prefix)

2. **Connection Issues**

   .. code-block:: bash
   
      # Verify backend is listening
      lsof -i :9091
      
      # Check simulator endpoint
      go run simulate_sender.go -csvfile data.csv -endpoint ws://localhost:9091/telemetry

3. **Mode Configuration**

   In ``backend-processing/configs/config.yaml``:
   
   .. code-block:: yaml
   
      mode: "csv"  # Must be "csv" for simulator

Network Diagnostic Commands
--------------------------

Port Checking
~~~~~~~~~~

.. code-block:: bash

   # Check all telemetry ports
   lsof -i :9091,9092,9094,5432,3000
   
   # Alternative with netstat
   netstat -tuln | grep -E '9091|9092|9094|5432|3000'

WebSocket Testing
~~~~~~~~~~~~~~

.. code-block:: bash

   # Install websocat if needed
   brew install websocat  # macOS
   
   # Test raw telemetry WebSocket
   websocat ws://localhost:9091/telemetry
   
   # Test live data WebSocket
   websocat ws://localhost:9094/ws

Database Testing
~~~~~~~~~~~~~

.. code-block:: bash

   # Test connection
   psql -h localhost -U username -d telem_db -c "SELECT version();"
   
   # List tables
   psql -h localhost -U username -d telem_db -c "\dt"
   
   # Check recent data
   psql -h localhost -U username -d telem_db -c "SELECT * FROM cell_data ORDER BY timestamp DESC LIMIT 5;"

Docker Diagnostics
~~~~~~~~~~~~~~~

.. code-block:: bash

   # Check container status
   docker ps
   
   # View logs
   docker logs telemetry-backend
   docker logs telemetry-db
   
   # Check resource usage
   docker stats
   
   # Restart services
   docker-compose restart backend
   docker-compose restart db

Advanced Debugging
----------------

Enable Debug Logging
~~~~~~~~~~~~~~~~~

**Backend**:

In ``cmd/telemetryserver/main.go``:

.. code-block:: go

   // Add debug logging
   log.SetFlags(log.LstdFlags | log.Lshortfile)
   
   // In processdata.go, add:
   log.Printf("DEBUG: Received frameID %d with %d bytes", frameID, len(data))

**Frontend**:

In ``services/websocket.js``:

.. code-block:: javascript

   // Enable debugging
   const DEBUG = true;
   
   handleMessage(data) {
     if (DEBUG) console.log('Received WebSocket message:', data);
     // ... rest of code
   }

Browser DevTools Usage
~~~~~~~~~~~~~~~~~~~

**Network Tab**:

* Filter by "WS" to see WebSocket traffic
* Check WebSocket frames (binary data shown as "[binary]")
* Verify proto files loaded successfully

**Console Tab**:

* Look for React errors
* Check for Protobuf decode errors
* Monitor subscription messages

**Performance Tab**:

* Record during chart updates
* Look for frame drops (should be 60 FPS)
* Check memory usage over time

Memory Profiling
~~~~~~~~~~~~~

Backend (Go):

.. code-block:: bash

   # Run with memory profiling
   go run -memprofile=mem.prof main.go
   
   # Analyze profile
   go tool pprof -http=:8080 mem.prof

Frontend (Chrome):

1. Open DevTools → Memory tab
2. Take heap snapshot
3. Update graphs for 1 minute
4. Take another snapshot
5. Compare to check for memory leaks

Getting Help
-----------

If you've tried all troubleshooting steps and still have issues:

1. **Gather Information**:
   
   * Backend logs (last 50 lines)
   * Frontend console errors
   * Network tab WebSocket frames
   * Output of diagnostic commands
   * Configuration files (sanitized)

2. **Check GitHub Issues**:
   
   * Search existing issues for similar problems
   * Review closed issues for solutions

3. **Create Detailed Issue Report**:
   
   * Title: Brief description of issue
   * Environment: OS, browser, Docker/native
   * Steps to reproduce
   * Expected vs actual behavior
   * Logs and error messages
   * What you've already tried

4. **Contact Team**:
   
   * Include all gathered information
   * Provide screenshots if helpful
   * Be specific about environment