import React, { useEffect, useState, useRef, useContext, useCallback } from 'react';
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
  // Setup intersection observer with threshold for partial visibility
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
    initialInView: false,
    // Skip update if parent isn't in view
    skip: !rootInView,
  });

  // Get resize observer to update chart dimensions
  const { ref: resizeRef, width = 300, height: measuredHeight = height } = useResizeObserver();

  // Combine refs
  const setRefs = (element) => {
    // Set both refs
    inViewRef(element);
    resizeRef(element);
  };

  // Get theme
  const theme = useTheme();
  
  // State for UI control
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isLoadingManual, setIsLoadingManual] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [lastDataCount, setLastDataCount] = useState(0);
  const [localPaused, setLocalPaused] = useState(false);
  
  // Access settings from context
  const { settings } = useContext(ChartSettingsContext);
  
  // Chart ref for manual resizing
  const chartRef = useRef(null);
  
  // Use custom hook to fetch data
  const { data, loading, error, refresh } = useHistoricalData(
    endpoint, 
    pageSize || settings.historical.pageSize
  );
  
  // Ref to track if component is mounted
  const isMounted = useRef(true);
  
  // Effective paused state: paused if explicitly paused or not in view
  const effectivePaused = localPaused || !inView;
  
  // Effect to handle component mount/unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Effect to handle global refresh trigger
  useEffect(() => {
    if (refreshTrigger > 0 && inView && rootInView) {
      handleRefresh();
    }
  }, [refreshTrigger, inView, rootInView]);
  
  // Effect to update last data count
  useEffect(() => {
    if (data && data.length > 0) {
      setLastDataCount(data.length);
      setLastRefreshed(new Date());
      setHasError(false);
    }
  }, [data]);
  
  // Effect to handle errors
  useEffect(() => {
    if (error) {
      setHasError(true);
    }
  }, [error]);
  
  // Ensure chart resizes properly when container size changes
  useEffect(() => {
    const handleResize = () => {
      // Force chart to resize after container changes
      if (chartRef.current && chartRef.current.resize) {
        setTimeout(() => chartRef.current.resize(), 50);
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // Also respond to height/width prop changes
    handleResize();
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [height, width, isFullscreen]);
  
  // Handle manual refresh
  const handleRefresh = () => {
    if (loading || !inView) return;
    
    setIsLoadingManual(true);
    refresh();
    
    // Reset loading state after timeout
    setTimeout(() => {
      if (isMounted.current) {
        setIsLoadingManual(false);
      }
    }, 1000);
  };
  
  // Handle fullscreen toggle
  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(prev => !prev);
    
    // Force resize after fullscreen toggle
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
  }, []);
  
  // Handle pause/resume
  const handlePauseToggle = useCallback(() => {
    setLocalPaused(prev => !prev);
  }, []);
  
  // Trigger resize event when component becomes visible or changes fullscreen state
  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      return () => clearTimeout(timer);
    }
  }, [inView, isFullscreen]);
  
  // Calculate responsive dimensions
  const chartHeight = isFullscreen ? '85vh' : height;
  
  // Format the last refreshed time
  const formattedLastRefreshed = lastRefreshed
    ? `${lastRefreshed.toLocaleTimeString()}`
    : 'Never';
    
  // Dynamic styles for container
  const containerStyle = {
    width: isFullscreen ? '95vw' : '100%',
    height: isFullscreen ? '90vh' : '100%', // Use 100% to fill grid container
    position: isFullscreen ? 'fixed' : 'relative',
    top: isFullscreen ? '5vh' : 'auto',
    left: isFullscreen ? '2.5vw' : 'auto',
    zIndex: isFullscreen ? DESIGN_TOKENS.zIndex.modal : 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    borderRadius: isFullscreen ? 0 : `${DESIGN_TOKENS.borderRadius.lg}px`,
    boxShadow: isFullscreen ? DESIGN_TOKENS.shadows.xl : undefined,
    transition: settings?.global?.enableTransitions !== false
      ? theme.transitions.create(['width', 'height', 'top', 'left', 'box-shadow'], {
          duration: theme.transitions.duration.standard
        })
      : 'none',
    ...(settings?.global?.enableHardwareAcceleration !== false && {
      transform: 'translateZ(0)'
    }),
    ...customStyles,
  };

  return (
    <Card
      ref={setRefs}
      className={`historical-chart-wrapper ${className}`}
      sx={containerStyle}
    >
      <CardHeader
        title={
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
                sx={{ 
                  height: 20, 
                  fontSize: '0.7rem',
                  fontWeight: DESIGN_TOKENS.fontWeight.medium 
                }}
              />
            )}
          </Box>
        }
        action={
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {/* Show last updated time */}
            {lastRefreshed && (
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1, alignSelf: 'center' }}>
                {`${formattedLastRefreshed}`}
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
                {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </IconButton>
            </Tooltip>
          </Box>
        }
        sx={{
          padding: theme.spacing(1, 2),
          borderBottom: `1px solid ${theme.palette.divider}`,
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(0, 0, 0, 0.15)' 
            : 'rgba(255, 255, 255, 0.85)',
        }}
      />
      
      <CardContent
        sx={{
          padding: 0,
          height: 'calc(100% - 56px)',
          '&:last-child': { paddingBottom: 0 },
          position: 'relative',
        }}
      >
        {/* Loading indicator */}
        {(loading && !data?.length) && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 2,
            }}
          >
            <CircularProgress />
          </Box>
        )}
        
        {/* Error message */}
        {hasError && !loading && (
          <Box
            sx={{
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
            }}
          >
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
        )}
        
        {/* Empty state */}
        {!loading && !hasError && data?.length === 0 && (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              justifyContent: 'center', 
              alignItems: 'center',
              height: '100%',
            }}
          >
            <Typography variant="body1" color="text.secondary" align="center">
              No data available
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Try adjusting data point limit or refresh
            </Typography>
          </Box>
        )}
        
        {/* The actual chart - only render if in view and not in error state */}
        {(inView && rootInView && !hasError) && (
          <Box 
            ref={chartRef} 
            sx={{ 
              flexGrow: 1, 
              display: 'flex', 
              flexDirection: 'column',
              height: '100%',
              width: '100%'
            }}
          >
            <HistoricalChart
              endpoint={endpoint}
              data={data} // Pass data directly to avoid duplicate fetching
              config={{
                title: '',  // We manage the title in this wrapper
                axisTitles,
                showDataLabels,
                dimensions: { 
                  width: Math.max(width, 300), 
                  height: chartHeight 
                },
                groupSize: 16, // Cell data grouping
              }}
            />
          </Box>
        )}
        
        {/* Overlay when not in view */}
        {!inView && (
          <Box
            sx={{
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
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Chart paused (not in viewport)
            </Typography>
          </Box>
        )}
        
        {/* Overlay when paused */}
        {inView && localPaused && (
          <Box
            sx={{
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
            }}
          >
            <Chip
              label="PAUSED"
              color="primary"
              variant="outlined"
              sx={{ 
                backgroundColor: theme.palette.mode === 'dark' 
                  ? 'rgba(0, 0, 0, 0.7)' 
                  : 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(2px)',
                fontWeight: 'bold',
                pointerEvents: 'auto'
              }}
              onClick={handlePauseToggle}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

HistoricalChartWrapper.propTypes = {
  endpoint: PropTypes.string.isRequired,
  title: PropTypes.string,
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  axisTitles: PropTypes.object,
  className: PropTypes.string,
  customStyles: PropTypes.object,
  showDataLabels: PropTypes.bool,
  refreshTrigger: PropTypes.number,
  pageSize: PropTypes.number,
  rootInView: PropTypes.bool,
};

export default React.memo(HistoricalChartWrapper);