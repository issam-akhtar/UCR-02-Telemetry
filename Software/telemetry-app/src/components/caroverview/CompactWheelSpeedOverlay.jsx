import React, { useReducer, useEffect, useRef, useContext } from 'react';
import { Box, Typography, alpha, useTheme, Tooltip } from '@mui/material';
import { GiCarWheel } from 'react-icons/gi';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Constants
const DEFAULT_TIRE_SIZE = 18.1;
const FREQUENCY_THRESHOLDS = { LOW: 10, MEDIUM: 20 };
const POSITIONS = {
  'FL': 'Front Left',
  'FR': 'Front Right',
  'RL': 'Rear Left',
  'RR': 'Rear Right'
};

// Action types for reducer - use strings for better debugging
const SET_WHEEL_SPEED = 'SET_WHEEL_SPEED';
const SET_ANIMATION_STATE = 'SET_ANIMATION_STATE';

// Initial state
const initialState = {
  wheelSpeeds: { FL: 0, FR: 0, RL: 0, RR: 0 },
  isAnimating: false
};

// Reducer function
function wheelSpeedReducer(state, action) {
  switch (action.type) {
    case SET_WHEEL_SPEED:
      return {
        ...state,
        wheelSpeeds: { ...state.wheelSpeeds, ...action.payload }
      };
    case SET_ANIMATION_STATE:
      return { 
        ...state, 
        isAnimating: action.payload 
      };
    default:
      return state;
  }
}

/**
 * High-Performance WheelSpeedOverlay Component
 * Shows real-time wheel speeds with animation and proper unit handling
 */
