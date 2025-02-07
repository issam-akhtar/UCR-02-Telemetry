import { createTheme } from "@mui/material/styles";

// ✅ Base Theme Configuration
const baseTheme = {
  typography: {
    fontFamily: "'Inter', sans-serif",
    h4: {
      fontWeight: 700,
      fontSize: "2rem",
      letterSpacing: "-0.5px",
    },
    h6: {
      fontWeight: 600,
      letterSpacing: "-0.25px",
    },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          transition: "transform 0.2s, box-shadow 0.2s",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.2)",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          borderRadius: 8,
          padding: "8px 20px",
        },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          background:
            "linear-gradient(195deg, rgb(66, 66, 74), rgb(25, 25, 25))",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        },
      },
    },
  },
};

export const darkTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "dark",
    primary: { main: "#e53935", contrastText: "#ffffff" },
    secondary: { main: "#7c4dff", contrastText: "#ffffff" },
    background: { default: "#0a0a1d", paper: "#1a1a1d" },
    text: { primary: "#ffffff", secondary: "#b3b3b3" },
    divider: "rgba(255, 255, 255, 0.12)",
  },
});

export const lightTheme = createTheme({
  ...baseTheme,
  palette: {
    mode: "light",
    primary: { main: "#d32f2f", contrastText: "#ffffff" },
    secondary: { main: "#5e35b1", contrastText: "#ffffff" },
    background: { default: "#f8f9fa", paper: "#ffffff" },
    text: { primary: "#212121", secondary: "#757575" },
    divider: "rgba(0, 0, 0, 0.12)",
  },
});
