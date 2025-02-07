import React, { useState, useMemo, createContext } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Navbar from "./components/layout/Navbar";
import Sidebar from "./components/layout/Sidebar";
import Dashboard from "./pages/Dashboard";
import DataExplorer from "./pages/DataExplorer";
import Footer from "./components/layout/Footer";
import Box from "@mui/material/Box";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ChartSettingsProvider } from "./context/ChartSettingsContext";
import ChartSettingsModal from "./components/modals/ChartSettingsModal";

export const ThemeContext = createContext();

const queryClient = new QueryClient();
const drawerWidth = 240;

export default function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [chartSettingsOpen, setChartSettingsOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  const handleChartSettingsOpen = () => {
    setChartSettingsOpen(true);
  };

  const handleChartSettingsClose = () => {
    setChartSettingsOpen(false);
  };

  const theme = useMemo(
    () =>
      createTheme({
        palette: darkMode
          ? {
              mode: "dark",
              text: { primary: "#ecf3e8" },
              background: { default: "#161A1D", paper: "#1a1a1d" },
              primary: { main: "#F5F3F4" },
              secondary: { main: "#B1A7A6" },
              error: { main: "#BA181B" },
            }
          : {
              mode: "light",
              text: { primary: "#161A1D" },
              background: { default: "#F5F3F4", paper: "#ffffff" },
              primary: { main: "#BA181B" },
              secondary: { main: "#B1A7A6" },
              error: { main: "#BA181B" },
            },
        components: {
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: "8px",
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-2px)" },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 500,
              },
            },
          },
        },
      }),
    [darkMode]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <ThemeContext.Provider
          value={{ toggleTheme: toggleDarkMode, isDarkMode: darkMode }}
        >
          <ChartSettingsProvider>
            <BrowserRouter>
              <div
                style={{
                  display: "flex",
                  minHeight: "100vh",
                  flexDirection: "column",
                }}
              >
                <Navbar
                  onMenuClick={handleDrawerToggle}
                  onSettingsClick={handleChartSettingsOpen}
                />
                <Box sx={{ display: "flex", flexGrow: 1 }}>
                  <Sidebar
                    mobileOpen={mobileOpen}
                    handleDrawerToggle={handleDrawerToggle}
                  />
                  <Box
                    component="main"
                    sx={{
                      flexGrow: 1,
                      p: 3,
                      width: { sm: `calc(100% - ${drawerWidth}px)` },
                      overflow: "auto",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/explorer" element={<DataExplorer />} />
                    </Routes>
                  </Box>
                </Box>
                <Footer />
              </div>
              <ChartSettingsModal
                open={chartSettingsOpen}
                onClose={handleChartSettingsClose}
              />
            </BrowserRouter>
          </ChartSettingsProvider>
        </ThemeContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
