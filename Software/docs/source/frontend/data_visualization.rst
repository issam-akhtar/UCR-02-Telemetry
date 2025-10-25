Data Visualization
=================

This document describes the data visualization components and techniques used in the UCR-02-Telemetry frontend application.

Introduction
-----------

Data visualization is a core functionality of the UCR-02-Telemetry system, allowing users to monitor and analyze telemetry data from the vehicle. The frontend implements various visualization techniques to present different types of data effectively.

Chart Types
-----------

The application uses several chart types to visualize telemetry data:

Real-Time Charts
~~~~~~~~~~~~~~~~

Real-time charts display continuously updating data from the vehicle:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Feature
     - Description
   * - Auto-scaling
     - Automatically adjusts y-axis range based on incoming data
   * - Time window
     - Configurable time window (e.g., last 30 seconds)
   * - Multiple signals
     - Display multiple data signals on the same chart
   * - Color coding
     - Consistent color scheme for different data types
   * - Tooltips
     - Interactive tooltips showing precise values
   * - Legend
     - Interactive legend for toggling signal visibility

Historical Charts
~~~~~~~~~~~~~~~~

Historical charts allow analysis of past telemetry data:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Feature
     - Description
   * - Time range selection
     - UI controls for selecting specific time periods
   * - Zoom and pan
     - Interactive zoom and pan functionality
   * - Data export
     - Export chart data as CSV or image
   * - Annotations
     - Add annotations to mark significant events
   * - Comparison
     - Compare data across different time periods
   * - Aggregation
     - View aggregated data (min, max, avg) for longer time periods

Specialized Visualizations
-----------------------

Battery Visualization
~~~~~~~~~~~~~~~~~~~~

The battery visualization provides a detailed view of the battery pack:

* **3D Model**: Interactive 3D representation of the battery pack
* **Cell Status**: Color-coded indication of each cell's voltage and temperature
* **Cross-Section View**: Visualize internal temperature distribution
* **Alert Highlighting**: Visual highlighting of cells with abnormal values

Gauge Components
~~~~~~~~~~~~~~~~

Gauges provide at-a-glance information about key metrics:

* **Circular Gauges**: For speed, power, and other critical values
* **Linear Gauges**: For battery charge level and similar metrics
* **Threshold Indicators**: Color changes based on value thresholds
* **Min/Max Markers**: Indicators showing historical minimum and maximum values

Heatmaps
~~~~~~~~

Heatmaps visualize temperature distribution and other spatial data:

* **Color Gradient**: Smooth color transitions indicating value ranges
* **Dynamic Range**: Automatically adjusted or manually set value range
* **Grid Overlay**: Optional grid lines for reference
* **Tooltip Details**: Detailed information on hover

Implementation Technologies
-----------------------

The frontend uses these technologies for data visualization:

* **Plotly.js**: Core charting library for real-time and historical charts
* **Three.js**: 3D visualization for battery and vehicle models
* **SVG**: Custom SVG-based components for gauges and indicators
* **CSS**: Animation and transitions for smooth updates

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``telemetry-app/src/components/charts/RealTimeChart.jsx``
     - Real-time chart implementation with Plotly.js
   * - ``telemetry-app/src/components/charts/HistoricalChart.jsx``
     - Historical data chart implementation
   * - ``telemetry-app/src/components/visuals/Gauge.jsx``
     - SVG-based gauge component
   * - ``telemetry-app/src/cellmappings/CellsGrid.jsx``
     - Battery cell grid visualization
   * - ``telemetry-app/src/components/charts/CellSliceChart.jsx``
     - Cross-sectional battery visualization

Performance Considerations
-----------------------

Visualization components implement these performance optimizations:

* **Throttling**: Limit update frequency for high-frequency data
* **Canvas Rendering**: Use canvas instead of SVG for large datasets
* **WebGL Acceleration**: Leverage WebGL for 3D visualizations
* **Lazy Loading**: Only load visualization components when needed
* **Efficient Updates**: Minimize DOM updates and re-renders
* **Data Decimation**: Reduce data points for large historical datasets

Customization Options
------------------

Users can customize visualization components:

* **Theme**: Light and dark mode support for all visualizations
* **Color Schemes**: Configurable color palettes
* **Time Ranges**: Adjustable time windows for real-time charts
* **Thresholds**: Configurable alarm and warning thresholds
* **Layout**: Adjustable layout and component size

Accessibility Considerations
-------------------------

Visualization components follow these accessibility principles:

* **Color Blindness**: Color schemes tested for color vision deficiencies
* **Screen Readers**: Alternative text descriptions for charts
* **Keyboard Navigation**: Interactive elements accessible via keyboard
* **Focus Indicators**: Visible focus states for interactive elements
* **High Contrast**: Sufficient contrast for text and important elements