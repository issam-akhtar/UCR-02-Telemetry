Frontend Architecture
====================

This document describes the architecture of the UCR-02-Telemetry frontend application, which is built with React and Vite.

High-Level Architecture
---------------------

The UCR-02-Telemetry frontend application follows a modern React architecture with clear separation of concerns and a component-based structure:

.. mermaid::

   graph TB
     WebSocket["WebSocket Service"] --> StateManagement["State Management"]
     RESTClient["REST API Client"] --> StateManagement
     StateManagement --> Components["UI Components"]
     Components --> Pages["Application Pages"]
     Components --> Charts["Visualization Components"]
     ProtobufDecoder["Protobuf Decoder"] --> WebSocket
     Utilities["Utility Functions"] --> Components
     Utilities --> WebSocket
     Theme["Theme Provider"] --> Components

Architectural Layers
------------------

Service Layer
~~~~~~~~~~~~

The service layer handles all communication with the backend:

* **WebSocket Service**: Manages real-time data connections with automatic reconnection
* **REST API Client**: Handles historical data retrieval and configuration endpoints

State Management
~~~~~~~~~~~~~~

The application uses React Context API for state management:

* **Context Providers**: Define global state and state manipulation functions
* **Custom Hooks**: Provide reusable state logic and data access patterns

Component Layer
~~~~~~~~~~~~~

The frontend is composed of reusable components organized by function:

* **UI Components**: Buttons, inputs, cards, and other basic UI elements
* **Visualization Components**: Charts, gauges, and 3D visualizations
* **Layout Components**: Page layouts, navigation, and structural elements

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``telemetry-app/src/App.jsx``
     - Main application entry point with routing and global providers
   * - ``telemetry-app/src/services/websocket.js``
     - WebSocket service with reconnection and subscription management
   * - ``telemetry-app/src/utils/protobuf.js``
     - Protobuf message loading and decoding utilities
   * - ``telemetry-app/src/contexts/``
     - React context providers for state management
   * - ``telemetry-app/src/hooks/``
     - Custom React hooks for data access and state logic
   * - ``telemetry-app/src/components/``
     - Reusable UI components and visualizations
   * - ``telemetry-app/src/pages/``
     - Main application views and pages

Data Flow
--------

1. **Real-Time Data Flow**:

   * Backend broadcasts binary Protobuf messages via WebSocket
   * WebSocket service receives and decodes messages using Protobuf.js
   * Data is distributed to subscribers through a pub/sub pattern
   * Components re-render with updated data

2. **Historical Data Flow**:

   * User selects time range and data types
   * REST API client requests data from backend endpoints
   * Response data is processed and formatted
   * Chart components render historical data visualizations

3. **User Interaction Flow**:

   * User interacts with UI elements
   * Component state updates locally
   * Global state updates via Context API if needed
   * Components re-render with updated state

Code Organization
---------------

The codebase follows a feature-based organization:

* **src/components/**: Reusable UI components grouped by function
* **src/pages/**: Application views and routes
* **src/services/**: Backend communication services
* **src/utils/**: Utility functions and helpers
* **src/contexts/**: Global state management
* **src/hooks/**: Custom React hooks for reusable logic
* **src/cellmappings/**: Battery cell visualization components
* **src/modals/**: Modal dialog components

This organization promotes code reusability, maintainability, and separation of concerns.