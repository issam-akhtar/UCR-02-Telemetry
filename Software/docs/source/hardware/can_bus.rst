CAN Bus
=======

.. note::
   This page is a template and will be populated with CAN bus implementation details.

Overview
--------

The Controller Area Network (CAN) bus is the primary communication backbone for the UCR-02-Telemetry system.

CAN Bus Specifications
----------------------

Physical Layer
^^^^^^^^^^^^^^

* **Standard**: [CAN 2.0B or CAN FD - to be documented]
* **Bit Rate**: [To be documented]
* **Bus Length**: [To be documented]
* **Termination**: [120Ω specifications to be documented]

Topology
--------

Network Diagram
^^^^^^^^^^^^^^^

.. mermaid::

   graph LR
     A[To be documented] --> B[CAN topology]
     B --> C[Network diagram]
     C --> D[Will be added]

Node Configuration
^^^^^^^^^^^^^^^^^^

[List of CAN nodes and their IDs to be documented]

Message Format
--------------

Frame Structure
^^^^^^^^^^^^^^^

The CAN messages follow this general structure:

.. code-block:: text

   [Frame ID] [DLC] [Data Bytes 0-7]
   
   Details to be documented

DBC File
^^^^^^^^

The system uses a DBC file to define CAN messages. See:

* ``backend-processing/configs/UCR-01.dbc`` - DBC definition file
* ``backend-processing/configs/UCR-01.json`` - JSON converted format

Message List
^^^^^^^^^^^^

Frame ID Ranges
~~~~~~~~~~~~~~~

* **50-57**: Cell voltage data (special handling)
* **[Others to be documented]**

Hardware Implementation
-----------------------

Transceivers
^^^^^^^^^^^^

* **Model**: [To be documented]
* **Interface**: [To be documented]

Termination Resistors
^^^^^^^^^^^^^^^^^^^^^

* **Value**: 120Ω (standard)
* **Placement**: [Locations to be documented]

Wiring Guidelines
^^^^^^^^^^^^^^^^^

.. code-block:: text

   [Wiring specifications to be documented]
   - Twisted pair requirements
   - Cable specifications
   - Maximum distances

Troubleshooting
---------------

Common CAN Issues
^^^^^^^^^^^^^^^^^

* **Bus-off errors**: [Troubleshooting steps to be documented]
* **Message collisions**: [Troubleshooting steps to be documented]
* **Termination problems**: [Troubleshooting steps to be documented]

Diagnostic Tools
^^^^^^^^^^^^^^^^

[Tools and procedures for CAN bus diagnostics to be documented]

See Also
--------

* :doc:`esp32` - ESP32 CAN interface
* :doc:`../backend/can_decoder` - CAN message decoding
* :doc:`../integration/index` - Integration guides
