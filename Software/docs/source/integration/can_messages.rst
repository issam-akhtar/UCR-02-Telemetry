CAN Messages
===========

This document describes the CAN message structure used in the UCR-02-Telemetry system.

Introduction
-----------

Controller Area Network (CAN) is the primary communication protocol used on the UCR-02 vehicle. The telemetry system decodes CAN messages according to defined DBC files to extract meaningful sensor data.

CAN Message Structure
------------------

Each CAN message consists of:

* **Frame ID** - Unique identifier for the message (11 or 29 bits)
* **Data Length** - Number of data bytes (0-8 bytes)
* **Data Bytes** - The actual payload containing sensor values

Message Types
-----------

The UCR-02 telemetry system processes these message types:

Battery Management System (BMS)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Frame IDs 50-57 are reserved for cell data:

.. code-block:: text

   FrameID 50: Cells 1-4
   FrameID 51: Cells 5-8
   FrameID 52: Cells 9-12
   ...
   FrameID 57: Cells 29-32

Motor Controller
~~~~~~~~~~~~~~

Frame IDs 100-150 contain motor controller information:

.. code-block:: text

   FrameID 100: Motor temperatures
   FrameID 101: Motor RPM
   FrameID 102: Motor current
   ...

Vehicle Dynamics
~~~~~~~~~~~~~~

Frame IDs 200-250 contain vehicle dynamics information:

.. code-block:: text

   FrameID 200: Wheel speeds
   FrameID 201: Accelerometer data
   FrameID 202: Gyroscope data
   ...

Signal Decoding
-------------

Signal decoding happens in ``candecoder.go`` using DBC JSON definitions. The process includes:

1. Identify message by Frame ID
2. Extract raw signal bytes according to start bit and length
3. Apply scaling and offset to convert to engineering units
4. Store decoded signals with their names and values

Special Processing
---------------

Cell Data Processing (Frame IDs 50-57):

.. code-block:: go

   // These frames bypass the worker pool and use direct batch insertion
   if frameID >= 50 && frameID <= 57 {
       processdata.AddCellDataToBatch(cellRecord)
   }

Adding New CAN Messages
--------------------

To add new CAN messages:

1. Update the DBC file in ``backend-processing/configs/UCR-01.dbc``
2. Generate new JSON definition:

   .. code-block:: bash

      python scripts/convert_dbc_to_json.py --dbc=configs/UCR-01.dbc --output=configs/UCR-01.json

3. Update ``processdata.go`` to handle the new Frame ID
4. Add appropriate database storage for the new message type