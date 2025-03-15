import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import RealTimeCharts from './pages/RealTimeCharts';
import HistoricalCharts from './pages/HistoricalCharts';
import WebSocketDataDisplay from './components/WebSocketDataDisplay';
import ChartSettingsModal from './modals/ChartSettingsModal';
import { ChartSettingsProvider } from './contexts/ChartSettingsContext';
import { ThemeProvider, CssBaseline, AppBar, Toolbar, Typography, Button, IconButton, Box } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import theme from './theme';
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import NetworkStatusBar from './components/NetworkStatusBar';
import { ChartSelectionProvider } from './contexts/ChartSelectionContext';

const App = () => {
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  return (
    <ThemeProvider theme={theme}>
      <ChartSettingsProvider>
        <ChartSelectionProvider>
          <NetworkStatusProvider>
            <CssBaseline />
            <BrowserRouter>
              <AppBar position="fixed">
                <Toolbar sx={{ gap: 2 }}>
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
                  <IconButton color="inherit" onClick={() => setSettingsModalOpen(true)}>
                    <SettingsIcon />
                  </IconButton>
                </Toolbar>
              </AppBar>
              <Toolbar />
              <NetworkStatusBar />
              <ChartSettingsModal isOpen={settingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
              <Box sx={{ flex: 1 }}>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/realtime" element={<RealTimeCharts />} />
                  <Route path="/historical" element={<HistoricalCharts />} />
                  <Route path="/wsdata" element={<WebSocketDataDisplay />} />
                  <Route path="*" element={<Dashboard />} />
                </Routes>
              </Box>
            </BrowserRouter>
          </NetworkStatusProvider>
        </ChartSelectionProvider>
      </ChartSettingsProvider>
    </ThemeProvider>
  );
};

export default App;
