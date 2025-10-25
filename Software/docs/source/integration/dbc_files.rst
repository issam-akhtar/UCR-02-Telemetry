DBC Files
=========

This document explains how DBC files are used in the UCR-02-Telemetry system.

Introduction
-----------

DBC (Database CAN) files define the structure and meaning of CAN messages. The UCR-02-Telemetry system uses DBC files to decode raw CAN data into meaningful signals.

DBC File Format
-------------

A DBC file contains:

* **Message definitions** - Frame ID, name, and length
* **Signal definitions** - Start bit, length, scaling, offset, units
* **Value tables** - Enumerated values for specific signals
* **Comments** - Documentation for messages and signals

UCR-01.dbc
---------

The primary DBC file for the UCR-02 vehicle is ``UCR-01.dbc``. This file contains all the CAN message definitions used by the vehicle's telemetry system.

Key message groups include:

* Battery Management System (BMS) messages
* Motor controller messages
* Vehicle dynamics messages
* Thermal management messages

JSON Conversion
-------------

The telemetry system uses a JSON representation of the DBC file for more efficient loading and processing. The conversion is done using the provided Python script:

.. code-block:: bash

   python scripts/convert_dbc_to_json.py --dbc=configs/UCR-01.dbc --output=configs/UCR-01.json

The resulting JSON structure contains all the necessary information for decoding CAN messages:

.. code-block:: text

   {
     "messages": {
       "100": {
         "name": "MotorTemperature",
         "signals": {
           "motor_temp_1": {
             "start_bit": 0,
             "bit_length": 16,
             "factor": 0.1,
             "offset": 0,
             "min_value": 0,
             "max_value": 150,
             "units": "°C"
           },
           ...
         }
       },
       ...
     }
   }

Adding or Modifying DBC Files
---------------------------

To add or modify DBC files:

1. Edit the DBC file using a CAN database editor like Vector CANdb++ or SavvyCAN
2. Place the updated DBC file in ``backend-processing/configs/``
3. Run the conversion script to generate the updated JSON
4. Restart the telemetry server to load the new definitions

Best Practices
------------

1. **Consistent Naming** - Use consistent naming conventions for signals
2. **Documentation** - Add comments to messages and signals
3. **Units** - Always specify units for physical values
4. **Scaling** - Use appropriate scaling factors to maximize precision
5. **Version Control** - Keep DBC files under version control

DBC Viewer
---------

The UCR-02-Telemetry system does not include a built-in DBC viewer. For viewing and editing DBC files, consider using:

* SavvyCAN (open source)
* CANdb++ Editor (commercial)
* BUSMASTER (open source)

Advanced Usage
------------

For complex signal processing needs beyond what DBC files support:

1. Add custom signal processing in ``candecoder.go``
2. Implement advanced calculations in ``processdata.go``
3. Update the database schema if additional fields are needed