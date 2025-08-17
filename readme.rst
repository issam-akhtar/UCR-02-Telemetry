UCR-02 Telemetry - Developer Guide
=================================

This document is the canonical, comprehensive developer guide for the UCR-02
Telemetry website and backend. It explains architecture, components, how to run
and develop locally (Docker and native), data formats, integration points,
common troubleshooting, and how to build the Sphinx documentation (including
Mermaid diagrams).

Key folders
-----------

- ``Software/backend-processing`` - Go backend: CAN decoding, Protobuf, WebSocket
  hub, REST historical API, DB layer.
- ``Software/telemetry-app`` - Frontend: Vite + React single-page app, WebSocket
  client, charts, model viewer.
- ``Software/DevEnvSetup`` - Docker Compose and helper scripts to run the full
  stack locally (recommended for new developers).

Quick start - Docker (recommended)
---------------------------------

1. Change to the DevEnv folder:

   ``cd Software/DevEnvSetup``
2. Start services:

   ``docker-compose up --build``

This composes the backend, frontend, and database containers.

Quick start - native (no Docker)
--------------------------------

Backend (Go):

- Install Go and set GOPATH/GOMOD properly.
- Build and run the telemetry server:

  ``cd Software/backend-processing``
  ``go build ./cmd/telemetryserver``
  ``./telemetryserver --config configs/config.yaml``

Frontend (React):

- Install Node.js and npm (LTS recommended).
- From ``Software/telemetry-app`` run:

  ``npm install``
  ``npm run dev``

Architecture and Data Flows
--------------------------

Live telemetry flow (high level):

.. mermaid::

   sequenceDiagram
     participant ESP as ESP32
     participant CAN as CAN Bus
     participant Backend as Go Backend
     participant DB as Database
     participant WS as WebSocket Hub
     participant FE as Frontend

     ESP->>CAN: CAN frames
     CAN->>Backend: frames received (simulator or hardware)
     Backend->>Backend: candecoder decodes to named signals
     Backend->>DB: persist telemetry rows
     Backend->>WS: broadcast protobuf messages
     WS->>FE: frontend receives and renders

Integration contracts
---------------------

Realtime (WebSocket):
- Endpoint: ``ws://<host>:<port>/ws`` (configured in backend config)
- Payload: Protobuf binary messages defined in
  ``Software/backend-processing/proto/telemetry.proto``

Historical (HTTP REST):
- Example endpoint: ``GET /api/historical?signal=<name>&from=<t>&to=<t>``
- Implementation: ``internal/handlers/historical.go`` queries the DB and returns
  timestamped samples (JSON).

Protobuf
--------

- Backend proto definition: ``Software/backend-processing/proto/telemetry.proto``
- Frontend copy: ``Software/telemetry-app/public/proto/telemetry.proto``

Keep these in sync when changing message shapes.

Developer checklist
------------------

- Use Docker Compose for quick setup.
- Use the CSV simulator in ``Software/backend-processing/cmd/csvserver`` for test
  traffic.
- Keep protos synced between backend and frontend.

Detailed data flow and backend/frontend integration
--------------------------------------------------

This section explains end-to-end how telemetry moves through the system, what
components touch it, and how it ends up on both real-time and historical
graphs. It also explains the charting architecture on the frontend and how the
system keeps graphs responsive under load.

1) Ingestion (how data comes into the system)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

- Sources: telemetry originates from embedded devices (ESP32 or ECUs) that put
  CAN frames onto a CAN bus. For development and testing there is a CSV-based
  simulator in ``Software/backend-processing/cmd/csvserver`` that emits frames
  using the same message IDs and payload formats.
- Transport to backend: the backend reads raw CAN frames from either a CAN
  interface (socketcan, device driver) or from the simulator over TCP/HTTP as
  configured.

2) Decoding (candecoder)
^^^^^^^^^^^^^^^^^^^^^^^^^

- The raw CAN frames are identified by arbitration ID (message ID) and data
  bytes. The backend uses a DBC-derived JSON mapping (``configs/UCR-01.json``)
  and the logic in ``pkg/candecoder`` to decode frames into named signals.
- Each signal decoding typically applies bit offset, length, endianness,
  scaling factor, and offset. The raw numeric value becomes a typed signal with
  metadata (units, name, min/max).

3) Processing (pkg/processdata)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

- After decoding, signals flow into the processing pipeline (``pkg/processdata``).
  Responsibilities here include:
  - Filtering invalid values and applying calibration transforms.
  - Aggregation or unit conversion (e.g., raw ADC -> Celsius).
  - Throttling: limit frequency of updates per-signal to avoid flooding the
    frontend (see ``throttler.go``).
  - Batching: small batches of updates may be grouped to reduce the number of
    WebSocket messages.
