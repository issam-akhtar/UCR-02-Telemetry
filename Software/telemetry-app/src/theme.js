import { createTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';

/**
 * Design System Tokens
 * Centralized design variables for consistent application styling
 */
const DESIGN_TOKENS = {
  borderRadius: {
    xs: 1,      // Minimal elements (checkboxes, radio buttons)
    sm: 2,      // Small components (chips, badges)
    md: 4,      // Standard components (buttons, inputs)
    lg: 8,      // Cards, dialogs
    xl: 12,     // Modals, large containers
  },
  fontFamily: {
    primary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    mono: '"Roboto Mono", "SF Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace',
    serif: '"Merriweather", "Georgia", "Times New Roman", serif',
  },
  fontWeight: {
    light: 300,
    regular: 400,
    medium: 500,
    semiBold: 600,
    bold: 700,
  },
  shadows: {
    xs: '0 1px 2px rgba(0,0,0,0.05)',
    sm: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
    md: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
    lg: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
    xl: '0 20px 25px rgba(0,0,0,0.1), 0 10px 10px rgba(0,0,0,0.04)',
  },
  spacing: {
    unit: 8, // Base spacing unit in pixels
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  zIndex: {
    mobileStepper: 1000,
    speedDial: 1050,
    appBar: 1100,
    drawer: 1200,
    modal: 1300,
    snackbar: 1400,
    tooltip: 1500,
    fab: 1600,
  },
};

/**
 * Color palette tokens
 * Consistent color system for both light and dark modes
 */
const PALETTE_TOKENS = {
  light: {
    primary: {
      main: '#2A6F97',
      light: '#4A8AB8',
      dark: '#1A4C6D',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#184E77',
      light: '#2E6B9A', 
      dark: '#0E2C4D',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#2E7D32',
      light: '#4CAF50',
      dark: '#1B5E20',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#D32F2F',
      light: '#EF5350',
      dark: '#B71C1C',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#ED6C02',
      light: '#FF9800',
      dark: '#C77700',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#0288D1',
      light: '#29B6F6',
      dark: '#01579B',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
      subtle: '#F0F2F5',
    },
    text: {
      primary: '#1A2027',
      secondary: '#3E5060',
      disabled: '#A0AEC0',
    },
    divider: 'rgba(0, 0, 0, 0.12)',
  },
  dark: {
    primary: {
      main: '#4A8AB8',
      light: '#6AA9D3',
      dark: '#2A6F97',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#2E6B9A',
      light: '#4A8AB8', 
      dark: '#184E77',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#4CAF50',
      light: '#81C784',
      dark: '#2E7D32',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF5350',
      light: '#F44336',
      dark: '#D32F2F',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#FF9800',
      light: '#FFB74D',
      dark: '#F57C00',
      contrastText: '#000000',
    },
    info: {
      main: '#29B6F6',
      light: '#4FC3F7',
      dark: '#0288D1',
      contrastText: '#000000',
    },
    background: {
      default: '#0F1C2E',
      paper: '#1A2E44',
      subtle: '#243752',
    },
    text: {
      primary: '#E0E0E0',
      secondary: '#A0A0A0',
      disabled: '#666666',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  
  // ===========================================
  // THEME PALETTE VARIATIONS
  // ===========================================
  
  // Deep Ocean Theme
  deepOcean: {
    mode: 'dark',
    primary: {
      main: '#2A9D8F',
      light: '#4DBCAF',
      dark: '#1D6E64',
      contrastText: '#E9F5F4',
    },
    secondary: {
      main: '#264653',
      light: '#3A677A',
      dark: '#18303A',
      contrastText: '#E9F5F4',
    },
    background: {
      default: '#0B1D26',
      paper: '#17313D',
      subtle: '#1E3945',
    },
    text: {
      primary: '#E9F5F4',
      secondary: '#2A9D8F',
      disabled: '#80A9A5',
    },
    divider: 'rgba(42, 157, 143, 0.3)',
  },
  
  // Space Horizon Theme
  spaceHorizon: {
    mode: 'dark',
    primary: {
      main: '#7C4DFF',
      light: '#9E7CFF',
      dark: '#5835B0',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF4081',
      light: '#FF6FA3',
      dark: '#C60055',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0A0E14',
      paper: '#1A2129',
      subtle: '#232B36',
    },
    text: {
      primary: '#B2BECD',
      secondary: '#7C4DFF',
      disabled: '#6C7A8A',
    },
    divider: 'rgba(124, 77, 255, 0.2)',
  },
  
  // Modern Monochrome Theme
  monochrome: {
    mode: 'dark',
    primary: {
      main: '#FFFFFF',
      light: '#FFFFFF',
      dark: '#CCCCCC',
      contrastText: '#000000',
    },
    secondary: {
      main: '#666666',
      light: '#888888',
      dark: '#444444',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
      subtle: '#2A2A2A',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
      disabled: '#888888',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  
  // Minimal Red-White-Gold Theme
  minimalRedWhiteGold: {
    mode: 'dark',
    primary: {
      main: '#B22222',
      light: '#D42C2C',
      dark: '#8B1A1A',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFD700',
      light: '#FFDF33',
      dark: '#CCAC00',
      contrastText: '#000000',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
      subtle: '#2A2A2A',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#FFD700',
      disabled: '#888888',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  
  // Light Breeze Theme
  lightBreeze: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      light: '#4791db',
      dark: '#115293',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
      subtle: '#f0f0f0',
    },
    text: {
      primary: '#333333',
      secondary: '#555555',
      disabled: '#999999',
    },
    divider: 'rgba(0, 0, 0, 0.1)',
  },
  
  // Neutral Slate Theme
  neutralSlate: {
    mode: 'dark',
    primary: {
      main: '#607D8B',
      light: '#78909C',
      dark: '#455A64',
      contrastText: '#ECEFF1',
    },
    secondary: {
      main: '#455A64',
      light: '#607D8B',
      dark: '#263238',
      contrastText: '#ECEFF1',
    },
    background: {
      default: '#263238',
      paper: '#37474F',
      subtle: '#455A64',
    },
    text: {
      primary: '#ECEFF1',
      secondary: '#90A4AE',
      disabled: '#78909C',
    },
    divider: 'rgba(96, 125, 139, 0.2)',
  },
  
  // Calm Dusk Theme
  calmDusk: {
    mode: 'dark',
    primary: {
      main: '#81A1C1',
      light: '#A3C1DB',
      dark: '#5E8AAD',
      contrastText: '#ECEFF4',
    },
    secondary: {
      main: '#88C0D0',
      light: '#A6D5E2',
      dark: '#69A7B9',
      contrastText: '#ECEFF4',
    },
    background: {
      default: '#2E3440',
      paper: '#3B4252',
      subtle: '#434C5E',
    },
    text: {
      primary: '#ECEFF4',
      secondary: '#81A1C1',
      disabled: '#7D8896',
    },
    divider: 'rgba(129, 161, 193, 0.2)',
  },
  
  // Dark Gray with Red Accent Theme
  darkGrayRedAccent: {
    mode: 'dark',
    primary: {
      main: '#424242',
      light: '#757575',
      dark: '#1c1c1c',
      contrastText: '#f5f5f5',
    },
    secondary: {
      main: '#ff5252',
      light: '#ff8a80',
      dark: '#c50e29',
      contrastText: '#f5f5f5',
    },
    background: {
      default: '#1c1c1c',
      paper: '#303030',
      subtle: '#404040',
    },
    text: {
      primary: '#f5f5f5',
      secondary: '#bdbdbd',
      disabled: '#757575',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  
  // Ebony Slate Theme
  ebonySlate: {
    mode: 'dark',
    primary: {
      main: '#3B3B3B',
      light: '#5A5A5A',
      dark: '#292929',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#5A5A5A',
      light: '#787878',
      dark: '#3B3B3B',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
      subtle: '#2A2A2A',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#BDBDBD',
      disabled: '#757575',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  
  // Midnight Indigo Theme
  midnightIndigo: {
    mode: 'dark',
    primary: {
      main: '#242857',
      light: '#393D6E',
      dark: '#161938',
      contrastText: '#EAEAF0',
    },
    secondary: {
      main: '#393D6E',
      light: '#575C99',
      dark: '#1F2347',
      contrastText: '#EAEAF0',
    },
    background: {
      default: '#0D0F25',
      paper: '#16193A',
      subtle: '#1E224D',
    },
    text: {
      primary: '#EAEAF0',
      secondary: '#B0B0C8',
      disabled: '#7F7F9A',
    },
    divider: 'rgba(234, 234, 240, 0.1)',
  },
  
  // Pine Forest Theme
  pineForest: {
    mode: 'dark',
    primary: {
      main: '#1D3B29',
      light: '#2A4F3A',
      dark: '#112218',
      contrastText: '#E6F1EB',
    },
    secondary: {
      main: '#2A4F3A',
      light: '#39684D',
      dark: '#1A3625',
      contrastText: '#E6F1EB',
    },
    background: {
      default: '#0B1C14',
      paper: '#11251B',
      subtle: '#172F22',
    },
    text: {
      primary: '#E6F1EB',
      secondary: '#A8B8AF',
      disabled: '#697A70',
    },
    divider: 'rgba(166, 192, 177, 0.2)',
  },
  
  // Smoky Purple Theme
  smokyPurple: {
    mode: 'dark',
    primary: {
      main: '#4B4870',
      light: '#706DA0',
      dark: '#393557',
      contrastText: '#EAE8F5',
    },
    secondary: {
      main: '#706DA0',
      light: '#8F8CB8',
      dark: '#524E7A',
      contrastText: '#EAE8F5',
    },
    background: {
      default: '#1C1A2E',
      paper: '#2B2840',
      subtle: '#36325A',
    },
    text: {
      primary: '#EAE8F5',
      secondary: '#B9B7CC',
      disabled: '#807E9F',
    },
    divider: 'rgba(233, 232, 245, 0.1)',
  },
};

/**
 * Creates an optimized theme with professional settings
 * @param {Object} options - Theme customization options
 * @returns {Object} - Material-UI theme object
 */
const createOptimizedTheme = (options = {}) => {
  const {
    mode = 'light',
    primaryColor,
    secondaryColor,
    fontFamily = DESIGN_TOKENS.fontFamily.primary,
    typography = {},
    components = {},
    dense = false,
    borderRadius,
    spacing,
    palette: customPalette = {},
  } = options;
  
  // Select the appropriate palette based on mode or use a named palette
  let palette;
  
  if (customPalette.type) {
    // If a named palette is specified, use it
    palette = PALETTE_TOKENS[customPalette.type];
  } else {
    // Otherwise, use the default light/dark palette
    palette = mode === 'light' ? PALETTE_TOKENS.light : PALETTE_TOKENS.dark;
  }
  
  // Apply custom palette if provided
  if (customPalette && Object.keys(customPalette).length > 0) {
    palette = {
      mode,
      ...palette,
      ...customPalette,
    };
  }
  
  // Override with custom colors if provided
  if (primaryColor) {
    palette.primary.main = primaryColor;
  }
  
  if (secondaryColor) {
    palette.secondary.main = secondaryColor;
  }

  return createTheme({
    palette: {
      mode,
      ...palette,
      action: {
        active: mode === 'light' ? 'rgba(0, 0, 0, 0.54)' : 'rgba(255, 255, 255, 0.7)',
        hover: mode === 'light' ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.08)',
        selected: mode === 'light' ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.16)',
        disabled: mode === 'light' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.3)',
        disabledBackground: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
        focus: mode === 'light' ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.12)',
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
        letterSpacing: '-0.01562em',
        marginBottom: '0.5em',
        ...typography.h1,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: DESIGN_TOKENS.fontWeight.semiBold,
        lineHeight: 1.3,
        letterSpacing: '-0.00833em',
        marginBottom: '0.5em',
        ...typography.h2,
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: DESIGN_TOKENS.fontWeight.semiBold,
        lineHeight: 1.4,
        letterSpacing: '0em',
        marginBottom: '0.5em',
        ...typography.h3,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: DESIGN_TOKENS.fontWeight.medium,
        lineHeight: 1.5,
        letterSpacing: '0.00735em',
        marginBottom: '0.5em',
        ...typography.h4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: DESIGN_TOKENS.fontWeight.medium,
        lineHeight: 1.6,
        letterSpacing: '0em',
        marginBottom: '0.5em',
        ...typography.h5,
      },
      h6: {
        fontSize: '1rem',
        fontWeight: DESIGN_TOKENS.fontWeight.medium,
        lineHeight: 1.7,
        letterSpacing: '0.0075em',
        marginBottom: '0.5em',
        ...typography.h6,
      },
      subtitle1: {
        fontSize: '1rem',
        fontWeight: DESIGN_TOKENS.fontWeight.medium,
        lineHeight: 1.5,
        letterSpacing: '0.00938em',
        ...typography.subtitle1,
      },
      subtitle2: {
        fontSize: '0.875rem',
        fontWeight: DESIGN_TOKENS.fontWeight.medium,
        lineHeight: 1.4,
        letterSpacing: '0.00714em',
        ...typography.subtitle2,
      },
      body1: {
        fontSize: '1rem',
        fontWeight: DESIGN_TOKENS.fontWeight.regular,
        lineHeight: 1.5,
        letterSpacing: '0.00938em',
        ...typography.body1,
      },
      body2: {
        fontSize: '0.875rem',
        fontWeight: DESIGN_TOKENS.fontWeight.regular,
        lineHeight: 1.4,
        letterSpacing: '0.01071em',
        ...typography.body2,
      },
      button: {
        fontSize: '0.875rem',
        fontWeight: DESIGN_TOKENS.fontWeight.medium,
        lineHeight: 1.75,
        letterSpacing: '0.02857em',
        textTransform: 'none',
        ...typography.button,
      },
      caption: {
        fontSize: '0.75rem',
        fontWeight: DESIGN_TOKENS.fontWeight.regular,
        lineHeight: 1.4,
        letterSpacing: '0.03333em',
        ...typography.caption,
      },
      overline: {
        fontSize: '0.75rem',
        fontWeight: DESIGN_TOKENS.fontWeight.medium,
        lineHeight: 1.5,
        letterSpacing: '0.08333em',
        textTransform: 'uppercase',
        ...typography.overline,
      },
    },
    shape: {
      borderRadius: borderRadius || DESIGN_TOKENS.borderRadius.md,
    },
    shadows: [
      'none',
      DESIGN_TOKENS.shadows.xs,
      DESIGN_TOKENS.shadows.sm,
      DESIGN_TOKENS.shadows.sm,
      DESIGN_TOKENS.shadows.sm,
      DESIGN_TOKENS.shadows.md,
      DESIGN_TOKENS.shadows.md,
      DESIGN_TOKENS.shadows.md,
      DESIGN_TOKENS.shadows.md,
      DESIGN_TOKENS.shadows.lg,
      DESIGN_TOKENS.shadows.lg,
      DESIGN_TOKENS.shadows.lg,
      DESIGN_TOKENS.shadows.lg,
      DESIGN_TOKENS.shadows.lg,
      DESIGN_TOKENS.shadows.lg,
      DESIGN_TOKENS.shadows.xl,
      DESIGN_TOKENS.shadows.xl,
      DESIGN_TOKENS.shadows.xl,
      DESIGN_TOKENS.shadows.xl,
      DESIGN_TOKENS.shadows.xl,
      DESIGN_TOKENS.shadows.xl,
      DESIGN_TOKENS.shadows.xl,
      DESIGN_TOKENS.shadows.xl,
      DESIGN_TOKENS.shadows.xl,
      DESIGN_TOKENS.shadows.xl,
    ],
    spacing: spacing || DESIGN_TOKENS.spacing.unit,
    breakpoints: {
      values: DESIGN_TOKENS.breakpoints.values,
    },
    zIndex: DESIGN_TOKENS.zIndex,
    transitions: {
      easing: {
        easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
        easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
        sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
      },
      duration: {
        shortest: 150,
        shorter: 200,
        short: 250,
        standard: 300,
        complex: 375,
        enteringScreen: 225,
        leavingScreen: 195,
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          html: {
            height: '100%',
            width: '100%',
            scrollBehavior: 'smooth',
            WebkitFontSmoothing: 'antialiased',
            MozOsxFontSmoothing: 'grayscale',
            textRendering: 'optimizeLegibility',
            boxSizing: 'border-box',
          },
          body: {
            height: '100%',
            width: '100%',
            overscrollBehavior: 'none',
            fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
            color: theme.palette.text.primary,
            backgroundColor: theme.palette.background.default,
          },
          '#root': {
            height: '100%',
            width: '100%',
          },
          'input:-webkit-autofill': {
            WebkitBoxShadow: `0 0 0 100px ${theme.palette.background.default} inset !important`,
            WebkitTextFillColor: `${theme.palette.text.primary} !important`,
          },
          '::selection': {
            backgroundColor: alpha(theme.palette.primary.main, 0.3),
          },
          '@media print': {
            body: {
              backgroundColor: theme.palette.background.paper,
            },
          },
          '*::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '*::-webkit-scrollbar-track': {
            background: mode === 'light' ? '#F1F1F1' : '#2D3748',
          },
          '*::-webkit-scrollbar-thumb': {
            background: mode === 'light' ? '#BDBDBD' : '#4A5568',
            borderRadius: '4px',
          },
          '*::-webkit-scrollbar-thumb:hover': {
            background: mode === 'light' ? '#A0A0A0' : '#718096',
          },
        }),
      },
      MuiPaper: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundImage: 'none',
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            transition: theme.transitions.create(['box-shadow']),
          }),
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
            position: 'relative',
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            padding: 24,
            '&:last-child': {
              paddingBottom: 24,
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            fontWeight: DESIGN_TOKENS.fontWeight.medium,
            boxShadow: 'none',
            textTransform: 'none',
            '&:hover': {
              boxShadow: 'none',
            },
            '&.Mui-focusVisible': {
              boxShadow: `0 0 0 2px ${theme.palette.background.paper}, 0 0 0 4px ${theme.palette.primary.main}`,
            },
          }),
          sizeLarge: {
            padding: '10px 22px',
            fontSize: '1rem',
          },
          sizeMedium: {
            padding: '8px 16px',
          },
          sizeSmall: {
            padding: '6px 12px',
          },
          containedPrimary: {
            '&:hover': {
              boxShadow: DESIGN_TOKENS.shadows.md,
            },
          },
        },
        variants: [
          {
            props: { variant: 'soft', color: 'primary' },
            style: ({ theme }) => ({
              color: theme.palette.primary.main,
              backgroundColor: alpha(theme.palette.primary.main, 0.12),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.2),
              },
            }),
          },
          {
            props: { variant: 'soft', color: 'secondary' },
            style: ({ theme }) => ({
              color: theme.palette.secondary.main,
              backgroundColor: alpha(theme.palette.secondary.main, 0.12),
              '&:hover': {
                backgroundColor: alpha(theme.palette.secondary.main, 0.2),
              },
            }),
          },
          {
            props: { variant: 'soft', color: 'error' },
            style: ({ theme }) => ({
              color: theme.palette.error.main,
              backgroundColor: alpha(theme.palette.error.main, 0.12),
              '&:hover': {
                backgroundColor: alpha(theme.palette.error.main, 0.2),
              },
            }),
          },
          {
            props: { variant: 'soft', color: 'warning' },
            style: ({ theme }) => ({
              color: theme.palette.warning.main,
              backgroundColor: alpha(theme.palette.warning.main, 0.12),
              '&:hover': {
                backgroundColor: alpha(theme.palette.warning.main, 0.2),
              },
            }),
          },
          {
            props: { variant: 'soft', color: 'success' },
            style: ({ theme }) => ({
              color: theme.palette.success.main,
              backgroundColor: alpha(theme.palette.success.main, 0.12),
              '&:hover': {
                backgroundColor: alpha(theme.palette.success.main, 0.2),
              },
            }),
          },
          {
            props: { variant: 'soft', color: 'info' },
            style: ({ theme }) => ({
              color: theme.palette.info.main,
              backgroundColor: alpha(theme.palette.info.main, 0.12),
              '&:hover': {
                backgroundColor: alpha(theme.palette.info.main, 0.2),
              },
            }),
          },
        ],
        defaultProps: {
          disableElevation: true,
        },
      },
      MuiButtonBase: {
        defaultProps: {
          disableRipple: false,
        },
        styleOverrides: {
          root: {
            '&.MuiMenuItem-root, &.MuiTreeItem-label, &.MuiTableRow-root, &.MuiListItem-root': {
              WebkitTapHighlightColor: 'transparent',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            borderRadius: DESIGN_TOKENS.borderRadius.md,
          },
        },
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.palette.mode === 'light' 
                ? 'rgba(0,0,0,0.32)' 
                : 'rgba(255,255,255,0.32)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
            },
          }),
          notchedOutline: ({ theme }) => ({
            borderColor: theme.palette.mode === 'light' 
              ? 'rgba(0,0,0,0.23)' 
              : 'rgba(255,255,255,0.23)',
            transition: theme.transitions.create(['border-color', 'box-shadow']),
          }),
          input: ({ theme }) => ({
            padding: theme.spacing(1.75, 2),
          }),
        },
      },
      MuiFilledInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            backgroundColor: theme.palette.mode === 'light'
              ? 'rgba(0, 0, 0, 0.06)'
              : 'rgba(255, 255, 255, 0.06)',
            '&:hover': {
              backgroundColor: theme.palette.mode === 'light'
                ? 'rgba(0, 0, 0, 0.09)'
                : 'rgba(255, 255, 255, 0.09)',
            },
            '&.Mui-focused': {
              backgroundColor: theme.palette.mode === 'light'
                ? 'rgba(0, 0, 0, 0.06)'
                : 'rgba(255, 255, 255, 0.06)',
            },
          }),
        },
      },
      MuiInputBase: {
        styleOverrides: {
          root: {
            transition: 'background-color 0.2s, box-shadow 0.2s',
          },
          input: ({ theme }) => ({
            '&::placeholder': {
              opacity: 0.6,
              color: theme.palette.text.secondary,
            },
          }),
        },
      },
      MuiSelect: {
        styleOverrides: {
          select: {
            paddingTop: 12,
            paddingBottom: 12,
          },
        },
        defaultProps: {
          variant: 'outlined',
        },
      },
      MuiCheckbox: {
        styleOverrides: {
          root: {
            padding: 8,
          },
        },
        defaultProps: {
          size: dense ? 'small' : 'medium',
        },
      },
      MuiRadio: {
        styleOverrides: {
          root: {
            padding: 8,
          },
        },
        defaultProps: {
          size: dense ? 'small' : 'medium',
        },
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            padding: 8,
          },
          root: {
            width: 56,
            height: 38,
            padding: 8,
          },
          thumb: {
            width: 20,
            height: 20,
          },
          track: {
            borderRadius: 12,
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme }) => ({
            borderRadius: DESIGN_TOKENS.borderRadius.sm,
            backgroundColor: theme.palette.mode === 'light'
              ? 'rgba(55, 65, 81, 0.9)'
              : 'rgba(229, 231, 235, 0.9)',
            color: theme.palette.mode === 'light' ? '#fff' : '#000',
            fontSize: '0.75rem',
            fontWeight: DESIGN_TOKENS.fontWeight.regular,
            padding: theme.spacing(0.75, 1.5),
            maxWidth: 300,
          }),
          arrow: ({ theme }) => ({
            color: theme.palette.mode === 'light'
              ? 'rgba(55, 65, 81, 0.9)'
              : 'rgba(229, 231, 235, 0.9)',
          }),
        },
        defaultProps: {
          arrow: true,
          enterTouchDelay: 700,
          leaveTouchDelay: 1500,
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.palette.mode === 'light'
              ? alpha(theme.palette.primary.main, 0.05)
              : alpha(theme.palette.primary.main, 0.15),
            '.MuiTableCell-root': {
              color: theme.palette.text.secondary,
              fontWeight: DESIGN_TOKENS.fontWeight.semiBold,
            },
            borderBottom: 'none',
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontSize: '0.875rem',
            padding: theme.spacing(2),
            borderColor: theme.palette.divider,
          }),
          sizeSmall: {
            padding: '8px 16px',
          },
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: ({ theme }) => ({
            '&:last-of-type .MuiTableCell-body': {
              borderBottom: 'none',
            },
            '&.Mui-selected': {
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
              '&:hover': {
                backgroundColor: alpha(theme.palette.primary.main, 0.12),
              },
            },
            '&:hover': {
              backgroundColor: theme.palette.mode === 'light'
                ? 'rgba(0, 0, 0, 0.04)'
                : 'rgba(255, 255, 255, 0.04)',
            },
          }),
        },
      },
      MuiAvatar: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontSize: '1rem',
            fontWeight: DESIGN_TOKENS.fontWeight.medium,
            backgroundColor: theme.palette.mode === 'light'
              ? theme.palette.grey[400]
              : theme.palette.grey[600],
          }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: DESIGN_TOKENS.borderRadius.md,
            maxHeight: 24,
            fontSize: '0.75rem',
            fontWeight: DESIGN_TOKENS.fontWeight.medium,
          },
          label: {
            paddingLeft: 12,
            paddingRight: 12,
          },
          deleteIcon: {
            fontSize: '1rem',
          },
          icon: {
            fontSize: '1rem',
          },
        },
        defaultProps: {
          size: dense ? 'small' : 'medium',
        },
      },
      MuiDialogTitle: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontSize: '1.25rem',
            fontWeight: DESIGN_TOKENS.fontWeight.semiBold,
            padding: theme.spacing(3),
          }),
        },
      },
      MuiDialogContent: {
        styleOverrides: {
          root: ({ theme }) => ({
            padding: theme.spacing(3),
          }),
        },
      },
      MuiDialogActions: {
        styleOverrides: {
          root: ({ theme }) => ({
            padding: theme.spacing(2, 3, 3),
          }),
        },
      },
      MuiDivider: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderColor: theme.palette.divider,
          }),
        },
      },
      MuiLink: {
        defaultProps: {
          underline: 'hover',
        },
        styleOverrides: {
          root: {
            fontWeight: DESIGN_TOKENS.fontWeight.medium,
            '&:hover': {
              textDecoration: 'none',
            },
          },
        },
      },
      MuiPagination: {
        defaultProps: {
          color: 'primary',
          shape: 'rounded',
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: {
            borderBottom: '1px solid',
            borderColor: 'divider',
          },
          indicator: {
            height: 3,
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
          },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            fontSize: '0.875rem',
            fontWeight: DESIGN_TOKENS.fontWeight.medium,
            textTransform: 'none',
            padding: '12px 16px',
            minWidth: 'auto',
          },
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: {
            borderRadius: DESIGN_TOKENS.borderRadius.lg,
            overflow: 'hidden',
            '&:before': {
              display: 'none',
            },
            '&.Mui-expanded': {
              margin: 16,
            },
          },
        },
      },
      MuiAccordionSummary: {
        styleOverrides: {
          root: {
            padding: '0 16px',
          },
          content: {
            margin: '16px 0',
          },
        },
      },
      MuiAccordionDetails: {
        styleOverrides: {
          root: {
            padding: '0 16px 16px',
          },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            '& .MuiAlert-root': {
              boxShadow: DESIGN_TOKENS.shadows.lg,
              borderRadius: DESIGN_TOKENS.borderRadius.md,
            },
          },
        },
        defaultProps: {
          anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
        },
      },
      MuiAlert: {
        styleOverrides: {
          root: ({ theme }) => ({
            padding: theme.spacing(1.5, 2),
            alignItems: 'center',
          }),
          icon: {
            fontSize: '1.25rem',
          },
          message: {
            fontSize: '0.875rem',
            fontWeight: DESIGN_TOKENS.fontWeight.medium,
          },
        },
      },
      MuiBadge: {
        styleOverrides: {
          root: {
            '& .MuiBadge-badge': {
              fontWeight: DESIGN_TOKENS.fontWeight.medium,
            },
          },
        },
      },
      MuiTimelineDot: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root: ({ theme }) => ({
            border: 'none',
            '& .MuiDataGrid-withBorderColor': {
              borderColor: theme.palette.divider,
            },
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: theme.palette.mode === 'light'
                ? alpha(theme.palette.primary.main, 0.05)
                : alpha(theme.palette.primary.main, 0.15),
              borderBottom: 'none',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: DESIGN_TOKENS.fontWeight.semiBold,
            },
            '& .MuiDataGrid-row:nth-of-type(even)': {
              backgroundColor: theme.palette.mode === 'light'
                ? alpha(theme.palette.primary.main, 0.03)
                : alpha(theme.palette.primary.main, 0.05),
            },
            '& .MuiDataGrid-cell': {
              fontSize: '0.875rem',
              borderBottom: `1px solid ${theme.palette.divider}`,
            },
          }),
        },
      },
      // Additional custom components
      ...components,
    },
    // Design system extensions 
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
        xxl: 40,
      },
      shadows: DESIGN_TOKENS.shadows,
      animation: {
        shortest: '150ms',
        shorter: '200ms',
        short: '250ms',
        standard: '300ms',
        complex: '375ms',
      },
    },
  });
};

