import { createTheme } from '@mui/material/styles';

// Design System Configuration
const DESIGN_TOKENS = {
  borderRadius: {
    sm: 2,     // Small components (chips, badges)
    md: 4,     // Standard components (buttons, inputs)
    lg: 6,     // Cards, dialogs
    xl: 8,     // Modals, large containers
  },
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    mono: '"Roboto Mono", "Consolas", "Monaco", monospace',
    serif: '"Merriweather", "Georgia", "Times New Roman", serif',
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
  },
};

// Performance-optimized theme creator with professional configuration
const createOptimizedTheme = (options = {}) => {
  const {
    mode = 'dark',
    primary = '#2A6F97',  // More professional primary color
    secondary = '#184E77', 
    background = {
      default: '#0F1C2E',
      paper: '#1A2E44',
    },
    fontFamily = DESIGN_TOKENS.fontFamily.primary,
    typography = {},
    components = {},
  } = options;

  return createTheme({
    palette: {
      mode,
      primary: {
        main: primary,
        light: '#4A8AB8', // Calculated lighter shade
        dark: '#1A4C6D', // Calculated darker shade
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: secondary,
        light: '#2E6B9A',
        dark: '#0E2C4D',
        contrastText: '#FFFFFF',
      },
      background,
      // Professional semantic color palette
      success: {
        main: '#2E7D32', // More muted, professional green
        light: '#4CAF50',
        dark: '#1B5E20',
        contrastText: '#FFFFFF',
      },
      warning: {
        main: '#ED6C02', // Professional orange
        light: '#FF9800',
        dark: '#C77700',
        contrastText: '#FFFFFF',
      },
      error: {
        main: '#D32F2F', // Refined, professional red
        light: '#F44336',
        dark: '#B22222',
        contrastText: '#FFFFFF',
      },
      info: {
        main: '#1976D2', // Standard professional blue
        light: '#2196F3',
        dark: '#1565C0',
        contrastText: '#FFFFFF',
      },
      text: {
        primary: mode === 'dark' ? '#E0E0E0' : '#212121',
        secondary: mode === 'dark' ? '#A0A0A0' : '#484848',
        disabled: mode === 'dark' ? '#666666' : '#BDBDBD',
      },
    },
    typography: {
      fontFamily,
      fontWeightLight: DESIGN_TOKENS.fontWeight.light,
      fontWeightRegular: DESIGN_TOKENS.fontWeight.regular,
      fontWeightMedium: DESIGN_TOKENS.fontWeight.medium,
      fontWeightBold: DESIGN_TOKENS.fontWeight.bold,
      h1: {
        fontSize: '2.5rem',
        fontWeight: DESIGN_TOKENS.fontWeight.bold,
        lineHeight: 1.2,
        letterSpacing: '-0.01em',
        ...typography.h1,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: DESIGN_TOKENS.fontWeight.semiBold,
        lineHeight: 1.3,
        letterSpacing: '-0.005em',
        ...typography.h2,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: DESIGN_TOKENS.fontWeight.semiBold,
        lineHeight: 1.4,
        ...typography.h3,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: DESIGN_TOKENS.fontWeight.medium,
        lineHeight: 1.5,
        ...typography.h4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: DESIGN_TOKENS.fontWeight.medium,
        lineHeight: 1.6,
        ...typography.h5,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: DESIGN_TOKENS.fontWeight.medium,
        lineHeight: 1.7,
        ...typography.h6,
      },
      body1: {
        fontSize: '1rem',
        fontWeight: DESIGN_TOKENS.fontWeight.regular,
        lineHeight: 1.5,
        ...typography.body1,
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: DESIGN_TOKENS.fontWeight.regular,
        lineHeight: 1.4,
        ...typography.body2,
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: DESIGN_TOKENS.fontWeight.light,
        ...typography.caption,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          html: {
            scrollBehavior: 'smooth',
            '-webkit-font-smoothing': 'antialiased',
            '-moz-osx-font-smoothing': 'grayscale',
          },
          body: {
            overscrollBehavior: 'none',
            fontFeatureSettings: '"salt" on, "ss01" on', // OpenType features for professional typography
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none', // Remove the default gradient for better performance
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            transition: 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.06)',
          },
        },
        defaultProps: {
          elevation: 1,
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            fontWeight: DESIGN_TOKENS.fontWeight.medium,
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            letterSpacing: '0.02em',
          },
          containedPrimary: {
            '&:hover': {
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
            },
          },
        },
        defaultProps: {
          disableElevation: true, // Flat buttons for better performance
          disableRipple: true, // Disable ripple for better performance
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            borderRadius: DESIGN_TOKENS.borderRadius.md,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: DESIGN_TOKENS.borderRadius.sm,
            fontSize: '0.75rem',
            fontWeight: DESIGN_TOKENS.fontWeight.regular,
          },
        },
        defaultProps: {
          enterTouchDelay: 500, // Reduce likelihood of accidental tooltips on mobile
          leaveTouchDelay: 1500,
        },
      },
      // Performance optimized list components
      MuiList: {
        defaultProps: {
          dense: true, // More compact lists by default
          disablePadding: true,
        },
      },
      MuiListItem: {
        defaultProps: {
          disableTouchRipple: true, // Disable ripple for better performance
        },
      },
      // Optimized Tables
      MuiTableCell: {
        styleOverrides: {
          root: {
            padding: '8px 16px', // More compact tables
          },
        },
      },
      // Input optimizations
      MuiInputBase: {
        styleOverrides: {
          input: {
            '&:-webkit-autofill': {
              transitionDelay: '9999s',
              transitionProperty: 'background-color, color',
            },
          },
        },
      },
      // Menu optimizations
      MuiMenu: {
        defaultProps: {
          transitionDuration: 150, // Faster transitions
        },
      },
      // Dialog optimizations
      MuiDialog: {
        defaultProps: {
          transitionDuration: 200, // Faster transitions
        },
      },
      ...components,
    },
    shape: {
      borderRadius: DESIGN_TOKENS.borderRadius.md,
    },
    // Performance-optimized transitions
    transitions: {
      duration: {
        shortest: 100,
        shorter: 150,
        short: 200,
        standard: 250,
        complex: 300,
        enteringScreen: 200,
        leavingScreen: 175,
      },
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
    },
    // Professional design system extensions
    custom: {
      borderWidth: {
        thin: 1,
        medium: 2,
        thick: 3,
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
      },
      shadows: {
        subtle: '0 1px 3px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
        medium: '0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)',
        strong: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.1)',
      },
    },
  });
};

// Optimized version for Raspberry Pi - simpler theme with fewer visual effects
const raspberryPiOptimizedTheme = createOptimizedTheme({
  primary: '#2A6F97',
  secondary: '#184E77',
  background: {
    default: '#0F1C2E',
    paper: '#1A2E44',
  },
  components: {
    // Override with more performance-focused styles
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: 'none', // Remove shadows for better performance
          transition: 'none', // Remove transitions for better performance
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableRipple: true, // Disable ripple for better performance
        disableFocusRipple: true,
        disableTouchRipple: true,
      },
      styleOverrides: {
        root: {
          transition: 'none', // Remove transitions for better performance
        },
      },
    },
    // Disable animations and transitions globally
    MuiCssBaseline: {
      styleOverrides: {
        '*, *::before, *::after': {
          animation: 'none !important',
          transition: 'none !important',
        },
      },
    },
  },
  // Simplified transitions
  transitions: {
    duration: {
      shortest: 0,
      shorter: 0,
      short: 0,
      standard: 0,
      complex: 0,
      enteringScreen: 0,
      leavingScreen: 0,
    },
  },
});

// Export the optimized theme as default for the Raspberry Pi
export default raspberryPiOptimizedTheme;