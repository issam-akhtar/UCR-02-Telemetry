Integration: end-to-end
=======================

This document explains how backend and frontend are integrated, the wire
contracts, and a single-packet sequence diagram that follows one message from
device to graph.

Wire contracts
--------------

Realtime (WebSocket):
- Binary frames containing Protobuf-encoded messages defined in
  ``proto/telemetry.proto``.
- Each message contains a server timestamp and a map of signal name -> value.

Historical (HTTP REST):
- JSON arrays of timestamped values returned by ``/api/historical``.

Single packet end-to-end sequence
--------------------------------

.. mermaid::

   sequenceDiagram
     participant Device as ESP32
     participant CanBus as CAN Bus
     participant Backend as Telemetry Backend
     participant Decoder as candecoder
     participant Processor as processdata
     participant DB as Database
     participant Hub as WebSocket Hub
     participant Frontend as React App

     Device->>CanBus: CAN frame (ID=0x123, data=0x...)
     CanBus->>Backend: raw frame received
     Backend->>Decoder: identify ID 0x123, decode -> {cell_temp: 42.7}
     Decoder-->>Processor: decoded signal
     Processor->>DB: INSERT telemetry (cell_temp=42.7, ts=2025-08-16T...)
     Processor->>Hub: marshal protobuf (TelemetryMessage) and enqueue
     Hub->>Frontend: deliver protobuf binary frame
     Frontend->>Frontend: decode protobuf, push to buffer, update chart

Best practices for integration
-----------------------------

- Keep ``proto/telemetry.proto`` synchronized between backend and frontend.
- Schema evolution: avoid renaming fields without providing backwards
  compatibility; use optional fields where possible.
- Use versioning in the WebSocket handshake if you plan to change message
  shapes in a breaking way.
