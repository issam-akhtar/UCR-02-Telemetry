import React, { lazy, Suspense, useState, useMemo, useCallback, memo } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { 
  ThemeProvider, 
  CssBaseline, 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Box, 
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  CircularProgress,
  useMediaQuery,
  Paper,
  Tooltip
} from '@mui/material';

// Core icons imported directly for faster initial render
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloseIcon from '@mui/icons-material/Close';
import WifiIcon from '@mui/icons-material/Wifi';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';

// Context providers with performance optimizations
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import { ChartSettingsProvider } from './contexts/ChartSettingsContext';
import { ChartSelectionProvider } from './contexts/ChartSelectionContext';

// Import the theme once to avoid unnecessary re-imports
import theme from './theme';

// Error boundary
import { ErrorBoundary } from 'react-error-boundary';

// Minimal loading component with reduced animations
const MinimalLoadingSpinner = memo(() => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, height: '100%' }}>
    <CircularProgress size={24} thickness={4} disableShrink />
  </Box>
));

// Lazily load components that aren't needed for initial render
const NetworkStatusBar = lazy(() => import('./components/misc/NetworkStatusBar'));
const ChartSettingsModal = lazy(() => import('./modals/ChartSettingsModal'));

// Lazy load all pages for better code splitting and initial load performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RealTimeCharts = lazy(() => import('./pages/RealTimeCharts'));
const HistoricalCharts = lazy(() => import('./pages/HistoricalCharts'));
const WebSocketDataDisplay = lazy(() => import('./components/misc/WebSocketDataDisplay'));

