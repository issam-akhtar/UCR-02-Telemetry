Deployment
==========

This document outlines the deployment options and procedures for the UCR-02-Telemetry system.

Introduction
-----------

The UCR-02-Telemetry system can be deployed in various environments, from development workstations to race-day pit laptops to permanent server installations.

Deployment Options
---------------

Local Development Environment
~~~~~~~~~~~~~~~~~~~~~~~~~~

For development and testing:

.. code-block:: bash

   # Terminal 1 - Start the database (if not running)
   cd DevEnvSetup
   docker-compose -f docker-compose.yml up -d db
   
   # Terminal 2 - Start backend
   cd backend-processing/cmd/telemetryserver
   go run main.go
   
   # Terminal 3 - Start frontend
   cd telemetry-app
   npm install
   npm run dev

Docker Deployment
~~~~~~~~~~~~~~

For containerized deployment:

.. code-block:: bash

   cd DevEnvSetup
   docker-compose up -d

Docker Customization
~~~~~~~~~~~~~~~~

Customize the Docker deployment by editing:

* ``.env`` file for environment variables
* ``docker-compose.yml`` for service configuration

Raspberry Pi Deployment
~~~~~~~~~~~~~~~~~~~

The UCR-02-Telemetry system can run on Raspberry Pi devices:

.. code-block:: bash

   # Install dependencies
   sudo apt-get update
   sudo apt-get install -y postgresql docker.io docker-compose
   
   # Setup database
   ./telemetry_database_pi_script.sh
   
   # Start backend
   ./telemetry_backend_pi_script.sh
   
   # Start frontend
   ./telemetry_frontend_pi_script.sh

Configuration Options
------------------

The primary configuration file is located at ``backend-processing/configs/config.yaml``.

Key configuration options:

.. code-block:: yaml

   mode: "csv"           # "csv" or "live"
   websocket:
     host: "0.0.0.0"
     port: 9091
     path: "/telemetry"
   apiport: 9092
   live_ws_port: 9094
   database:
     connection_string: "postgresql://username:password@localhost:5432/telem_db"
     batch_size: 100

Network Requirements
-----------------

The UCR-02-Telemetry system requires:

* **Port 9091** - Raw telemetry WebSocket ingest
* **Port 9092** - REST API
* **Port 9094** - Frontend WebSocket
* **Port 5432** - PostgreSQL database (internal)
* **Port 3000** - Frontend HTTP server

Scaling Considerations
-------------------

Database Scaling
~~~~~~~~~~~~~

TimescaleDB provides several scaling options:

* **Partitioning** - Automatic with TimescaleDB hypertables
* **Retention policies** - Set up for automatic data pruning
* **Compression** - Enable for older chunks to save space

.. code-block:: sql

   -- Example: Set retention policy to keep 30 days of data
   SELECT add_retention_policy('cell_data', INTERVAL '30 days');
   
   -- Example: Enable compression on a table
   ALTER TABLE cell_data SET (timescaledb.compress = true);

Backup and Restore
---------------

Database Backup
~~~~~~~~~~~~

Back up the TimescaleDB database:

.. code-block:: bash

   pg_dump -h localhost -U username -d telem_db -F custom -f backup.dump

Database Restore
~~~~~~~~~~~~~

Restore the database:

.. code-block:: bash

   pg_restore -h localhost -U username -d telem_db -c backup.dump

Monitoring
--------

Service Health
~~~~~~~~~~~

Monitor system health:

* **Backend services** - Check logs and API endpoint ``/health``
* **Database** - Query ``pg_stat_activity`` table
* **WebSocket servers** - Monitor connection counts and throughput

Log Files
~~~~~~~

Key log files:

* **Backend logs** - Standard output or syslog
* **Database logs** - PostgreSQL logs
* **Frontend logs** - Browser console or npm output

Troubleshooting Deployment
-----------------------

Common deployment issues:

* **WebSocket connection failures** - Check network configuration and firewall rules
* **Database connection issues** - Verify PostgreSQL is running and connection string
* **Frontend not loading** - Check browser console for JavaScript errors