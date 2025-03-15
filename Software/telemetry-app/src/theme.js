import { createTheme } from '@mui/material/styles';

// 2. Deep Ocean Theme
const deepOceanTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2A9D8F',
      contrastText: '#E9F5F4',
    },
    secondary: {
      main: '#264653',
      contrastText: '#E9F5F4',
    },
    background: {
      default: '#0B1D26',
      paper: '#17313D',
    },
    text: {
      primary: '#E9F5F4',
      secondary: '#2A9D8F',
    },
  },
  typography: {
    fontFamily: '"Inter", "sans-serif"',
    h1: { fontWeight: 800, fontSize: '2.4rem' },
    h3: { color: '#2A9D8F', fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: '#17313D',
          border: '1px solid rgba(42, 157, 143, 0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          background: '#2A9D8F',
          '&:hover': {
            boxShadow: '0 0 15px rgba(42, 157, 143, 0.4)',
          },
        },
      },
    },
  },
});

// 4. Space Horizon Theme
const spaceTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7C4DFF',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF4081',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0A0E14',
      paper: '#1A2129',
    },
    text: {
      primary: '#B2BECD',
      secondary: '#7C4DFF',
    },
  },
  typography: {
    fontFamily: '"Space Mono", monospace',
    h1: { fontWeight: 700, letterSpacing: '-0.05em' },
    h3: { color: '#7C4DFF', textTransform: 'uppercase' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: '#1A2129',
          border: '1px solid rgba(124, 77, 255, 0.2)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          background: '#7C4DFF',
          '&:hover': {
            boxShadow: '0 0 20px rgba(124, 77, 255, 0.3)',
          },
        },
      },
    },
  },
});

// 5. Modern Monochrome Theme
const monochromeTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#FFFFFF',
      contrastText: '#000000',
    },
    secondary: {
      main: '#666666',
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#CCCCCC',
    },
  },
  typography: {
    fontFamily: '"Roboto Mono", monospace',
    h1: { fontWeight: 300, letterSpacing: '-0.05em' },
    h3: { color: '#CCCCCC', fontWeight: 400 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid rgba(255, 255, 255, 0.12)',
          background: '#1E1E1E',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          border: '1px solid #FFFFFF',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
          },
        },
      },
    },
  },
});

// 7. Minimal Red-White-Gold Theme
const minimalRedWhiteGoldTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#B22222',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFD700',
      contrastText: '#000000',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
    },
    text: {
      primary: '#FFFFFF',
      secondary: '#FFD700',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2rem',
      color: '#FFFFFF',
    },
    h3: {
      fontWeight: 500,
      color: '#FFD700',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: '#B22222',
          color: '#FFFFFF',
          border: 'none',
          '&:hover': {
            backgroundColor: '#8B1A1A',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E1E1E',
          border: 'none',
          boxShadow: 'none',
        },
      },
    },
  },
});

// Light Breeze Theme
const lightBreezeTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: '#333333',
      secondary: '#555555',
    },
  },
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h1: { fontWeight: 600, fontSize: '2.4rem' },
    h3: { fontWeight: 500 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          background: '#1976d2',
          '&:hover': {
            boxShadow: '0 0 8px rgba(25, 118, 210, 0.4)',
          },
        },
      },
    },
  },
});

// Neutral Slate Theme
const neutralSlateTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#607D8B', 
      contrastText: '#ECEFF1',
    },
    secondary: {
      main: '#455A64', 
      contrastText: '#ECEFF1',
    },
    background: {
      default: '#263238',
      paper: '#37474F',
    },
    text: {
      primary: '#ECEFF1',
      secondary: '#90A4AE',
    },
  },
  typography: {
    fontFamily: '"Open Sans", sans-serif',
    h1: { fontWeight: 600, fontSize: '2.2rem' },
    h3: { color: '#90A4AE', fontWeight: 500 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: '#37474F',
          border: '1px solid rgba(96, 125, 139, 0.2)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          background: '#607D8B',
          '&:hover': {
            boxShadow: '0 0 10px rgba(96, 125, 139, 0.3)',
          },
        },
      },
    },
  },
});

// Calm Dusk Theme
const calmDuskTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#81A1C1',
      contrastText: '#ECEFF4',
    },
    secondary: {
      main: '#88C0D0',
      contrastText: '#ECEFF4',
    },
    background: {
      default: '#2E3440',
      paper: '#3B4252',
    },
    text: {
      primary: '#ECEFF4',
      secondary: '#81A1C1',
    },
  },
  typography: {
    fontFamily: '"Fira Sans", sans-serif',
    h1: { fontWeight: 700, fontSize: '2.5rem' },
    h3: { color: '#88C0D0', fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          background: '#3B4252',
          border: '1px solid rgba(129, 161, 193, 0.2)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          background: '#81A1C1',
          '&:hover': {
            boxShadow: '0 0 12px rgba(129, 161, 193, 0.4)',
          },
        },
      },
    },
  },
});

