import React, { useContext, useCallback, useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useInView } from 'react-intersection-observer';
import useResizeObserver from 'use-resize-observer';
import { Card, CardHeader, CardContent, Typography, Box, useTheme, IconButton, Tooltip, Chip } from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import RealTimeChart from './RealTimeChart';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

const RealTimeChartWrapper = ({
  chartType,
  title = 'Real-Time Data',
  width = '100%',
  height = 400,
  axisTitles = { x: 'Time', y: 'Value' },
  className = '',
  customStyles = {},
  showLegend = true,
  isPaused = false,
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  // Local state
  const [localPaused, setLocalPaused] = useState(isPaused);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Track if the component is in the viewport with a lower threshold for better performance
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.05, // Lower threshold - only needs minimal visibility to be considered in view
    triggerOnce: false,
    rootMargin: '0px 0px 300px 0px', // Preload charts that are 300px below viewport
  });
  
  // Track the component's size for responsive charts
  const { ref: resizeRef, width: containerWidth, height: containerHeight } = useResizeObserver({
    // Lower the update frequency for better performance
    box: 'border-box'
  });
  
  // Combine refs
  const setRefs = useCallback(
    (node) => {
      resizeRef(node);
      inViewRef(node);
    },
    [resizeRef, inViewRef]
  );
  
  // Update local pause state when prop changes
  useEffect(() => {
    setLocalPaused(isPaused);
  }, [isPaused]);
  
  // Effective paused state: paused if explicitly paused or not in view
  const effectivePaused = useMemo(() => 
    localPaused || !inView,
  [localPaused, inView]);
  
  // Handle pause/resume
  const handlePauseToggle = useCallback(() => {
    setLocalPaused(prev => !prev);
  }, []);
  
  // Toggle fullscreen mode
  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(prev => !prev);
    // Allow time for transition, then trigger resize event
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
  }, []);
  
  // Trigger resize event when component becomes visible or changes fullscreen state
  useEffect(() => {
    if (!inView) return;
    
    const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    return () => clearTimeout(timer);
  }, [inView, isFullscreen]);
  
  // Dynamic styles for containers - UPDATED to match HistoricalChartWrapper
  const containerStyle = useMemo(() => ({
    width: isFullscreen ? '98vw' : (typeof width === 'number' ? `${width}px` : width),
    height: isFullscreen ? '95vh' : (typeof height === 'number' ? `${height}px` : height),
    position: isFullscreen ? 'fixed' : 'relative',
    top: isFullscreen ? '2.5vh' : 'auto',
    left: isFullscreen ? '1vw' : 'auto',
    zIndex: isFullscreen ? 1300 : 'auto',
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    boxShadow: isFullscreen ? '0 0 30px rgba(0, 0, 0, 0.5)' : theme.shadows[3],
    transition: settings?.global?.enableTransitions !== false 
      ? theme.transitions.create(['width', 'height', 'box-shadow', 'border-radius'], { 
          duration: theme.transitions.duration.standard 
        }) 
      : 'none',
    ...(settings?.global?.enableHardwareAcceleration !== false && {
      transform: 'translateZ(0)'
    }),
    ...customStyles,
  }), [
    isFullscreen, 
    width, 
    height, 
    theme.shape.borderRadius,
    theme.shadows, 
    theme.transitions,
    settings?.global?.enableTransitions,
    settings?.global?.enableHardwareAcceleration,
    customStyles
  ]);

  // Memoize the header action buttons
  const headerActions = useMemo(() => (
    <Box sx={{ display: 'flex', gap: 0.5 }}>
      <Tooltip title={localPaused ? 'Resume' : 'Pause'}>
        <IconButton size="small" onClick={handlePauseToggle} color={localPaused ? 'primary' : 'default'}>
          {localPaused ? <PlayArrowIcon /> : <PauseIcon />}
        </IconButton>
      </Tooltip>
      <Tooltip title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
        <IconButton size="small" onClick={handleFullscreenToggle}>
          {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
        </IconButton>
      </Tooltip>
    </Box>
  ), [localPaused, isFullscreen, handlePauseToggle, handleFullscreenToggle]);

  // Memoize "Not in viewport" overlay
  const notInViewOverlay = useMemo(() => (
    !inView && (
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
    )
  ), [inView, theme.palette.mode]);

  // Memoize "Paused" overlay
  const pausedOverlay = useMemo(() => (
    inView && localPaused && (
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
    )
  ), [inView, localPaused, theme.palette.mode, handlePauseToggle]);

  return (
    <Card 
      ref={setRefs} 
      className={className} 
      sx={containerStyle}
      id={`chart-${chartType}`}
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
          </Box>
        }
        action={headerActions}
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
        {/* Always render the chart with isVisible prop based on inView */}
        <RealTimeChart
          chartType={chartType}
          config={{
            title,
            axisTitles,
            showLegend,
            dimensions: { 
              width: containerWidth || (typeof width === 'number' ? width : 600), 
              height: containerHeight ? containerHeight - 56 : (typeof height === 'number' ? height - 56 : 400)
            },
          }}
          isPaused={effectivePaused}
          isVisible={inView}
        />
        
        {/* Overlay when not in view */}
        {notInViewOverlay}
        
        {/* Overlay when paused */}
        {pausedOverlay}
      </CardContent>
    </Card>
  );
};

RealTimeChartWrapper.propTypes = {
  chartType: PropTypes.string.isRequired,
  title: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  axisTitles: PropTypes.object,
  className: PropTypes.string,
  customStyles: PropTypes.object,
  showLegend: PropTypes.bool,
  isPaused: PropTypes.bool,
};

export default React.memo(RealTimeChartWrapper);