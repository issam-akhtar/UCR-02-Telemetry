import React, { useContext, useCallback } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';

/**
 * WheelDataCard Component
 * 
 * Performance-optimized component for displaying wheel data in a racing car visualization.
 * Uses theme for styling and context for settings with focus on rendering efficiency.
 */
const WheelDataCard = ({
  position,
  children,
  positionStyle,
  scale = 1,
  onClick,
  className
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  // Use minimal InView configuration for better performance
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: '100px' // Load just before becoming visible
  });
  
  // Extract only necessary settings - use safe defaults if values are missing
  const {
    animationDuration = 0,
    enableTransitions = false,
    enableHardwareAcceleration = true
  } = settings.global || {};
  
  const {
    chartSize = 'medium',
    chartLayout = 'grid',
    useImperialUnits = false,
    showTempInF = false,
    significantChangeThreshold = 1.5,
    updateInterval = 300
  } = settings.dashboard || {};
  
  // Simplified scale calculation
  let dynamicScale = scale;
  if (chartSize === 'large') dynamicScale *= 1.2;
  if (chartSize === 'small') dynamicScale *= 0.8;
  if (chartLayout === 'list') dynamicScale *= 1.1;
  
  // Determine if compact mode should be used
  const isCompact = dynamicScale < 0.8;
  
  // Simple position name mapping
  const positionNames = {
    FL: 'Front Left',
    FR: 'Front Right',
    RL: 'Rear Left',
    RR: 'Rear Right'
  };
  
  // Keyboard event handler for accessibility
  const handleKeyDown = useCallback(e => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);
  
  // Calculate font sizes once based on scale
  const fontSizes = {
    title: `${0.6 * dynamicScale}rem`,
    value: `${0.65 * dynamicScale}rem`,
    label: `${0.45 * dynamicScale}rem`
  };
  
  // Only apply animations if enabled
  const useAnimations = animationDuration > 0 && enableTransitions;
  
  // Prepare props for children once to avoid recreating objects
  const childProps = {
    compact: isCompact,
    wheelCardScale: dynamicScale,
    fontSizes,
    animationsEnabled: useAnimations,
    animationDuration: `${animationDuration}ms`,
    animationEasing: 'ease-in-out',
    enableHardwareAcceleration,
    useImperialUnits,
    showTempInF,
    significantChangeThreshold,
    updateInterval
  };
  
  // Create transition styles only if needed
  const transitionStyle = useAnimations ? {
    transition: `box-shadow ${animationDuration}ms ease-in-out, 
                border-color ${animationDuration}ms ease-in-out`,
    willChange: enableHardwareAcceleration ? 'box-shadow, border-color' : 'auto'
  } : {};

  return (
    <Box
      ref={ref}
      sx={{
        position: 'absolute',
        ...positionStyle,
        zIndex: 10,
        pointerEvents: 'auto'
      }}
      className={className}
      role="region"
      aria-label={`${positionNames[position] || position} Wheel Data`}
    >
      <Box
        sx={{
          backgroundColor: alpha(theme.palette.background.paper, 0.85),
          backdropFilter: 'blur(8px)',
          borderRadius: theme.shape.borderRadius,
          boxShadow: theme.shadows[2],
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          minWidth: 120 * dynamicScale,
          maxWidth: 240 * dynamicScale,
          minHeight: 100 * dynamicScale,
          padding: theme.spacing(isCompact ? 1 : 1.5),
          display: 'flex',
          flexDirection: 'column',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': {
            boxShadow: theme.shadows[4],
            borderColor: alpha(theme.palette.primary.main, 0.5)
          },
          ...transitionStyle
        }}
        onClick={onClick}
        tabIndex={onClick ? 0 : -1}
        onKeyDown={handleKeyDown}
      >
        <Typography
          variant="subtitle1"
          sx={{
            color: theme.palette.primary.main,
            fontWeight: 'bold',
            textAlign: 'center',
            mb: theme.spacing(isCompact ? 0.5 : 1),
            textTransform: 'uppercase',
            letterSpacing: '1px',
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            pb: theme.spacing(0.5),
            fontSize: fontSizes.title
          }}
        >
          {position} Wheel
        </Typography>
        
        <Box sx={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          gap: theme.spacing(isCompact ? 0.5 : 1)
        }}>
          {inView ? (
            // Only render children when in view
            React.Children.map(children, child =>
              React.cloneElement(child, childProps)
            )
          ) : (
            // Simple placeholder when not in view
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <Typography variant="body2" color="text.secondary">
                {positionNames[position] || position} Data
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

WheelDataCard.propTypes = {
  position: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']).isRequired,
  children: PropTypes.node.isRequired,
  positionStyle: PropTypes.object.isRequired,
  scale: PropTypes.number,
  onClick: PropTypes.func,
  className: PropTypes.string
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(WheelDataCard);