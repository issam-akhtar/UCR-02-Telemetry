Themes
======

This document describes the theming system implemented in the UCR-02-Telemetry frontend application.

Introduction
-----------

The UCR-02-Telemetry frontend implements a comprehensive theming system that provides consistent visual styling across the application. The system supports both light and dark modes and allows for customization of colors, typography, spacing, and other visual elements.

Theme Architecture
---------------

The theming system follows these principles:

* **Central Definition**: All theme variables are defined in a central location
* **Component Access**: Components access theme variables through a theme provider
* **Mode Switching**: Seamless switching between light and dark modes
* **Responsive Design**: Adapts to different screen sizes and orientations
* **Consistency**: Ensures visual consistency across the application

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``telemetry-app/src/theme.js``
     - Core theme definition with variables and utility functions
   * - ``telemetry-app/src/App.jsx``
     - Theme provider implementation and mode selection
   * - ``telemetry-app/src/contexts/ThemeContext.jsx``
     - React context for theme state management
   * - ``telemetry-app/src/components/ui/ThemeToggle.jsx``
     - UI control for switching between theme modes

Theme Structure
------------

The theme is structured into these key sections:

Color System
~~~~~~~~~~

The color system defines palette, semantic colors, and variants:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Category
     - Description
   * - Base Colors
     - Primary, secondary, accent, neutral color scales
   * - Semantic Colors
     - Success, warning, error, info color scales
   * - Surface Colors
     - Background, card, dialog surface colors
   * - Text Colors
     - Primary, secondary, disabled text colors
   * - Border Colors
     - Dividers, borders, focus rings
   * - Chart Colors
     - Data visualization color sequences

Typography
~~~~~~~~~

Typography defines text styles and font settings:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Category
     - Description
   * - Font Families
     - Base, monospace, and heading font stacks
   * - Font Sizes
     - Scaled size system for different text elements
   * - Font Weights
     - Regular, medium, bold weight definitions
   * - Line Heights
     - Default and specialized line height values
   * - Text Styles
     - Pre-defined styles for common text elements

Spacing and Sizing
~~~~~~~~~~~~~~~

A consistent spacing system for layout:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Category
     - Description
   * - Spacing Scale
     - Progression of spacing values (4px, 8px, 16px, etc.)
   * - Component Spacing
     - Standard margins and paddings for components
   * - Layout Spacing
     - Grid gaps and section spacing
   * - Border Radii
     - Corner rounding values for different elements
   * - Icon Sizes
     - Standard sizes for icons and visual elements

Effects
~~~~~~

Visual effects for depth and interaction:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Category
     - Description
   * - Shadows
     - Elevation system with consistent shadows
   * - Transitions
     - Standard durations and easing functions
   * - Focus Styles
     - Consistent focus indicators for accessibility
   * - Hover States
     - Standard hover effect definitions
   * - Active States
     - Visual feedback for active elements

Light and Dark Modes
------------------

The theme system implements both light and dark modes:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - Feature
     - Description
   * - User Preference Detection
     - Detects system preference via prefers-color-scheme
   * - Manual Toggle
     - Allows user override of system preference
   * - Persistent Selection
     - Saves user preference in local storage
   * - Smooth Transition
     - Animates between theme modes
   * - Mode-Specific Assets
     - Supports different assets for each mode

Theme Implementation
------------------

The theme is implemented using React's context API:

.. code-block:: jsx

   // Theme provider in App.jsx
   import { ThemeProvider } from './contexts/ThemeContext';
   import { lightTheme, darkTheme } from './theme';
   
   function App() {
     return (
       <ThemeProvider>
         <AppContent />
       </ThemeProvider>
     );
   }
   
   // Using theme in a component
   import { useTheme } from '../contexts/ThemeContext';
   
   function Button({ children }) {
     const { theme } = useTheme();
     
     return (
       <button 
         style={{ 
           backgroundColor: theme.colors.primary,
           color: theme.colors.onPrimary,
           padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
           borderRadius: theme.borderRadius.sm
         }}
       >
         {children}
       </button>
     );
   }

Chart Theming
-----------

Data visualizations are themed consistently with the UI:

* **Consistent Colors**: Chart colors match the application theme
* **Background Adaptation**: Chart backgrounds adapt to theme mode
* **Text Readability**: Axis labels and annotations respect text color hierarchy
* **Grid Lines**: Grid line colors adjust for contrast in each mode
* **Interactive Elements**: Tooltips and controls follow theme styles

Customization
-----------

The theme system allows for customization:

* **Custom Palettes**: Define organization-specific color palettes
* **Component Variants**: Create themed variants of common components
* **Extending the Theme**: Add new theme variables as needed
* **Theme Templates**: Switch between different theme templates
* **Runtime Adjustments**: Modify theme values at runtime for user preferences

Best Practices
------------

When working with the theme system:

1. **Always use theme variables** instead of hardcoded values
2. **Reference semantic colors** rather than palette colors directly
3. **Use the spacing scale** for consistent layout
4. **Test both theme modes** when developing components
5. **Consider contrast ratios** for accessibility
6. **Maintain hierarchy** through consistent use of type styles
7. **Use provided mixins** for common styling patterns

Accessibility Considerations
-------------------------

The theme system ensures accessibility:

* **Contrast Ratios**: All color combinations meet WCAG 2.1 AA standards
* **Focus Visibility**: Focus indicators visible in all theme modes
* **Text Scaling**: Typography adapts to user font size settings
* **Reduced Motion**: Supports reduced motion preferences
* **Color Independence**: Information never conveyed through color alone