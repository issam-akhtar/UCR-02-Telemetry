import React, { useState, useEffect, useRef, useContext } from 'react';
import { Box, Typography, useTheme, alpha, Tooltip } from '@mui/material';
import { MdOutlineCompress } from 'react-icons/md';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Define strain thresholds as constants outside the component
export const STRAIN_THRESHOLDS = { 
  MODERATE: 40, 
  HIGH: 80 
};

// Position mapping
const POSITION_NAMES = {
  'FL': 'Front Left',
  'FR': 'Front Right',
  'RL': 'Rear Left',
  'RR': 'Rear Right'
};

/**
 * High-Performance CompactChassisStrainOverlay
 * Displays chassis strain data with optimized animations and visual effects
 */
const CompactChassisStrainOverlay = ({
  wheelFilter = null,
  strainValues = null,
  transformForCard = false,
  sx = {},
  fontSizes = {}
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const isFirstRender = useRef(true);
  
  // Refs for throttling and animation
  const throttleTimerRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const prevStrainRef = useRef(null);
  const activeTimerRef = useRef(null);
  const pulseTimerRef = useRef(null);
  
  // Animation states
  const [isActive, setIsActive] = useState(false);
  const [pulseCount, setPulseCount] = useState(0);
  
  // Strain data state
  const [strainData, setStrainData] = useState({
    FL: strainValues?.FL ?? 0,
    FR: strainValues?.FR ?? 0,
    RL: strainValues?.RL ?? 0,
    RR: strainValues?.RR ?? 0
  });
  
  // Extract settings with defaults
  const {
    dashboard: {
      updateInterval = 300,
      significantChangeThreshold = 0.5
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
  const pulseAnimationDuration = Math.max(300, animationDuration);
  const activeStateDuration = Math.max(1000, animationDuration * 4);
  
  // Get current strain value for the selected wheel
  const currentStrain = wheelFilter ? strainData[wheelFilter] || 0 : 0;
  const positionName = wheelFilter ? POSITION_NAMES[wheelFilter] || 'Unknown' : 'Unknown';
  
  // Calculate color and status based on strain value
  const strainColor = currentStrain > STRAIN_THRESHOLDS.HIGH ? theme.palette.error.main :
                     currentStrain > STRAIN_THRESHOLDS.MODERATE ? theme.palette.warning.main :
                     theme.palette.success.main;
                     
  const strainStatus = currentStrain > STRAIN_THRESHOLDS.HIGH ? "High" :
                      currentStrain > STRAIN_THRESHOLDS.MODERATE ? "Medium" :
                      "Normal";
  
  // Helper function to check if a change is significant
  const isSignificantChange = (oldVal, newVal) => {
    if (oldVal === 0 && newVal !== 0) return true;
    if (oldVal !== 0 && newVal === 0) return true;
    
    const percentChange = Math.abs((newVal - oldVal) / Math.max(oldVal, 0.1)) * 100;
    return percentChange >= significantChangeThreshold;
  };
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      [throttleTimerRef, activeTimerRef, pulseTimerRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
          ref.current = null;
        }
      });
    };
  }, []);

  // Update state when strainValues prop changes
  useEffect(() => {
    if (!strainValues) return;
    
    // Skip first render to prevent unnecessary state reset
    if (isFirstRender.current) {
      isFirstRender.current = false;
      
      setStrainData({
        FL: strainValues.FL ?? 0,
        FR: strainValues.FR ?? 0,
        RL: strainValues.RL ?? 0,
        RR: strainValues.RR ?? 0
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
    
    // Process update function
    const processUpdate = () => {
      setStrainData(prevData => {
        const newData = { ...prevData };
        let hasChanges = false;
        
        // Check each wheel position for significant changes
        ['FL', 'FR', 'RL', 'RR'].forEach(position => {
          if (strainValues[position] !== undefined && 
              isSignificantChange(prevData[position], strainValues[position])) {
            newData[position] = strainValues[position];
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
  }, [strainValues, updateInterval, significantChangeThreshold]);

  // Trigger animation effects on significant changes
  useEffect(() => {
    // Set initial value for reference if not set
    if (prevStrainRef.current === null) {
      prevStrainRef.current = currentStrain;
      return;
    }
    
    // Only trigger animation if there's a significant change
    if (isSignificantChange(prevStrainRef.current, currentStrain)) {
      if (animationsEnabled) {
        // Clear any existing timers
        if (activeTimerRef.current) {
          clearTimeout(activeTimerRef.current);
          activeTimerRef.current = null;
        }
        
        // Set active state and pulse count
        setIsActive(true);
        setPulseCount(3);
        
        // Set timer to turn off active state
        activeTimerRef.current = setTimeout(() => {
          setIsActive(false);
          setPulseCount(0);
          activeTimerRef.current = null;
        }, activeStateDuration);
      }
      
      // Update previous value
      prevStrainRef.current = currentStrain;
    }
  }, [currentStrain, animationsEnabled, activeStateDuration]);

  // Handle pulse animation countdown
  useEffect(() => {
    // Clear any existing pulse timer
    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current);
      pulseTimerRef.current = null;
    }
    
    // Set new timer if needed
    if (pulseCount > 0 && animationsEnabled) {
      pulseTimerRef.current = setTimeout(() => {
        setPulseCount(prev => prev - 1);
        pulseTimerRef.current = null;
      }, pulseAnimationDuration);
    }
  }, [pulseCount, animationsEnabled, pulseAnimationDuration]);

  // Font sizes
  const titleSize = '11px';
  const valueSize = '11px';
  const labelSize = '11px';
  
  // Create animation styles only if animations are enabled
  const animationStyles = animationsEnabled ? {
    '@keyframes ripple': {
      '0%': { opacity: 0.5, transform: 'scale(1)' },
      '100%': { opacity: 0, transform: 'scale(1.8)' }
    },
    '@keyframes pulse': {
      '0%': { opacity: 0.7, transform: 'scale(1)' },
      '50%': { opacity: 1, transform: 'scale(1.1)' },
      '100%': { opacity: 0.7, transform: 'scale(1)' }
    },
    '@keyframes glow': {
      '0%': { boxShadow: `0 0 5px ${alpha(strainColor, 0.3)}` },
      '50%': { boxShadow: `0 0 12px ${alpha(strainColor, 0.6)}` },
      '100%': { boxShadow: `0 0 5px ${alpha(strainColor, 0.3)}` }
    }
  } : {};
  
  // Create the transition style only if animations are enabled
  const transitionStyle = animationsEnabled ? {
    transition: `all ${animationDuration}ms ${animationEasing}`,
    willChange: enableHardwareAcceleration ? 'transform, color, background-color, box-shadow, opacity' : 'auto'
  } : {};
  
  // Generate ripple effect style if active and animations enabled
  const rippleStyle = animationsEnabled && isActive ? {
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: -4,
      borderRadius: '50%',
      border: `1px solid ${strainColor}`,
      opacity: 0.5,
      animation: `ripple ${animationDuration}ms ${animationEasing} infinite`
    }
  } : {};

  return (
    <Tooltip 
      title={
        <Box sx={{ p: 0.75 }}>
          <Typography variant="subtitle2" sx={{ fontSize: titleSize, fontWeight: 600, mb: 0.5 }}>
            {positionName} Chassis Strain
          </Typography>
          <Typography variant="body2" sx={{ fontSize: labelSize }}>
            Value: {currentStrain.toFixed(1)}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: labelSize }}>
            Status: {strainStatus}
          </Typography>
          <Typography 
            variant="caption" 
            sx={{ 
              fontSize: parseFloat(labelSize) * 0.85, 
              mt: 0.5, 
              display: 'block', 
              opacity: 0.8 
            }}
          >
            Measures material stress at wheel mounting point
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
          alignItems: 'center',
          justifyContent: 'center',
          ...animationStyles,
          ...sx
        }}
      >
        {/* Icon with modern effect */}
        <Box 
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            width: 24,
            height: 24,
            borderRadius: '50%',
            backgroundColor: alpha(strainColor, 0.1),
            boxShadow: `0 0 8px ${alpha(strainColor, 0.3)}`,
            animation: animationsEnabled && isActive 
              ? `glow ${animationDuration}ms infinite ${animationEasing}` 
              : 'none',
            mb: 0.75,
            ...transitionStyle,
            ...rippleStyle
          }}
        >
          <MdOutlineCompress 
            size="1.5rem" 
            color={strainColor}
            style={{
              animation: animationsEnabled && isActive 
                ? `pulse ${pulseAnimationDuration}ms ${animationEasing} infinite` 
                : 'none',
              ...transitionStyle
            }}
            aria-hidden="true"
          />
        </Box>
        
        {/* Value with modern display */}
        <Typography
          variant="body2"
          sx={{
            color: strainColor,
            fontWeight: 600,
            fontSize: valueSize,
            lineHeight: 1,
            letterSpacing: '0.3px',
            animation: animationsEnabled && pulseCount > 0 
              ? `pulse ${pulseAnimationDuration}ms ${animationEasing} infinite` 
              : 'none',
            background: pulseCount > 0 ? alpha(strainColor, 0.1) : 'transparent',
            borderRadius: theme.shape.borderRadius / 4,
            px: 1,
            py: 0.25,
            ...transitionStyle
          }}
          aria-live={pulseCount > 0 ? "polite" : "off"}
        >
          {currentStrain.toFixed(1)}
        </Typography>
        
        {/* Status indicator with pill design */}
        <Typography
          variant="caption"
          sx={{
            color: alpha(theme.palette.common.white, 0.95),
            fontWeight: 500,
            fontSize: labelSize,
            mt: 0.5,
            px: 0.75,
            py: 0.1,
            borderRadius: theme.shape.borderRadius / 2,
            background: strainColor,
            boxShadow: `0 1px 2px ${alpha(strainColor, 0.5)}`,
            textShadow: '0 1px 1px rgba(0,0,0,0.1)',
            letterSpacing: '0.4px',
            ...transitionStyle
          }}
        >
          {strainStatus}
        </Typography>
      </Box>
    </Tooltip>
  );
};

CompactChassisStrainOverlay.propTypes = {
  wheelFilter: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']),
  strainValues: PropTypes.shape({
    FL: PropTypes.number,
    FR: PropTypes.number,
    RL: PropTypes.number,
    RR: PropTypes.number,
  }),
  transformForCard: PropTypes.bool,
  sx: PropTypes.object,
  fontSizes: PropTypes.object
};

// Memoize the component to prevent unnecessary renders
export default React.memo(CompactChassisStrainOverlay);