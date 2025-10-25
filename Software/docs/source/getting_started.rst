Getting Started
===============

This guide will help you get up and running with the UCR-02-Telemetry system quickly.

Quick Start (5 Minutes)
-----------------------

The fastest way to get the system running is using the interactive menu:

.. code-block:: bash

   cd DevEnvSetup
   sudo python3 interaction-menu.py

Follow the menu prompts to:

1. Start the database
2. Build Docker containers
3. Run the entire stack

Once running, access the frontend at http://localhost:9093

Prerequisites
-------------

Before starting, ensure you have the following installed:

Required Software
~~~~~~~~~~~~~~~~~

.. list-table::
   :header-rows: 1
   :widths: 30 20 50

   * - Software
     - Version
     - Purpose
   * - Docker
     - 28+
     - Container runtime for deployment
   * - Docker Compose
     - 2.33+
     - Multi-container orchestration
   * - Go
     - 1.21+
     - Backend development
   * - Node.js
     - 18+
     - Frontend development
   * - npm
     - 9+
     - Frontend package management
   * - Python
     - 3.7+
     - Tooling and scripts
   * - PostgreSQL
     - 14+
     - Database (if running without Docker)
   * - TimescaleDB
     - 2.x
     - Time-series extension for PostgreSQL

Optional Tools
~~~~~~~~~~~~~~

* **VS Code**: Recommended IDE with Go and React extensions
* **Postman/curl**: For testing REST API endpoints
* **psql**: PostgreSQL command-line client for database inspection
* **cantools**: Python library for DBC file manipulation

Installation Steps
------------------

1. Clone the Repository
~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   git clone https://github.com/issam-akhtar/UCR-02-Telemetry.git
   cd UCR-02-Telemetry/Software

2. Choose Your Setup Method
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

You have three options for running the system:

Option A: Interactive Menu (Recommended)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   cd DevEnvSetup
   sudo python3 interaction-menu.py

This provides a guided setup with options to:

* Start/stop the database
* Build/rebuild Docker images
* Run Docker containers
* View logs
* Install dependencies

.. tip::
   Use the interactive menu for the easiest setup experience. It handles dependencies and configuration automatically.

Option B: Docker Compose
^^^^^^^^^^^^^^^^^^^^^^^^^

.. code-block:: bash

   cd DevEnvSetup
   docker-compose up -d

This starts all services in containers:

* Database (PostgreSQL with TimescaleDB)
* Backend (Go telemetry server)
* Frontend (React application)

Option C: Manual Setup (Development)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

For active development, run components separately:

**Terminal 1 - Database:**

.. code-block:: bash

   # Using Docker
   cd DevEnvSetup
   docker-compose up -d db

**Terminal 2 - Backend:**

.. code-block:: bash

   cd backend-processing/cmd/telemetryserver
   go mod tidy
   go run main.go

**Terminal 3 - Frontend:**

.. code-block:: bash

   cd telemetry-app
   npm install
   npm run dev

**Terminal 4 - Simulator (optional):**

.. code-block:: bash

   cd backend-processing/cmd/csvserver
   go run simulate_sender.go -csvfile ../../testdata/data.csv -startline 960000

3. Verify Installation
~~~~~~~~~~~~~~~~~~~~~~~

Check that all services are running:

.. code-block:: bash

   # Check ports are listening
   lsof -i :9091,9092,9094,5432,5173

   # Test backend health
   curl http://localhost:9092/api/v1/health

   # Test WebSocket connection (should upgrade from HTTP)
   curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
        http://localhost:9091/telemetry

4. Access the Application
~~~~~~~~~~~~~~~~~~~~~~~~~~

* **Frontend**: http://localhost:5173 (Vite dev) or http://localhost:9093 (Docker)
* **REST API**: http://localhost:9092/api/v1
* **WebSocket Ingest**: ws://localhost:9091/telemetry
* **WebSocket Live**: ws://localhost:9094

First Steps
-----------

Once the system is running, here's what to explore:

