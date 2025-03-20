import React, { useContext, useCallback, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useInView } from 'react-intersection-observer';
import useResizeObserver from 'use-resize-observer';
import { Card, CardHeader, CardContent, Typography, Box, useTheme, IconButton, Tooltip } from '@mui/material';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
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
  
  // Track if the component is in the viewport
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
  });
  
  // Track the component's size for responsive charts
  const { ref: resizeRef, width: containerWidth, height: containerHeight } = useResizeObserver();
  
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
  const effectivePaused = localPaused || !inView;
  
  // Handle pause/resume
  const handlePauseToggle = useCallback(() => {
    setLocalPaused(prev => !prev);
  }, []);
  
  // Trigger a resize event when component becomes visible
  useEffect(() => {
    if (inView) {
      const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      return () => clearTimeout(timer);
    }
  }, [inView]);
  
  const containerStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: theme.shape.borderRadius,
    overflow: 'hidden',
    boxShadow: theme.shadows[1],
    transition: settings?.global?.enableTransitions !== false 
      ? theme.transitions.create(['box-shadow'], { 
          duration: theme.transitions.duration.shorter 
        }) 
      : 'none',
    ...(settings?.global?.enableHardwareAcceleration !== false && {
      transform: 'translateZ(0)'
    }),
    ...customStyles,
  };

  return (
    <Card ref={setRefs} className={className} sx={containerStyle}>
      <CardHeader
        title={
          <Typography variant="h6" component="h2" noWrap title={title}>
            {title}
          </Typography>
        }
        action={
          <Tooltip title={localPaused ? 'Resume' : 'Pause'}>
            <IconButton size="small" onClick={handlePauseToggle}>
              {localPaused ? <PlayArrowIcon /> : <PauseIcon />}
            </IconButton>
          </Tooltip>
        }
        sx={{
          padding: theme.spacing(1, 2),
          borderBottom: `1px solid ${theme.palette.divider}`,
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
              height: containerHeight || (typeof height === 'number' ? height : 400)
            },
          }}
          isPaused={effectivePaused}
          isVisible={inView}
        />
        
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
              zIndex: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary">
              Chart paused (not in viewport)
            </Typography>
          </Box>
        )}
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