// Dark Gray with Red Accent Theme
const darkGrayRedAccentTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#424242',
      light: '#757575',
      dark: '#1c1c1c',
      contrastText: '#f5f5f5',
    },
    secondary: {
      main: '#ff5252',
      light: '#ffaaaa',
      dark: '#b20000',
      contrastText: '#f5f5f5',
    },
    background: {
      default: '#1c1c1c',
      paper: '#303030',
    },
    text: {
      primary: '#f5f5f5',
      secondary: '#bdbdbd',
    },
  },
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2rem',
    },
    h3: {
      fontWeight: 500,
      color: '#ff5252',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#303030',
          border: '1px solid #424242',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: '#ff5252',
          color: '#f5f5f5',
          border: 'none',
          '&:hover': {
            backgroundColor: '#e60000',
          },
        },
      },
    },
  },
});

// ===========================================
// NEW MONOCHROMATIC THEMES
// ===========================================

// 1) Ebony Slate Theme: Black/Gray Tones
const ebonySlateTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#3B3B3B',  // medium gray
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#5A5A5A',  // lighter gray
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#121212', // near-black
      paper: '#1E1E1E',   // dark gray
    },
    text: {
      primary: '#FFFFFF', // white
      secondary: '#BDBDBD', // mid-gray
    },
  },
  typography: {
    fontFamily: '"Roboto Mono", monospace',
    h1: {
      fontWeight: 700,
      fontSize: '2.2rem',
    },
    h3: {
      fontWeight: 500,
      color: '#BDBDBD',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1E1E1E',
          border: '1px solid #3B3B3B',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: '#3B3B3B',
          '&:hover': {
            backgroundColor: '#2A2A2A',
          },
        },
      },
    },
  },
});

// 2) Midnight Indigo Theme: Dark Indigo Tones
const midnightIndigoTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#242857',  // deep indigo
      contrastText: '#EAEAF0',
    },
    secondary: {
      main: '#393D6E',  // lighter indigo
      contrastText: '#EAEAF0',
    },
    background: {
      default: '#0D0F25', // near-black with a hint of blue
      paper: '#16193A',  // darker indigo
    },
    text: {
      primary: '#EAEAF0',
      secondary: '#B0B0C8',
    },
  },
  typography: {
    fontFamily: '"Open Sans", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2.2rem',
    },
    h3: {
      fontWeight: 500,
      color: '#B0B0C8',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#16193A',
          border: '1px solid rgba(234, 234, 240, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: '#242857',
          '&:hover': {
            backgroundColor: '#1B1F4A',
          },
        },
      },
    },
  },
});

// 3) Pine Forest Theme: Deep Green Tones
const pineForestTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1D3B29',  // deep green
      contrastText: '#E6F1EB',
    },
    secondary: {
      main: '#2A4F3A',  // slightly lighter green
      contrastText: '#E6F1EB',
    },
    background: {
      default: '#0B1C14',
      paper: '#11251B',
    },
    text: {
      primary: '#E6F1EB',
      secondary: '#A8B8AF',
    },
  },
  typography: {
    fontFamily: '"Fira Sans", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.3rem',
    },
    h3: {
      fontWeight: 500,
      color: '#A8B8AF',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#11251B',
          border: '1px solid rgba(166, 192, 177, 0.2)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: '#1D3B29',
          '&:hover': {
            backgroundColor: '#172F22',
          },
        },
      },
    },
  },
});

// 4) Smoky Purple Theme: Subdued Purple Tones
const smokyPurpleTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4B4870', // medium purple
      contrastText: '#EAE8F5',
    },
    secondary: {
      main: '#706DA0', // lighter purple
      contrastText: '#EAE8F5',
    },
    background: {
      default: '#1C1A2E', // very dark purple
      paper: '#2B2840',
    },
    text: {
      primary: '#EAE8F5',
      secondary: '#B9B7CC',
    },
  },
  typography: {
    fontFamily: '"Roboto", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2.3rem',
    },
    h3: {
      fontWeight: 500,
      color: '#B9B7CC',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#2B2840',
          border: '1px solid rgba(233, 232, 245, 0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          backgroundColor: '#4B4870',
          '&:hover': {
            backgroundColor: '#3C395B',
          },
        },
      },
    },
  },
});

// Export default theme and named themes
export default minimalRedWhiteGoldTheme;
export {
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
