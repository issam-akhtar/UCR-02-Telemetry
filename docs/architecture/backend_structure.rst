Backend file structure and where to change things
================================================

This page lists important folders and files in ``Software/backend-processing``
and explains where to make changes for common tasks.

Top-level files
---------------

- ``go.mod`` / ``go.sum``: Go module dependencies.
- ``Dockerfile``: how the backend container image is built.
- ``configs/config.yaml``: main runtime configuration (bind addresses,
  database settings, decoder paths). Change this to adjust runtime behavior.

CMDs and servers
----------------

- ``cmd/telemetryserver/main.go``: production server entrypoint. Change server
  bootstrapping, middleware, or CLI flags here.
- ``cmd/csvserver``: simple CSV-based simulator used for development.

Protobuf and types
------------------

- ``proto/telemetry.proto`` and generated ``proto/telemetry.pb.go``: canonical
  protobuf definitions and Go bindings. When modifying, regenerate Go code.

Configs and DBC
---------------

- ``configs/UCR-01.dbc``: original DBC (domain-specific CAN database file)
- ``scripts/convert_dbc_to_json.py``: helper to convert a .dbc into JSON
  mappings used by the decoder.
- ``configs/UCR-01.json``: DBC-derived JSON mapping used by ``pkg/candecoder``.

pkg/ - core packages
--------------------

- ``pkg/candecoder``
  - Purpose: map raw CAN frames to named signals using the JSON/DBC mapping.
  - Look here to change decoding, add new messages, or adjust scaling.

- ``pkg/processdata``
  - Purpose: smoothing, throttling, preparing messages for DB and WS
    broadcasting.
  - Files: ``processdata.go``, ``throttler.go``. Edit these to change
    throttling algorithms or batching behavior.

- ``pkg/db``
  - Purpose: database access helpers (insert samples, query historical ranges).
  - Files: ``db.go``. Modify to change SQL dialect, batch sizes, or schema
    mapping.

internal/ - application internals
--------------------------------

- ``internal/wsserver``
  - hub.go: the WebSocket hub that manages clients and broadcast loops. Modify
    to change client lifecycle behavior, broadcast strategies, or heartbeats.

- ``internal/handlers``
  - ``historical.go``: REST handlers for historical data. Edit to change API
    shapes, add auth, or implement server-side downsampling.

DB schema and scripts
---------------------

- ``db/telem_data.sql``: initial schema used to create the telemetry table.
- ``*_script.sh`` helper scripts: automate common tasks (DB init, Pi-specific
  deployment steps).

Where to look for common changes
--------------------------------

- Add/update message decodes: ``pkg/candecoder`` and update ``configs/*.json``
  (or convert a new .dbc).
- Change throttling/aggregation behavior: ``pkg/processdata/throttler.go`` and
  ``processdata.go``.
- Adjust WebSocket behavior (ping, queue policy): ``internal/wsserver/hub.go``.
- Change HTTP API endpoints and parameters: ``internal/handlers/historical.go``.

Developer tips
--------------

- Use the CSV simulator (``cmd/csvserver``) to reproduce decoding and pipeline
  tests.
- Use the protobuf definitions to produce test fixtures that both the backend
  and frontend can read.
- Add unit tests around ``pkg/candecoder`` decoders using the mappings in
  ``configs/`` to ensure future DBC changes don't regress decoding.