// Error fallback component
const ErrorFallbackComponent = memo(({ error, resetErrorBoundary }) => (
  <Paper 
    role="alert" 
    sx={{ 
      p: 3, 
      m: 2, 
      bgcolor: 'error.main', 
      color: 'error.contrastText',
      borderRadius: 1,
      maxWidth: '800px',
      mx: 'auto',
      mt: 4
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
      <Typography variant="h6" component="h2">Application Error</Typography>
      <Box sx={{ flexGrow: 1 }} />
      <IconButton 
        size="small" 
        onClick={() => window.location.reload()}
        sx={{ color: 'error.contrastText' }}
      >
        <RefreshIcon />
      </IconButton>
    </Box>
    
    <Divider sx={{ mb: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
    
    <Typography variant="body2" component="pre" sx={{ 
      whiteSpace: 'pre-wrap',
      mb: 2,
      p: 2,
      bgcolor: 'rgba(0,0,0,0.2)',
      borderRadius: 1,
      overflow: 'auto',
      maxHeight: '50vh',
      fontSize: '0.8rem'
    }}>
      {error.message}
    </Typography>
    
    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
      <Button 
        variant="contained" 
        color="inherit"
        onClick={resetErrorBoundary}
        size="small"
      >
        Try Again
      </Button>
    </Box>
  </Paper>
));

// Performance-optimized navigation list item
const NavItem = memo(({ item, isActive, onClick }) => (
  <ListItem 
    button 
    component={Link}
    to={item.path}
    selected={isActive}
    onClick={onClick}
    disableRipple
    sx={{
      borderRadius: 1,
      mb: 0.5,
      '&.Mui-selected': {
        bgcolor: 'rgba(42, 111, 151, 0.15)',
      },
      '&:hover': {
        bgcolor: 'rgba(42, 111, 151, 0.1)',
      }
    }}
  >
    <ListItemIcon sx={{ 
      color: isActive ? 'primary.main' : 'text.secondary',
      minWidth: 36
    }}>
      {item.icon}
    </ListItemIcon>
    <ListItemText 
      primary={item.text} 
      primaryTypographyProps={{
        color: isActive ? 'primary' : 'textPrimary',
        variant: 'body2',
        fontWeight: isActive ? 500 : 400
      }}
    />
  </ListItem>
));

// Performance-optimized navigation component
const Navigation = memo(({ drawerOpen, setDrawerOpen }) => {
  const location = useLocation();
  
  const menuItems = useMemo(() => [
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { text: 'Real-Time Data', path: '/realtime', icon: <SpeedIcon /> },
    { text: 'Historical Data', path: '/historical', icon: <StorageIcon /> },
    { text: 'WebSocket Monitor', path: '/wsdata', icon: <WifiIcon /> },
  ], []);
  
  const closeDrawer = useCallback(() => setDrawerOpen(false), [setDrawerOpen]);
  
  return (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={closeDrawer}
      variant="temporary"
      keepMounted={false}
      sx={{
        '& .MuiDrawer-paper': { 
          width: 240,
          boxSizing: 'border-box',
          bgcolor: 'background.paper'
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
        <Typography variant="h6" component="h1">Telemetry</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton size="small" onClick={closeDrawer} edge="end">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      
      <Divider />
      
      <Box sx={{ p: 1 }}>
        <List disablePadding>
          {menuItems.map((item) => (
            <NavItem 
              key={item.text}
              item={item}
              isActive={location.pathname === item.path}
              onClick={closeDrawer}
            />
          ))}
        </List>
      </Box>
    </Drawer>
  );
});

// Desktop navigation for more efficient rendering on larger screens
const DesktopNavigation = memo(() => {
  const location = useLocation();
  
  const isActive = useCallback((path) => {
    return location.pathname === path;
  }, [location.pathname]);
  
  return (
    <Box sx={{ display: { xs: 'none', sm: 'flex' }, gap: 1 }}>
      <Button 
        component={Link}
        to="/dashboard" 
        color={isActive('/dashboard') ? 'primary' : 'inherit'}
        sx={{ 
          color: isActive('/dashboard') ? 'primary.main' : 'text.primary',
          fontWeight: isActive('/dashboard') ? 500 : 400
        }}
        disableRipple
      >
        Dashboard
      </Button>
      <Button 
        component={Link}
        to="/realtime" 
        color={isActive('/realtime') ? 'primary' : 'inherit'}
        sx={{ 
          color: isActive('/realtime') ? 'primary.main' : 'text.primary',
          fontWeight: isActive('/realtime') ? 500 : 400
        }}
        disableRipple
      >
        Real-Time
      </Button>
      <Button 
        component={Link}
        to="/historical" 
        color={isActive('/historical') ? 'primary' : 'inherit'}
        sx={{ 
          color: isActive('/historical') ? 'primary.main' : 'text.primary',
          fontWeight: isActive('/historical') ? 500 : 400
        }}
        disableRipple
      >
        Historical
      </Button>
      <Button 
        component={Link}
        to="/wsdata" 
        color={isActive('/wsdata') ? 'primary' : 'inherit'}
        sx={{ 
          color: isActive('/wsdata') ? 'primary.main' : 'text.primary',
          fontWeight: isActive('/wsdata') ? 500 : 400
        }}
        disableRipple
      >
        WS Monitor
      </Button>
    </Box>
  );
});

// Main content area with Suspense
const MainContent = memo(() => (
  <Box 
    component="main"
    sx={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      position: 'relative',
      bgcolor: 'background.default',
      p: { xs: 1, sm: 2 },
    }}
  >
    <Suspense fallback={<MinimalLoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/realtime" element={<RealTimeCharts />} />
        <Route path="/historical" element={<HistoricalCharts />} />
        <Route path="/wsdata" element={<WebSocketDataDisplay />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  </Box>
));

// Main App component with performance optimizations
const App = () => {
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  // Toggle settings modal with useCallback for stable identity
  const toggleSettingsModal = useCallback(() => {
    setSettingsModalOpen(prev => !prev);
  }, []);
  
  // Toggle drawer with useCallback for stable identity
  const toggleDrawer = useCallback(() => {
    setDrawerOpen(prev => !prev);
  }, []);

  // Memoized providers to prevent re-renders
  const providers = useMemo(() => (
    <ThemeProvider theme={theme}>
      <ChartSettingsProvider>
        <ChartSelectionProvider>
          <NetworkStatusProvider>
            <CssBaseline />
            <div className="raspberry-pi-mode">
              <BrowserRouter>
                {/* AppBar with minimal re-renders */}
                <AppBar 
                  position="fixed" 
                  elevation={0}
                  sx={{ 
                    zIndex: (theme) => theme.zIndex.drawer + 1,
                    bgcolor: 'background.paper',
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    boxShadow: 'none'
                  }}
                >
                  <Toolbar sx={{ minHeight: { xs: 56, sm: 64 } }}>
                    {isSmallScreen && (
                      <IconButton
                        color="inherit"
                        edge="start"
                        onClick={toggleDrawer}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <MenuIcon />
                      </IconButton>
                    )}
                    
                    <Typography 
                      variant="h6" 
                      component="div"
                      sx={{ 
                        flexGrow: 1,
                        color: 'text.primary',
                        fontWeight: 'medium',
                        fontSize: { xs: '1.1rem', sm: '1.25rem' }
                      }}
                      noWrap
                    >
                      Telemetry Dashboard
                    </Typography>
                    
                    {/* Desktop navigation */}
                    <DesktopNavigation />
                    
                    <Tooltip title="Settings">
                      <IconButton 
                        onClick={toggleSettingsModal}
                        size="small"
                        edge="end"
                        sx={{ color: 'text.primary', ml: 1 }}
                      >
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>
                  </Toolbar>
                </AppBar>
                
                {/* Mobile navigation drawer */}
                <Navigation drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} />
                
                {/* Spacer for fixed AppBar */}
                <Box sx={{ height: { xs: 56, sm: 64 } }} />
                
                {/* Network status indicator - load lazily */}
                <Suspense fallback={<Box sx={{ height: 4 }} />}>
                  <NetworkStatusBar />
                </Suspense>
                
                {/* Settings modal - only load when needed */}
                {settingsModalOpen && (
                  <Suspense fallback={null}>
                    <ChartSettingsModal 
                      isOpen={settingsModalOpen} 
                      onClose={() => setSettingsModalOpen(false)} 
                    />
                  </Suspense>
                )}
                
                {/* Main content area */}
                <MainContent />
              </BrowserRouter>
            </div>
          </NetworkStatusProvider>
        </ChartSelectionProvider>
      </ChartSettingsProvider>
    </ThemeProvider>
  ), [
    drawerOpen, 
    settingsModalOpen, 
    toggleDrawer, 
    toggleSettingsModal, 
    isSmallScreen
  ]);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
      {providers}
    </ErrorBoundary>
  );
};

export default App;