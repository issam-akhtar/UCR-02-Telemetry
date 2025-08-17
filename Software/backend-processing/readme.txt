This is the refactored Telemetry System backend. Below are quick developer
instructions and a pointer to the canonical documentation (root ``readme.rst``
and Sphinx docs in ``docs/``).

Quick local build (native)
--------------------------

1. Build the CSV simulator server (for test traffic):

   cd cmd/csvserver
   go build
   ./csvserver --addr=localhost:8081

2. Build and run the telemetry server:

   cd cmd/telemetryserver
   go build
   ./telemetryserver --config ../configs/config.yaml

3. Endpoints

   - WebSocket: ws://localhost:<ws-port>/ws
   - Historical REST examples: /api/historical?signal=<name>&from=<t>&to=<t>

Documentation
-------------

This backend is documented in the repository-wide developer guide at the root
``readme.rst`` and in the Sphinx site under ``docs/``. To build the docs locally
see ``docs/requirements.txt`` and run ``make html`` in ``docs/``.

For deeper dives (DBC conversions, protobuf changes), read the files in this
folder: ``pkg/candecoder``, ``proto/``, ``internal/handlers`` and ``pkg/db``.
