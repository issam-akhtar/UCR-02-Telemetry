Frontend file structure and where to change things
=================================================

This page lists the important folders and files in ``Software/telemetry-app``
and explains what to edit when you want to change specific behavior.

Top-level files
---------------

- ``package.json`` / ``package-lock.json``: project dependencies and npm scripts.
- ``vite.config.js``: Vite build config (aliases, proxy devServer settings).
- ``index.html``: HTML shell loaded by Vite.
- ``Dockerfile``: container image build steps for production/dev images.

Public assets
-------------

- ``public/proto/telemetry.proto``: canonical proto used by client-side
  decoder. If you change Protobuf schemas, update this file.
- ``public/3D`` and ``public/SVG``: static 3D models and SVG assets for the
  model viewer and UI.

Source (`src/`)
----------------

- ``src/main.jsx`` and ``src/App.jsx``: entry point and top-level router.
  Change these when you want to alter app initialization (providers, theme).

- ``src/pages/``: page-level React components
  - ``Dashboard.jsx``: main overview page. Edit to change layout and widgets.
  - ``RealTimeCharts.jsx``: page that hosts live telemetry charts.
  - ``HistoricalCharts.jsx``: page for historical data viewing.
  - ``ModelViewer.jsx``: 3D model viewer page.

- ``src/services/``:
  - ``websocket.js``: WebSocket connection manager. Change reconnect/backoff,
    binary handling, and message routing here.
  - ``api.js``: REST API helpers. Change endpoints or add auth here.

- ``src/utils/``:
  - ``protobuf.js``: client-side protobuf decode helpers. Update if proto
    messages change.
  - ``validation.js``: input validation utilities.

- ``src/hooks/``:
  - ``useRealTimeData.js``: central real-time buffer and subscription model.
    Edit this to change buffering size, downsampling behavior, or refresh
    intervals.
  - ``useHistoricalData.js``: fetch historical time-series and provide a
    normalized API to charts.

- ``src/contexts/``: React contexts that provide global state
  - ``ChartSettingsContext.jsx``: persistent chart settings.
  - ``ChartSelectionContext.jsx``: which signals are being shown.
  - ``NavigationContext.jsx`` and ``NetworkStatusContext.jsx``: navigation and
    connectivity state.

- ``src/components/``: UI components grouped by feature
  - ``components/charts``: chart implementations (``RealTimeChart.jsx``,
    ``HistoricalChart.jsx``, wrappers). Change these to modify rendering or
    swap chart libraries.
  - ``components/caroverview``: vehicle overview UI (visual overlays, wheels,
    telemetry cards). Change here to alter the dashboard visuals.
  - ``components/visuals``: visual widgets (speedometer, SoC indicator).
  - ``components/misc``: utility components like ``WebSocketDataDisplay`` for
    debugging.

Where to look for common changes
--------------------------------

- To change the WebSocket reconnection strategy: edit
  ``src/services/websocket.js``.
- To add a new chart type: add a component in ``src/components/charts`` and
  wire it in the page in ``src/pages/RealTimeCharts.jsx`` or
  ``HistoricalCharts.jsx``.
- To change proto decoding: update ``public/proto/telemetry.proto`` and then
  edit ``src/utils/protobuf.js`` to handle any new fields.

Developer tips
--------------

- Use the `ChartContainerUserGuide.md` under ``src/docs/`` for guidance on
  composing charts.
- Start the frontend with ``npm run dev`` and use the browser console to
  inspect incoming binary frames via a simple logging middleware in
  ``src/services/websocket.js``.
