import React, { useReducer, useEffect, useContext, useRef } from 'react';
import { Box, Typography, Paper, alpha, useTheme, Grid } from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';
import useResizeObserver from 'use-resize-observer';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Action types for reducer
const SET_MULTIPLE = 'SET_MULTIPLE';

// Initial state for vehicle dynamics
const initialState = {
  rollAngle: 0,
  pitchAngle: 0,
  verticalVelocity: 0,
  heading: 0,
  speed: 0
};

// Thresholds for gauges - defined outside to avoid recreation
const THRESHOLDS = {
  ROLL: { MODERATE: 15, HIGH: 30 },
  PITCH: { MODERATE: 15, HIGH: 30 },
  VERTICAL_VELOCITY: { MODERATE: 1, HIGH: 3 },
  SPEED: { MODERATE: 50, HIGH: 100 }
};

// Compass directions - defined outside to avoid recreation
const COMPASS_DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const CARDINAL_DIRECTIONS = ['N', 'E', 'S', 'W'];

// Simple reducer for efficient state updates
function dynamicsReducer(state, action) {
  switch (action.type) {
    case SET_MULTIPLE:
      return { ...state, ...action.payload };
    default:
      return state;
  }
}

/**
 * High-Performance VehicleDynamicsPanel Component
 * 
 * Displays vehicle dynamic data with optimized rendering and state management
 */
