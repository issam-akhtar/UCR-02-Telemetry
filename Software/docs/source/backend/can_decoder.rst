CAN Decoder
===========

This document describes the CAN decoder component of the UCR-02-Telemetry system, which is responsible for transforming raw CAN bus data into structured signal values.

Introduction
-----------

The CAN decoder is a critical component that translates binary CAN frame data into meaningful signal values using definitions from the DBC file. It ensures that raw binary data from the vehicle is correctly interpreted according to the signal specifications defined in the DBC.

Implementation
------------

The CAN decoder is implemented in Go and is located in the `candecoder` package:

* **DBC Parser**: Loads signal definitions from JSON-converted DBC files
* **Decoding Logic**: Applies bit manipulation and scaling formulas
* **Caching**: Caches decoded values for performance optimization
* **Memory Management**: Uses sync.Pool for map reuse

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``backend-processing/pkg/candecoder/candecoder.go``
     - Core decoder implementation that converts binary CAN frames into structured signal values
   * - ``backend-processing/configs/UCR-01.json``
     - JSON representation of DBC file containing signal definitions, scaling factors, and units

DBC Configuration
--------------

The CAN decoder relies on a JSON representation of the DBC file:

* **File Path**: `configs/UCR-01.json`
* **Generation**: Generated from `scripts/convert_dbc_to_json.py`
* **Format**: Structured JSON with messages, signals, and scaling factors
* **Updates**: Automatically reloaded when the file changes

Decoding Process
-------------

The decoding process follows these steps:

1. **Message Identification**: CAN frame ID is used to look up message definition
2. **Signal Extraction**: Each signal's bit position and length are used to extract raw value
3. **Value Scaling**: Raw value is scaled using the formula: `(raw_value * scale) + offset`
4. **Unit Conversion**: Values are converted to appropriate units if needed
5. **Result Map Creation**: Decoded values are stored in a map with signal names as keys

Performance Optimization
---------------------

Several optimizations improve decoder performance:

* **Map Pooling**: Reuse of map objects to reduce GC pressure
* **Message Caching**: Caching of frequently accessed message definitions
* **Frame Caching**: Caching results for identical frames
* **Direct Bit Manipulation**: Efficient bitwise operations
* **Parallelization**: Independent processing of different frame types

Error Handling
-----------

The decoder implements robust error handling:

* **Unknown Messages**: Gracefully handles undefined message IDs
* **Signal Errors**: Reports errors for problematic signal definitions
* **DBC Issues**: Validates DBC format during loading
* **Out-of-Range Values**: Handles values outside expected ranges
* **Logging**: Structured logging of decoding errors for diagnostics

Usage Example
-----------

.. code-block:: go

    // Get a map from the pool
    resultMap := candecoder.GetMapFromPool()
    defer candecoder.ReturnMapToPool(resultMap)

    // Decode a CAN frame
    err := candecoder.DecodeFrame(frameID, dataBytes, resultMap)
    if err != nil {
        log.Printf("Error decoding frame %d: %v", frameID, err)
        return
    }

    // Use the decoded signals
    for name, value := range resultMap {
        fmt.Printf("%s: %v\n", name, value)
    }

This component is designed for high performance and reliability, handling thousands of CAN frames per second with minimal overhead.