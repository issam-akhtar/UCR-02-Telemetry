Sequence diagrams and edge cases
=================================

This page shows common sequence diagrams and edge cases: reconnection flows
and DB failover behavior.

Realtime happy path
-------------------

.. mermaid::

   sequenceDiagram
     participant ESP as ESP32
     participant Backend as Telemetry Backend
     participant WS as WebSocket Hub
     participant FE as Frontend

     ESP->>Backend: CAN frames
     Backend->>Backend: decode -> package (protobuf)
     Backend->>WS: push protobuf message
     WS->>FE: deliver message
     FE->>FE: update UI

Reconnect sequence (frontend reconnects)
-----------------------------------------

.. mermaid::

   sequenceDiagram
     participant FE as Frontend
     participant WS as WebSocket
     participant Backend as Telemetry Backend

     FE->>WS: open connection
     WS-->>FE: ack
     Note right of FE: connection drops (network)
     FE-xWS: TCP closed
     FE->>FE: exponential backoff reconnect
     FE->>WS: re-open
     WS->>Backend: attach client
     Backend->>FE: (optional) initial state snapshot
     FE->>FE: resume

DB failover / write-back sequence
--------------------------------

.. mermaid::

   sequenceDiagram
     participant Backend as Telemetry Backend
     participant DB as Primary DB
     participant Cache as In-memory queue

     Backend->>DB: write telemetry
     DB--xBackend: failure (connection error)
     Backend->>Cache: enqueue (durable cache)
     Backend->>DB: retry (backoff)
     DB-->>Backend: success
     Backend->>DB: flush queued items

Notes
-----

- The backend supports buffering/throttling in ``pkg/processdata`` (see
  ``throttler.go``). For production, prefer a durable queue (Redis/Kafka) if
  retention across restarts is required.
