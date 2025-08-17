Component diagram and dependency graph
======================================

This page documents the high-level components of the UCR-02 Telemetry system
and explains how they depend on each other.

.. mermaid::

   graph TD
     A[ESP32 / ECU] -->|CAN frames| B(CAN Bus)
     B --> C[Backend: candecoder]
     C --> D[ProcessData]
     D --> E[DB (Postgres/SQLite)]
     D --> F[WebSocket Hub]
     F --> G[Frontend: React App]
     G --> H[Model Viewer / Charts]
     subgraph Backend
       C
       D
       F
     end

Notes
-----

- The backend components (candecoder, processdata, wsserver/hub) are all in
  ``Software/backend-processing``.
- The frontend (``Software/telemetry-app``) consumes WebSocket streams and the
  historical HTTP API to render charts and the model viewer.
- DevEnv (``Software/DevEnvSetup``) composes the backend, frontend, and DB for
  local development and testing.
