import React, { useContext, useEffect, useRef, useState } from 'react';
import { Box, Tooltip, alpha, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import useResizeObserver from 'use-resize-observer';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import SteeringWheelOverlay from './SteeringWheelOverlay';

// Define tire positions outside component to avoid recreation
const TIRE_POSITIONS = [
  { code: 'FL', label: 'Front Left', x: 39.45, y: 35.5 },
  { code: 'FR', label: 'Front Right', x: 60.5, y: 35.5 },
  { code: 'RL', label: 'Rear Left', x: 39.45, y: 76.5 },
  { code: 'RR', label: 'Rear Right', x: 60.5, y: 76.5 }
];

// Color and status maps
const SUSPENSION_COLORS = [
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

const STATUS_TEXT = [
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

/**
 * High-Performance CarVisualizer Component
 *
 * Displays a car visualization with responsive tire elements and a steering wheel.
 * Optimized for rendering efficiency and minimal re-renders.
 */
const CarVisualizer = ({
  suspensionData,
  steeringAngle = 0,
  activeTooltip,
  setActiveTooltip
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref, width = 300, height = 400 } = useResizeObserver();
  
  // State for optimized data
  const [optimizedData, setOptimizedData] = useState(suspensionData);
  
  // Refs for throttling
  const lastUpdateRef = useRef(0);
  const timerRef = useRef(null);
  const prevDataRef = useRef({...suspensionData});
  
  // Extract settings with defaults
  const {
    dashboard: {
      updateInterval = 300,
      significantChangeThreshold = 0.5,
      chartSize = 'medium',
      chartLayout = 'grid',
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
  
  // Calculate tire size based on container dimensions
  const minDimension = Math.min(width || 300, height || 400);
  let baseSize = minDimension / 28;
  
  if (chartSize === 'large') {
    baseSize *= 1.2;
  } else if (chartSize === 'small') {
    baseSize *= 0.8;
  }
  
  const tireSize = {
    width: baseSize * 1.5,
    height: baseSize * 3.0
  };
  
  // Calculate steering wheel scale
  const wheelScale = Math.max(0.8, minDimension / 400) * 
                    (chartSize === 'large' ? 1.2 : 
                     chartSize === 'small' ? 0.8 : 1);
  
  // Helper functions for suspension values
  const getSuspensionColor = (val) => {
    const value = Math.max(0, Math.min(val, 100));
    for (const item of SUSPENSION_COLORS) {
      if (value < item.threshold) return item.color;
    }
    return '#ff0000'; // Fallback
  };
  
  const getStatusText = (val) => {
    const value = Math.max(0, Math.min(val, 100));
    for (const item of STATUS_TEXT) {
      if (value < item.threshold) return item.status;
    }
    return 'Max'; // Fallback
  };
  
  const getGlowStrength = (val) => {
    const value = Math.max(0, Math.min(val, 100));
    return Math.max(6, 15 - Math.floor(value / 10));
  };
  
  const getCompressionPct = (val) => {
    return Math.max(0, Math.min(100 - val, 60));
  };
  
  const formatMeasurement = (value, unit = 'mm') => {
    if (unit === 'mm' && useImperialUnits) {
      const inches = value / 25.4;
      return `${inches.toFixed(2)}″`;
    }
    return `${value.toFixed(1)}${unit}`;
  };
  
  // Update data when suspensionData changes
  useEffect(() => {
    // Check if there's a significant change
    let hasSignificantChange = false;
    
    Object.keys(suspensionData).forEach(key => {
      const prevVal = prevDataRef.current[key] || 0;
      const newVal = suspensionData[key] || 0;
      const pctChange = Math.abs((newVal - prevVal) / (Math.max(prevVal, 0.1)) * 100);
      
      if (pctChange > significantChangeThreshold) {
        hasSignificantChange = true;
      }
    });
    
    if (!hasSignificantChange) return;
    
    // Clear any existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    
    const now = Date.now();
    const elapsed = now - lastUpdateRef.current;
    
    // If enough time has passed, update immediately
    if (elapsed >= updateInterval) {
      setOptimizedData(suspensionData);
      prevDataRef.current = {...suspensionData};
      lastUpdateRef.current = now;
    } else {
      // Otherwise, schedule update for later
      timerRef.current = setTimeout(() => {
        setOptimizedData(suspensionData);
        prevDataRef.current = {...suspensionData};
        lastUpdateRef.current = Date.now();
        timerRef.current = null;
      }, updateInterval - elapsed);
    }
    
    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [suspensionData, updateInterval, significantChangeThreshold]);
  
  // Create transition style only if animations are enabled
  const transitionStyle = animationsEnabled ? {
    transition: `all ${animationDuration}ms ${animationEasing}`,
    willChange: enableHardwareAcceleration ? 'transform, opacity, height, box-shadow' : 'auto'
  } : {};
  
  // Render a tire element
  const renderTire = (position) => {
    const { code, label, x, y } = position;
    const suspensionValue = optimizedData[code] || 0;
    const color = getSuspensionColor(suspensionValue);
    const statusText = getStatusText(suspensionValue);
    const glowStrength = getGlowStrength(suspensionValue);
    const compressionPct = getCompressionPct(suspensionValue);
    const opacity = Math.min(0.7 + (suspensionValue / 100) * 0.3, 1);
    const compressionMm = (100 - suspensionValue) * 0.5;
    
    // Handle interaction
    const handleClick = () => setActiveTooltip(`tire-${code}`);
    const handleEnter = () => setActiveTooltip(`tire-${code}`);
    const handleLeave = () => setActiveTooltip(null);
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setActiveTooltip(`tire-${code}`);
      }
    };
    
    const isOpen = activeTooltip === `tire-${code}`;
    
    // Define pulse animation only when needed
    const pulseAnimation = animationsEnabled && suspensionValue < 10 ? {
      animation: 'pulse 1.5s infinite',
      '@keyframes pulse': {
        '0%': { opacity: opacity * 0.6 },
        '50%': { opacity },
        '100%': { opacity: opacity * 0.6 }
      }
    } : {};
    
    return (
      <Tooltip
        key={code}
        title={
          <Box sx={{ p: 0.5 }}>
            <Box sx={{ fontWeight: 'bold', mb: 0.5 }}>{label} Suspension</Box>
            <Box>Value: {suspensionValue.toFixed(1)}</Box>
            <Box>Compression: {compressionPct.toFixed(0)}%</Box>
            <Box>Travel: {formatMeasurement(compressionMm)}</Box>
            <Box>Status: {statusText}</Box>
          </Box>
        }
        placement="top"
        arrow
        enterDelay={0}
        leaveDelay={0}
        open={isOpen}
        onClose={handleLeave}
      >
        <Box
          sx={{
            position: 'absolute',
            width: tireSize.width,
            height: tireSize.height,
            borderRadius: theme.shape.borderRadius / 4,
            backgroundColor: color,
            opacity,
            border: `1px solid ${alpha(theme.palette.common.black, 0.15)}`,
            boxShadow: `0 0 ${glowStrength}px ${color}`,
            top: `${y}%`,
            left: `${x}%`,
            transform: 'translate(-50%, -50%)',
            cursor: 'pointer',
            overflow: 'hidden',
            ...transitionStyle,
            ...pulseAnimation
          }}
          onClick={handleClick}
          onMouseEnter={handleEnter}
          onMouseLeave={handleLeave}
          onKeyDown={handleKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`${label} tire with suspension value ${suspensionValue.toFixed(1)}`}
        >
          {/* Dark overlay showing "compression" */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: `${compressionPct}%`,
              backgroundColor: alpha(theme.palette.common.black, 0.2),
              ...transitionStyle
            }}
          />
        </Box>
      </Tooltip>
    );
  };
  
  // Layout styles
  const containerStyle = chartLayout === 'list' 
    ? {
        paddingTop: { xs: '20px', sm: '25px', md: '30px' },
        paddingBottom: { xs: '20px', sm: '25px', md: '30px' },
        minHeight: { xs: '300px', sm: '350px', md: '400px' }
      }
    : {
        minHeight: { xs: '250px', sm: '300px', md: '350px' }
      };
  
  // Car image styles
  const carImageStyle = {
    maxHeight: { 
      xs: chartSize === 'large' ? '85%' : '80%', 
      sm: chartSize === 'large' ? '90%' : '85%' 
    },
    maxWidth: { 
      xs: chartSize === 'large' ? '75%' : '70%', 
      sm: chartSize === 'large' ? '80%' : '75%' 
    },
    transform: 'translate(-50%, -50%) rotate(90deg)',
    ...transitionStyle
  };

  return (
    <Box
      ref={ref}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        borderRadius: theme.shape.borderRadius,
        overflow: 'visible',
        ...containerStyle
      }}
    >
      {/* Background gradient */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at center, ${alpha(
            theme.palette.primary.main,
            0.04
          )}, transparent 70%)`,
          pointerEvents: 'none'
        }}
      />

      {/* Render each tire */}
      {TIRE_POSITIONS.map(position => renderTire(position))}

      {/* Car outline */}
      <Box
        sx={{
          position: 'absolute',
          inset: '0%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: 'none'
        }}
      >
        <Box
          component="img"
          src="/SVG/UCR-01-Drawing-Top.svg"
          alt="Car Top View"
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 'auto',
            height: 'auto',
            pointerEvents: 'none',
            zIndex: 1,
            filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.15))',
            ...carImageStyle
          }}
          loading="lazy"
        />
        
        {/* Steering wheel overlay */}
        <SteeringWheelOverlay 
          steeringAngle={steeringAngle} 
          scale={wheelScale}
          animationDuration={animationDuration}
          enableTransitions={enableTransitions}
          enableSmoothing={enableSmoothing}
          enableHardwareAcceleration={enableHardwareAcceleration}
        />
      </Box>
    </Box>
  );
};

CarVisualizer.propTypes = {
  suspensionData: PropTypes.shape({
    FL: PropTypes.number,
    FR: PropTypes.number,
    RL: PropTypes.number,
    RR: PropTypes.number
  }).isRequired,
  steeringAngle: PropTypes.number,
  activeTooltip: PropTypes.string,
  setActiveTooltip: PropTypes.func.isRequired
};

export default React.memo(CarVisualizer);