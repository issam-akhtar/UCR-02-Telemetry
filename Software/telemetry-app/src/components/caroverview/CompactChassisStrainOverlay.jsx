import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { Box, Typography, useTheme, alpha, Tooltip } from '@mui/material';
import { MdOutlineCompress } from 'react-icons/md';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Define and export strain thresholds
export const STRAIN_THRESHOLDS = { 
  MODERATE: 40, 
  HIGH: 80 
};

/**
 * Redesigned Chassis Strain Overlay with modern UI
 */
export default function CompactChassisStrainOverlay({
  wheelFilter = null,
  strainValues = null,
  transformForCard = false,
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
  
  // Animation times derived from settings
  const pulseAnimationDuration = useMemo(() => 
    Math.max(300, settings.global.animationDuration),
  [settings.global.animationDuration]);
  
  const activeStateDuration = useMemo(() => 
    Math.max(1000, settings.global.animationDuration * 4),
  [settings.global.animationDuration]);
  
  const [frontLeftStrain, setFrontLeftStrain] = useState(strainValues?.FL ?? 0);
  const [frontRightStrain, setFrontRightStrain] = useState(strainValues?.FR ?? 0);
  const [rearLeftStrain, setRearLeftStrain] = useState(strainValues?.RL ?? 0);
  const [rearRightStrain, setRearRightStrain] = useState(strainValues?.RR ?? 0);
  
  const [isActive, setIsActive] = useState(false);
  const prevStrainRef = useRef(0);
  const [pulseCount, setPulseCount] = useState(0);

  // Update state from props with throttling for performance
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (strainValues) {
      // Function to check if a change is significant based on settings
      const isSignificantChange = (oldVal, newVal) => {
        if (oldVal === 0 && newVal !== 0) return true;
        if (oldVal !== 0 && newVal === 0) return true;
        
        const percentChange = Math.abs((newVal - oldVal) / oldVal) * 100;
        return percentChange >= settings.dashboard.significantChangeThreshold;
      };
      
      if (strainValues.FL !== undefined && strainValues.FL !== null &&
          isSignificantChange(frontLeftStrain, strainValues.FL)) {
        setFrontLeftStrain(strainValues.FL);
      }
      
      if (strainValues.FR !== undefined && strainValues.FR !== null &&
          isSignificantChange(frontRightStrain, strainValues.FR)) {
        setFrontRightStrain(strainValues.FR);
      }
      
      if (strainValues.RL !== undefined && strainValues.RL !== null &&
          isSignificantChange(rearLeftStrain, strainValues.RL)) {
        setRearLeftStrain(strainValues.RL);
      }
      
      if (strainValues.RR !== undefined && strainValues.RR !== null &&
          isSignificantChange(rearRightStrain, strainValues.RR)) {
        setRearRightStrain(strainValues.RR);
      }
    }
  }, [strainValues, wheelFilter, settings.dashboard.significantChangeThreshold, 
      frontLeftStrain, frontRightStrain, rearLeftStrain, rearRightStrain]);

  // Apply update interval for throttling
  useEffect(() => {
    if (settings.dashboard.updateInterval > 0) {
      const timer = setInterval(() => {
        // This would refresh data if needed
      }, settings.dashboard.updateInterval);
      
      return () => clearInterval(timer);
    }
  }, [settings.dashboard.updateInterval]);

  let strain = 0;
  let positionName = '';
  
  switch (wheelFilter) {
    case 'FL':
      strain = frontLeftStrain;
      positionName = 'Front Left';
      break;
    case 'FR':
      strain = frontRightStrain;
      positionName = 'Front Right';
      break;
    case 'RL':
      strain = rearLeftStrain;
      positionName = 'Rear Left';
      break;
    case 'RR':
      strain = rearRightStrain;
      positionName = 'Rear Right';
      break;
    default:
      strain = 0;
      positionName = 'Unknown';
      break;
  }

  const getStrainColor = (value) => {
    if (value > STRAIN_THRESHOLDS.HIGH) return theme.palette.error.main;
    if (value > STRAIN_THRESHOLDS.MODERATE) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  const getStrainStatus = (value) => {
    if (value > STRAIN_THRESHOLDS.HIGH) return "High"; 
    if (value > STRAIN_THRESHOLDS.MODERATE) return "Medium";
    return "Normal";
  };

  const strainColor = getStrainColor(strain);
  const strainStatus = getStrainStatus(strain);

  // Trigger animation effects on significant changes
  useEffect(() => {
    // Use significantChangeThreshold from settings instead of hardcoded value
    if (Math.abs(strain - prevStrainRef.current) > settings.dashboard.significantChangeThreshold) {
      if (animationsEnabled) {
        setIsActive(true);
        setPulseCount(3);
      }
      prevStrainRef.current = strain;
      
      if (animationsEnabled) {
        const timer = setTimeout(() => {
          setIsActive(false);
          setPulseCount(0);
        }, activeStateDuration);
        return () => clearTimeout(timer);
      }
    } else {
      prevStrainRef.current = strain;
    }
  }, [strain, settings.dashboard.significantChangeThreshold, animationsEnabled, activeStateDuration]);

  useEffect(() => {
    let timer;
    if (pulseCount > 0 && animationsEnabled) {
      timer = setTimeout(() => {
        setPulseCount((prev) => prev - 1);
      }, pulseAnimationDuration);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pulseCount, animationsEnabled, pulseAnimationDuration]);

  // Custom font sizes from props or defaults
  const titleSize = '12px';
  const valueSize = '12px';
  const labelSize = '12px';

  // Modern UI animations - conditional based on settings
  const animations = animationsEnabled ? {
    '@keyframes ripple': {
      '0%': { opacity: 0.5, transform: 'scale(1)' },
      '100%': { opacity: 0, transform: 'scale(1.8)' },
    },
    '@keyframes pulse': {
      '0%': { opacity: 0.7, transform: 'scale(1)' },
      '50%': { opacity: 1, transform: 'scale(1.1)' },
      '100%': { opacity: 0.7, transform: 'scale(1)' },
    },
    '@keyframes glow': {
      '0%': { boxShadow: `0 0 5px ${alpha(strainColor, 0.3)}` },
      '50%': { boxShadow: `0 0 12px ${alpha(strainColor, 0.6)}` },
      '100%': { boxShadow: `0 0 5px ${alpha(strainColor, 0.3)}` },
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
            Value: {strain.toFixed(1)}
          </Typography>
          <Typography variant="body2" sx={{ fontSize: labelSize }}>
            Status: {strainStatus}
          </Typography>
          <Typography variant="caption" sx={{ fontSize: labelSize * 0.85, mt: 0.5, display: 'block', opacity: 0.8 }}>
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
          // Removed fixed height so it can expand naturally
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          ...animations,
          ...sx,
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
            animation: animationsEnabled && isActive ? `glow ${animationDuration} infinite` : 'none',
            mb: 0.75,
            transition: animationsEnabled ? `background-color ${animationDuration} ease, box-shadow ${animationDuration} ease` : 'none',
            willChange: settings.global.enableHardwareAcceleration ? 'box-shadow, background-color' : 'auto',
            '&::after': animationsEnabled && isActive
              ? {
                  content: '""',
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  border: `1px solid ${strainColor}`,
                  opacity: 0.5,
                  animation: `ripple ${animationDuration} ease-out infinite`,
                  willChange: settings.global.enableHardwareAcceleration ? 'transform, opacity' : 'auto',
                }
              : {},
          }}
        >
          <MdOutlineCompress 
            size="1.5rem" 
            color={strainColor}
            style={{ 
              animation: animationsEnabled && isActive ? `pulse ${pulseAnimationDuration}ms ease infinite` : 'none',
              transition: animationsEnabled ? `color ${animationDuration} ease` : 'none',
              willChange: settings.global.enableHardwareAcceleration ? 'transform, opacity' : 'auto',
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
            fontSize: '12px',
            lineHeight: 1,
            letterSpacing: '0.3px',
            animation: animationsEnabled && pulseCount > 0 ? `pulse ${pulseAnimationDuration}ms ease infinite` : 'none',
            background: pulseCount > 0 ? alpha(strainColor, 0.1) : 'transparent',
            borderRadius: theme.shape.borderRadius / 4,
            px: 1,
            py: 0.25,
            transition: animationsEnabled ? `color ${animationDuration} ease, background-color ${animationDuration} ease` : 'none',
            willChange: settings.global.enableHardwareAcceleration ? 'color, background-color, transform' : 'auto',
          }}
          aria-live={pulseCount > 0 ? "polite" : "off"}
        >
          {strain.toFixed(1)}
        </Typography>
        
        {/* Status indicator with pill design */}
        <Typography
          variant="caption"
          sx={{
            color: alpha(theme.palette.common.white, 0.95),
            fontWeight: 500,
            fontSize: '12px',
            mt: 0.5,
            px: 0.75,
            py: 0.1,
            borderRadius: theme.shape.borderRadius / 2,
            background: strainColor,
            boxShadow: `0 1px 2px ${alpha(strainColor, 0.5)}`,
            textShadow: '0 1px 1px rgba(0,0,0,0.1)',
            letterSpacing: '0.4px',
            transition: animationsEnabled ? `background ${animationDuration} ease, box-shadow ${animationDuration} ease` : 'none',
            willChange: settings.global.enableHardwareAcceleration ? 'background, box-shadow' : 'auto',
          }}
        >
          {strainStatus}
        </Typography>
      </Box>
    </Tooltip>
  );
}

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

export const MemoizedCompactChassisStrainOverlay = React.memo(CompactChassisStrainOverlay);