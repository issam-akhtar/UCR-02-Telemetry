CSV Simulation
=============

This document describes how to use CSV files to simulate telemetry data in the UCR-02-Telemetry system.

Introduction
-----------

The UCR-02-Telemetry system includes a CSV simulation tool that allows developers to replay recorded telemetry data or create test scenarios without requiring physical hardware.

CSV Format
---------

The simulator expects CSV files with the following format:

.. code-block:: text

   timestamp,id,data
   1621234567.123,100,0102030405060708
   1621234567.234,101,0102030405060708
   1621234567.345,102,0102030405060708

Where:

* **timestamp** - Unix timestamp with millisecond precision
* **id** - CAN Frame ID (decimal)
* **data** - Hex-encoded data bytes (up to 8 bytes)

CSV Simulator Tool
---------------

The CSV simulator is located at ``backend-processing/cmd/csvserver/simulate_sender.go``.

Basic Usage
~~~~~~~~~

.. code-block:: bash

   cd backend-processing/cmd/csvserver
   go run simulate_sender.go -csvfile ../../testdata/data.csv

Advanced Options
~~~~~~~~~~~~~

.. code-block:: bash

   # Start from a specific line in the CSV file
   go run simulate_sender.go -csvfile ../../testdata/data.csv -startline 1000
   
   # Set custom replay speed (default is 1.0 = real-time)
   go run simulate_sender.go -csvfile ../../testdata/data.csv -speed 2.0
   
   # Connect to a custom WebSocket endpoint
   go run simulate_sender.go -csvfile ../../testdata/data.csv -endpoint ws://custom-host:9091/telemetry

Docker Usage
~~~~~~~~~~

The simulator can also be run from within the Docker environment:

.. code-block:: bash

   cd DevEnvSetup
   ./run_simulator.sh ../../testdata/data.csv

Creating Test Data
---------------

You can create your own test data CSV files using the following approaches:

Capture Live Data
~~~~~~~~~~~~~~

Record live telemetry data for later replay:

1. Connect to the physical device and capture the raw WebSocket data
2. Convert the captured binary data to CSV format
3. Store in the ``testdata`` directory for later use

Generate Synthetic Data
~~~~~~~~~~~~~~~~~~~

For controlled testing scenarios, generate synthetic data:

.. code-block:: python

   import csv
   import time
   
   # Generate synthetic data file
   with open('synthetic_test.csv', 'w', newline='') as file:
       writer = csv.writer(file)
       writer.writerow(["timestamp", "id", "data"])
       
       base_time = time.time()
       for i in range(1000):
           timestamp = base_time + (i * 0.01)  # 10ms intervals
           
           # Generate alternating message types
           if i % 3 == 0:
               # Temperature message
               writer.writerow([f"{timestamp:.3f}", "100", "1E00000000000000"])
           elif i % 3 == 1:
               # RPM message
               writer.writerow([f"{timestamp:.3f}", "101", "E8030000"])
           else:
               # Current message
               writer.writerow([f"{timestamp:.3f}", "102", "2C0100000000"])

Testing Strategies
----------------

Continuous Integration
~~~~~~~~~~~~~~~~~~

Use CSV simulation for automated testing:

1. Create reference CSV files for known scenarios
2. Run the simulator with these files during CI/CD pipelines
3. Validate expected outputs against predefined benchmarks

Regression Testing
~~~~~~~~~~~~~~~

Use CSV simulation to verify fixes:

1. Capture CSV data that triggers a specific issue
2. Fix the issue in the codebase
3. Re-run the simulator with the same data to verify the fix

Performance Testing
~~~~~~~~~~~~~~~~

Generate large CSV files to test system performance:

1. Create CSV files with high message frequencies
2. Run the simulator with these files
3. Monitor system performance metrics (CPU, memory, message throughput)

Troubleshooting
-------------

Common issues with CSV simulation:

* **Timestamp format** - Ensure timestamps use the correct format (Unix time with millisecond precision)
* **Data format** - Hex data must be properly formatted without spaces or "0x" prefixes
* **File permissions** - Ensure the CSV file is readable by the simulation process
* **Connection issues** - Verify the WebSocket server is running and accessible