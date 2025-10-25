Quick Troubleshooting Reference
==============================

Live Graphs Not Updating - Quick Fix Guide
-----------------------------------------

**Check in this order:**

1. ☐ Network Status Bar shows "WebSocket: Connected"?
   
   * NO → Start backend: ``cd backend-processing/cmd/telemetryserver && go run main.go``
   * YES → Continue

2. ☐ Navigate to "WS Data" page - Messages appearing?
   
   * NO → Start data source (ESP32 or ``cd backend-processing/cmd/csvserver && go run simulate_sender.go -csvfile ../../testdata/data.csv``)
   * YES → Continue

3. ☐ Browser console (F12) - Any errors?
   
   * Protobuf errors → Hard refresh browser (Ctrl+Shift+R)
   * Other errors → See full troubleshooting guide
   * NO errors → Continue

4. ☐ Charts paused?
   
   * "Resume" button showing → Click it
   * "Pause" button showing → Continue

5. ☐ Chart settings correct?
   
   * Open Settings (gear icon)
   * Update Interval: 100ms
   * Real Time Window: 10000ms

Common Quick Fixes
----------------

**Restart Everything**

.. code-block:: bash

   # Terminal 1 - Database
   cd DevEnvSetup && docker-compose up -d db
   
   # Terminal 2 - Backend
   cd backend-processing/cmd/telemetryserver && go run main.go
   
   # Terminal 3 - Simulator (if testing)
   cd backend-processing/cmd/csvserver && go run simulate_sender.go -csvfile ../../testdata/data.csv
   
   # Terminal 4 - Frontend
   cd telemetry-app && npm run dev

**Clear Browser Cache**

1. Open DevTools (F12)
2. Right-click refresh
3. "Empty Cache and Hard Reload"

**Check All Ports**

.. code-block:: bash

   lsof -i :9091,9092,9094,5432,3000
   # Should show processes for all ports

Port Reference
------------

* **9091** - Raw telemetry WebSocket (ESP32/simulator connects here)
* **9092** - REST API (historical data)
* **9094** - Live data WebSocket (frontend connects here)
* **5432** - PostgreSQL/TimescaleDB
* **3000** - Frontend dev server (or 5173 if using Vite)

Chart Type Reference
------------------

Common chart types and their data sources:

* ``tcu`` - TCU/Motor controller data
* ``cell`` - Battery cell voltages (128 cells)
* ``pack_voltage`` - Battery pack voltage
* ``pack_current`` - Battery pack current
* ``ins_imu`` - IMU sensor data
* ``ins_gps`` - GPS position data
* ``therm`` - Temperature/thermal data
* ``front_analog`` - Front analog sensors
* ``rear_analog`` - Rear analog sensors

Error Messages Quick Reference
----------------------------

**"Failed to decode message"**

* Cause: Protobuf files not loaded
* Fix: Hard refresh browser, check Network tab for proto files

**"WebSocket closed"**

* Cause: Backend not running or wrong port
* Fix: Start backend on port 9094

**"No data to graph"**

* Cause: No data for that chart type OR chart paused
* Fix: Check WS Data page for messages, click Resume button

**"Connection refused"**

* Cause: Server not listening on expected port
* Fix: Check server started correctly with ``lsof -i :PORT``

Diagnostic Commands
-----------------

.. code-block:: bash

   # Check if backend running
   lsof -i :9091,9092,9094
   
   # Check if database running
   docker ps | grep postgres
   
   # Test database connection
   psql -h localhost -U username -d telem_db -c "SELECT 1;"
   
   # Test WebSocket
   websocat ws://localhost:9094/ws
   
   # View backend logs (if running in Docker)
   docker logs telemetry-backend

Emergency Debug Mode
------------------

If nothing works, enable full debugging:

**Backend**: In ``main.go`` add at the start:

.. code-block:: go

   log.SetFlags(log.LstdFlags | log.Lshortfile)

**Frontend**: In ``websocket.js`` change:

.. code-block:: javascript

   const DEBUG = true;  // Set to true

Then check console output for detailed information.

For More Help
-----------

See the comprehensive troubleshooting guide: :doc:`comprehensive_guide`