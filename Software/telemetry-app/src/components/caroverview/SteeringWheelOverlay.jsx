import React from 'react';
import { Box, Typography, useTheme, alpha } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * Performance-Optimized SteeringWheelOverlay Component
 * 
 * A visually detailed steering wheel that rotates based on the provided steering angle.
 * Optimized for maximum rendering efficiency while maintaining visual fidelity.
 * 
 * @param {Object} props - Component props
 * @param {number} props.steeringAngle - Current steering angle in degrees
 * @param {number} props.scale - Scale factor for the steering wheel
 * @param {number} props.animationDuration - Duration for animations in ms
 * @param {boolean} props.enableTransitions - Whether animations should be enabled
 * @param {boolean} props.enableSmoothing - Whether to use smooth easing for animations
 * @param {boolean} props.enableHardwareAcceleration - Whether to use hardware acceleration
 */
const SteeringWheelOverlay = ({ 
  steeringAngle = 0, 
  scale = 1,
  animationDuration = 300,
  enableTransitions = true,
  enableSmoothing = true,
  enableHardwareAcceleration = true
}) => {
  const theme = useTheme();
  
  // Limit angle to +/- 90 degrees for visual appeal
  const normalizedAngle = Math.max(-90, Math.min(90, steeringAngle));
  
  // Animation settings
  const animationsEnabled = animationDuration > 0 && enableTransitions;
  const animationEasing = enableSmoothing ? 'cubic-bezier(0.4, 0.0, 0.2, 1)' : 'ease-out';
  
  // Visual settings
  const size = 70 * scale;
  const wheelColor = theme.palette.mode === 'dark' ? '#FFFFFF' : '#333333';
  const accentColor = theme.palette.primary.main;
  const textColor = alpha(theme.palette.mode === 'dark' ? '#FFFFFF' : '#333333', 0.9);
  
  // Angle display values
  const angleDirection = normalizedAngle === 0 ? 'CENTER' : normalizedAngle > 0 ? 'RIGHT' : 'LEFT';
  const angleDisplay = `${Math.abs(normalizedAngle).toFixed(1)}°`;
  
  // Combined transition style - only created if needed
  const transitionStyle = animationsEnabled ? {
    transition: `transform ${animationDuration}ms ${animationEasing}`,
    willChange: enableHardwareAcceleration ? 'transform' : 'auto'
  } : {};

  return (
    <Box
      sx={{
        position: 'absolute',
        top: '-5%',
        left: '50%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 20,
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Steering wheel that rotates */}
      <Box
        sx={{
          width: size,
          height: size,
          transform: `rotate(${normalizedAngle}deg)`,
          filter: `drop-shadow(0 0 5px ${alpha(theme.palette.common.white, 0.5)})`,
          opacity: 0.9,
          ...transitionStyle
        }}
        aria-label={`Steering wheel rotated ${normalizedAngle.toFixed(1)} degrees`}
      >
        <svg 
          width="100%"
          height="100%"
          viewBox="0 0 24 24"
          fill="none"
          stroke={wheelColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <defs>
            <filter id="steeringWheelGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Main outer circle */}
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke={accentColor}
            strokeWidth="1.8"
            filter="url(#steeringWheelGlow)"
          />
          
          {/* Inner hub circle */}
          <circle
            cx="12"
            cy="12"
            r="2.5"
            stroke={accentColor}
            strokeWidth="1.8"
            fill={alpha(accentColor, 0.1)}
            filter="url(#steeringWheelGlow)"
          />
          
          {/* Wheel spokes */}
          <line x1="12" y1="14.5" x2="12" y2="21" stroke={wheelColor} strokeWidth="1.8" />
          <line x1="9.5" y1="12" x2="3" y2="10" stroke={wheelColor} strokeWidth="1.8" />
          <line x1="14.5" y1="12" x2="21" y2="10" stroke={wheelColor} strokeWidth="1.8" />
          
          {/* Grip details */}
          <path d="M 16,6 A 6,6 0 0 0 8,6" stroke={wheelColor} strokeWidth="1.2" fill="none" />
          <path d="M 8,18 A 6,6 0 0 0 16,18" stroke={wheelColor} strokeWidth="1.2" fill="none" />
        </svg>
      </Box>
      
      {/* Angle indicator text */}
      <Box
        sx={{
          mt: 1,
          backgroundColor: alpha(theme.palette.background.paper, 0.3),
          borderRadius: theme.shape.borderRadius,
          padding: '4px 8px',
          backdropFilter: 'blur(4px)',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          whiteSpace: 'nowrap',
          ...(animationsEnabled ? {
            transition: `all ${animationDuration}ms ${animationEasing}`
          } : {})
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 'bold',
            color: textColor,
            fontSize: `${Math.max(10, 12 * scale)}px`,
            textShadow: `0 0 4px ${alpha(theme.palette.common.black, 0.5)}`,
            letterSpacing: '0.5px',
            mr: 1
          }}
        >
          STEERING
        </Typography>
        <Typography
          variant="body2"
          sx={{
            fontWeight: 'bold',
            color: accentColor,
            fontSize: `${Math.max(12, 14 * scale)}px`,
            textShadow: `0 0 4px ${alpha(theme.palette.common.black, 0.5)}`,
            letterSpacing: '0.5px'
          }}
        >
          {angleDisplay} {angleDirection}
        </Typography>
      </Box>
    </Box>
  );
};

SteeringWheelOverlay.propTypes = {
  steeringAngle: PropTypes.number,
  scale: PropTypes.number,
  animationDuration: PropTypes.number,
  enableTransitions: PropTypes.bool,
  enableSmoothing: PropTypes.bool,
  enableHardwareAcceleration: PropTypes.bool
};

export default React.memo(SteeringWheelOverlay);