import React, { lazy, Suspense, useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
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
  Tooltip,
  Avatar,
  Badge,
  alpha,
  Menu,
  MenuItem,
  ListItemButton
} from '@mui/material';
// Core icons imported directly for faster initial render
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CloseIcon from '@mui/icons-material/Close';
import WifiIcon from '@mui/icons-material/Wifi';
import SpeedIcon from '@mui/icons-material/Speed';
import StorageIcon from '@mui/icons-material/Storage';
import BatteryFullIcon from '@mui/icons-material/BatteryFull';
import RefreshIcon from '@mui/icons-material/Refresh';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { DESIGN_TOKENS } from './theme';
// Context providers with performance optimizations
import { NetworkStatusProvider } from './contexts/NetworkStatusContext';
import { ChartSettingsProvider, ChartSettingsContext } from './contexts/ChartSettingsContext';
import { ChartSelectionProvider } from './contexts/ChartSelectionContext';
import { NavigationProvider, useNavigation } from './contexts/NavigationContext';
import { wsService, animationContext } from './services/websocket';
// Import the enhanced NavigationListener component
import NavigationListener from './components/navigation/NavigationListener';
// Import the theme once to avoid unnecessary re-imports
import theme from './theme';
// Error boundary
import { ErrorBoundary } from 'react-error-boundary';
// Create a context for animation state - memoized
export const AnimationContext = React.createContext({
  enabled: true,
  duration: 300
});
// Minimal loading component with reduced animations
const MinimalLoadingSpinner = memo(() => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 4, height: '100%' }}>
    <CircularProgress size={20} thickness={4} disableShrink />
  </Box>
));
// Store preloaded components in module-level variables
let preloadedDashboard = null;
let preloadedRealTimeCharts = null;
let preloadedHistoricalCharts = null;
let preloadedWebSocketDataDisplay = null;
let preloadedNetworkStatusBar = null;
let preloadedChartSettingsModal = null;
let preloadedModelViewer = null;

// Modified preloading approach that avoids preloading 3D components
const preloadComponents = async () => {
  try {
    // Only preload non-3D components
    const [
      dashboardModule,
      realTimeChartsModule,
      historicalChartsModule,
      networkStatusBarModule,
      chartSettingsModalModule,
      webSocketDataDisplayModule
    ] = await Promise.all([
      import('./pages/Dashboard').catch(e => ({ default: () => null })),
      import('./pages/RealTimeCharts').catch(e => ({ default: () => null })),
      import('./pages/HistoricalCharts').catch(e => ({ default: () => null })),
      import('./components/misc/NetworkStatusBar').catch(e => ({ default: () => null })),
      import('./modals/ChartSettingsModal').catch(e => ({ default: () => null })),
      import('./components/misc/WebSocketDataDisplay').catch(e => ({ default: () => null }))
    ]);
    // Store the preloaded modules
    preloadedDashboard = dashboardModule.default;
    preloadedRealTimeCharts = realTimeChartsModule.default;
    preloadedHistoricalCharts = historicalChartsModule.default;
    preloadedNetworkStatusBar = networkStatusBarModule.default;
    preloadedChartSettingsModal = chartSettingsModalModule.default;
    preloadedWebSocketDataDisplay = webSocketDataDisplayModule.default;
    console.log('Standard components preloaded successfully');
  } catch (error) {
    console.error('Route preloading failure:', error);
  }
};
// Start preloading immediately
preloadComponents();

// Create custom lazy components that use preloaded modules when available
const lazyWithPreload = (importFn, preloadedComponent) => {
  return lazy(() => {
    if (preloadedComponent) {
      return Promise.resolve({ default: preloadedComponent });
    }
    return importFn();
  });
};
// Use the preloaded components - much faster transitions
const Dashboard = lazyWithPreload(() => import('./pages/Dashboard'), preloadedDashboard);
const RealTimeCharts = lazyWithPreload(() => import('./pages/RealTimeCharts'), preloadedRealTimeCharts);
const HistoricalCharts = lazyWithPreload(() => import('./pages/HistoricalCharts'), preloadedHistoricalCharts);
const WebSocketDataDisplay = lazyWithPreload(() => import('./components/misc/WebSocketDataDisplay'), preloadedWebSocketDataDisplay);
const NetworkStatusBar = lazyWithPreload(() => import('./components/misc/NetworkStatusBar'), preloadedNetworkStatusBar);
const ChartSettingsModal = lazyWithPreload(() => import('./modals/ChartSettingsModal'), preloadedChartSettingsModal);

// Lazy load the Model Viewer page - not preloaded because it's heavier
const ModelViewerPage = lazy(() => import('./pages/ModelViewer'));

