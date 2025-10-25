Overview
========

The UCR-02-Telemetry system is a complex multi-component system that requires various services to work together seamlessly. When issues occur, troubleshooting can be challenging without proper guidance.

This troubleshooting section provides comprehensive resources to help you identify and resolve issues quickly.

What's in This Section
---------------------

**Comprehensive Troubleshooting Guide**
   The main troubleshooting document covering all components of the telemetry system:
   
   * Live graphs not updating (most common issue)
   * Backend server issues
   * Database connectivity problems
   * Frontend WebSocket issues
   * CSV simulation problems
   * Network diagnostics
   * Advanced debugging techniques

**Quick Reference**
   A one-page quick reference guide for common issues and their solutions:
   
   * Quick diagnostic checklist
   * Common quick fixes
   * Port reference table
   * Chart type reference
   * Error messages lookup
   * Emergency debug commands

When to Use Each Guide
--------------------

**Use the Comprehensive Guide when:**

* You need detailed step-by-step troubleshooting
* You want to understand the root cause of an issue
* You need diagnostic commands and verification steps
* You're dealing with a complex or unusual problem
* You want to learn how the system components interact

**Use the Quick Reference when:**

* You need a fast solution to a common problem
* You want to verify system status quickly
* You need to look up port numbers or error codes
* You're in the middle of a race day and need quick answers
* You want a printable reference card

Common Issues at a Glance
------------------------

The most frequently encountered issues are:

1. **Live graphs not updating** - Usually related to WebSocket connections or data flow
2. **Backend won't start** - Often port conflicts or database connection issues
3. **No data in database** - Typically data source or DBC configuration problems
4. **WebSocket disconnects** - Network or backend server issues
5. **Protobuf decode errors** - Proto file loading or version mismatches

Most Common Quick Fixes
----------------------

Before diving into detailed troubleshooting, try these quick fixes:

.. code-block:: bash

   # 1. Restart all services
   cd DevEnvSetup && docker-compose restart
   
   # 2. Check all ports are available
   lsof -i :9091,9092,9094,5432,3000
   
   # 3. Hard refresh browser (clears cached proto files)
   # Press Ctrl+Shift+R or Cmd+Shift+R

Getting Started with Troubleshooting
----------------------------------

If you're experiencing an issue:

1. **Identify the symptom** - What exactly isn't working?
2. **Check the Quick Reference** - See if there's an immediate solution
3. **Use the Comprehensive Guide** - Follow the detailed troubleshooting steps
4. **Gather diagnostic information** - Collect logs and error messages
5. **Ask for help** - If stuck, follow the "Getting Help" section in the comprehensive guide

System Architecture Quick Reference
----------------------------------

Understanding the data flow helps troubleshoot issues:

.. code-block:: text

   Data Source (ESP32/Simulator)
        ↓ (WebSocket, port 9091)
   Backend Ingest Server
        ↓
   CAN Decoder + Data Processing
        ↓
   TimescaleDB Database (port 5432)
        ↓
   Live WebSocket Hub (port 9094)
        ↓
   Frontend React App (port 3000)
        ↓
   Plotly Charts

   REST API (port 9092)
        ← Historical Data Queries

Any break in this chain will cause issues. The troubleshooting guides help you identify where the break occurs and how to fix it.