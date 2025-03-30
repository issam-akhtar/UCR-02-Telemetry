import React, { useState, useEffect, useRef, useContext } from 'react';
import { Box, Typography, useTheme, alpha, LinearProgress, Tooltip } from '@mui/material';
import { GiSpring } from 'react-icons/gi';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Color and status maps defined outside component to avoid recreation
const COLOR_MAP = [
  { threshold: 10, color: '#00ff00' },   // Green
  { threshold: 20, color: '#7fff00' },
  { threshold: 30, color: '#bfff00' },
  { threshold: 40, color: '#ffff00' },   // Yellow
  { threshold: 50, color: '#ffdf00' },
  { threshold: 60, color: '#ffbf00' },
  { threshold: 70, color: '#ff9f00' },
  { threshold: 80, color: '#ff7f00' },
  { threshold: 90, color: '#ff5f00' },
  { threshold: 101, color: '#ff0000' }   // Red
];

const STATUS_MAP = [
  { threshold: 10, status: 'Min' },
  { threshold: 20, status: 'Low-' },
  { threshold: 30, status: 'Low' },
  { threshold: 40, status: 'Med-' },
  { threshold: 50, status: 'Med' },
  { threshold: 60, status: 'Med+' },
  { threshold: 70, status: 'High-' },
  { threshold: 80, status: 'High' },
  { threshold: 90, status: 'High+' },
  { threshold: 101, status: 'Max' }
];

// Position mapping
const POSITION_NAMES = {
  'FL': 'Front Left',
  'FR': 'Front Right',
  'RL': 'Rear Left',
  'RR': 'Rear Right'
};

/**
 * High-Performance SuspensionOverlay Component
 * Displays suspension data with optimized rendering and state updates
 */
