import React, { useContext, useCallback } from 'react';
import { Box, Typography, alpha, useTheme, Paper } from '@mui/material';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';

/**
 * High-Performance WheelCard Component
 * 
 * Optimized card for displaying wheel-specific telemetry data
 * with minimal re-renders and efficient styling
 */
const WheelCard = ({
  position,
  children,
  positionStyle,
  scale = 1,
  onClick,
  className,
  animationsEnabled,
  animationDuration,
  animationEasing,
  enableHardwareAcceleration
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  // Simple position mapping
  const positionNames = {
    FL: 'Front Left',
    FR: 'Front Right',
    RL: 'Rear Left',
    RR: 'Rear Right'
  };
  
  // Use InView for efficient rendering
  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
    rootMargin: '100px'
  });
  
  // Extract settings with safe defaults
  const {
    animationDuration: globalAnimDuration = 0,
    enableTransitions = false,
    enableHardwareAcceleration: globalHwAccel = true
  } = settings.global || {};
  
  const {
    chartSize = 'medium',
    chartLayout = 'grid'
  } = settings.dashboard || {};
  
  // Determine animation behavior
  const useAnimations = animationsEnabled !== undefined ? 
    animationsEnabled : (globalAnimDuration > 0 && enableTransitions);
    
  const transitionDuration = animationDuration !== undefined ?
    (typeof animationDuration === 'string' ? animationDuration : `${animationDuration}ms`) :
    `${globalAnimDuration}ms`;
    
  const transitionEasing = animationEasing || 
    ((settings.realTime?.enableSmoothing) ? 'cubic-bezier(0.4, 0.0, 0.2, 1)' : 'ease-in-out');
    
  const useHardwareAcceleration = enableHardwareAcceleration !== undefined ?
    enableHardwareAcceleration : globalHwAccel;
  
  // Calculate dynamic scale once
  let dynamicScale = scale * 0.85;
  if (chartSize === 'large') dynamicScale *= 1.2;
  if (chartSize === 'small') dynamicScale *= 0.8;
  if (chartLayout === 'list') dynamicScale *= 1.1;
  
  // Keyboard handler for accessibility
  const handleKeyDown = useCallback(e => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  }, [onClick]);
  
  // Calculate font sizes once
  const fontSizes = {
    title: `${0.6 * dynamicScale}rem`,
    value: `${0.65 * dynamicScale}rem`,
    label: `${0.45 * dynamicScale}rem`
  };
  
  // Props to pass to children
  const childProps = {
    compact: true,
    wheelCardScale: dynamicScale,
    fontSizes,
    animationsEnabled: useAnimations,
    animationDuration: transitionDuration,
    animationEasing: transitionEasing,
    enableHardwareAcceleration: useHardwareAcceleration
  };
  
  // Optimized transition style - only created if needed
  const transitionStyle = useAnimations ? {
    transition: `all ${transitionDuration} ${transitionEasing}`,
    willChange: useHardwareAcceleration ? 'transform, box-shadow, border-color' : 'auto'
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
      <Paper
        elevation={0}
        sx={{
          backdropFilter: 'blur(10px)',
          borderRadius: theme.shape.borderRadius,
          backgroundColor: alpha(theme.palette.background.paper, 0.8),
          boxShadow: theme.shadows[4],
          border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
          minWidth: 110 * dynamicScale,
          maxWidth: 140 * dynamicScale,
          minHeight: 140 * dynamicScale,
          height: 'auto',
          padding: theme.spacing(1 * dynamicScale),
          display: 'flex',
          flexDirection: 'column',
          cursor: onClick ? 'pointer' : 'default',
          '&:hover': {
            boxShadow: theme.shadows[8],
            borderColor: alpha(theme.palette.primary.main, 0.25),
            transform: useAnimations ? 'translateY(-2px)' : 'none'
          },
          ...transitionStyle
        }}
        onClick={onClick}
        tabIndex={onClick ? 0 : -1}
        onKeyDown={handleKeyDown}
      >
        <Typography
          variant="subtitle2"
          sx={{
            color: theme.palette.primary.main,
            fontWeight: 700,
            textAlign: 'center',
            mb: 0.5,
            pb: 0.25,
            fontSize: `${0.7 * dynamicScale}rem`,
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0)} 0%, 
                        ${alpha(theme.palette.primary.main, 0.15)} 50%, 
                        ${alpha(theme.palette.primary.main, 0)} 100%)`,
            borderRadius: `${theme.shape.borderRadius / 2}px ${theme.shape.borderRadius / 2}px 0 0`,
            lineHeight: 1.2,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.3)}`
          }}
        >
          {position} Wheel
        </Typography>

        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          pointerEvents: 'auto'
        }}>
          {inView ? (
            // Only render children when in view
            React.Children.map(children, child =>
              React.cloneElement(child, childProps)
            )
          ) : (
            // Simple placeholder when not in view
            <Box sx={{
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="body2" color="text.secondary">
                {positionNames[position] || position}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
};

WheelCard.propTypes = {
  position: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']).isRequired,
  children: PropTypes.node.isRequired,
  positionStyle: PropTypes.object.isRequired,
  scale: PropTypes.number,
  onClick: PropTypes.func,
  className: PropTypes.string,
  animationsEnabled: PropTypes.bool,
  animationDuration: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  animationEasing: PropTypes.string,
  enableHardwareAcceleration: PropTypes.bool
};

export default React.memo(WheelCard);