// Simplified error fallback component
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
    <Typography
      variant="body2"
      component="pre"
      sx={{
        whiteSpace: 'pre-wrap',
        mb: 2,
        p: 2,
        bgcolor: 'rgba(0,0,0,0.2)',
        borderRadius: 1,
        overflow: 'auto',
        maxHeight: '30vh',
        fontSize: '0.8rem'
      }}
    >
      {error.message}
    </Typography>
    <Button
      variant="contained"
      color="inherit"
      onClick={resetErrorBoundary}
      size="small"
    >
      Try Again
    </Button>
  </Paper>
));
// MODERNIZED: Enhanced navigation list item for mobile menu
const NavItem = memo(({
  item,
  isActive,
  onClick
}) => {
  const { navigateTo, isNavigating } = useNavigation();
  const handleClick = useCallback((e) => {
    e.preventDefault();
    onClick(); // Close the drawer
    navigateTo(item.path); // Use the navigation provider
  }, [navigateTo, onClick, item.path]);
  return (
    <ListItemButton
      selected={isActive}
      onClick={handleClick}
      disabled={isNavigating}
      sx={{
        borderRadius: DESIGN_TOKENS.borderRadius.md,
        mb: 1,
        py: 1.2,
        px: 2,
        transition: theme => theme.transitions.create(['background-color', 'box-shadow']),
        position: 'relative',
        overflow: 'hidden',
        '&.Mui-selected': {
          bgcolor: theme => alpha(theme.palette.primary.main, 0.15),
          boxShadow: isActive ? DESIGN_TOKENS.shadows.sm : 'none',
          '&:before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: '10%',
            height: '80%',
            width: 3,
            borderRadius: '0 2px 2px 0',
            bgcolor: 'primary.main',
            transition: theme => theme.transitions.create(['opacity', 'height']),
          }
        },
        '&:hover': {
          bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
        }
      }}
    >
      <ListItemIcon sx={{
        color: isActive ? 'primary.main' : 'text.secondary',
        minWidth: 36,
        transition: theme => theme.transitions.create(['color'])
      }}>
        {item.icon}
      </ListItemIcon>
      <ListItemText
        primary={item.text}
        primaryTypographyProps={{
          color: isActive ? 'primary.main' : 'text.primary',
          variant: 'body2',
          fontWeight: isActive ? DESIGN_TOKENS.fontWeight.semiBold : DESIGN_TOKENS.fontWeight.medium,
          transition: theme => theme.transitions.create(['color'])
        }}
      />
    </ListItemButton>
  );
});
// MODERNIZED: Enhanced mobile drawer navigation
const Navigation = memo(({ drawerOpen, setDrawerOpen }) => {
  const location = useLocation();
  // Memoize menu items to prevent recreations
  const menuItems = useMemo(() => [
    { text: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { text: 'Real-Time Data', path: '/realtime', icon: <SpeedIcon /> },
    { text: 'Historical Data', path: '/historical', icon: <StorageIcon /> },
    { text: 'Model Viewer', path: '/model-viewer', icon: <BatteryFullIcon /> },
    { text: 'WebSocket Monitor', path: '/wsdata', icon: <WifiIcon /> },
  ], []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), [setDrawerOpen]);
  return (
    <Drawer
      anchor="left"
      open={drawerOpen}
      onClose={closeDrawer}
      variant="temporary"
      keepMounted={false} // Important - prevent rendering when closed
      sx={{
        '& .MuiDrawer-paper': {
          width: 280,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          boxShadow: DESIGN_TOKENS.shadows.lg,
          borderRadius: `0 ${DESIGN_TOKENS.borderRadius.lg}px ${DESIGN_TOKENS.borderRadius.lg}px 0`
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box
          component="img"
          src="/logo.png"
          alt="Logo"
          sx={{
            height: 36,
            width: 'auto',
            mr: 2
          }}
        />
        <Typography
          variant="h6"
          component="h1"
          sx={{
            fontWeight: DESIGN_TOKENS.fontWeight.bold,
            color: 'secondary.main'
          }}
        >
          Telemetry
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          size="small"
          onClick={closeDrawer}
          edge="end"
          sx={{
            bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
            transition: theme => theme.transitions.create(['background-color']),
            '&:hover': {
              bgcolor: theme => alpha(theme.palette.primary.main, 0.2),
            }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            pl: 2,
            textTransform: 'uppercase',
            fontWeight: DESIGN_TOKENS.fontWeight.semiBold,
            letterSpacing: '0.5px',
            mb: 1,
            display: 'block'
          }}
        >
          Navigation
        </Typography>
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
      <Box sx={{ mt: 'auto', p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            pl: 2,
            textTransform: 'uppercase',
            fontWeight: DESIGN_TOKENS.fontWeight.semiBold,
            letterSpacing: '0.5px',
            mb: 1,
            display: 'block'
          }}
        >
          Support
        </Typography>
        <List disablePadding>
          <ListItemButton
            sx={{
              borderRadius: DESIGN_TOKENS.borderRadius.md,
              mb: 1,
              py: 1.2,
              px: 2
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'secondary.main' }}>
              <HelpOutlineIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Help Center"
              primaryTypographyProps={{
                variant: 'body2',
                fontWeight: DESIGN_TOKENS.fontWeight.medium,
                color: 'text.primary'
              }}
            />
          </ListItemButton>
        </List>
      </Box>
    </Drawer>
  );
});
// MODERNIZED: Enhanced desktop navigation with theme-appropriate styling and animations
const DesktopNavigation = memo(() => {
  const location = useLocation();
  const { navigateTo, isNavigating } = useNavigation();
  // Memoize the isActive function
  const isActive = useCallback((path) => {
    return location.pathname === path;
  }, [location.pathname]);
  // Memoize navigation handlers
  const navHandlers = useMemo(() => ({
    dashboard: () => navigateTo('/dashboard'),
    realtime: () => navigateTo('/realtime'),
    historical: () => navigateTo('/historical'),
    modelViewer: () => navigateTo('/model-viewer'),
    wsdata: () => navigateTo('/wsdata')
  }), [navigateTo]);
  // Nav items for desktop
  const navItems = useMemo(() => [
    {
      text: 'Dashboard',
      path: '/dashboard',
      icon: <DashboardIcon fontSize="small" />,
      handler: navHandlers.dashboard,
      tooltip: 'View Dashboard'
    },
    {
      text: 'Real-Time',
      path: '/realtime',
      icon: <SpeedIcon fontSize="small" />,
      handler: navHandlers.realtime,
      tooltip: 'Real-Time Data Analytics'
    },
    {
      text: 'Historical',
      path: '/historical',
      icon: <StorageIcon fontSize="small" />,
      handler: navHandlers.historical,
      tooltip: 'Historical Data Analysis'
    },
    {
      text: 'Model Viewer',
      path: '/model-viewer',
      icon: <BatteryFullIcon fontSize="small" />,
      handler: navHandlers.modelViewer,
      tooltip: '3D GLB Model Viewer'
    },
    {
      text: 'WS Monitor',
      path: '/wsdata',
      icon: <WifiIcon fontSize="small" />,
      handler: navHandlers.wsdata,
      tooltip: 'WebSocket Monitor'
    },
  ], [navHandlers]);
  return (
    <Box sx={{
      display: { xs: 'none', sm: 'flex' },
      alignItems: 'center',
      flexGrow: 1,
      justifyContent: 'flex-end'
    }}>
      {/* Navigation items */}
      <Box
        sx={{
          display: 'flex',
          gap: 0.5,
          backgroundColor: theme => alpha(theme.palette.background.paper, 0.2),
          backdropFilter: 'blur(8px)',
          borderRadius: DESIGN_TOKENS.borderRadius.lg,
          p: 0.5,
          border: '1px solid',
          borderColor: 'divider',
        }}
      >
        {navItems.map((item) => (
          <Tooltip key={item.text} title={item.tooltip} arrow>
            <Button
              onClick={item.handler}
              disabled={isNavigating}
              startIcon={item.icon}
              variant={isActive(item.path) ? "contained" : "text"}
              disableElevation
              size="small"
              sx={{
                minWidth: 'auto',
                px: 2,
                py: 1,
                borderRadius: DESIGN_TOKENS.borderRadius.md,
                color: isActive(item.path) ? 'white' : 'text.primary',
                fontWeight: DESIGN_TOKENS.fontWeight.medium,
                letterSpacing: 0.3,
                transition: theme => theme.transitions.create(['background-color', 'transform', 'box-shadow'], {
                  duration: theme.transitions.duration.shorter
                }),
                textTransform: 'none',
                backgroundColor: isActive(item.path) ? 'primary.main' : 'transparent',
                '&:hover': {
                  backgroundColor: isActive(item.path) ? 'primary.dark' : alpha('#000', 0.08),
                  transform: 'translateY(-1px)',
                  boxShadow: isActive(item.path) ? DESIGN_TOKENS.shadows.md : 'none'
                },
                '&.Mui-disabled': {
                  opacity: 0.7
                },
                '&.MuiButton-contained': {
                  backgroundColor: 'primary.main',
                }
              }}
            >
              {item.text}
            </Button>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
});
// OPTIMIZATION: Fast switching between routes using shared Suspense
const MainContent = memo(() => {
  return (
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
          <Route path="/model-viewer" element={<ModelViewerPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Box>
  );
});
// App wrapper component to handle BrowserRouter
const AppWithRouter = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);
// IMPROVED: AnimationContextProvider with better update handling and debouncing
const AnimationContextProvider = ({ children }) => {
  const chartSettingsContext = React.useContext(ChartSettingsContext);
  const settings = chartSettingsContext?.settings || {};
  const lastUpdateRef = useRef(Date.now());
  // State to force updates when needed
  const [forceUpdate, setForceUpdate] = useState(0);
  // Animation context for the entire app
  const animationContextValue = useMemo(() => ({
    enabled: settings?.global?.enableTransitions ?? true,
    duration: settings?.global?.animationDuration ?? 300
  }), [
    settings?.global?.enableTransitions,
    settings?.global?.animationDuration,
    forceUpdate // Include forceUpdate to ensure context updates when needed
  ]);
  // Effect to sync the external animation context with our provider value
  useEffect(() => {
    console.log('Animation settings updated:', animationContextValue);
    // Update the external animation context
    if (animationContext && typeof animationContext.setConfig === 'function') {
      animationContext.setConfig(animationContextValue);
    }
  }, [animationContextValue]);
  // Listen for settings changes on both window and document
  useEffect(() => {
    // Function to handle settings updates
    const handleSettingsUpdate = (event) => {
      console.log('AnimationContext received settings update event', event);
      // Debounce updates that come in quick succession
      const now = Date.now();
      if (now - lastUpdateRef.current < 50) {
        return; // Skip if last update was less than 50ms ago
      }
      lastUpdateRef.current = now;
      // Force a rerender of this context
      setForceUpdate(prev => prev + 1);
      // Also directly update the animation context if available
      if (animationContext && typeof animationContext.setConfig === 'function') {
        const newSettings = event?.detail?.settings || chartSettingsContext?.settings;
        if (newSettings) {
          animationContext.setConfig({
            enabled: newSettings?.global?.enableTransitions ?? true,
            duration: newSettings?.global?.animationDuration ?? 300
          });
        }
      }
    };
    // Listen for both direct settings updates and forced UI updates
    window.addEventListener('settings-updated', handleSettingsUpdate);
    document.addEventListener('settings-updated', handleSettingsUpdate);
    window.addEventListener('force-ui-update', handleSettingsUpdate);
    window.addEventListener('settingsChanged', handleSettingsUpdate);
    return () => {
      // Cleanup
      window.removeEventListener('settings-updated', handleSettingsUpdate);
      document.removeEventListener('settings-updated', handleSettingsUpdate);
      window.removeEventListener('force-ui-update', handleSettingsUpdate);
      window.removeEventListener('settingsChanged', handleSettingsUpdate);
    };
  }, [chartSettingsContext?.settings]);
  return (
    <AnimationContext.Provider value={animationContextValue}>
      {children}
    </AnimationContext.Provider>
  );
};
// MODERNIZED: Main App component with enhanced AppBar and navigation
const AppContent = () => {
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));
  const settingsAppliedRef = useRef(false);
  // Toggle settings modal with useCallback for stable identity
  const toggleSettingsModal = useCallback(() => {
    setSettingsModalOpen(prev => !prev);
  }, []);
  // Toggle drawer with useCallback for stable identity
  const toggleDrawer = useCallback(() => {
    setDrawerOpen(prev => !prev);
  }, []);
  // Memoize toolbar height to prevent recalculation
  const toolbarHeight = useMemo(() => ({ xs: 56, sm: 64 }), []);
  // Memoized app classes
  const appClassName = useMemo(() => {
    // Check for low performance mode from localStorage
    const isLowPerformanceMode =
      window.localStorage.getItem('lowPerformanceMode') === 'true' ||
      false;
    return isLowPerformanceMode ? 'low-performance-mode' : '';
  }, []);
  // Listen for settings changes that need to be applied globally
  useEffect(() => {
    const handleSettingsUpdate = (event) => {
      console.log('App received settings update:', event?.detail);
      settingsAppliedRef.current = true;
      // Force all components to re-render that depend on settings
      if (wsService && typeof wsService.updateSettings === 'function') {
        try {
          const settings = event?.detail?.settings;
          if (settings) {
            wsService.updateSettings(settings);
          }
        } catch (e) {
          console.error('Failed to update wsService settings:', e);
        }
      }
    };
    window.addEventListener('settings-updated', handleSettingsUpdate);
    document.addEventListener('settings-updated', handleSettingsUpdate);
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdate);
      document.removeEventListener('settings-updated', handleSettingsUpdate);
    };
  }, []);
  // Effect to handle settings modal closing
  useEffect(() => {
    if (!settingsModalOpen && settingsAppliedRef.current) {
      // Settings modal was closed after settings were applied
      console.log('Settings modal closed, applying settings...');
      settingsAppliedRef.current = false;
      // Force a UI update after modal closes
      setTimeout(() => {
        try {
          window.dispatchEvent(new CustomEvent('force-ui-update', {
            detail: { timestamp: Date.now() }
          }));
        } catch (e) {
          console.error('Failed to dispatch force-ui-update event:', e);
        }
      }, 50);
    }
  }, [settingsModalOpen]);
  // Memoized AppBar to prevent recreation
  const appBar = useMemo(() => (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        zIndex: DESIGN_TOKENS.zIndex.appBar,
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
        boxShadow: DESIGN_TOKENS.shadows.xs,
        backdropFilter: 'blur(8px)',
        background: theme => alpha(theme.palette.background.paper, 0.85)
      }}
    >
      <Toolbar sx={{ minHeight: toolbarHeight }}>
        {isSmallScreen && (
          <IconButton
            color="inherit"
            edge="start"
            onClick={toggleDrawer}
            size="small"
            sx={{
              mr: 1,
              bgcolor: theme => alpha(theme.palette.primary.main, 0.1),
              transition: theme => theme.transitions.create(['background-color']),
              '&:hover': {
                bgcolor: theme => alpha(theme.palette.primary.main, 0.2),
              }
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
        {/* Logo with theme-appropriate styling */}
        <Box
          component="img"
          src="/logo.png"
          alt="Logo"
          sx={{
            height: { xs: 32, sm: 36 },
            width: 'auto',
            mr: 2,
            filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.2))',
            transition: theme => theme.transitions.create(['transform']),
            '&:hover': {
              transform: 'scale(1.05)'
            }
          }}
        />
        <Typography
          variant="h6"
          component="div"
          sx={{
            fontWeight: DESIGN_TOKENS.fontWeight.bold,
            fontSize: { xs: '1.1rem', sm: '1.25rem' },
            color: 'secondary.main',
            display: { xs: 'none', md: 'block' }
          }}
          noWrap
        >
          Telemetry Dashboard
        </Typography>
        {/* Desktop navigation */}
        <DesktopNavigation />
        {/* Settings button with tooltip */}
        <Tooltip title="Settings">
          <IconButton
            onClick={toggleSettingsModal}
            size="small"
            edge="end"
            sx={{
              color: 'secondary.main',
              ml: 1,
              bgcolor: theme => alpha(theme.palette.secondary.main, 0.1),
              transition: theme => theme.transitions.create(['transform', 'background-color', 'box-shadow']),
              '&:hover': {
                bgcolor: theme => alpha(theme.palette.secondary.main, 0.2),
                transform: 'translateY(-1px)',
                boxShadow: DESIGN_TOKENS.shadows.sm
              }
            }}
          >
            <SettingsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  ), [isSmallScreen, toggleDrawer, toolbarHeight, toggleSettingsModal]);
  return (
    <ThemeProvider theme={theme}>
      <ChartSettingsProvider>
        <ChartSelectionProvider>
          <NetworkStatusProvider>
            <CssBaseline />
            <div className={appClassName}>
              <NavigationProvider>
                <AnimationContextProvider>
                  {/* Use the enhanced NavigationListener component */}
                  <NavigationListener />
                  {/* AppBar with minimal re-renders */}
                  {appBar}
                  {/* Mobile navigation drawer */}
                  <Navigation drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} />
                  {/* Spacer for fixed AppBar */}
                  <Box sx={{ height: toolbarHeight }} />
                  {/* Network status indicator - load lazily */}
                  <Suspense fallback={<Box sx={{ height: 4 }} />}>
                    <NetworkStatusBar />
                  </Suspense>
                  {/* Settings modal - keep mounted to preserve state */}
                  <Suspense fallback={null}>
                    <ChartSettingsModal
                      isOpen={settingsModalOpen}
                      onClose={toggleSettingsModal}
                    />
                  </Suspense>
                  {/* Main content area */}
                  <MainContent />
                </AnimationContextProvider>
              </NavigationProvider>
            </div>
          </NetworkStatusProvider>
        </ChartSelectionProvider>
      </ChartSettingsProvider>
    </ThemeProvider>
  );
};
// Export the wrapped app
export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallbackComponent}>
      <AppWithRouter />
    </ErrorBoundary>
  );
}