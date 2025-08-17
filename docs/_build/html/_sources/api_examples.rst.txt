API examples and sample requests/responses
=========================================

This page documents example REST and WebSocket interactions with sample JSON
and Protobuf snippets.

Historical REST example
-----------------------

Request (HTTP GET):

.. code-block:: http

   GET /api/historical?signal=cell_temp&from=2025-01-01T00:00:00Z&to=2025-01-01T00:10:00Z HTTP/1.1
   Host: localhost:8080

Response (JSON):

.. code-block:: json

   [
     {"timestamp":"2025-01-01T00:00:00Z","value":23.5},
     {"timestamp":"2025-01-01T00:01:00Z","value":23.8},
     {"timestamp":"2025-01-01T00:02:00Z","value":24.1}
   ]

WebSocket (realtime) example
-----------------------------

The backend broadcasts protobuf-serialized messages. Here is a conceptual
example of what the decoded JSON equivalent looks like after the frontend
decodes the protobuf frame:

.. code-block:: json

   {
     "timestamp": "2025-01-01T00:00:05Z",
     "signals": {
       "vehicle_speed": 31.2,
       "motor_temp": 68.4,
       "battery_soc": 0.87
     }
   }

Small code snippets
-------------------

- Frontend: subscribing to WebSocket and decoding via protobuf (JS pseudocode):

.. code-block:: javascript

   const ws = new WebSocket('ws://localhost:8080/ws');
   ws.binaryType = 'arraybuffer';
   ws.onmessage = (ev) => {
     const buf = new Uint8Array(ev.data);
     const msg = TelemetryProto.TelemetryMessage.decode(buf);
     // update UI with msg
   };

- Backend: pseudo-handler broadcasting protobuf (Go-like pseudocode):

.. code-block:: go

   func broadcastUpdate(hub *ws.Hub, data []byte) {
     // data is protobuf-marshaled bytes
     hub.Broadcast(data)
   }

Auto-generating examples from tests
-----------------------------------

- Optionally, you can add small unit tests that output canonical JSON examples
  and commit their outputs into ``docs/examples/``. Sphinx can then include
  those files with the ``.. literalinclude::`` directive.

Example literal include (historical example):

.. literalinclude:: examples/historical_example.json
  :language: json


