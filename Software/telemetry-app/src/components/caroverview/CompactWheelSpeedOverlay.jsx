import React, { useState, useEffect, useCallback, useRef, useContext, useMemo } from 'react';
import { Box, Typography, alpha, useTheme, Tooltip } from '@mui/material';
import { GiCarWheel } from 'react-icons/gi';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

const DEFAULT_TIRE_SIZE = 18.1;

// Define and export frequency thresholds
export const FREQUENCY_THRESHOLDS = { 
  LOW: 10, 
  MEDIUM: 20 
};

/**
 * Enhanced Wheel Speed Overlay - More compact with better readability
 */
export default function CompactWheelSpeedOverlay({ 
  wheelFilter = null, 
  speedValues = null, 
  transformForCard = false,
  tireSize = DEFAULT_TIRE_SIZE, 
  sx = {},
  fontSizes = {}
}) {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const isFirstRender = useRef(true);
  
  // Animation settings based on context
  const animationsEnabled = useMemo(() => 
    settings.global.animationDuration > 0 && settings.global.enableTransitions,
  [settings.global.animationDuration, settings.global.enableTransitions]);

  const animationDuration = useMemo(() => 
    `${settings.global.animationDuration}ms`,
  [settings.global.animationDuration]);
  
  // Determine whether to use imperial units
  const useImperialUnits = useMemo(() => 
    settings.dashboard.useImperialUnits,
  [settings.dashboard.useImperialUnits]);
  
  const [frontLeft, setFrontLeft] = useState(speedValues?.FL ?? 0);
  const [frontRight, setFrontRight] = useState(speedValues?.FR ?? 0);
  const [rearLeft, setRearLeft] = useState(speedValues?.RL ?? 0);
  const [rearRight, setRearRight] = useState(speedValues?.RR ?? 0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation for wheel changes - only if animations are enabled
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    // Trigger animation on significant changes only if animations are enabled
    if (animationsEnabled) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 
        Math.max(500, settings.global.animationDuration * 2));
      
      return () => clearTimeout(timer);
    }
  }, [frontLeft, frontRight, rearLeft, rearRight, animationsEnabled, settings.global.animationDuration]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (speedValues) {
      // Function to check if change is significant
      const isSignificantChange = (oldVal, newVal) => {
        if (oldVal === 0 && newVal !== 0) return true;
        if (oldVal !== 0 && newVal === 0) return true;
        
        const percentChange = Math.abs((newVal - oldVal) / oldVal) * 100;
        return percentChange >= settings.dashboard.significantChangeThreshold;
      };
      
      if (speedValues.FL !== undefined && speedValues.FL !== null && 
          isSignificantChange(frontLeft, speedValues.FL)) {
        setFrontLeft(speedValues.FL);
      }
      
      if (speedValues.FR !== undefined && speedValues.FR !== null && 
          isSignificantChange(frontRight, speedValues.FR)) {
        setFrontRight(speedValues.FR);
      }
      
      if (speedValues.RL !== undefined && speedValues.RL !== null && 
          isSignificantChange(rearLeft, speedValues.RL)) {
        setRearLeft(speedValues.RL);
      }
      
      if (speedValues.RR !== undefined && speedValues.RR !== null && 
          isSignificantChange(rearRight, speedValues.RR)) {
        setRearRight(speedValues.RR);
      }
    }
  }, [speedValues, wheelFilter, settings.dashboard.significantChangeThreshold, 
      frontLeft, frontRight, rearLeft, rearRight]);

  // Apply update interval for throttling
  useEffect(() => {
    if (settings.dashboard.updateInterval > 0) {
      const timer = setInterval(() => {
        // This would refresh data at specified intervals if needed
      }, settings.dashboard.updateInterval);
      
      return () => clearInterval(timer);
    }
  }, [settings.dashboard.updateInterval]);

  const getFrequencyColor = useCallback((freq) => {
    if (freq < FREQUENCY_THRESHOLDS.LOW) return theme.palette.success.main;
    if (freq < FREQUENCY_THRESHOLDS.MEDIUM) return theme.palette.warning.main;
    return theme.palette.error.main;
  }, [theme]);

  // Enhanced rotation style for wheel icon - with animation controls
  const getRotationStyle = useCallback((freq) => {
    // If animations are disabled, don't animate
    if (!animationsEnabled) {
      return { 
        filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.3))`,
      };
    }
    
    const rotationSpeed = Math.min(freq * 0.2, 5);
    return { 
      animation: freq > 0 ? `spin ${1/rotationSpeed}s linear infinite` : 'none',
      filter: `drop-shadow(0 1px 2px rgba(0,0,0,0.3))`, // Added shadow for better visibility
      willChange: settings.global.enableHardwareAcceleration ? 'transform' : 'auto',
      '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
      }
    };
  }, [animationsEnabled, settings.global.enableHardwareAcceleration]);

  const frequencyToSpeed = useCallback((freq) => {
    const currentTireSize = tireSize || DEFAULT_TIRE_SIZE;
    const wheelRadiusMeters = (currentTireSize * 0.0254) / 2;
    const circumference = 2 * Math.PI * wheelRadiusMeters;
    const speedKmh = freq * circumference * 3.6;
    
    // Convert to mph if using imperial units
    return useImperialUnits ? speedKmh * 0.621371 : speedKmh;
  }, [tireSize, useImperialUnits]);

  // Speed unit display
  const speedUnit = useMemo(() => 
    useImperialUnits ? 'mph' : 'km/h',
  [useImperialUnits]);

  let frequency = 0;
  let position = '';
  
  switch (wheelFilter) {
    case 'FL':
      frequency = frontLeft;
      position = 'Front Left';
      break;
    case 'FR':
      frequency = frontRight;
      position = 'Front Right';
      break;
    case 'RL':
      frequency = rearLeft;
      position = 'Rear Left';
      break;
    case 'RR':
      frequency = rearRight;
      position = 'Rear Right';
      break;
    default:
      frequency = 0;
      position = 'Unknown';
      break;
  }

  const color = getFrequencyColor(frequency);
  const speedCalculated = frequencyToSpeed(frequency);

  // Custom font sizes - slightly larger for better readability
  const titleSize = '12px';
  const valueSize = '12px';
  const labelSize = '12px';

  // Enhanced tooltip
  const tooltipContent = (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="subtitle2" sx={{ fontSize: titleSize, fontWeight: 600, mb: 0.25 }}>
        {position} Wheel Speed
      </Typography>
      <Typography variant="body2" sx={{ fontSize: labelSize, lineHeight: 1.2 }}>
        Frequency: {frequency.toFixed(1)} Hz
      </Typography>
      <Typography variant="body2" sx={{ fontSize: labelSize, lineHeight: 1.2 }}>
        Speed: {speedCalculated.toFixed(1)} {speedUnit}
      </Typography>
    </Box>
  );

  return (
    <Tooltip 
      title={tooltipContent}
      arrow
      placement="top"
      leaveDelay={200}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: 'auto',
          minHeight: 24,
          py: 0.25, // Minimal padding
          ...sx,
        }}
        role="img"
        aria-label={`${position} wheel speed: ${speedCalculated.toFixed(0)} ${speedUnit}`}
      >
        {/* Simplified horizontal layout for better compactness */}
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 22,
          height: 22, 
          borderRadius: '50%',
          backgroundColor: alpha(color, 0.15),
          boxShadow: `0 0 8px ${alpha(color, 0.3)}`,
          mr: 1, // Right margin
          transition: animationsEnabled ? `all ${animationDuration} ease` : 'none',
          transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
          willChange: settings.global.enableHardwareAcceleration ? 'transform, box-shadow, background-color' : 'auto',
        }}>
          <GiCarWheel 
            size="1.5rem" // Slightly larger icon for better visibility  
            color={color} 
            style={getRotationStyle(frequency)} 
            aria-hidden="true"
          />
        </Box>
        
        {/* Enhanced value display */}
        <Box sx={{
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}>
          <Typography
            variant="body2"
            sx={{
              color,
              fontWeight: 700, // Bolder for better readability
              fontSize: '12px',
              lineHeight: 1.1,
              letterSpacing: '0.3px',
              textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.3)}`, // Text shadow
              transition: animationsEnabled ? `color ${animationDuration} ease` : 'none',
              willChange: settings.global.enableHardwareAcceleration ? 'color' : 'auto',
            }}
          >
            {frequency.toFixed(1)} Hz
          </Typography>
          
          <Typography
            variant="caption"
            sx={{
              color: alpha(theme.palette.text.primary, 0.9), // Better contrast
              fontSize: '12px',
              lineHeight: 1.1,
              fontWeight: 500, // Semi-bold
            }}
          >
            {speedCalculated.toFixed(0)} {speedUnit}
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );
}

CompactWheelSpeedOverlay.propTypes = {
  wheelFilter: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']),
  speedValues: PropTypes.shape({
    FL: PropTypes.number,
    FR: PropTypes.number,
    RL: PropTypes.number,
    RR: PropTypes.number,
  }),
  transformForCard: PropTypes.bool,
  tireSize: PropTypes.number,
  sx: PropTypes.object,
  fontSizes: PropTypes.object
};