1. View Live Data
~~~~~~~~~~~~~~~~~

Navigate to the "Live View" page to see real-time telemetry data. If using the CSV simulator, you should see data flowing immediately.

2. Explore Historical Data
~~~~~~~~~~~~~~~~~~~~~~~~~~~

Visit the "Historical" page to query past telemetry data. Try different time ranges and signal types.

3. Check System Status
~~~~~~~~~~~~~~~~~~~~~~~

Look at the top-right corner of the UI for connection status indicators:

* **Green**: WebSocket connected and receiving data
* **Yellow**: WebSocket connected but no data
* **Red**: WebSocket disconnected

4. Customize Dashboards
~~~~~~~~~~~~~~~~~~~~~~~~

Use the configuration panel to:

* Add/remove charts
* Change update intervals
* Select which signals to display
* Adjust visualization settings

Common First-Time Tasks
-----------------------

Add a New Signal to Monitor
~~~~~~~~~~~~~~~~~~~~~~~~~~~~

See :doc:`integration/adding_new_signals` for the complete guide.

Quick steps:

1. Update DBC file with new signal definition
2. Regenerate JSON: ``python scripts/convert_dbc_to_json.py``
3. Add processing logic in ``pkg/processdata/processdata.go``
4. Create database table in ``db/telem_data.sql``
5. Add frontend component to display the data

Test with Sample Data
~~~~~~~~~~~~~~~~~~~~~~

The CSV simulator provides test data without needing a physical vehicle:

.. code-block:: bash

   cd backend-processing/cmd/csvserver
   go run simulate_sender.go -csvfile ../../testdata/data.csv

This streams realistic telemetry data through the system.

Query Historical Data
~~~~~~~~~~~~~~~~~~~~~

Use the REST API to retrieve historical data:

.. code-block:: bash

   curl "http://localhost:9092/api/v1/historical/cell-data?\
   start_time=2025-01-01T00:00:00Z&\
   end_time=2025-01-02T00:00:00Z&\
   limit=100"

Troubleshooting
---------------

If you encounter issues during setup:

No Data Appearing in Frontend
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

1. Check WebSocket status indicator (top-right)
2. Verify backend is running: ``curl http://localhost:9092/api/v1/health``
3. Verify simulator/device is sending data
4. Check browser console (F12) for errors
5. See :doc:`troubleshooting/quick_reference` for detailed steps

Database Connection Errors
~~~~~~~~~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   # Check database is running
   docker ps | grep postgres
   
   # Test connection
   psql -h localhost -U postgres -d telem_db

   # Check configuration
   cat backend-processing/configs/config.yaml

Port Already in Use
~~~~~~~~~~~~~~~~~~~

.. code-block:: bash

   # Find process using port
   lsof -i :9091
   
   # Kill process if needed
   kill -9 <PID>

.. warning::
   On macOS, AirPlay Receiver uses port 5000 by default. If running into port conflicts, disable it in System Preferences → Sharing.

Next Steps
----------

Now that you have the system running, explore:

* :doc:`architecture/overview` - Understand the system architecture
* :doc:`integration/adding_new_signals` - Add custom signals
* :doc:`frontend/components` - Customize the UI
* :doc:`backend/performance_tuning` - Optimize for production
* :doc:`integration/deployment` - Deploy to production

Additional Resources
--------------------

* **Project Repository**: https://github.com/issam-akhtar/UCR-02-Telemetry
* **Issue Tracker**: https://github.com/issam-akhtar/UCR-02-Telemetry/issues
* **Architecture Diagrams**: :doc:`architecture/data_flow`
* **API Reference**: :doc:`networking/rest_api`
* **Glossary**: :doc:`glossary` for technical terms

Need Help?
----------

* Check the :doc:`troubleshooting/comprehensive_guide`
* Review :doc:`troubleshooting/quick_reference` for common issues
* Open an issue on GitHub
* Contact the UCR-02 team

.. tip::
   Save the interactive menu script location - it's the quickest way to manage the development environment!