/**
 * Optimized version for performance-constrained environments
 * Reduces animations and visual effects for better performance
 */
const createLightweightTheme = (options = {}) => {
  const baseTheme = createOptimizedTheme({
    ...options,
    components: {
      ...options.components,
      MuiPaper: {
        styleOverrides: {
          root: {
            boxShadow: 'none',
            transition: 'none',
          },
        },
      },
      MuiButton: {
        defaultProps: {
          disableRipple: true,
          disableFocusRipple: true,
          disableTouchRipple: true,
        },
        styleOverrides: {
          root: {
            transition: 'none',
          },
        },
      },
      MuiButtonBase: {
        defaultProps: {
          disableRipple: true,
        },
      },
      MuiCssBaseline: {
        styleOverrides: {
          '*, *::before, *::after': {
            animation: 'none !important',
            transition: 'none !important',
          },
        },
      },
    },
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

  return baseTheme;
};

// Create all theme variations
const darkTheme = createOptimizedTheme({ mode: 'dark' });
const lightTheme = createOptimizedTheme({ mode: 'light' });
const lightweightTheme = createLightweightTheme({ mode: 'dark' });

// Theme variations based on old themes
const deepOceanTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.deepOcean,
  typography: {
    fontFamily: '"Inter", "sans-serif"',
    h1: { fontWeight: 800, fontSize: '2.4rem' },
    h3: { color: PALETTE_TOKENS.deepOcean.secondary.main, fontWeight: 600 }
  }
});

const spaceTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.spaceHorizon,
  typography: {
    fontFamily: '"Space Mono", monospace',
    h1: { fontWeight: 700, letterSpacing: '-0.05em' },
    h3: { color: PALETTE_TOKENS.spaceHorizon.primary.main, textTransform: 'uppercase' }
  }
});

const monochromeTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.monochrome,
  typography: {
    fontFamily: '"Roboto Mono", monospace',
    h1: { fontWeight: 300, letterSpacing: '-0.05em' },
    h3: { color: PALETTE_TOKENS.monochrome.text.secondary, fontWeight: 400 }
  }
});

const minimalRedWhiteGoldTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.minimalRedWhiteGold,
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h1: { fontWeight: 600, fontSize: '2rem', color: '#FFFFFF' },
    h3: { fontWeight: 500, color: '#FFD700' }
  }
});

const lightBreezeTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.lightBreeze,
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h1: { fontWeight: 600, fontSize: '2.4rem' },
    h3: { fontWeight: 500 }
  }
});

const neutralSlateTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.neutralSlate,
  typography: {
    fontFamily: '"Open Sans", sans-serif',
    h1: { fontWeight: 600, fontSize: '2.2rem' },
    h3: { color: PALETTE_TOKENS.neutralSlate.text.secondary, fontWeight: 500 }
  }
});

const calmDuskTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.calmDusk,
  typography: {
    fontFamily: '"Fira Sans", sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem' },
    h3: { color: PALETTE_TOKENS.calmDusk.secondary.main, fontWeight: 600 }
  }
});

const darkGrayRedAccentTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.darkGrayRedAccent,
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h1: { fontWeight: 600, fontSize: '2rem' },
    h3: { fontWeight: 500, color: PALETTE_TOKENS.darkGrayRedAccent.secondary.main }
  }
});

const ebonySlateTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.ebonySlate,
  typography: {
    fontFamily: '"Roboto Mono", monospace',
    h1: { fontWeight: 700, fontSize: '2.2rem' },
    h3: { fontWeight: 500, color: PALETTE_TOKENS.ebonySlate.text.secondary }
  }
});

const midnightIndigoTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.midnightIndigo,
  typography: {
    fontFamily: '"Open Sans", sans-serif',
    h1: { fontWeight: 600, fontSize: '2.2rem' },
    h3: { fontWeight: 500, color: PALETTE_TOKENS.midnightIndigo.text.secondary }
  }
});

const pineForestTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.pineForest,
  typography: {
    fontFamily: '"Fira Sans", sans-serif',
    h1: { fontWeight: 700, fontSize: '2.3rem' },
    h3: { fontWeight: 500, color: PALETTE_TOKENS.pineForest.text.secondary }
  }
});

const smokyPurpleTheme = createOptimizedTheme({ 
  palette: PALETTE_TOKENS.smokyPurple,
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h1: { fontWeight: 600, fontSize: '2.3rem' },
    h3: { fontWeight: 500, color: PALETTE_TOKENS.smokyPurple.text.secondary }
  }
});

// Export themed configurations
export {
  createOptimizedTheme,
  createLightweightTheme,
  DESIGN_TOKENS,
  PALETTE_TOKENS,
  lightTheme,
  darkTheme,
  lightweightTheme,
  deepOceanTheme,
  spaceTheme,
  monochromeTheme,
  minimalRedWhiteGoldTheme,
  lightBreezeTheme,
  neutralSlateTheme,
  calmDuskTheme,
  darkGrayRedAccentTheme,
  ebonySlateTheme,
  midnightIndigoTheme,
  pineForestTheme,
  smokyPurpleTheme,
};

// Export default theme as minimalRedWhiteGoldTheme (matching your previous default)
export default minimalRedWhiteGoldTheme;