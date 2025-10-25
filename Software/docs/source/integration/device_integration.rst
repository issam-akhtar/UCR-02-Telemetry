Device Integration
=================

This document explains how to integrate physical devices with the UCR-02-Telemetry system.

Introduction
-----------

The UCR-02-Telemetry system is designed to receive and process data from various devices on the Formula SAE Electric racecar. This document outlines the process for integrating new devices into the telemetry system.

Supported Device Types
---------------------

The telemetry system supports these device types:

* **ESP32-based custom hardware** - Primary telemetry collection device
* **CAN bus devices** - Motor controllers, BMS, and other CAN-enabled components
* **Serial devices** - Sensors with RS232/UART outputs
* **Ethernet/WiFi devices** - Network-capable sensors and controllers

Integration Process
-----------------

ESP32 Setup
~~~~~~~~~~

To set up an ESP32 for telemetry data collection:

1. Flash the telemetry firmware (available in the ``firmware`` repository)
2. Configure WiFi settings to connect to the telemetry network
3. Set the WebSocket server endpoint to point to the telemetry server

.. code-block:: cpp

   // Example ESP32 code snippet
   void setupWebSocket() {
     webSocket.begin(TELEMETRY_SERVER_IP, TELEMETRY_SERVER_PORT, "/telemetry");
     webSocket.onEvent(webSocketEvent);
   }

CAN Bus Integration
~~~~~~~~~~~~~~~~~

Integrating CAN bus devices:

1. Add the device's DBC file to ``backend-processing/configs/``
2. Update the DBC JSON configuration using the conversion script
3. Add new message handlers in ``processdata.go`` for the device's frame IDs

Serial Device Integration
~~~~~~~~~~~~~~~~~~~~~~~

For serial devices:

1. Configure the ESP32 or other interface device to read serial data
2. Format the data according to the telemetry system's expected format
3. Send the data via WebSocket to the telemetry server

Testing Device Integration
------------------------

After device integration:

1. Use the CSV simulator to verify message parsing
2. Check the database for proper data storage
3. Verify real-time updates appear in the frontend application

Troubleshooting
-------------

Common issues and solutions:

* **Connection failures**: Verify network configuration and WebSocket server availability
* **Data parsing errors**: Check message format and update DBC files if needed
* **Timing issues**: Adjust sampling rates if data throughput is too high

Adding New Device Types
---------------------

To add support for a new device type:

1. Create a new device driver in the firmware repository
2. Update the data processing pipeline in ``backend-processing`` if needed
3. Add appropriate database tables and frontend displays