import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RealTimeCharts from './pages/RealTimeCharts';
import HistoricalCharts from './pages/HistoricalCharts';
import WebSocketDataDisplay from './components/WebSocketDataDisplay';
import ChartSettingsModal from './modals/ChartSettingsModal';
import { ChartSettingsProvider } from './contexts/ChartSettingsContext';

import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
} from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

// NEW: Network Status
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import NetworkStatusBar from './components/NetworkStatusBar';

// COLOR PALETTE
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#F5F3F4' },
    secondary: { main: '#B1A7A6' },
    error: { main: '#BA181B' },
    background: {
      default: '#161A1D',
      paper: '#161A1D',
    },
    text: {
      primary: '#ecf3e8',
    },
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

const App = () => {
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <ChartSettingsProvider>
        <NetworkStatusProvider>
          <CssBaseline />
          <BrowserRouter>
            <AppBar position="fixed" color="primary">
              <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Telemetry Dashboard
                </Typography>
                <Button color="inherit" component={Link} to="/dashboard">
                  Dashboard
                </Button>
                <Button color="inherit" component={Link} to="/realtime">
                  Real-Time Graphs
                </Button>
                <Button color="inherit" component={Link} to="/historical">
                  Historical Graphs
                </Button>
                <Button color="inherit" component={Link} to="/wsdata">
                  WS Data
                </Button>
                <IconButton
                  color="inherit"
                  onClick={() => setSettingsModalOpen(true)}
                  sx={{ ml: 2 }}
                >
                  <SettingsIcon />
                </IconButton>
              </Toolbar>
            </AppBar>

            {/* Space under AppBar */}
            <Toolbar />

            {/* Show network status bar */}
            <NetworkStatusBar />

            {/* Chart Settings Modal */}
            <ChartSettingsModal
              isOpen={settingsModalOpen}
              onClose={() => setSettingsModalOpen(false)}
            />

            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/realtime" element={<RealTimeCharts />} />
              <Route path="/historical" element={<HistoricalCharts />} />
              <Route path="/wsdata" element={<WebSocketDataDisplay />} />
              <Route path="*" element={<Dashboard />} />
            </Routes>
          </BrowserRouter>
        </NetworkStatusProvider>
      </ChartSettingsProvider>
    </ThemeProvider>
  );
};

export default App;
