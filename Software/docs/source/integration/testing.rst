Testing
=======

This document outlines testing strategies and procedures for the UCR-02-Telemetry system.

Introduction
-----------

Comprehensive testing is essential to ensure the UCR-02-Telemetry system reliably captures, processes, and displays telemetry data. This document covers various testing approaches and tools.

Unit Testing
----------

Backend Tests
~~~~~~~~~~~

The backend components use Go's built-in testing framework:

.. code-block:: bash

   cd backend-processing
   go test ./...

Key test files include:

* ``pkg/candecoder/candecoder_test.go`` - Tests for CAN message decoding
* ``pkg/processdata/processdata_test.go`` - Tests for data processing logic
* ``pkg/db/db_test.go`` - Tests for database operations

Frontend Tests
~~~~~~~~~~~~

The frontend uses Jest and React Testing Library:

.. code-block:: bash

   cd telemetry-app
   npm test

Component tests check:

* Correct rendering of UI elements
* Real-time data updates
* Chart behavior with dynamic data

Integration Testing
----------------

WebSocket Integration
~~~~~~~~~~~~~~~~~~

Test WebSocket communication:

.. code-block:: bash

   # Start the backend server
   cd backend-processing/cmd/telemetryserver
   go run main.go
   
   # In another terminal, run the test client
   cd backend-processing/test
   go run websocket_test_client.go

Database Integration
~~~~~~~~~~~~~~~~~

Test database operations with real data:

1. Start the database and server
2. Run integration tests:

   .. code-block:: bash
   
      cd backend-processing/test
      go run db_integration_test.go

End-to-End Testing
---------------

CSV Simulation Testing
~~~~~~~~~~~~~~~~~~

Use CSV simulation for end-to-end testing:

.. code-block:: bash

   # Start the backend server
   cd backend-processing/cmd/telemetryserver
   go run main.go
   
   # Start the frontend
   cd telemetry-app
   npm run dev
   
   # Run the CSV simulator
   cd backend-processing/cmd/csvserver
   go run simulate_sender.go -csvfile ../../testdata/data.csv

Browser Automation
~~~~~~~~~~~~~~~

Use tools like Cypress for browser automation:

.. code-block:: bash

   cd telemetry-app
   npx cypress open

Performance Testing
----------------

Load Testing
~~~~~~~~~~

Test system performance under load:

.. code-block:: bash

   # Generate high-volume test data
   python scripts/generate_test_data.py --rows 1000000 --rate 1000
   
   # Run with high message throughput
   cd backend-processing/cmd/csvserver
   go run simulate_sender.go -csvfile ../../testdata/high_volume.csv -speed 10.0

Memory Profiling
~~~~~~~~~~~~~

Profile memory usage:

.. code-block:: bash

   # Run with memory profiling enabled
   cd backend-processing/cmd/telemetryserver
   go run -memprofile=mem.prof main.go
   
   # Analyze memory usage
   go tool pprof -http=:8080 mem.prof

CPU Profiling
~~~~~~~~~~

Profile CPU usage:

.. code-block:: bash

   # Run with CPU profiling enabled
   cd backend-processing/cmd/telemetryserver
   go run -cpuprofile=cpu.prof main.go
   
   # Analyze CPU usage
   go tool pprof -http=:8080 cpu.prof

Test Data Generation
-----------------

Generate test data for various scenarios:

.. code-block:: python

   # Generate normal operation data
   python scripts/generate_test_data.py --scenario normal
   
   # Generate error condition data
   python scripts/generate_test_data.py --scenario error
   
   # Generate edge case data
   python scripts/generate_test_data.py --scenario edge

Continuous Integration
-------------------

GitHub Actions
~~~~~~~~~~~

The repository includes GitHub Actions workflows for automated testing:

.. code-block:: yaml

   # Backend tests
   - name: Test Backend
     run: cd backend-processing && go test ./...
   
   # Frontend tests
   - name: Test Frontend
     run: cd telemetry-app && npm test

Local CI/CD
~~~~~~~~~

Run the CI/CD pipeline locally:

.. code-block:: bash

   # Run the complete test suite
   ./scripts/run_ci_tests.sh

Best Practices
-----------

1. **Test coverage** - Aim for high test coverage of critical components
2. **Regression testing** - Add tests for any bugs found
3. **Parameterized tests** - Use table-driven tests for multiple scenarios
4. **Mock external dependencies** - Use mocks for databases, WebSockets, etc.
5. **Automated testing** - Integrate tests with CI/CD pipelines

Troubleshooting Tests
------------------

Common test issues:

* **Flaky tests** - Tests that sometimes pass and sometimes fail
* **Slow tests** - Tests that take too long to run
* **Resource leaks** - Tests that don't clean up resources