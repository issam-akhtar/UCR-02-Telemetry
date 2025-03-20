import React, { useContext, useMemo } from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';
import useResizeObserver from 'use-resize-observer';

/**
 * WheelCard
 * 
 * Updated to rely more on container-based sizing, so it adapts fluidly to grid changes.
 * We removed hard-coded widths in favor of flexible sizing with min/max constraints.
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
  
  // Use MUI breakpoints to determine responsive sizing instead of isCompactMode
  const isSmallCard = useMemo(() => {
    return scale < 0.8 || (cardWidth && cardWidth < 180);
  }, [scale, cardWidth]);
  
  const positionNames = {
    FL: 'Front Left',
    FR: 'Front Right',
    RL: 'Rear Left',
    RR: 'Rear Right'
  };
  
  const readablePosition = positionNames[position] || position;
  
  const containerStyles = useMemo(() => ({
    position: 'absolute',
    ...positionStyle,
    zIndex: 10,
    pointerEvents: 'auto',
  }), [positionStyle]);
  
  // Instead of fixed widths, allow the card to expand or shrink with min/max constraints.
  // The scale is still applied for finer adjustments, but less aggressively.
  const boxStyles = useMemo(() => ({
    backgroundColor: alpha(theme.palette.background.paper, 0.85),
    backdropFilter: 'blur(8px)',
    borderRadius: theme.shape.borderRadius,
    boxShadow: theme.shadows[4],
    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
    width: '100%',
    minWidth: 120 * scale,
    maxWidth: 240 * scale,
    minHeight: 100 * scale,
    maxHeight: 240 * scale,
    overflow: 'visible',
    display: 'flex',
    flexDirection: 'column',
    isolation: 'isolate',
    cursor: onClick ? 'pointer' : 'default',
    transition: useAnimations 
      ? theme.transitions.create(['box-shadow', 'border-color'], {
          duration: transitionDuration
        }) 
      : 'none',
    willChange: useHardwareAcceleration ? 'box-shadow, border-color' : 'auto',
    '&:hover': {
      boxShadow: theme.shadows[8],
      borderColor: alpha(theme.palette.primary.main, 0.5)
    }
  }), [theme, scale, onClick, useAnimations, transitionDuration, useHardwareAcceleration]);
  
  // Always render if in view
  const shouldRender = inView;
  
  return (
    <Box
      ref={setRefs}
      sx={containerStyles}
      className={className}
      role="region"
      aria-label={`${readablePosition} Wheel Data`}
    >
      <Box
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
        {/* Header with position label */}
        <Typography
          variant="subtitle1"
          sx={{
            color: theme.palette.primary.main,
            fontWeight: 'bold',
            textAlign: 'center',
            mb: theme.spacing(isSmallCard ? 0.5 : 1),
            textTransform: 'uppercase',
            letterSpacing: '1px',
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            pb: theme.spacing(0.5),
            fontSize: {
              xs: isSmallCard ? '0.75rem' : '0.85rem',
              sm: isSmallCard ? '0.85rem' : '0.95rem',
              md: isSmallCard ? '0.95rem' : '1.05rem',
            },
            lineHeight: 1.2,
          }}
        >
          {position} Wheel
        </Typography>
        
        <Box 
          sx={{ 
            position: 'relative', 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(isSmallCard ? 0.5 : 1),
            pointerEvents: 'auto', 
          }}
        >
          {shouldRender ? React.Children.map(children, child => 
            React.cloneElement(child, { 
              compact: isSmallCard,
              wheelCardScale: scale,
              // Pass animation and hardware acceleration settings to children
              animationsEnabled: useAnimations,
              animationDuration: transitionDuration,
              enableHardwareAcceleration: useHardwareAcceleration,
              // Pass dashboard settings to children
              useImperialUnits: settings.dashboard.useImperialUnits,
              showTempInF: settings.dashboard.showTempInF,
              significantChangeThreshold: settings.dashboard.significantChangeThreshold,
            })
          ) : (
            <Box sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Typography variant="body2" color="text.secondary">
                {readablePosition} Data
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
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