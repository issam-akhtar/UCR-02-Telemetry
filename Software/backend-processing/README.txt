This is the refactored Telemetry System code.

1. Build the CSV WebSocket server:
   cd cmd/csvserver
   go build
   ./csvserver --addr=localhost:8081

2. Build and run the main Telemetry Server:
   cd cmd/telemetryserver
   go build
   ./telemetryserver

3. Access front-end websockets at http://localhost:9000/ws
4. Historical endpoints:
   - /api/tcuData
   - /api/cellData
   etc...
