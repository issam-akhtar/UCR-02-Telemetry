Backend internals
Backend: consolidated documentation
==================================

This consolidated page gathers all backend-relevant information in one place
for developers working in ``Software/backend-processing``. It includes a
high-level overview, a directory map, detailed per-package notes, the single
packet message flow, and practical guidance for changes and testing.

High-level overview
-------------------

The backend:

- Receives raw CAN frames (from hardware or simulator).
- Decodes frames to named signals (``pkg/candecoder``).
- Processes signals (smoothing, unit conversion, throttling) in
  ``pkg/processdata``.
- Persists historical samples to a SQL DB (``pkg/db`` + ``db/telem_data.sql``).
- Broadcasts real-time updates to WebSocket clients using Protobuf
  (``internal/wsserver`` + ``proto/``).

Project layout (important files)
--------------------------------

- ``cmd/telemetryserver/main.go`` - server entrypoint; adjust bootstrapping,
  logging, middleware, and CLI flags here.
- ``cmd/csvserver/`` - CSV-based simulator for development and CI.
- ``internal/config`` - configuration loader (YAML parsing) and runtime
  defaults.
- ``internal/wsserver`` - WebSocket hub: client management, broadcast loops,
  and per-client queues.
- ``internal/handlers`` - HTTP handlers including ``historical.go`` for
  historical data queries.
- ``pkg/candecoder`` - DBC/JSON-driven decoding logic. Primary place to add
  new message decoders or adjust bitfield parsing.
- ``pkg/processdata`` - signal processing, throttling, batching, and server
  side annotations.
- ``pkg/db`` - DB abstraction; wraps SQL insert/query for telemetry.
- ``proto/`` - Protobuf message definitions and generated Go sources
  (``telemetry.proto`` and ``telemetry.pb.go``).
- ``configs/`` - contains ``config.yaml``, DBC/JSON mappings (``UCR-01.json``),
  and the raw DBC file (``UCR-01.dbc``).
- ``db/telem_data.sql`` - initial schema for telemetry storage.

Single-packet end-to-end sequence
---------------------------------

This diagram follows a single CAN frame through decode, processing,
persistence, broadcast, and frontend update.

.. mermaid::

   sequenceDiagram
     participant Device as ESP32
     participant CAN as CAN Bus
     participant Backend as Telemetry Server
     participant Decoder as candecoder
     participant Processor as processdata
     participant DB as Database
     participant Hub as WebSocket Hub
     participant FE as Frontend

     Device->>CAN: CAN frame (ID=0x123, data=...)
     CAN->>Backend: receive frame
     Backend->>Decoder: decode -> {cell_temp: 42.7}
     Decoder-->>Processor: decoded signals
     Processor->>DB: INSERT sample (cell_temp, ts)
     Processor->>Hub: marshal protobuf and enqueue
     Hub->>FE: deliver protobuf binary frame
     FE->>FE: decode, buffer, render chart update

Per-package notes and common change points
------------------------------------------

pkg/candecoder
~~~~~~~~~~~~~~

- Purpose: translate raw CAN frames (IDs and bytes) into named signals using
  JSON mappings derived from .dbc files.
- Where to change: add/modify JSON mappings in ``configs/`` and adjust
  ``pkg/candecoder/candecoder.go`` for parsing logic (endianness, signedness,
  scaling).

pkg/processdata
~~~~~~~~~~~~~~~

- Purpose: apply smoothing, throttling, batching. Emit events to DB and WS.
- Where to change: ``pkg/processdata/processdata.go`` and
  ``pkg/processdata/throttler.go``. Modify throttling algorithms and batch
  sizes here.

pkg/db
~~~~~~

- Purpose: provide insert/query helpers; adapt SQL for your chosen DB.
- Where to change: ``pkg/db/db.go`` and ``db/telem_data.sql``. For Postgres
  adjustments, modify queries to use prepared statements and optimize indices.

internal/wsserver
~~~~~~~~~~~~~~~~~

- Purpose: manage WebSocket clients, their send queues, and broadcasts.
- Where to change: ``internal/wsserver/hub.go`` — add heartbeat policies,
  change queue policies (drop/close), or add per-client subscriptions.

internal/handlers
~~~~~~~~~~~~~~~~~

- Purpose: HTTP handlers. ``internal/handlers/historical.go`` implements
  historical query endpoints.
- Where to change: add server-side downsampling, pagination, or auth here.

Configs and DBC conversion
--------------------------

- To add or change signal maps, edit the DBC or use
  ``scripts/convert_dbc_to_json.py`` to regenerate JSON mappings and place
  them in ``configs/``.

Testing and simulator
---------------------

- Use ``cmd/csvserver`` to simulate real traffic. Unit tests should cover
  ``pkg/candecoder`` decoding using small sample frames and expected outputs.

Operational notes
-----------------

- Backpressure: Hub uses bounded queues; consider durable queues for
  high-volume production systems.
- Schema migrations: if you change ``db/telem_data.sql``, provide migrations
  or versioned schema updates.
