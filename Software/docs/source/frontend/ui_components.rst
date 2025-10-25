UI Components
============

This document describes the UI component system of the UCR-02-Telemetry frontend application, focusing on the reusable components that make up the user interface.

Introduction
-----------

The UCR-02-Telemetry frontend uses a component-based architecture with a library of reusable UI components. These components ensure consistent visual styling, behavior, and accessibility across the application while promoting code reuse and maintainability.

Component Library Structure
-------------------------

The UI components are organized in a hierarchical structure:

* **Atoms**: Smallest UI elements (buttons, inputs, icons)
* **Molecules**: Combinations of atoms (form fields, search bars)
* **Organisms**: Complex UI sections (navigation bars, data cards)
* **Templates**: Page layouts and structural components
* **Pages**: Complete screens combining multiple organisms

Navigation Components
------------------

Navigation components provide the structure for user movement through the application:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Component
     - Description
   * - ``Sidebar``
     - Main navigation sidebar with expandable sections
   * - ``TopBar``
     - Application header with global controls and status indicators
   * - ``TabNavigation``
     - Horizontal tab-based navigation for related views
   * - ``Breadcrumbs``
     - Path-based navigation showing current location hierarchy

Form Components
------------

Form components handle user input and data entry:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Component
     - Description
   * - ``TextInput``
     - Standard text input field with validation
   * - ``Select``
     - Dropdown selection component
   * - ``Checkbox``
     - Boolean selection component
   * - ``RadioGroup``
     - Mutually exclusive option selection
   * - ``DateTimePicker``
     - Date and time selection component
   * - ``RangeSlider``
     - Range selection with draggable handles

Data Display Components
--------------------

Components for displaying different types of data:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Component
     - Description
   * - ``DataTable``
     - Tabular data display with sorting and pagination
   * - ``DataCard``
     - Card-based data display for key metrics
   * - ``StatusBadge``
     - Visual indicator for status values
   * - ``Timeline``
     - Chronological display of events and data
   * - ``MetricDisplay``
     - Formatted display of numeric metrics with units

Layout Components
--------------

Components that control the application's visual structure:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Component
     - Description
   * - ``Grid``
     - Responsive grid layout system
   * - ``Card``
     - Container with consistent styling
   * - ``Panel``
     - Collapsible content section
   * - ``SplitView``
     - Resizable split panel layout
   * - ``TabContent``
     - Content container for tab navigation

Feedback Components
----------------

Components that provide user feedback:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Component
     - Description
   * - ``Toast``
     - Temporary notification message
   * - ``AlertBox``
     - Persistent alert display
   * - ``ProgressIndicator``
     - Loading state visualization
   * - ``ErrorBoundary``
     - Graceful error handling wrapper
   * - ``ConnectionStatus``
     - WebSocket connection state indicator

Modal Components
-------------

Dialog and overlay components:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Component
     - Description
   * - ``Modal``
     - Generic modal dialog container
   * - ``ConfirmDialog``
     - Confirmation dialog with actions
   * - ``SidePanel``
     - Slide-in panel from screen edge
   * - ``Popover``
     - Contextual floating content
   * - ``Tooltip``
     - Small informational overlay

Styling System
-----------

The UI components use a consistent styling system:

* **Theme Provider**: Provides global theme variables to all components
* **CSS-in-JS**: Component-specific styling with dynamic theme support
* **Design Tokens**: Centralized design variables for colors, spacing, typography
* **Responsive Design**: Adaptable layouts for different screen sizes
* **Dark/Light Modes**: Full support for both light and dark themes

Accessibility Features
-------------------

UI components implement these accessibility features:

* **ARIA Attributes**: Proper ARIA roles, states, and properties
* **Keyboard Navigation**: Full keyboard accessibility
* **Focus Management**: Visible focus indicators and logical tab order
* **Screen Reader Support**: Appropriate text alternatives and labels
* **Color Contrast**: WCAG 2.1 AA compliant color usage
* **Reduced Motion**: Support for prefers-reduced-motion preference

Component Development Guidelines
-----------------------------

When developing new UI components:

1. **Single Responsibility**: Each component should have one clear purpose
2. **Consistent Props API**: Follow established patterns for props naming
3. **Accessibility First**: Build with accessibility in mind from the start
4. **Theme Compatibility**: Use theme variables instead of hardcoded values
5. **Responsive Design**: Ensure components work across all target screen sizes
6. **Performance**: Optimize for rendering performance
7. **Documentation**: Include PropTypes and usage examples
8. **Testing**: Create unit tests for component functionality

Component Usage Example
--------------------

Example of using multiple UI components together:

.. code-block:: jsx

   import { Card, DataTable, Select, StatusBadge } from '../components/ui';
   
   function SensorDataView({ sensorData }) {
     return (
       <Card title="Temperature Sensors">
         <div className="card-toolbar">
           <Select 
             label="Time Range" 
             options={[
               { value: '1h', label: 'Last Hour' },
               { value: '24h', label: 'Last 24 Hours' },
               { value: '7d', label: 'Last 7 Days' }
             ]} 
           />
           <StatusBadge status={sensorData.status} />
         </div>
         
         <DataTable 
           data={sensorData.readings} 
           columns={[
             { header: 'Sensor ID', accessor: 'id' },
             { header: 'Location', accessor: 'location' },
             { header: 'Temperature', accessor: 'temperature' },
             { header: 'Last Updated', accessor: 'timestamp' }
           ]}
           pagination
           sortable
         />
       </Card>
     );
   }