const CompactSuspensionOverlay = ({
  wheelFilter = null,
  suspensionValues = null,
  transformForCard = false,
  compact = false,
  sx = {},
  fontSizes = {}
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const isFirstRender = useRef(true);
  const throttleTimerRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  
  // State for suspension values
  const [suspensionData, setSuspensionData] = useState({
    FL: suspensionValues?.FL ?? 0,
    FR: suspensionValues?.FR ?? 0,
    RL: suspensionValues?.RL ?? 0,
    RR: suspensionValues?.RR ?? 0
  });
  
  // Extract settings with defaults
  const {
    dashboard: {
      updateInterval = 300,
      significantChangeThreshold = 0.5,
      useImperialUnits = false
    } = {},
    global: {
      enableTransitions = true,
      animationDuration = 300,
      enableHardwareAcceleration = true
    } = {},
    realTime: {
      enableSmoothing = true
    } = {}
  } = settings || {};
  
  // Animation settings
  const animationsEnabled = enableTransitions && animationDuration > 0;
  const animationEasing = enableSmoothing ? 'cubic-bezier(0.4, 0.0, 0.2, 1)' : 'ease';
  
  // Get current wheel value and position
  const currentValue = wheelFilter ? suspensionData[wheelFilter] || 0 : 0;
  const position = wheelFilter ? POSITION_NAMES[wheelFilter] || 'Unknown' : 'Unknown';
  
  // Calculate derived values efficiently
  const maxTravel = 50; // mm
  const travelDistance = (100 - currentValue) * (maxTravel / 100);
  const compressionPct = Math.max(0, Math.min(100 - currentValue, 60));
  
  // Get color based on value
  const getColor = (val) => {
    const value = Math.max(0, Math.min(val, 100));
    for (const item of COLOR_MAP) {
      if (value < item.threshold) return item.color;
    }
    return '#ff0000'; // Fallback
  };
  
  // Get status text based on value
  const getStatusText = (val) => {
    const value = Math.max(0, Math.min(val, 100));
    for (const item of STATUS_MAP) {
      if (value < item.threshold) return item.status;
    }
    return 'Max'; // Fallback
  };
  
  // Format measurement based on unit preference
  const formatMeasurement = (value, unit = 'mm') => {
    if (unit === 'mm' && useImperialUnits) {
      // Convert mm to inches
      const inches = value / 25.4;
      return `${inches.toFixed(2)}″`;
    }
    return `${value.toFixed(1)}${unit}`;
  };
  
  // Helper to check for significant changes
  const isSignificantChange = (oldVal, newVal) => {
    if (oldVal === 0 && newVal !== 0) return true;
    if (oldVal !== 0 && newVal === 0) return true;
    
    const percentChange = Math.abs((newVal - oldVal) / Math.max(oldVal, 0.1)) * 100;
    return percentChange >= significantChangeThreshold;
  };
  
  // Update data when suspensionValues changes
  useEffect(() => {
    if (!suspensionValues) return;
    
    // Skip first render to prevent unnecessary animation
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setSuspensionData({
        FL: suspensionValues.FL ?? 0,
        FR: suspensionValues.FR ?? 0,
        RL: suspensionValues.RL ?? 0,
        RR: suspensionValues.RR ?? 0
      });
      return;
    }
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    // Clear any existing timer
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    
    // Process update (throttled)
    const processUpdate = () => {
      setSuspensionData(prevData => {
        const newData = { ...prevData };
        let hasChanges = false;
        
        // Check each wheel position for significant changes
        ['FL', 'FR', 'RL', 'RR'].forEach(position => {
          if (suspensionValues[position] !== undefined && 
              isSignificantChange(prevData[position], suspensionValues[position])) {
            newData[position] = suspensionValues[position];
            hasChanges = true;
          }
        });
        
        return hasChanges ? newData : prevData;
      });
      
      lastUpdateTimeRef.current = Date.now();
    };
    
    // If enough time has passed, update immediately
    if (timeSinceLastUpdate >= updateInterval) {
      processUpdate();
    } else {
      // Otherwise, schedule update for later
      throttleTimerRef.current = setTimeout(
        processUpdate, 
        updateInterval - timeSinceLastUpdate
      );
    }
    
    // Cleanup on unmount
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
      }
    };
  }, [suspensionValues, updateInterval, significantChangeThreshold]);
  
  // Current styling values
  const color = getColor(currentValue);
  const status = getStatusText(currentValue);
  const formattedTravel = formatMeasurement(travelDistance, 'mm');
  
  // Font sizes with defaults
  const titleSize = '11px';
  const valueSize = '11px';
  const labelSize = '11px';
  
  // Create transition style only if animations are enabled
  const transitionStyle = animationsEnabled ? {
    transition: `all ${animationDuration}ms ${animationEasing}`,
    willChange: enableHardwareAcceleration ? 'transform, color, background-color, box-shadow' : 'auto'
  } : {};

  return (
    <Tooltip 
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontSize: titleSize, fontWeight: 600, mb: 0.25 }}>
            {position} Suspension
          </Typography>
          <Typography variant="body2" sx={{ fontSize: labelSize, lineHeight: 1.2 }}>
            Value: {currentValue.toFixed(1)}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: labelSize, lineHeight: 1.2 }}>
            Travel: {formattedTravel}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: labelSize, lineHeight: 1.2 }}>
            Compression: {compressionPct.toFixed(0)}%
          </Typography>
        </Box>
      } 
      arrow 
      placement="top" 
      leaveDelay={200}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: theme.shape.borderRadius / 4,
          py: 0.25,
          width: '100%',
          ...sx
        }}
      >
        {/* Icon + numeric value */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            gap: 0.5,
            mb: 0.25
          }}
        >
          <GiSpring
            size="1.5rem"
            color={color}
            style={{
              filter: `drop-shadow(0 1px 2px ${alpha(color, 0.5)})`,
              ...transitionStyle
            }}
            aria-hidden="true"
          />
          <Typography
            variant="body2"
            sx={{
              color,
              fontWeight: 700,
              fontSize: valueSize,
              lineHeight: 1,
              textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.3)}`,
              ...transitionStyle
            }}
          >
            {currentValue.toFixed(0)}
          </Typography>
        </Box>

        {/* Progress bar */}
        <Box
          sx={{
            width: '100%',
            height: 3,
            position: 'relative',
            background: alpha(theme.palette.background.paper, 0.15),
            borderRadius: theme.shape.borderRadius,
            overflow: 'hidden',
            mb: 0.25,
            boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.2)}`
          }}
          role="progressbar"
          aria-valuenow={Math.max(0, Math.min(currentValue, 100))}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(currentValue, 100))}
            sx={{
              height: '100%',
              borderRadius: theme.shape.borderRadius,
              backgroundColor: alpha(theme.palette.common.black, 0.05),
              '& .MuiLinearProgress-bar': {
                backgroundColor: color,
                borderRadius: theme.shape.borderRadius,
                backgroundImage: `linear-gradient(90deg, ${alpha(color, 0.7)} 0%, ${color} 50%, ${alpha(color, 0.7)} 100%)`,
                boxShadow: `0 0 4px ${color}`,
                ...transitionStyle
              }
            }}
          />
        </Box>

        {/* Status pill */}
        <Typography
          variant="caption"
          sx={{
            color: alpha(theme.palette.common.white, 1),
            fontSize: labelSize,
            fontWeight: 600,
            px: 0.75,
            py: 0,
            borderRadius: theme.shape.borderRadius / 2,
            background: color,
            boxShadow: `0 1px 3px ${alpha(color, 0.7)}`,
            textShadow: '0 1px 1px rgba(0,0,0,0.2)',
            letterSpacing: '0.5px',
            lineHeight: 1.5,
            ...transitionStyle
          }}
        >
          {status}
        </Typography>
      </Box>
    </Tooltip>
  );
};

CompactSuspensionOverlay.propTypes = {
  wheelFilter: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']),
  suspensionValues: PropTypes.shape({
    FL: PropTypes.number,
    FR: PropTypes.number,
    RL: PropTypes.number,
    RR: PropTypes.number,
  }),
  transformForCard: PropTypes.bool,
  compact: PropTypes.bool,
  sx: PropTypes.object,
  fontSizes: PropTypes.object,
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(CompactSuspensionOverlay);