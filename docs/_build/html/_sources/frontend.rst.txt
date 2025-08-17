Frontend: consolidated documentation
===================================

This consolidated page contains everything a developer needs to know about the
frontend (``Software/telemetry-app``): project layout, where to make common
changes, the real-time data path, chart rendering details, performance tips,
and links to relevant files.

Quick jump list
---------------

- To change WebSocket behavior: ``src/services/websocket.js``
- To change proto decoding: ``public/proto/telemetry.proto`` & ``src/utils/protobuf.js``
- To change buffer/downsampling: ``src/hooks/useRealTimeData.js``
- To add/modify charts: ``src/components/charts/*``, pages in ``src/pages/``

Project layout (important files)
--------------------------------

- Top-level: ``package.json`` (scripts/deps), ``vite.config.js`` (build/dev
  server settings), ``Dockerfile``.
- Public assets: ``public/proto/telemetry.proto``, ``public/3D/``, ``public/SVG/``.
- Source: ``src/`` — main app code:
  - ``src/main.jsx`` and ``src/App.jsx`` — app bootstrap and providers.
  - ``src/pages/`` — Dashboard, RealTimeCharts, HistoricalCharts, ModelViewer.
  - ``src/services/websocket.js`` — WebSocket connect/reconnect, binary handling.
  - ``src/services/api.js`` — REST helpers for historical queries.
  - ``src/utils/protobuf.js`` — Protobuf decode helpers for client.
  - ``src/hooks/useRealTimeData.js`` & ``useHistoricalData.js`` — central
    buffering and data normalization.
  - ``src/components/charts/`` — chart implementations and wrappers.

Real-time data path (detailed)
-----------------------------

1) Connection and frame reception

- The WebSocket client (`src/services/websocket.js`) opens a binary socket to
  ``ws://<host>/ws`` and sets ``binaryType='arraybuffer'``.
- Frames are received as ArrayBuffers (protobuf binary) and forwarded to the
  decoder.

2) Protobuf decode and normalization

- ``src/utils/protobuf.js`` decodes the binary using a Protobuf runtime
  (generated or runtime reflection). The decoded message has a timestamp and
  a mapping of signal names to numeric values.
- The decoder normalizes field names and applies any small per-field
  post-processing required by the frontend (unit conversions for display).

3) Buffering and backpressure

- Decoded messages go into ``useRealTimeData`` which maintains a per-signal
  circular buffer (fixed capacity). This design bounds memory growth and
  simplifies charting windows (e.g., last N seconds or samples).
- The buffer append is cheap (O(1)), and the hook exposes a subscription API
  so chart components only read the current window when they need to render.

4) Downsampling and rendering

- To avoid plotting too many points, the frontend may downsample using an
  algorithm like Largest-Triangle-Three-Buckets (LTTB) or simple decimation
  before rendering.
- Chart components throttle their render updates (for example, only every
  200-500ms) to make the UI smooth while still providing timeliness.

5) Historical merge

- Historical values fetched from ``/api/historical`` are added into the same
  buffers (with timestamp normalization). When both historical and live data
  are present, the UI merges them and deduplicates using timestamp/sequence
  numbers.

Where to change behavior (file->action)
--------------------------------------

- Add new chart widget: ``src/components/charts/`` and import in
  ``src/pages/RealTimeCharts.jsx`` or ``HistoricalCharts.jsx``.
- Change reconnect/backoff: ``src/services/websocket.js``.
- Change buffer sizes / sampling: ``src/hooks/useRealTimeData.js``.
- Update Protobuf shapes: edit ``public/proto/telemetry.proto`` and update
  client decode code in ``src/utils/protobuf.js``.

Developer tips
--------------

- For development, log decoded messages at ``src/services/websocket.js`` to
  inspect raw frames.
- Use the built-in simulator (CSV) to produce repeatable input streams.
- If charts appear sluggish, reduce per-chart render frequency and increase
  downsampling.

