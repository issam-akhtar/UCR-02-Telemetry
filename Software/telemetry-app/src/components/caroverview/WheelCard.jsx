import React, { useContext, useMemo } from 'react';
import { Box, Typography, alpha, useTheme, Paper } from '@mui/material';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';
import useResizeObserver from 'use-resize-observer';

/**
 * Improved WheelCard with better readability and more compact design
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
  enableHardwareAcceleration
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref: cardRef, width: cardWidth } = useResizeObserver();

  // Derive animation settings from props or context
  const useAnimations = useMemo(() => 
    animationsEnabled !== undefined ? 
      animationsEnabled : 
      (settings.global.animationDuration > 0 && settings.global.enableTransitions),
  [animationsEnabled, settings.global.animationDuration, settings.global.enableTransitions]);

  const transitionDuration = useMemo(() => 
    animationDuration || `${settings.global.animationDuration}ms`,
  [animationDuration, settings.global.animationDuration]);

  // Determine hardware acceleration from props or context
  const useHardwareAcceleration = useMemo(() => 
    enableHardwareAcceleration !== undefined ? 
      enableHardwareAcceleration : 
      settings.global.enableHardwareAcceleration,
  [enableHardwareAcceleration, settings.global.enableHardwareAcceleration]);

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  const setRefs = useMemo(
    () => (node) => {
      cardRef(node);
      inViewRef(node);
    },
    [cardRef, inViewRef]
  );

  // Position mapping
  const positionNames = {
    FL: 'Front Left',
    FR: 'Front Right',
    RL: 'Rear Left',
    RR: 'Rear Right'
  };

  const readablePosition = positionNames[position] || position;

  // Container positioning styles
  const containerStyles = useMemo(() => ({
    position: 'absolute',
    ...positionStyle,
    zIndex: 10,
    pointerEvents: 'auto',
  }), [positionStyle]);

  // More compact card with improved readability
  const boxStyles = useMemo(() => {
    const dynamicScale = scale * 0.85;
    
    return {
      backdropFilter: 'blur(10px)',
      borderRadius: theme.shape.borderRadius,
      backgroundColor: alpha(theme.palette.background.paper, 0.8), // Slightly more opaque for better contrast
      boxShadow: theme.shadows[4],
      border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
      width: '100%',
      minWidth: 110 * dynamicScale,
      maxWidth: 140 * dynamicScale,
      minHeight: 140 * dynamicScale, // Reduced height for more compact look
      height: 'auto',
      padding: theme.spacing(1 * dynamicScale), // Reduced padding
      overflow: 'visible',
      display: 'flex',
      flexDirection: 'column',
      cursor: onClick ? 'pointer' : 'default',
      transition: useAnimations ? `all ${transitionDuration} ease-in-out` : 'none',
      willChange: useHardwareAcceleration ? 'transform, box-shadow, border-color' : 'auto',
      '&:hover': {
        boxShadow: theme.shadows[8],
        borderColor: alpha(theme.palette.primary.main, 0.25),
        transform: useAnimations ? 'translateY(-2px)' : 'none'
      }
    };
  }, [theme, scale, onClick, useAnimations, transitionDuration, useHardwareAcceleration]);

  // Always render if no settings provided or if component is in view
  const shouldRender = inView;

  // Improved header with better contrast
  const headerStyles = useMemo(() => ({
    color: theme.palette.primary.main,
    fontWeight: 700, // Bolder for better visibility
    textAlign: 'center',
    mb: 0.5, // Reduced margin for compactness
    pb: 0.25, // Reduced padding
    fontSize: '0.7rem',
    borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
    background: `linear-gradient(90deg, ${alpha(theme.palette.primary.main, 0)} 0%, ${alpha(theme.palette.primary.main, 0.15)} 50%, ${alpha(theme.palette.primary.main, 0)} 100%)`,
    borderRadius: `${theme.shape.borderRadius / 2}px ${theme.shape.borderRadius / 2}px 0 0`,
    lineHeight: 1.2,
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.3)}` // Text shadow for better readability
  }), [theme]);

  return (
    <Box
      ref={setRefs}
      sx={containerStyles}
      className={className}
      role="region"
      aria-label={`${readablePosition} Wheel Data`}
    >
      <Paper
        elevation={0}
        sx={boxStyles}
        onClick={onClick}
        tabIndex={onClick ? 0 : -1}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {/* Improved header */}
        <Typography
          variant="subtitle2"
          sx={headerStyles}
        >
          {position} Wheel
        </Typography>

        {/* More compact content layout */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5, // Reduced gap for more compact layout
            pointerEvents: 'auto',
          }}
        >
          {shouldRender ? React.Children.map(children, child =>
            React.cloneElement(child, {
              compact: true,
              wheelCardScale: scale * 0.85,
              fontSizes: {
                title: '0.6rem',
                value: '0.65rem', // Slightly larger for better readability
                label: '0.45rem' // Slightly larger for better readability
              },
              // Pass animation and hardware acceleration settings to children
              animationsEnabled: useAnimations,
              animationDuration: transitionDuration,
              enableHardwareAcceleration: useHardwareAcceleration,
            })
          ) : (
            <Box sx={{
              height: 100,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="body2" color="text.secondary">
                {readablePosition}
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
  animationDuration: PropTypes.string,
  enableHardwareAcceleration: PropTypes.bool
};

export default React.memo(WheelCard);