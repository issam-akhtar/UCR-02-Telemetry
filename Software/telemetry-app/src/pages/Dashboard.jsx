import React, { lazy, Suspense, useState, useEffect, useContext, useMemo, useCallback, memo, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useTheme } from '@mui/material/styles';
import { Box, CircularProgress, useMediaQuery } from '@mui/material';
import { ChartSettingsContext } from '../contexts/ChartSettingsContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimationContext } from '../App';
import { wsService } from '../services/websocket';

// Import components - using lazy loading for non-critical components
const RaceCarTelemetry = lazy(() => import('../components/caroverview/RaceCarTelemetry'));
const SoCIndicator = lazy(() => import('../components/visuals/SoCIndicator'));
const LiveGPSMap = lazy(() => import('../components/visuals/LiveGPSMap'));
const CellHeatmap = lazy(() => import('../components/visuals/CellHeatmap'));
const SpeedometerGauge = lazy(() => import('../components/visuals/SpeedometerGauge'));
const PedalsGauge = lazy(() => import('../components/visuals/PedalsGauge'));
const MotorControllerTempGauge = lazy(() => import('../components/visuals/MotorControllerTempGauge'));
const WeatherVisual = lazy(() => import('../components/visuals/Weather'));

// Simple fallback component for Suspense
const ComponentLoader = memo(({ settings }) => (
  <Box sx={{ 
    height: '100%', 
    width: '100%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    bgcolor: settings?.dashboard?.loaderBackgroundColor || 'background.paper',
    borderRadius: settings?.dashboard?.componentBorderRadius || 1,
  }}>
    <CircularProgress 
      size={settings?.dashboard?.loaderSize || 24} 
      color={settings?.dashboard?.loaderColor || "primary"}
    />
  </Box>
));

const ResponsiveGridLayout = WidthProvider(Responsive);

