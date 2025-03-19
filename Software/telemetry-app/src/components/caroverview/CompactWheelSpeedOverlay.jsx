import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, alpha, useTheme, Tooltip } from '@mui/material';
import { GiCarWheel } from 'react-icons/gi';
import useRealTimeData from '../../hooks/useRealTimeData';
import PropTypes from 'prop-types';

// Default tire size if not provided (in inches)
const DEFAULT_TIRE_SIZE = 18.1;

/**
 * CompactWheelSpeedOverlay Component
 * 
 * Displays wheel speed information optimized for the wheel card display.
 * Calculates speed based on the actual wheel size (18.1 inches by default).
 */
export default function CompactWheelSpeedOverlay({ 
  wheelFilter = null, 
  speedValues = null, 
  transformForCard = false,
  tireSize = DEFAULT_TIRE_SIZE, 
  sx = {}
}) {
  const theme = useTheme();
  const isFirstRender = useRef(true);
  
  // Initialize with meaningful defaults that won't cause visual jumps
  const [frontLeft, setFrontLeft] = useState(speedValues?.FL ?? 10);
  const [frontRight, setFrontRight] = useState(speedValues?.FR ?? 10);
  const [rearLeft, setRearLeft] = useState(speedValues?.RL ?? 10);
  const [rearRight, setRearRight] = useState(speedValues?.RR ?? 10);
  
  // For wheel animation - separate from actual data
  const [wheelRotation, setWheelRotation] = useState(0);
  
  // Constants for frequency thresholds
  const FREQUENCY_THRESHOLDS = {
    LOW: 10,
    MEDIUM: 20
  };

  // Handler for front_frequency data - matches processdata.go's processFrontFrequencyData
  const handleFrequencyData = useCallback((msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields || {};
      
      // Only update state if we have actual values
      const fl = fields.front_left?.numberValue;
      const fr = fields.front_right?.numberValue;
      const rl = fields.rear_left?.numberValue;
      const rr = fields.rear_right?.numberValue;
      
      // Update only if the value is defined and not null
      if (fl !== undefined && fl !== null) setFrontLeft(fl);
      if (fr !== undefined && fr !== null) setFrontRight(fr);
      if (rl !== undefined && rl !== null) setRearLeft(rl);
      if (rr !== undefined && rr !== null) setRearRight(rr);
    } catch (error) {
      console.error("Error processing wheel frequency data:", error);
    }
  }, []);
  
  // Subscribe to real-time data if speedValues is not provided
  useRealTimeData(speedValues ? null : 'front_frequency', handleFrequencyData);
  
  // Update state when speedValues prop changes - only update defined values
  useEffect(() => {
    // Skip the first render to prevent resetting to props default
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (speedValues) {
      if (speedValues.FL !== undefined && speedValues.FL !== null) 
        setFrontLeft(speedValues.FL);
      if (speedValues.FR !== undefined && speedValues.FR !== null) 
        setFrontRight(speedValues.FR);
      if (speedValues.RL !== undefined && speedValues.RL !== null) 
        setRearLeft(speedValues.RL);
      if (speedValues.RR !== undefined && speedValues.RR !== null) 
        setRearRight(speedValues.RR);
    }
  }, [speedValues]);
  
  // Animation for wheel icons - more efficient with requestAnimationFrame
  useEffect(() => {
    let animationFrameId;
    let lastTimestamp = 0;
    const rotationSpeed = 50; // ms per 10 degrees
    
    const animate = (timestamp) => {
      if (!lastTimestamp || timestamp - lastTimestamp >= rotationSpeed) {
        setWheelRotation(prev => (prev + 10) % 360);
        lastTimestamp = timestamp;
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animationFrameId = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);
  
  // Color coding based on frequency
  const getFrequencyColor = (freq) => {
    if (freq < FREQUENCY_THRESHOLDS.LOW) return theme.palette.success.main;
    if (freq < FREQUENCY_THRESHOLDS.MEDIUM) return theme.palette.warning.main;
    return theme.palette.error.main;
  };
  
  // Calculate rotation speed based on frequency - optimized to not cause jank
  const getRotationStyle = (freq) => {
    const baseRotation = wheelRotation;
    const speedFactor = Math.min(Math.max(1, freq * 2), 20); // Minimum factor of 1, max of 20
    
    return {
      transform: `rotate(${baseRotation * speedFactor}deg)`,
      transition: 'transform 0.1s linear'
    };
  };
  
  // Calculate speed in km/h based on the provided tire size
  const frequencyToSpeed = (freq) => {
    // Use the component prop 'tireSize', not a global variable
    const currentTireSize = tireSize || DEFAULT_TIRE_SIZE;
    // Convert tire size from inches to meters for the radius
    const wheelRadiusMeters = (currentTireSize * 0.0254) / 2;
    const circumference = 2 * Math.PI * wheelRadiusMeters;
    const speed = freq * circumference * 3.6; // in km/h
    return speed;
  };

  // Determine which value to display based on wheelFilter
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
      frequency = 10; // Meaningful default
      position = 'Unknown';
      break;
  }

  const color = getFrequencyColor(frequency);
  const speed = frequencyToSpeed(frequency);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        ...sx
      }}
    >
      <Tooltip 
        title={
          <Box sx={{ p: 0.5 }}>
            <Typography variant="subtitle2">{position} Wheel Speed</Typography>
            <Typography variant="body2">Frequency: {frequency.toFixed(2)} Hz</Typography>
            <Typography variant="body2">Speed: {speed.toFixed(1)} km/h</Typography>
            <Typography variant="body2" sx={{ fontSize: '0.7rem', mt: 0.5, opacity: 0.8 }}>
              Calculated from {tireSize}" wheel diameter
            </Typography>
          </Box>
        }
        arrow
        placement="top"
        enterDelay={300}
        leaveDelay={200}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            // Important for tooltips
            pointerEvents: 'auto',
          }}
          role="img"
          aria-label={`${position} wheel speed: ${speed.toFixed(0)} km/h`}
        >
          <GiCarWheel 
            size="0.9rem" 
            color={color} 
            style={getRotationStyle(frequency)} 
            aria-hidden="true"
          />
          
          <Typography
            variant="body2"
            sx={{
              color: color,
              fontWeight: 'bold',
              fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
              lineHeight: 1,
              mt: 0.25,
              userSelect: 'none'
            }}
          >
            {frequency.toFixed(1)} Hz
          </Typography>
          
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.grey[400],
              fontSize: { xs: '0.5rem', sm: '0.55rem', md: '0.6rem' },
              userSelect: 'none'
            }}
          >
            {speed.toFixed(0)} km/h
          </Typography>
        </Box>
      </Tooltip>
    </Box>
  );
}

CompactWheelSpeedOverlay.propTypes = {
  wheelFilter: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']),
  speedValues: PropTypes.shape({
    FL: PropTypes.number,
    FR: PropTypes.number,
    RL: PropTypes.number,
    RR: PropTypes.number
  }),
  transformForCard: PropTypes.bool,
  tireSize: PropTypes.number,
  sx: PropTypes.object
};