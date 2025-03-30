import React, { useEffect, useState, useRef, useContext, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Card, CardHeader, CardContent, Typography, Box, IconButton, Tooltip, 
  CircularProgress, Chip, useTheme } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { DESIGN_TOKENS } from '../../theme';
import { useInView } from 'react-intersection-observer';
import useResizeObserver from 'use-resize-observer';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import HistoricalChart from './HistoricalChart';
import useHistoricalData from '../../hooks/useHistoricalData';
import { throttle } from 'lodash';

/**
 * HistoricalChartWrapper Component
 * 
 * A wrapper for historical data charts that provides loading state management,
 * refresh controls, fullscreen mode, and optimized rendering based on viewport visibility.
 * Fully integrated with ChartSettingsContext for customization.
 */
const HistoricalChartWrapper = ({
  endpoint,
  title = 'Historical Data',
  height = 400,
  axisTitles = { x: 'Time', y: 'Value' },
  className = '',
  customStyles = {},
  showDataLabels = false,
  refreshTrigger = 0,
  pageSize = null,
  rootInView = true, // Whether the parent container is in view
}) => {
  // Get theme
  const theme = useTheme();

  // Access settings from context
  const { settings } = useContext(ChartSettingsContext);
  
  // Destructure settings with defaults to prevent undefined access
  const histSettings = settings?.historical || {};
  const globalSettings = settings?.global || {};
  const dashboardSettings = settings?.dashboard || {};

  // Refs for timers and other resources
  const resizeTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const lastRefreshTimeRef = useRef(0); // Track last refresh time
  const previousRefreshTriggerRef = useRef(refreshTrigger); // Track previous trigger value
  const resizeAfterRefreshTimerRef = useRef(null); // New ref for resizing after refresh
  const isFullscreenTransitioningRef = useRef(false); // Track fullscreen transition state

  // Calculate optimal inView options based on settings
  const inViewOptions = useMemo(() => ({
    threshold: 0.1,
    triggerOnce: false,
    initialInView: false,
    // Skip update if parent isn't in view
    skip: !rootInView,
    // Use rootMargin to start loading slightly before chart is visible
    rootMargin: '100px 0px',
    // Don't track if inactive for better performance
    trackVisibility: false,
    delay: 100
  }), [rootInView]);

  // Setup intersection observer with optimized options
  const { ref: inViewRef, inView } = useInView(inViewOptions);

  // Get resize observer to update chart dimensions
  const { ref: resizeRef, width = 300, height: measuredHeight = height } = useResizeObserver();

  // Animation settings from context
  const animationsEnabled = useMemo(() =>
    globalSettings.animationDuration > 0 && globalSettings.enableTransitions !== false,
  [globalSettings.animationDuration, globalSettings.enableTransitions]);

  const animationDuration = useMemo(() =>
    `${globalSettings.animationDuration || 300}ms`,
  [globalSettings.animationDuration]);
  
  // Animation easing based on smoothing setting
  const animationEasing = useMemo(() => 
    histSettings.enableSmoothing 
      ? 'cubic-bezier(0.4, 0.0, 0.2, 1)' 
      : 'ease',
  [histSettings.enableSmoothing]);

  // Hardware acceleration setting
  const enableHardwareAcceleration = useMemo(() =>
    globalSettings.enableHardwareAcceleration !== false,
  [globalSettings.enableHardwareAcceleration]);

  // Combine refs using a callback ref
  const setRefs = useCallback((element) => {
    // Set both refs
    inViewRef(element);
    resizeRef(element);
  }, [inViewRef, resizeRef]);

  // State for UI control
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [localPaused, setLocalPaused] = useState(false);
  const [chartState, setChartState] = useState({
    hasError: false,
    isLoadingManual: false,
    lastRefreshed: null,
    lastDataCount: 0
  });
  
  // Destructure chart state for easier access
  const { hasError, isLoadingManual, lastRefreshed, lastDataCount } = chartState;
  
  // Chart ref for manual resizing
  const chartRef = useRef(null);
  
  // Get page size from props or settings
  const effectivePageSize = useMemo(() => 
    pageSize || (histSettings.pageSize || 2000), 
  [pageSize, histSettings.pageSize]);
  
  // Use custom hook to fetch data
  const { data, loading, error, refresh } = useHistoricalData(
    endpoint, 
    effectivePageSize
  );
  
  // Ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Effective paused state: paused if explicitly paused or not in view
  const effectivePaused = useMemo(() => 
    localPaused || !inView,
  [localPaused, inView]);
  
  // Improved resize handler with better error handling
  const handleResize = useCallback(() => {
    if (!chartRef.current) return;
    
    try {
      if (typeof chartRef.current.resize === 'function') {
        chartRef.current.resize();
      }
      
      // Dispatch a resize event for any other components that need it
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('resize'));
      }
    } catch (err) {
      console.error('Error resizing chart:', err);
    }
  }, []);
  
  // Create a throttled version of handleResize for better performance
  const throttledResize = useMemo(() => 
    throttle(handleResize, 200),
  [handleResize]);
  
  // More aggressive resize that tries multiple times with RAF
  const forceResize = useCallback(() => {
    // Immediate resize
    handleResize();
    
    // Then additional resize with RAF for smoother rendering
    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        if (isMounted.current) {
          handleResize();
        }
      });
    }
    
    // Then a sequence of delayed resizes to ensure it takes effect
    const delays = [50, 200, 500];
    
    delays.forEach(delay => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
      
      resizeTimerRef.current = setTimeout(() => {
        if (isMounted.current) {
          handleResize();
          resizeTimerRef.current = null;
        }
      }, delay);
    });
  }, [handleResize]);
  
  // Effect to handle component mount/unmount
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      
      // Clean up any timers
      [resizeTimerRef, refreshTimerRef, resizeAfterRefreshTimerRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
          ref.current = null;
        }
      });
      
      // Cancel throttled functions
      if (throttledResize && throttledResize.cancel) {
        throttledResize.cancel();
      }
    };
  }, [throttledResize]);
  
  // Handle manual refresh - memoized to prevent recreation on render
  const handleRefresh = useCallback(() => {
    // Skip if already loading or not in view
    if (loading || isLoadingManual || !inView) return;
    
    // Prevent multiple refreshes within cooldown period (from settings or default)
    const minRefreshInterval = Math.max(histSettings.refreshRate || 0, 1000);
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < minRefreshInterval) {
      console.log(`Skipping refresh, cooldown period (${minRefreshInterval}ms) not elapsed`);
      return;
    }
    
    // Update last refresh time
    lastRefreshTimeRef.current = now;
    
    setChartState(prev => ({
      ...prev,
      isLoadingManual: true
    }));
    
    refresh();
    
    // Reset loading state after timeout
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }
    
    refreshTimerRef.current = setTimeout(() => {
      if (isMounted.current) {
        setChartState(prev => ({
          ...prev,
          isLoadingManual: false
        }));
        
        // Schedule resize after data is loaded and state is updated
        if (resizeAfterRefreshTimerRef.current) {
          clearTimeout(resizeAfterRefreshTimerRef.current);
        }
        
        resizeAfterRefreshTimerRef.current = setTimeout(() => {
          if (isMounted.current) {
            forceResize();
          }
          resizeAfterRefreshTimerRef.current = null;
        }, 100);
      }
      refreshTimerRef.current = null;
    }, 1000);
  }, [loading, isLoadingManual, inView, refresh, forceResize, histSettings.refreshRate]);
  
  // Effect to handle global refresh trigger
  useEffect(() => {
    // Only respond to trigger changes if value has changed and not just on initial mount
    if (refreshTrigger !== previousRefreshTriggerRef.current && 
        inView && rootInView && !loading && !isLoadingManual) {
      
      // Use the same refresh cooldown logic
      const minRefreshInterval = Math.max(histSettings.refreshRate || 0, 1000);
      const now = Date.now();
      if (now - lastRefreshTimeRef.current < minRefreshInterval) {
        console.log(`Skipping triggered refresh, cooldown period (${minRefreshInterval}ms) not elapsed`);
      } else {
        handleRefresh();
      }
    }
    
    // Update previous trigger value
    previousRefreshTriggerRef.current = refreshTrigger;
  }, [refreshTrigger, inView, rootInView, handleRefresh, loading, isLoadingManual, histSettings.refreshRate]);
  
  // Effect to update last data count and handle errors
  useEffect(() => {
    if (data && data.length > 0) {
      setChartState(prev => ({
        ...prev,
        lastDataCount: data.length,
        lastRefreshed: new Date(),
        hasError: false
      }));
      
      // Trigger resize after data is updated
      if (resizeAfterRefreshTimerRef.current) {
        clearTimeout(resizeAfterRefreshTimerRef.current);
      }
      
      resizeAfterRefreshTimerRef.current = setTimeout(() => {
        if (isMounted.current) {
          forceResize();
        }
        resizeAfterRefreshTimerRef.current = null;
      }, 100);
    }
    
    if (error) {
      setChartState(prev => ({
        ...prev,
        hasError: true
      }));
    }
  }, [data, error, forceResize]);
  
  // Ensure chart resizes properly when container size changes
  useEffect(() => {
    window.addEventListener('resize', throttledResize);
    
    // Initial resize
    throttledResize();
    
    return () => {
      window.removeEventListener('resize', throttledResize);
    };
  }, [throttledResize]);
  
  // Trigger resize when fullscreen changes
  useEffect(() => {
    if (isFullscreenTransitioningRef.current) return;
    
    if (isFullscreen || inView) {
      isFullscreenTransitioningRef.current = true;
      
      // Sequence of resizes for more reliable updates using RAF and timeouts
      requestAnimationFrame(() => {
        forceResize();
        
        // Add additional resize after animation completes
        setTimeout(() => {
          forceResize();
          isFullscreenTransitioningRef.current = false;
        }, parseFloat(animationDuration) + 50);
      });
    }
    
    return () => {
      isFullscreenTransitioningRef.current = false;
    };
  }, [isFullscreen, inView, forceResize, animationDuration]);
  
  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);
  
  // Handle pause/resume
  const handlePauseToggle = useCallback(() => {
    setLocalPaused(prev => !prev);
  }, []);
  
  // Calculate responsive dimensions based on settings
  const chartHeight = useMemo(() => {
    // Start with base height (either fullscreen or prop)
    let baseHeight = isFullscreen ? '85vh' : height;
    
    // Apply chart size from settings if available and not fullscreen
    if (!isFullscreen && dashboardSettings.chartSize) {
      if (dashboardSettings.chartSize === 'large') {
        baseHeight = typeof height === 'number' ? height * 1.2 : height;
      } else if (dashboardSettings.chartSize === 'small') {
        baseHeight = typeof height === 'number' ? height * 0.8 : height;
      }
    }
    
    return baseHeight;
  }, [isFullscreen, height, dashboardSettings.chartSize]);
  
  // Format the last refreshed time
  const formattedLastRefreshed = useMemo(() => 
    lastRefreshed ? `${lastRefreshed.toLocaleTimeString()}` : 'Never',
  [lastRefreshed]);
    
  // Dynamic styles for container - memoized to prevent recreation on every render
  const containerStyle = useMemo(() => ({
    width: isFullscreen ? '98vw' : '100%',
    height: isFullscreen ? '95vh' : '100%',
    position: isFullscreen ? 'fixed' : 'relative',
    top: isFullscreen ? '2.5vh' : 'auto',
    left: isFullscreen ? '1vw' : 'auto',
    zIndex: isFullscreen ? 1300 : 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: isFullscreen ? theme.shape.borderRadius : `${theme.shape.borderRadius}px`,
    boxShadow: isFullscreen ? '0 0 30px rgba(0, 0, 0, 0.5)' : undefined,
    transition: animationsEnabled
      ? `width ${animationDuration} ${animationEasing}, 
         height ${animationDuration} ${animationEasing}, 
         top ${animationDuration} ${animationEasing}, 
         left ${animationDuration} ${animationEasing}, 
         box-shadow ${animationDuration} ${animationEasing}`
      : 'none',
    ...(enableHardwareAcceleration && {
      transform: 'translateZ(0)',
      willChange: isFullscreenTransitioningRef.current ? 'width, height, top, left, box-shadow' : 'auto'
    }),
    ...customStyles,
  }), [
    isFullscreen, 
    theme.shape.borderRadius, 
    animationsEnabled, 
    animationDuration, 
    animationEasing,
    enableHardwareAcceleration, 
    customStyles
  ]);

  // Card header style
  const cardHeaderStyle = useMemo(() => ({
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(0, 0, 0, 0.15)' 
      : 'rgba(255, 255, 255, 0.85)',
  }), [theme.spacing, theme.palette.divider, theme.palette.mode]);

  // Card content style
  const cardContentStyle = useMemo(() => ({
    padding: 0,
    height: 'calc(100% - 56px)',
    '&:last-child': { paddingBottom: 0 },
    position: 'relative',
  }), []);

  // Loading overlay style
  const loadingOverlayStyle = useMemo(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(0, 0, 0, 0.3)' 
      : 'rgba(255, 255, 255, 0.3)',
  }), [theme.palette.mode]);

  // Error overlay style
  const errorOverlayStyle = useMemo(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(0, 0, 0, 0.7)' 
      : 'rgba(255, 255, 255, 0.7)',
  }), [theme.palette.mode]);

  // Empty state style
  const emptyStateStyle = useMemo(() => ({
    display: 'flex', 
    flexDirection: 'column',
    justifyContent: 'center', 
    alignItems: 'center',
    height: '100%',
  }), []);

  // Not in view overlay style
  const notInViewOverlayStyle = useMemo(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(0, 0, 0, 0.7)' 
      : 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(2px)',
    zIndex: 1,
  }), [theme.palette.mode]);

  // Paused overlay style
  const pausedOverlayStyle = useMemo(() => ({
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 1,
    pointerEvents: 'none',
  }), []);

  // Pause chip style
  const pauseChipStyle = useMemo(() => ({
    backgroundColor: theme.palette.mode === 'dark' 
      ? 'rgba(0, 0, 0, 0.7)' 
      : 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(2px)',
    fontWeight: 'bold',
    pointerEvents: 'auto'
  }), [theme.palette.mode]);

  // Chart box style
  const chartBoxStyle = useMemo(() => ({
    flexGrow: 1, 
    display: 'flex', 
    flexDirection: 'column',
    height: '100%',
    width: '100%'
  }), []);

  // Count chip style
  const countChipStyle = useMemo(() => ({
    height: 20, 
    fontSize: '0.7rem',
    fontWeight: 500
  }), []);

  // Memoize chart configuration to prevent recreation on every render
  const chartConfig = useMemo(() => ({
    title: '',  // We manage the title in this wrapper
    axisTitles,
    showDataLabels,
    dimensions: { 
      width: Math.max(width, 300), 
      height: chartHeight 
    },
    groupSize: 16, // Cell data grouping
  }), [axisTitles, showDataLabels, width, chartHeight]);

  // Check if we should show the chart
  const shouldShowChart = useMemo(() => 
    inView && rootInView && !hasError,
  [inView, rootInView, hasError]);

  // Memoize title component
  const titleComponent = useMemo(() => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Typography
        variant="h6"
        component="h2"
        noWrap
        title={title}
        sx={{ fontWeight: 500 }}
      >
        {title}
      </Typography>
      
      {!loading && !isLoadingManual && data && data.length > 0 && (
        <Chip 
          label={`${lastDataCount} points`} 
          size="small" 
          color="secondary" 
          variant="outlined" 
          sx={countChipStyle}
        />
      )}
    </Box>
  ), [title, loading, isLoadingManual, data, lastDataCount, countChipStyle]);

  // Memoize header actions
  const headerActions = useMemo(() => (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      {/* Show last updated time */}
      {lastRefreshed && (
        <Typography variant="caption" color="text.secondary" sx={{ mr: 1, alignSelf: 'center' }}>
          {formattedLastRefreshed}
        </Typography>
      )}
      
      
      {/* Refresh button */}
      <Tooltip title="Refresh data">
        <IconButton 
          size="small"
          onClick={handleRefresh}
          disabled={loading || isLoadingManual}
        >
          {(loading || isLoadingManual) ? (
            <CircularProgress size={16} />
          ) : (
            <RefreshIcon fontSize="small" />
          )}
        </IconButton>
      </Tooltip>
      
      {/* Fullscreen toggle */}
      <Tooltip title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
        <IconButton size="small" onClick={handleFullscreenToggle}>
          {isFullscreen ? <FullscreenExitIcon fontSize="small" /> : <FullscreenIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
    </Box>
  ), [
    lastRefreshed, 
    formattedLastRefreshed, 
    localPaused, 
    loading, 
    isLoadingManual, 
    isFullscreen, 
    handlePauseToggle, 
    handleRefresh, 
    handleFullscreenToggle
  ]);

  // Memoize loading indicator
  const loadingIndicator = useMemo(() => (
    (loading && !data?.length) && (
      <Box sx={loadingOverlayStyle}>
        <CircularProgress />
      </Box>
    )
  ), [loading, data?.length, loadingOverlayStyle]);

  // Memoize error message
  const errorMessage = useMemo(() => (
    hasError && !loading && (
      <Box sx={errorOverlayStyle}>
        <ErrorOutlineIcon color="error" sx={{ fontSize: 40, mb: 2 }} />
        <Typography color="error" align="center" fontWeight="medium">
          Error loading data
        </Typography>
        <Tooltip title="Retry">
          <IconButton
            color="primary"
            onClick={handleRefresh}
            sx={{ mt: 2 }}
          >
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>
    )
  ), [hasError, loading, errorOverlayStyle, handleRefresh]);

  // Memoize empty state
  const emptyState = useMemo(() => (
    !loading && !hasError && data?.length === 0 && (
      <Box sx={emptyStateStyle}>
        <Typography variant="body1" color="text.secondary" align="center">
          No data available
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          Try adjusting data point limit or refresh
        </Typography>
      </Box>
    )
  ), [loading, hasError, data?.length, emptyStateStyle]);

  // Memoize not in view overlay
  const notInViewOverlay = useMemo(() => (
    !inView && (
      <Box sx={notInViewOverlayStyle}>
        <Typography variant="body2" color="text.secondary">
          Chart paused (not in viewport)
        </Typography>
      </Box>
    )
  ), [inView, notInViewOverlayStyle]);

  // Memoize paused overlay
  const pausedOverlay = useMemo(() => (
    inView && localPaused && (
      <Box sx={pausedOverlayStyle}>
        <Chip
          label="PAUSED"
          color="primary"
          variant="outlined"
          sx={pauseChipStyle}
          onClick={handlePauseToggle}
        />
      </Box>
    )
  ), [inView, localPaused, pausedOverlayStyle, pauseChipStyle, handlePauseToggle]);

  return (
    <Card
      ref={setRefs}
      className={`historical-chart-wrapper ${className}`}
      sx={containerStyle}
    >
      <CardHeader
        title={titleComponent}
        action={headerActions}
        sx={cardHeaderStyle}
      />
      
      <CardContent sx={cardContentStyle}>
        {/* Loading indicator */}
        {loadingIndicator}
        
        {/* Error message */}
        {errorMessage}
        
        {/* Empty state */}
        {emptyState}
        
        {/* The actual chart - only render if in view and not in error state */}
        {shouldShowChart && (
          <Box ref={chartRef} sx={chartBoxStyle}>
            <HistoricalChart
              endpoint={endpoint}
              data={data} // Pass data directly to avoid duplicate fetching
              config={chartConfig}
            />
          </Box>
        )}
        
        {/* Overlay when not in view */}
        {notInViewOverlay}
        
        {/* Overlay when paused */}
        {pausedOverlay}
      </CardContent>
    </Card>
  );
};

HistoricalChartWrapper.propTypes = {
  endpoint: PropTypes.string.isRequired,
  title: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  axisTitles: PropTypes.shape({
    x: PropTypes.string,
    y: PropTypes.string
  }),
  className: PropTypes.string,
  customStyles: PropTypes.object,
  showDataLabels: PropTypes.bool,
  refreshTrigger: PropTypes.number,
  pageSize: PropTypes.number,
  rootInView: PropTypes.bool,
};

export default React.memo(HistoricalChartWrapper);