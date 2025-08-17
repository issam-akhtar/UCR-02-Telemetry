Class and package diagrams
==========================

This section describes class-level responsibilities for key backend packages:
``pkg/candecoder``, ``pkg/processdata``, and ``internal/wsserver``.

pkg/candecoder
---------------

Responsibilities:

- Load DBC-derived JSON mappings (``configs/UCR-01.json``)
- Decode raw CAN frames into typed signals
- Provide an API to map frame IDs -> message structures

Key types (conceptual)

- Decoder: loads the JSON mapping and exposes ``Decode(frame) -> map[string]Value``
- Signal: typed value with metadata (scale, offset, units)

.. mermaid::

   classDiagram
     class Decoder {
       +LoadMapping(path)
       +Decode(frame)
     }
     class Signal {
       +name
       +scale
       +offset
       +decode(raw)
     }
     Decoder "1" --> "*" Signal

pkg/processdata
----------------

Responsibilities:

- Receive decoded signals and apply smoothing, throttling, and formatting
- Provide historical persistence hooks into ``pkg/db``
- Throttle high-frequency signals to reduce bandwidth to frontend

Key types (conceptual):

- Processor: accepts decoded signals and emits processed SignalUpdates
- Throttler: per-signal rate limiter

.. mermaid::

   classDiagram
     class Processor {
       +Process(decoded)
       +Emit(update)
     }
     class Throttler {
       +Allow(signal)
     }
     Processor "1" --> "1" Throttler

internal/wsserver
------------------

Responsibilities:

- Manage WebSocket client connections
- Broadcast protobuf-encoded messages to subscribed clients
- Implement ping/pong and client heartbeats

Key types:

- Hub: manages clients and broadcast channels
- Client: per-connection state, send queue, and read loop

.. mermaid::

   classDiagram
     class Hub {
       +Register(client)
       +Unregister(client)
       +Broadcast(msg)
     }
     class Client {
       +SendQueue
       +ReadLoop()
       +WriteLoop()
     }
     Hub "1" --> "*" Client

Notes
-----

These diagrams are conceptual. For exact method names and types see the
Go source under ``Software/backend-processing/pkg`` and ``internal/wsserver``.