const VehicleDynamicsPanel = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref, width: containerWidth = 400 } = useResizeObserver();
  
  // Use reducer for state management
  const [state, dispatch] = useReducer(dynamicsReducer, initialState);
  const { rollAngle, pitchAngle, verticalVelocity, heading, speed } = state;
  
  // Extract the settings we need with defaults
  const {
    global: {
      enableTransitions = false,
      animationDuration = 300,
      enableHardwareAcceleration = false
    } = {},
    dashboard: {
      useImperialUnits = false,
      significantChangeThreshold = 1.0
    } = {},
    realTime: {
      enableSmoothing = false
    } = {}
  } = settings || {};
  
  // Calculate animation settings once
  const animationsEnabled = enableTransitions && animationDuration > 0;
  const animationEasing = enableSmoothing ? 'cubic-bezier(0.4, 0.0, 0.2, 1)' : 'ease-out';
  
  // Calculate base font size from container width
  const baseScale = Math.max(0.8, Math.min(1.2, containerWidth / 800));
  const fontSizes = {
    label: `${0.65 * baseScale}rem`,
    value: `${0.75 * baseScale}rem`,
    speed: `${1.3 * baseScale}rem`
  };
  
  // Format speed based on unit settings
  const formattedSpeed = useImperialUnits 
    ? (speed * 0.621371).toFixed(1) 
    : speed.toFixed(1);
  const speedUnit = useImperialUnits ? 'mph' : 'km/h';
  
  // Format measurement values based on unit preference
  const formatMeasurement = (value) => {
    if (useImperialUnits) {
      // Convert m/s to ft/s
      const ftPerSec = value * 3.28084;
      return `${ftPerSec.toFixed(1)} ft/s`;
    }
    return `${value.toFixed(1)} m/s`;
  };
  
  // Process incoming IMU data
  const handleImuData = (msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields || msg || {};
      const updates = {};
      let hasChanges = false;
      
      // Helper to check for significant changes
      const isSignificantChange = (oldVal, newVal) => {
        if (oldVal === 0 && newVal !== 0) return true;
        if (oldVal !== 0 && newVal === 0) return true;
        const percentChange = Math.abs((newVal - oldVal) / (oldVal || 1)) * 100;
        return percentChange >= significantChangeThreshold;
      };
      
      // Process roll data
      if (fields.roll !== undefined) {
        const newValue = fields.roll?.numberValue || 0;
        if (isSignificantChange(rollAngle, newValue)) {
          updates.rollAngle = newValue;
          hasChanges = true;
        }
      }
      
      // Process pitch data
      if (fields.pitch !== undefined) {
        const newValue = fields.pitch?.numberValue || 0;
        if (isSignificantChange(pitchAngle, newValue)) {
          updates.pitchAngle = newValue;
          hasChanges = true;
        }
      }
      
      // Process vertical velocity data
      if (fields.down_vel !== undefined) {
        const newValue = fields.down_vel?.numberValue || 0;
        if (isSignificantChange(verticalVelocity, newValue)) {
          updates.verticalVelocity = newValue;
          hasChanges = true;
        }
      }
      
      // Process velocity data for speed and heading
      if (fields.north_vel !== undefined && fields.east_vel !== undefined) {
        const northVel = fields.north_vel?.numberValue || 0;
        const eastVel = fields.east_vel?.numberValue || 0;
        
        // Calculate ground speed and heading
        const groundSpeedMs = Math.sqrt(northVel ** 2 + eastVel ** 2);
        const groundSpeedKmh = groundSpeedMs * 3.6;
        
        if (isSignificantChange(speed, groundSpeedKmh)) {
          updates.speed = groundSpeedKmh;
          hasChanges = true;
        }
        
        // Calculate heading angle
        const headingRad = Math.atan2(eastVel, northVel);
        const headingDeg = (headingRad * (180 / Math.PI) + 360) % 360;
        
        if (isSignificantChange(heading, headingDeg)) {
          updates.heading = headingDeg;
          hasChanges = true;
        }
      }
      
      // Only dispatch if there are significant changes
      if (hasChanges) {
        dispatch({ type: SET_MULTIPLE, payload: updates });
      }
    } catch (error) {
      console.error("Error processing IMU data:", error);
    }
  };
  
  // Subscribe to IMU data
  const { ref: dataRef } = useRealTimeData('ins_imu', handleImuData, {
    pauseOnHidden: false
  });
  
  // Combine refs
  const combinedRef = (node) => {
    ref(node);
    if (dataRef && typeof dataRef === 'function') {
      dataRef(node);
    }
  };
  
  // Create transition style only if animations are enabled
  const transitionStyle = animationsEnabled ? {
    transition: `all ${animationDuration}ms ${animationEasing}`,
    willChange: enableHardwareAcceleration ? 'left, box-shadow, color, transform' : 'auto'
  } : {};
  
  // Helper function to get color based on value and thresholds
  const getColorByThreshold = (value, thresholds) => {
    if (Math.abs(value) > thresholds.HIGH) return theme.palette.error.main;
    if (Math.abs(value) > thresholds.MODERATE) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  // Create a gauge component for roll, pitch, and vertical velocity
  const renderGauge = (value, maxValue, thresholds) => {
    const clampedValue = Math.max(-maxValue, Math.min(maxValue, value));
    const gaugePercent = ((clampedValue + maxValue) / (2 * maxValue)) * 100;
    const color = getColorByThreshold(value, thresholds);
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Track */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: alpha(theme.palette.common.white, 0.15),
          borderRadius: theme.shape.borderRadius / 4,
          transform: 'translateY(-50%)'
        }} />
        
        {/* Indicator */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: `${gaugePercent}%`,
          width: 8,
          height: 8,
          backgroundColor: color,
          borderRadius: '50%',
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 4px ${color}`,
          ...transitionStyle
        }} />
        
        {/* Center line */}
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 2,
          height: 8,
          backgroundColor: alpha(theme.palette.common.white, 0.4),
          transform: 'translate(-50%, -50%)'
        }} />
        
        {/* Min/max labels */}
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            left: 0,
            color: alpha(theme.palette.common.white, 0.5), 
            fontSize: fontSizes.label 
          }}
        >
          -{maxValue}°
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            right: 0,
            color: alpha(theme.palette.common.white, 0.5), 
            fontSize: fontSizes.label 
          }}
        >
          +{maxValue}°
        </Typography>
      </Box>
    );
  };

  // Render compass heading
  const renderCompass = () => {
    const index = Math.round(heading / 45) % 8;
    const compassDir = COMPASS_DIRECTIONS[index];
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%', textAlign: 'center' }}>
        <Box sx={{
          width: { xs: 30, sm: 36 },
          height: { xs: 30, sm: 36 },
          margin: '0 auto',
          borderRadius: '50%',
          border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {/* Arrow */}
          <Box sx={{
            position: 'absolute',
            width: 2,
            height: 14,
            backgroundColor: theme.palette.warning.main,
            transform: `rotate(${heading}deg)`,
            transformOrigin: 'center bottom',
            bottom: '50%',
            ...transitionStyle
          }} />
          
          {/* Center dot */}
          <Box sx={{
            width: 4,
            height: 4,
            borderRadius: '50%',
            backgroundColor: theme.palette.warning.main
          }} />
          
          {/* Cardinal direction markers */}
          {CARDINAL_DIRECTIONS.map((dir) => {
            const dirStyle = {
              position: 'absolute',
              top: dir === 'S' ? 'auto' : dir === 'N' ? -12 : '50%',
              bottom: dir === 'S' ? -12 : 'auto',
              left: dir === 'W' ? -12 : dir === 'E' ? 'auto' : '50%',
              right: dir === 'E' ? -12 : 'auto',
              transform: (dir === 'E' || dir === 'W') ? 'translateY(-50%)' : 'translateX(-50%)',
              color: alpha(theme.palette.common.white, 0.7),
              fontSize: fontSizes.label
            };
            
            return (
              <Typography key={dir} variant="caption" sx={dirStyle}>
                {dir}
              </Typography>
            );
          })}
        </Box>
        
        {/* Direction text */}
        <Typography 
          variant="caption" 
          sx={{ 
            marginTop: 1, 
            display: 'block', 
            fontSize: fontSizes.label 
          }}
        >
          {compassDir} • {heading.toFixed(0)}°
        </Typography>
      </Box>
    );
  };

  // Render speed display
  const renderSpeed = () => {
    const speedColor = speed > THRESHOLDS.SPEED.HIGH ? theme.palette.error.main :
                      speed > THRESHOLDS.SPEED.MODERATE ? theme.palette.warning.main :
                      theme.palette.success.main;
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%', textAlign: 'center' }}>
        <Typography 
          variant="h6" 
          sx={{
            fontSize: fontSizes.speed,
            fontWeight: 'bold',
            color: speedColor,
            lineHeight: 1.1,
            ...transitionStyle
          }}
        >
          {formattedSpeed}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{
            color: alpha(theme.palette.common.white, 0.7), 
            fontSize: fontSizes.label
          }}
        >
          {speedUnit}
        </Typography>
      </Box>
    );
  };

  // Common section styles
  const sectionLabelStyle = {
    color: theme.palette.common.white,
    opacity: 0.8,
    fontSize: fontSizes.label,
    mb: 0.5,
    display: 'block'
  };
  
  const valueTextStyle = {
    color: theme.palette.common.white,
    fontSize: fontSizes.value
  };

  return (
    <Paper 
      ref={combinedRef} 
      sx={{
        backgroundColor: alpha(theme.palette.background.paper, 0.15),
        backdropFilter: 'blur(10px)',
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        padding: { xs: 1, sm: 1.5 },
        paddingTop: 1,
        width: '100%',
        overflow: 'hidden',
        boxShadow: theme.shadows[4]
      }}
    >
      <Typography 
        variant="subtitle2" 
        sx={{
          color: theme.palette.primary.main,
          fontWeight: 'bold',
          mb: 1,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: fontSizes.label,
          textAlign: 'center'
        }}
      >
        Vehicle Dynamics
      </Typography>
      
      <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">
        {/* Roll */}
        <Grid item xs={4} sm={2.4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={sectionLabelStyle}>
              ROLL
            </Typography>
            <Box sx={{ height: 20, mb: 0.5 }}>
              {renderGauge(rollAngle, 45, THRESHOLDS.ROLL)}
            </Box>
            <Typography variant="body2" sx={valueTextStyle}>
              {rollAngle.toFixed(1)}°
            </Typography>
          </Box>
        </Grid>
        
        {/* Pitch */}
        <Grid item xs={4} sm={2.4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={sectionLabelStyle}>
              PITCH
            </Typography>
            <Box sx={{ height: 20, mb: 0.5 }}>
              {renderGauge(pitchAngle, 45, THRESHOLDS.PITCH)}
            </Box>
            <Typography variant="body2" sx={valueTextStyle}>
              {pitchAngle.toFixed(1)}°
            </Typography>
          </Box>
        </Grid>
        
        {/* Vertical Velocity */}
        <Grid item xs={4} sm={2.4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={sectionLabelStyle}>
              V-VEL
            </Typography>
            <Box sx={{ height: 20, mb: 0.5 }}>
              {renderGauge(verticalVelocity, 5, THRESHOLDS.VERTICAL_VELOCITY)}
            </Box>
            <Typography variant="body2" sx={valueTextStyle}>
              {formatMeasurement(verticalVelocity)}
            </Typography>
          </Box>
        </Grid>
        
        {/* Direction */}
        <Grid item xs={6} sm={2.4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={sectionLabelStyle}>
              DIRECTION
            </Typography>
            {renderCompass()}
          </Box>
        </Grid>
        
        {/* Speed */}
        <Grid item xs={6} sm={2.4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={sectionLabelStyle}>
              SPEED
            </Typography>
            {renderSpeed()}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default React.memo(VehicleDynamicsPanel);