const Dashboard = () => {
  const theme = useTheme();
  const { settings, updateSettings } = useContext(ChartSettingsContext);
  const animationContext = useContext(AnimationContext);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const scrollContainerRef = useRef(null);
  const prevMaxHeightRef = useRef(0);
  const resizeTimeoutRef = useRef(null);
  
  // Track component subscriptions for cleanup
  const subscriptions = useRef({});
  
  // Track if the component is being unmounted
  const isUnmounting = useRef(false);
  
  // References to mounted components for efficient cleanup
  const componentRefs = useRef({});
  
  // Add a state to gracefully handle unmounting
  const [isVisible, setIsVisible] = useState(true);
  
  // Parse animation context safely, with fallback to settings
  const animationsEnabled = useMemo(() => {
    // First check if animations are explicitly set in ChartSettingsContext
    if (settings?.dashboard?.animationsEnabled !== undefined) {
      return settings.dashboard.animationsEnabled;
    }
    // Otherwise fall back to AnimationContext or default
    return animationContext?.enabled ?? true;
  }, [settings?.dashboard?.animationsEnabled, animationContext?.enabled]);
  
  const animationDuration = useMemo(() => {
    // First check if duration is explicitly set in ChartSettingsContext
    if (settings?.dashboard?.animationDuration !== undefined) {
      return settings.dashboard.animationDuration;
    }
    // Otherwise fall back to AnimationContext or default
    return animationContext?.duration ?? 300;
  }, [settings?.dashboard?.animationDuration, animationContext?.duration]);
  
  // Performance settings from context
  const useHardwareAcceleration = useMemo(
    () => settings?.global?.enableHardwareAcceleration ?? false,
    [settings?.global?.enableHardwareAcceleration]
  );
  
  const prefetchResources = useMemo(
    () => settings?.dashboard?.prefetchResources ?? true,
    [settings?.dashboard?.prefetchResources]
  );
  
  const isLowPowerMode = useMemo(
    () => settings?.performance?.lowPowerMode ?? false,
    [settings?.performance?.lowPowerMode]
  );
  
  // Get visible components from settings
  const visibleComponents = useMemo(() => {
    // If not specified in settings, show all components
    if (!settings?.dashboard?.visibleComponents) {
      return {
        'soc-indicator': true,
        'speedometer-gauge': true,
        'motor-controller-temp-gauge': true,
        'car-overview': true,
        'live-gps-map': true,
        'pedals': true,
        'cell-heatmap': true,
        'weather-visual': true
      };
    }
    return settings.dashboard.visibleComponents;
  }, [settings?.dashboard?.visibleComponents]);
  
  // Combine default layouts with saved layouts from settings if available
  const defaultLayouts = useMemo(() => ({
    lg: [
      { i: 'soc-indicator', x: 0, y: 0, w: 8, h: 6 },
      { i: 'speedometer-gauge', x: 22, y: 0, w: 8, h: 8 },
      { i: 'motor-controller-temp-gauge', x: 0, y: 5, w: 8, h: 10 },
      { i: 'car-overview', x: 8, y: 0, w: 14, h: 16 },
      { i: 'live-gps-map', x: 22, y: 8, w: 8, h: 8 },
      { i: 'pedals', x: 0, y: 16, w: 12, h: 5.5 },
      { i: 'cell-heatmap', x: 12, y: 16, w: 18, h: 15 },
      { i: 'weather-visual', x: 0, y: 21, w: 12, h: 9.5 }
    ],
    md: [
      { i: 'soc-indicator', x: 0, y: 0, w: 6, h: 6 },
      { i: 'speedometer-gauge', x: 18, y: 0, w: 7, h: 8 },
      { i: 'motor-controller-temp-gauge', x: 0, y: 6, w: 6, h: 10 },
      { i: 'car-overview', x: 6, y: 0, w: 12, h: 16 },
      { i: 'live-gps-map', x: 18, y: 8, w: 7, h: 8 },
      { i: 'pedals', x: 0, y: 16, w: 10, h: 5.5 },
      { i: 'cell-heatmap', x: 10, y: 16, w: 15, h: 15 },
      { i: 'weather-visual', x: 0, y: 21, w: 10, h: 9.5 }
    ],
    sm: [
      { i: 'soc-indicator', x: 0, y: 0, w: 7, h: 6 },
      { i: 'speedometer-gauge', x: 7, y: 0, w: 8, h: 6 },
      { i: 'motor-controller-temp-gauge', x: 0, y: 6, w: 7, h: 8 },
      { i: 'car-overview', x: 0, y: 14, w: 15, h: 16 },
      { i: 'live-gps-map', x: 7, y: 6, w: 8, h: 8 },
      { i: 'pedals', x: 0, y: 30, w: 15, h: 5.5 },
      { i: 'cell-heatmap', x: 0, y: 35.5, w: 15, h: 12 },
      { i: 'weather-visual', x: 0, y: 47.5, w: 15, h: 8 }
    ],
    xs: [
      { i: 'soc-indicator', x: 0, y: 0, w: 10, h: 6 },
      { i: 'speedometer-gauge', x: 0, y: 6, w: 10, h: 6 },
      { i: 'motor-controller-temp-gauge', x: 0, y: 12, w: 10, h: 8 },
      { i: 'car-overview', x: 0, y: 20, w: 10, h: 16 },
      { i: 'live-gps-map', x: 0, y: 36, w: 10, h: 8 },
      { i: 'pedals', x: 0, y: 44, w: 10, h: 5.5 },
      { i: 'cell-heatmap', x: 0, y: 49.5, w: 10, h: 12 },
      { i: 'weather-visual', x: 0, y: 61.5, w: 10, h: 8 }
    ],
  }), []);
  
  // Use layouts from settings if available, otherwise use defaults
  const initialLayouts = useMemo(() => {
    if (settings?.dashboard?.layouts) {
      // Filter out any components that aren't visible
      const filteredLayouts = {};
      Object.keys(settings.dashboard.layouts).forEach(breakpoint => {
        filteredLayouts[breakpoint] = settings.dashboard.layouts[breakpoint].filter(
          layout => visibleComponents[layout.i]
        );
      });
      return filteredLayouts;
    }
    
    // If no saved layouts, filter default layouts by visible components
    const filteredDefaults = {};
    Object.keys(defaultLayouts).forEach(breakpoint => {
      filteredDefaults[breakpoint] = defaultLayouts[breakpoint].filter(
        layout => visibleComponents[layout.i]
      );
    });
    
    return filteredDefaults;
  }, [defaultLayouts, settings?.dashboard?.layouts, visibleComponents]);
  
  const [layouts, setLayouts] = useState(initialLayouts);
  
  // This prevents layout changes during unmounting for better transitions
  const onLayoutChange = useCallback((currentLayout, allLayouts) => {
    // Skip layout updates during unmounting
    if (isUnmounting.current) return;
    
    // Use functional update to avoid stale closures
    setLayouts(prevLayouts => {
      // Don't update if nothing changed - prevents infinite loops
      if (JSON.stringify(prevLayouts) === JSON.stringify(allLayouts)) {
        return prevLayouts;
      }
      
      // Save to settings if configured to do so
      if (settings?.dashboard?.saveLayoutChanges) {
        // Use a debounced save to prevent too many updates
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        resizeTimeoutRef.current = setTimeout(() => {
          updateSettings('dashboard', 'layouts', allLayouts);
          resizeTimeoutRef.current = null;
        }, 500);
      }
      
      return allLayouts;
    });
  }, [settings?.dashboard?.saveLayoutChanges, updateSettings]);
  
  // Grid configuration from settings
  const rowHeight = useMemo(() => {
    if (settings?.dashboard?.rowHeight) {
      return isMobile ? 
        (settings.dashboard.rowHeight.mobile || 35) : 
        (settings.dashboard.rowHeight.desktop || 40);
    }
    return isMobile ? 35 : 40;
  }, [isMobile, settings?.dashboard?.rowHeight]);
  
  const layoutMargin = useMemo(() => {
    if (settings?.dashboard?.layoutMargin) {
      return isMobile ? 
        (settings.dashboard.layoutMargin.mobile || [5, 5]) : 
        (settings.dashboard.layoutMargin.desktop || [10, 10]);
    }
    return isMobile ? [5, 5] : [10, 10];
  }, [isMobile, settings?.dashboard?.layoutMargin]);
  
  const containerPadding = useMemo(() => {
    if (settings?.dashboard?.containerPadding) {
      return isMobile ? 
        (settings.dashboard.containerPadding.mobile || [5, 5]) : 
        (settings.dashboard.containerPadding.desktop || [10, 10]);
    }
    return isMobile ? [5, 5] : [10, 10];
  }, [isMobile, settings?.dashboard?.containerPadding]);
  
  // Break points configuration from settings
  const breakpoints = useMemo(() => 
    settings?.dashboard?.breakpoints || { lg: 1200, md: 996, sm: 768, xs: 480 },
    [settings?.dashboard?.breakpoints]
  );
  
  const cols = useMemo(() => 
    settings?.dashboard?.cols || { lg: 30, md: 25, sm: 15, xs: 10 },
    [settings?.dashboard?.cols]
  );
  
  // Grid behavior from settings
  const isDraggable = useMemo(() => 
    isLowPowerMode ? false : (settings?.dashboard?.isDraggable !== undefined ? 
      settings.dashboard.isDraggable : false),
    [isLowPowerMode, settings?.dashboard?.isDraggable]
  );
  
  const isResizable = useMemo(() => 
    isLowPowerMode ? false : (settings?.dashboard?.isResizable !== undefined ? 
      settings.dashboard.isResizable : false),
    [isLowPowerMode, settings?.dashboard?.isResizable]
  );
  
  const compactType = useMemo(() => 
    settings?.dashboard?.compactType || null,
    [settings?.dashboard?.compactType]
  );
  
  const preventCollision = useMemo(() => 
    settings?.dashboard?.preventCollision !== undefined ? 
      settings.dashboard.preventCollision : true,
    [settings?.dashboard?.preventCollision]
  );
  
  // Extra padding to add to bottom of grid
  const bottomMargin = useMemo(() => 
    settings?.dashboard?.bottomMargin || 50,
    [settings?.dashboard?.bottomMargin]
  );
  
  // Memoize this expensive calculation
  const getMaxGridHeight = useMemo(() => {
    if (!layouts.lg || layouts.lg.length === 0) return 0;
    
    try {
      const maxItemBottom = layouts.lg.reduce((maxHeight, item) => {
        const verticalMargin = layoutMargin[1];
        const itemBottom = 
          (item.y + item.h) * rowHeight + 
          (item.y + item.h - 1) * verticalMargin;
        return Math.max(maxHeight, itemBottom);
      }, 0);
      
      const totalPadding = containerPadding[1] * 2;
      return maxItemBottom + totalPadding + bottomMargin;
    } catch (error) {
      console.error('Error calculating max grid height:', error);
      return settings?.dashboard?.fallbackHeight || 1200; // Fallback height
    }
  }, [
    layouts.lg, 
    rowHeight, 
    layoutMargin, 
    containerPadding, 
    bottomMargin, 
    settings?.dashboard?.fallbackHeight
  ]);
  
  // More efficient dashboard exiting handler
  useEffect(() => {
    const handleDashboardExiting = () => {
      // Set unmounting flag immediately
      isUnmounting.current = true;
      
      // OPTIMIZATION: Prioritize visual feedback first
      setIsVisible(false);
      
      // Use requestAnimationFrame to batch the heavy cleanup after the visual change
      requestAnimationFrame(() => {
        // Cancel any pending resize or animation timers first
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
          resizeTimeoutRef.current = null;
        }
        
        // Clean up subscriptions asynchronously - don't block navigation
        setTimeout(() => {
          if (isUnmounting.current) {
            // Clean up subscriptions
            Object.values(subscriptions.current).forEach(unsub => {
              if (typeof unsub === 'function') unsub();
            });
            subscriptions.current = {};
            
            // Signal child components to stop heavy work
            Object.values(componentRefs.current).forEach(ref => {
              if (ref?.current?.pauseUpdates) {
                ref.current.pauseUpdates();
              }
            });
          }
        }, 0);
      });
    };
    
    window.addEventListener('dashboardExiting', handleDashboardExiting);
    
    return () => {
      window.removeEventListener('dashboardExiting', handleDashboardExiting);
      isUnmounting.current = true;
      
      // Cleanup on unmount
      Object.values(subscriptions.current).forEach(unsub => {
        if (typeof unsub === 'function') unsub();
      });
      
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);
  
  // Handle container sizing - with safeguards to prevent update loops
  useEffect(() => {
    if (isUnmounting.current) return;
    
    // Check if height actually changed to prevent unnecessary DOM updates
    if (scrollContainerRef.current && Math.abs(prevMaxHeightRef.current - getMaxGridHeight) > 1) {
      prevMaxHeightRef.current = getMaxGridHeight;
      
      // Clear any previous timeout
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      // Use RAF to batch DOM updates
      requestAnimationFrame(() => {
        if (scrollContainerRef.current && !isUnmounting.current) {
          scrollContainerRef.current.style.minHeight = `${getMaxGridHeight}px`;
        }
      });
    }
    
    // Cleanup function
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    };
  }, [getMaxGridHeight]);
  
  // Prefetch critical resources - safer version
  useEffect(() => {
    const doPrefetchResources = () => {
      if (!prefetchResources) return;
      
      try {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            const links = settings?.dashboard?.prefetchLinks || ['realtime', 'historical'];
            links.forEach(href => {
              const link = document.createElement('link');
              link.rel = 'prefetch';
              link.href = '/' + href;
              document.head.appendChild(link);
            });
          });
        }
      } catch (error) {
        console.error('Error prefetching resources:', error);
      }
    };
    
    // Only run prefetch once and don't do it if component is unmounting
    if (!isUnmounting.current) {
      doPrefetchResources();
    }
  }, [prefetchResources, settings?.dashboard?.prefetchLinks]);
  
  // This component now uses conditional rendering for better unmounting
  if (!isVisible) {
    return (
      <Box
        sx={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          bgcolor: settings?.ui?.loadingBackgroundColor || theme.palette.background.default,
        }}
      />
    );
  }
  
  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: settings?.ui?.dashboardBackgroundColor || theme.palette.background.default,
        p: { 
          xs: settings?.ui?.padding?.xs || 1, 
          sm: settings?.ui?.padding?.sm || 1.5 
        },
        transition: animationsEnabled ? 
          `background-color ${animationDuration}ms` : 'none',
        willChange: useHardwareAcceleration ? 'background-color' : 'auto',
        height: '100vh',
        overflow: 'auto',
      }}
      role="main"
      aria-label="Vehicle Telemetry Dashboard"
    >
      {/* Scrollable Container */}
      <Box 
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          width: '100%',
          height: '100%', 
          position: 'relative',
          minHeight: `${getMaxGridHeight}px`, // Set initial height
        }}
        data-testid="dashboard-scroll-container"
      >
        <Box 
          sx={{ 
            width: '100%',
            position: 'relative',
          }}
          data-testid="dashboard-height-container"
        >
          <ResponsiveGridLayout
            className="dashboard-layout"
            layouts={layouts}
            breakpoints={breakpoints}
            cols={cols}
            rowHeight={rowHeight}
            margin={layoutMargin}
            containerPadding={containerPadding}
            isDraggable={isDraggable}
            isResizable={isResizable}
            useCSSTransforms={useHardwareAcceleration}
            measureBeforeMount={settings?.dashboard?.measureBeforeMount || false}
            compactType={compactType}
            preventCollision={preventCollision}
            onLayoutChange={onLayoutChange}
            style={{
              width: '100%',
              transition: animationsEnabled ? 
                `all ${animationDuration}ms` : 'none',
            }}
          >
            {visibleComponents['soc-indicator'] && (
              <div key="soc-indicator" style={{ 
                height: '100%', 
                willChange: useHardwareAcceleration ? 'transform' : 'auto',
                borderRadius: settings?.dashboard?.componentBorderRadius || 0,
                overflow: 'hidden',
              }}>
                <Suspense fallback={<ComponentLoader settings={settings} />}>
                  <SoCIndicator 
                    settings={settings?.components?.socIndicator || {}}
                  />
                </Suspense>
              </div>
            )}
            
            {visibleComponents['speedometer-gauge'] && (
              <div key="speedometer-gauge" style={{ 
                height: '100%', 
                willChange: useHardwareAcceleration ? 'transform' : 'auto',
                borderRadius: settings?.dashboard?.componentBorderRadius || 0,
                overflow: 'hidden',
              }}>
                <Suspense fallback={<ComponentLoader settings={settings} />}>
                  <SpeedometerGauge 
                    settings={settings?.components?.speedometerGauge || {}}
                  />
                </Suspense>
              </div>
            )}
            
            {visibleComponents['motor-controller-temp-gauge'] && (
              <div key="motor-controller-temp-gauge" style={{ 
                height: '100%', 
                willChange: useHardwareAcceleration ? 'transform' : 'auto',
                borderRadius: settings?.dashboard?.componentBorderRadius || 0,
                overflow: 'hidden',
              }}>
                <Suspense fallback={<ComponentLoader settings={settings} />}>
                  <MotorControllerTempGauge 
                    settings={settings?.components?.motorControllerTempGauge || {}}
                  />
                </Suspense>
              </div>
            )}
            
            {visibleComponents['car-overview'] && (
              <div key="car-overview" style={{ 
                height: '100%', 
                willChange: useHardwareAcceleration ? 'transform' : 'auto',
                borderRadius: settings?.dashboard?.componentBorderRadius || 0,
                overflow: 'hidden',
              }}>
                <Suspense fallback={<ComponentLoader settings={settings} />}>
                  <RaceCarTelemetry 
                    settings={settings?.components?.raceCarTelemetry || {}}
                  />
                </Suspense>
              </div>
            )}
            
            {visibleComponents['live-gps-map'] && (
              <div key="live-gps-map" style={{ 
                height: '100%', 
                willChange: useHardwareAcceleration ? 'transform' : 'auto',
                borderRadius: settings?.dashboard?.componentBorderRadius || 0,
                overflow: 'hidden',
              }}>
                <Suspense fallback={<ComponentLoader settings={settings} />}>
                  <LiveGPSMap 
                    settings={settings?.components?.liveGPSMap || {}}
                  />
                </Suspense>
              </div>
            )}
            
            {visibleComponents['pedals'] && (
              <div key="pedals" style={{ 
                height: '100%', 
                willChange: useHardwareAcceleration ? 'transform' : 'auto',
                borderRadius: settings?.dashboard?.componentBorderRadius || 0,
                overflow: 'hidden',
              }}>
                <Suspense fallback={<ComponentLoader settings={settings} />}>
                  <PedalsGauge 
                    settings={settings?.components?.pedalsGauge || {}}
                  />
                </Suspense>
              </div>
            )}
            
            {visibleComponents['cell-heatmap'] && (
              <div key="cell-heatmap" style={{ 
                height: '100%', 
                willChange: useHardwareAcceleration ? 'transform' : 'auto',
                borderRadius: settings?.dashboard?.componentBorderRadius || 0,
                overflow: 'hidden',
              }}>
                <Suspense fallback={<ComponentLoader settings={settings} />}>
                  <CellHeatmap 
                    settings={settings?.components?.cellHeatmap || {}}
                  />
                </Suspense>
              </div>
            )}
            
            {visibleComponents['weather-visual'] && (
              <div key="weather-visual" style={{ 
                height: '100%', 
                willChange: useHardwareAcceleration ? 'transform' : 'auto',
                borderRadius: settings?.dashboard?.componentBorderRadius || 0,
                overflow: 'hidden',
              }}>
                <Suspense fallback={<ComponentLoader settings={settings} />}>
                  <WeatherVisual 
                    settings={settings?.components?.weatherVisual || {}}
                  />
                </Suspense>
              </div>
            )}
          </ResponsiveGridLayout>
        </Box>
      </Box>
    </Box>
  );
};

export default memo(Dashboard);