const WheelSpeedOverlay = ({
  wheelFilter = null,
  speedValues = null,
  tireSize = DEFAULT_TIRE_SIZE,
  sx = {}
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const isFirstRender = useRef(true);
  const animationTimerRef = useRef(null);
  const previousSpeedsRef = useRef({});

  // Use reducer for state management
  const [state, dispatch] = useReducer(wheelSpeedReducer, initialState);
  const { wheelSpeeds, isAnimating } = state;
  
  // Extract settings with fallbacks
  const {
    global: {
      enableTransitions = false,
      animationDuration = 300,
      enableHardwareAcceleration = false
    } = {},
    dashboard: {
      useImperialUnits = false,
      significantChangeThreshold = 1.0,
      updateInterval = 300
    } = {},
    realTime: {
      enableSmoothing = false
    } = {}
  } = settings || {};
  
  // Determine if animations are enabled
  const animationsEnabled = enableTransitions && animationDuration > 0;
  
  // Animation easing based on smoothing setting
  const animationEasing = enableSmoothing ? 'cubic-bezier(0.4, 0.0, 0.2, 1)' : 'ease';
  
  // Helper function to check if a change is significant
  const isSignificantChange = (oldVal, newVal) => {
    if (oldVal === 0 && newVal !== 0) return true;
    if (oldVal !== 0 && newVal === 0) return true;
    const percentChange = Math.abs((newVal - oldVal) / (oldVal || 1)) * 100;
    return percentChange >= significantChangeThreshold;
  };
  
  // Update state when speedValues change
  useEffect(() => {
    // Skip first render to prevent unnecessary animation
    if (isFirstRender.current) {
      isFirstRender.current = false;
      
      // Initialize with initial values if provided
      if (speedValues) {
        dispatch({ 
          type: SET_WHEEL_SPEED, 
          payload: {
            FL: speedValues.FL ?? 0,
            FR: speedValues.FR ?? 0,
            RL: speedValues.RL ?? 0,
            RR: speedValues.RR ?? 0
          }
        });
        
        // Store initial values
        previousSpeedsRef.current = {
          FL: speedValues.FL ?? 0,
          FR: speedValues.FR ?? 0,
          RL: speedValues.RL ?? 0,
          RR: speedValues.RR ?? 0
        };
      }
      return;
    }
    
    if (!speedValues) return;
    
    // Check for significant changes
    const updates = {};
    let hasSignificantChanges = false;
    
    ['FL', 'FR', 'RL', 'RR'].forEach(position => {
      if (speedValues[position] !== undefined && 
          speedValues[position] !== null && 
          isSignificantChange(previousSpeedsRef.current[position], speedValues[position])) {
        updates[position] = speedValues[position];
        previousSpeedsRef.current[position] = speedValues[position];
        hasSignificantChanges = true;
      }
    });
    
    if (hasSignificantChanges) {
      dispatch({ type: SET_WHEEL_SPEED, payload: updates });
      
      // Handle animation state
      if (animationsEnabled) {
        if (animationTimerRef.current) {
          clearTimeout(animationTimerRef.current);
        }
        
        dispatch({ type: SET_ANIMATION_STATE, payload: true });
        
        animationTimerRef.current = setTimeout(() => {
          dispatch({ type: SET_ANIMATION_STATE, payload: false });
          animationTimerRef.current = null;
        }, Math.max(500, animationDuration * 2));
      }
    }
  }, [speedValues, animationsEnabled, animationDuration, significantChangeThreshold]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationTimerRef.current) {
        clearTimeout(animationTimerRef.current);
      }
    };
  }, []);

  // Get current wheel data and calculate derived values
  const frequency = wheelFilter ? (wheelSpeeds[wheelFilter] || 0) : 0;
  const position = wheelFilter ? (POSITIONS[wheelFilter] || 'Unknown') : 'Unknown';
  
  // Calculate color based on frequency
  const color = frequency < FREQUENCY_THRESHOLDS.LOW ? theme.palette.success.main :
               frequency < FREQUENCY_THRESHOLDS.MEDIUM ? theme.palette.warning.main :
               theme.palette.error.main;
               
  // Calculate speed from frequency
  const wheelRadiusMeters = (tireSize * 0.0254) / 2;
  const circumference = 2 * Math.PI * wheelRadiusMeters;
  const speedKmh = frequency * circumference * 3.6;
  const speed = useImperialUnits ? speedKmh * 0.621371 : speedKmh;
  const speedUnit = useImperialUnits ? 'mph' : 'km/h';

  // Create animation style for wheel spinning
  const wheelAnimation = animationsEnabled && frequency > 0 ? 
    {
      animation: `spin ${Math.max(0.2, 1/(frequency * 0.2))}s linear infinite`,
      '@keyframes spin': {
        '0%': { transform: 'rotate(0deg)' },
        '100%': { transform: 'rotate(360deg)' }
      }
    } : {};
    
  // Create transition style only if animations are enabled
  const transitionStyle = animationsEnabled ? {
    transition: `all ${animationDuration}ms ${animationEasing}`,
    willChange: enableHardwareAcceleration ? 'transform, box-shadow, background-color' : 'auto'
  } : {};
  
  // Text transition style
  const textTransitionStyle = animationsEnabled ? {
    transition: `color ${animationDuration}ms ${animationEasing}`
  } : {};

  return (
    <Tooltip 
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontSize: '11px', fontWeight: 600, mb: 0.25 }}>
            {position} Wheel Speed
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
            Frequency: {frequency.toFixed(1)} Hz
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '11px', lineHeight: 1.2 }}>
            Speed: {speed.toFixed(1)} {speedUnit}
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
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: 'auto',
          minHeight: 24,
          py: 0.25,
          ...sx
        }}
        role="img"
        aria-label={`${position} wheel speed: ${speed.toFixed(0)} ${speedUnit}`}
      >
        {/* Wheel icon */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22, 
            borderRadius: '50%',
            backgroundColor: alpha(color, 0.15),
            boxShadow: `0 0 8px ${alpha(color, 0.3)}`,
            mr: 1,
            transform: isAnimating ? 'scale(1.1)' : 'scale(1)',
            ...transitionStyle
          }}
        >
          <GiCarWheel 
            size="1.5rem"
            color={color} 
            style={{
              filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))',
              willChange: enableHardwareAcceleration ? 'transform' : 'auto',
              ...wheelAnimation
            }}
            aria-hidden="true"
          />
        </Box>
        
        {/* Speed values */}
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography 
            variant="body2" 
            sx={{
              color,
              fontWeight: 700,
              fontSize: '11px',
              lineHeight: 1.1,
              letterSpacing: '0.3px',
              textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.3)}`,
              ...textTransitionStyle
            }}
          >
            {frequency.toFixed(1)} Hz
          </Typography>
          
          <Typography 
            variant="caption" 
            sx={{
              color: alpha(theme.palette.text.primary, 0.9),
              fontSize: '11px',
              lineHeight: 1.1,
              fontWeight: 500
            }}
          >
            {speed.toFixed(0)} {speedUnit}
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );
};

WheelSpeedOverlay.propTypes = {
  wheelFilter: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']),
  speedValues: PropTypes.shape({
    FL: PropTypes.number,
    FR: PropTypes.number,
    RL: PropTypes.number,
    RR: PropTypes.number,
  }),
  tireSize: PropTypes.number,
  sx: PropTypes.object
};

export default React.memo(WheelSpeedOverlay);