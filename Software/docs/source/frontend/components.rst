Frontend Components
==================

This document describes the key components of the UCR-02-Telemetry frontend application and their organization.

Component Organization
--------------------

The components in the UCR-02-Telemetry frontend are organized into several categories:

* **Charts**: Visualization components for displaying telemetry data
* **Navigation**: Components for site navigation and routing
* **Visual Elements**: Gauges, indicators, and specialized visualizations
* **Car Overview**: Components specifically for vehicle visualization
* **Miscellaneous**: Utility and helper components

Chart Components
--------------

Chart components handle the visualization of telemetry data in both real-time and historical modes:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Component
     - Description
   * - ``RealTimeChart``
     - Dynamic chart for real-time data visualization with auto-scaling
   * - ``RealTimeChartWrapper``
     - Container that manages data subscription and configuration for real-time charts
   * - ``HistoricalChart``
     - Chart for displaying historical data with time-range selection
   * - ``HistoricalChartWrapper``
     - Container that handles data fetching and pagination for historical charts
   * - ``CellSliceChart``
     - Specialized chart for displaying battery cell data as cross-sectional slices
   * - ``GraphSelector``
     - UI component for selecting which data signals to display

Navigation Components
-------------------

Navigation components provide the structure for moving between different application views:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Component
     - Description
   * - ``Sidebar``
     - Main navigation sidebar with links to different sections
   * - ``TopBar``
     - Top navigation bar with status indicators and global controls
   * - ``TabNavigation``
     - Tab-based navigation for switching between related views
   * - ``Breadcrumbs``
     - Breadcrumb navigation showing the current location in the application

Visual Components
---------------

Visual components provide specialized visualizations for different types of telemetry data:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Component
     - Description
   * - ``Gauge``
     - Circular gauge for displaying numeric values with thresholds
   * - ``StatusIndicator``
     - Visual indicator showing system status with color coding
   * - ``ProgressBar``
     - Linear progress bar for displaying percentage-based metrics
   * - ``AlertBadge``
     - Visual notification for alerts and warnings

Car Overview Components
--------------------

These components provide specialized visualizations for the vehicle:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Component
     - Description
   * - ``BatteryView``
     - 3D visualization of the battery pack with cell data
   * - ``MotorView``
     - Visual representation of motor status and performance
   * - ``ThermalView``
     - Heat map visualization of temperature sensors
   * - ``CellsGrid``
     - Grid representation of all battery cells with color-coded status

Component Composition
-------------------

The UCR-02-Telemetry frontend uses a composition pattern to build complex UI elements from smaller, reusable components:

1. **Base Components**: Simple, reusable components like buttons, inputs, and cards
2. **Container Components**: Manage data and state for their children
3. **Page Components**: Combine multiple containers into full application views

This approach provides several benefits:

* **Reusability**: Components can be reused across different parts of the application
* **Maintainability**: Changes to a component affect all instances consistently
* **Testing**: Components can be tested in isolation
* **Performance**: React's reconciliation algorithm works efficiently with this pattern

Adding New Components
------------------

When adding new components to the application:

1. Determine the appropriate category for the component
2. Create a new directory if needed, or place in an existing category
3. Use the established naming conventions
4. Include PropTypes for type checking
5. Document the component's purpose and props
6. Create any necessary styles following the project's styling approach
7. Add unit tests for the component

Best Practices
------------

The UCR-02-Telemetry frontend follows these component best practices:

* **Single Responsibility**: Each component should do one thing well
* **Prop Documentation**: All props should be documented with PropTypes
* **Consistent Styling**: Use the theme system for consistent visual appearance
* **Performance Awareness**: Use React.memo and useCallback/useMemo for performance optimization
* **Accessibility**: Ensure components are accessible with proper ARIA attributes