- The processor also annotates each update with a server-side timestamp and a
  monotonic sequence if needed.

4) Persistence (DB)
^^^^^^^^^^^^^^^^^^^

- Processed signals destined for historical analysis are written to the
  configured SQL database. The DB schema lives in ``db/telem_data.sql``.
- Writes are usually batched and use prepared statements to optimize throughput.
- The backend supports configurable retention and partitioning strategies
  (simple SQLite files for dev; Postgres for production-like setups).

5) Broadcasting (WebSocket hub)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

- For real-time UI updates, the backend serializes signal updates into
  Protobuf messages (``proto/telemetry.proto``) and publishes them to the
  WebSocket Hub (``internal/wsserver/hub.go``).
- The Hub maintains a list of connected clients. Each client has a send queue
  and per-connection backpressure management. If a send queue grows large the
  server may drop old messages (configurable) or disconnect slow clients.

6) Frontend reception and rendering
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

- WebSocket client: the frontend's WebSocket client (``src/services/websocket.js``)
  connects to the backend endpoint. It receives binary frames which are
  decoded with the frontend Protobuf runtime (using the proto in
  ``public/proto/telemetry.proto``).
- Data shape: decoded messages contain a timestamp and a map of signal names
  to values. Example decoded JSON:

  {
    "timestamp": "2025-01-01T00:00:05Z",
    "signals": { "vehicle_speed": 31.2, "motor_temp": 68.4 }
  }

- Real-time chart pipeline (frontend):
  1. WebSocket handler decodes protobuf and calls the real-time data hook
     (``useRealTimeData``).
  2. The hook validates and normalizes values and writes them into an in-memory
     circular buffer per-signal (fixed capacity, e.g., 10k samples).
  3. The chart component subscribes to the buffer and uses a lightweight
     rendering strategy:
     - For high-frequency signals, the rendering may downsample (e.g., ``largest-triangle-three-buckets``
       or decimation) before drawing.
     - The charting library (e.g., Recharts / custom canvas renderer) updates
       only the changed series to minimize DOM work.

7) Historical data path
^^^^^^^^^^^^^^^^^^^^^^^

- When a user opens a historical chart, the frontend calls the REST endpoint
  (``/api/historical``) for the requested signal and time range.
- The backend handler (``internal/handlers/historical.go``) validates the
  request, translates the time range into a DB query, and returns a compact
  JSON array of timestamp/value pairs. For very large ranges the handler may
  apply server-side downsampling or return data in pages.
- The frontend receives the JSON, populates the chart data store (buffer), and
  renders the historical curve. If the user also has real-time updates enabled
  for that signal, the real-time buffer merges new samples into the same
  series (care is taken to avoid duplicates by comparing timestamps/sequence
  numbers).

8) End-to-end example (how a value appears on a graph)
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

1. Device emits a CAN frame containing a cell temperature value.
2. Backend receives frame and decodes it to a signal "cell_temp" via
   ``pkg/candecoder``.
3. The decoded value flows into ``pkg/processdata`` which applies calibration
   and the throttler.
4. The backend writes the sample to the DB (for historical) and serializes a
   protobuf message which is placed on the Hub broadcast queue.
5. The frontend WebSocket client receives the message, decodes it, and the
   real-time hook appends it to the in-memory buffer for ``cell_temp``.
6. The chart component obtains the latest samples (possibly downsampled) and
   re-renders the chart showing the new point.

9) Performance and resilience considerations
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

- Throttling: configure per-signal rates in the backend to avoid flooding the
  UI with very high frequency signals (accelerometers, etc.).
- Batching: group multiple signals into a single protobuf message to reduce
  per-message overhead.
- Backpressure: WebSocket clients maintain a bounded send queue; when the
  queue is full the backend must choose to drop or disconnect slow clients.
- DB failover: the backend can buffer writes in memory while the DB is
  unavailable and flush them when connectivity is restored. For production,
  consider using a durable queue (e.g., Kafka/Redis) to avoid data loss.

10) Developer tips for debugging data flow
^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

- Use the CSV simulator to reproduce sequences of frames and test the full
  pipeline quickly.
- Use the WebSocket raw binary logger (frontend) to capture incoming frames
  and decode them with the same proto locally to validate shapes.
- Instrument the backend with metrics (counts, latencies, queue lengths) to
  identify throttling or backpressure issues.


Building the Sphinx docs
------------------------

A Sphinx config and an index are available in ``docs/``. To build the HTML:

```
python3 -m venv .docs-venv
source .docs-venv/bin/activate
pip install -r docs/requirements.txt
cd docs
make html
```

The generated site is under ``docs/_build/html``.

If you want more targeted developer help (CI, extra diagrams, or sample
deploy scripts), tell me which part to expand.
