Integration Overview
==================

This section provides an overview of how to integrate with the UCR-02-Telemetry system, including device integration, data formats, and simulation options.

Introduction
-----------

The UCR-02-Telemetry system is designed to be flexible and extensible, allowing integration with various devices and data sources. This document outlines the key integration points, supported formats, and development workflows.

Device Integration
---------------

The system supports integration with several types of devices:

* **ESP32-based CAN Bus Interface**: Primary hardware interface for vehicle telemetry
* **External CAN Bus Analyzers**: For development and testing
* **CSV Data Sources**: For simulation and testing
* **Custom Data Sources**: Via the WebSocket ingest protocol

CAN Message Format
---------------

The system expects CAN messages in a specific binary format:

* **Standard CAN Frame Format**: 11-bit identifier, 8-byte data payload
* **Extended CAN Frame Format**: 29-bit identifier, 8-byte data payload
* **Timestamped Messages**: Each message includes a timestamp
* **Frame Identifier**: Used for routing and decoding

DBC File Integration
----------------

The system uses DBC files to define the structure and meaning of CAN messages:

* **DBC to JSON Conversion**: Using provided conversion script
* **Signal Definitions**: Mapping from raw bytes to meaningful values
* **Scaling Factors**: Applied during decoding
* **Units and Ranges**: For validation and display

Adding New Signals
---------------

To add new signals to the telemetry system:

1. Update the DBC file with new signal definitions
2. Convert the DBC to JSON format
3. Add processing logic to the data processor
4. Create a new hypertable in TimescaleDB (if needed)
5. Update frontend visualizations

CSV Simulation
-----------

The system includes a CSV simulation mode for development and testing:

* **CSV Format**: Timestamp, CAN ID, and hexadecimal data bytes
* **Simulation Controls**: Speed, start/stop, loop options
* **Sample Data**: Provided test datasets
* **Custom Data Generation**: Tools for generating test data

Coming Soon
---------

More detailed documentation about device integration procedures, CAN message formats, DBC file structure, and simulation options will be added in future updates.