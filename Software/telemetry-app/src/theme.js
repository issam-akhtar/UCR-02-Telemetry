import { createTheme } from '@mui/material/styles';

// 1. Cyberpunk Neon Theme
const cyberpunkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#6B00F6', // electric purple
      contrastText: '#FF00FF',
    },
    secondary: {
      main: '#00F3FF', // cyan
      contrastText: '#000000',
    },
    background: {
      default: '#0A0A12', // deep space blue
      paper: '#1A1A2F',
    },
    text: {
      primary: '#E0F2FF',
      secondary: '#00F3FF',
    },
    divider: 'rgba(0, 243, 255, 0.3)',
  },
  typography: {
    fontFamily: '"Orbitron", "sans-serif"',
    h1: { fontWeight: 900, fontSize: '2.5rem', textShadow: '0 0 10px #6B00F6' },
    h3: { color: '#00F3FF', fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          border: '1px solid #00F3FF',
          background: '#6B00F6', // solid color instead of gradient
          '&:hover': {
            boxShadow: '0 0 15px #00F3FF',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: 'rgba(10, 10, 18, 0.9)',
          border: '1px solid rgba(0, 243, 255, 0.3)',
          boxShadow: '0 0 20px rgba(107, 0, 246, 0.3)',
        },
      },
    },
  },
});

// 2. Deep Ocean Theme
const deepOceanTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#2A9D8F', // teal
      contrastText: '#E9F5F4',
    },
    secondary: {
      main: '#264653', // deep blue-grey
      contrastText: '#E9F5F4',
    },
    background: {
      default: '#0B1D26', // deep navy
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
          background: '#17313D', // solid color instead of gradient
          border: '1px solid rgba(42, 157, 143, 0.3)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          background: '#2A9D8F', // solid color instead of gradient
          '&:hover': {
            boxShadow: '0 0 15px rgba(42, 157, 143, 0.4)',
          },
        },
      },
    },
  },
});

// 3. Solarized Dark Theme (Classic Developer Favorite)
const solarizedTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#268BD2', // solarized blue
      contrastText: '#FDF6E3',
    },
    secondary: {
      main: '#DC322F', // solarized red
      contrastText: '#FDF6E3',
    },
    background: {
      default: '#002B36', // dark teal
      paper: '#073642',
    },
    text: {
      primary: '#839496',
      secondary: '#586E75',
    },
  },
  typography: {
    fontFamily: '"Fira Code", monospace',
    h1: { color: '#268BD2', fontWeight: 500 },
    h3: { color: '#DC322F', fontWeight: 500 },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          border: '1px solid #073642',
          boxShadow: '0 4px 10px rgba(0, 43, 54, 0.5)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          border: '1px solid #268BD2',
          color: '#268BD2',
          '&:hover': {
            backgroundColor: '#073642',
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
      main: '#7C4DFF', // deep space purple
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF4081', // nebula pink
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#0A0E14', // space black
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
          background: '#1A2129', // solid color instead of gradient
          border: '1px solid rgba(124, 77, 255, 0.2)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          background: '#7C4DFF', // solid color instead of gradient
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

// 6. Rustic Ember Theme
const rusticTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#B22106', // bold red
      contrastText: '#F7F7F7',
    },
    secondary: {
      main: '#1759D4', // bright blue
      contrastText: '#F7F7F7',
    },
    background: {
      default: '#121212', // dark background
      paper: '#1E1E1E',   // slightly lighter panels
    },
    text: {
      primary: '#F7F7F7', // near-white text
      secondary: '#946338', // warm brown accent
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: '"Roboto", "sans-serif"',
    h1: { fontWeight: 700, fontSize: '2.4rem', color: '#B22106' },
    h3: { fontWeight: 600, color: '#946338' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          background: '#B22106',
          color: '#F7F7F7',
          '&:hover': {
            background: '#8E1B05',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          background: '#1E1E1E',
          border: '1px solid #946338',
          boxShadow: '0 0 10px rgba(148, 99, 56, 0.3)',
        },
      },
    },
  },
});

// 7. Minimal Red-White-Gold Theme (Simple & Elegant)
const minimalRedWhiteGoldTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#B22222', // red
      contrastText: '#FFFFFF', // white text on red
    },
    secondary: {
      main: '#FFD700', // gold
      contrastText: '#000000', // black text on gold
    },
    background: {
      default: '#121212', // dark background
      paper: '#1E1E1E',   // slightly lighter panel
    },
    text: {
      primary: '#FFFFFF', // white
      secondary: '#FFD700', // gold
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

// Export default theme and named themes
export default minimalRedWhiteGoldTheme;
export {
  cyberpunkTheme,
  deepOceanTheme,
  solarizedTheme,
  spaceTheme,
  monochromeTheme,
  rusticTheme,
  minimalRedWhiteGoldTheme,
};
