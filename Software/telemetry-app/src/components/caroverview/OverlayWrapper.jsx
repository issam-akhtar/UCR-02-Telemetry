import React, { useMemo, useContext } from 'react';
import { Box, alpha, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import useResizeObserver from 'use-resize-observer';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

/**
 * Enhanced OverlayWrapper Component - More compact with better readability
 */
const OverlayWrapper = ({ 
  children, 
  compact = false, 
  name = '', 
  sx = {},
  wheelCardScale = 1,
  fontSizes = {}
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref, width, height } = useResizeObserver();
  
  // Animation settings based on context
  const animationsEnabled = useMemo(() => 
    settings.global.animationDuration > 0 && settings.global.enableTransitions,
  [settings.global.animationDuration, settings.global.enableTransitions]);

  const animationDuration = useMemo(() => 
    `${settings.global.animationDuration}ms`,
  [settings.global.animationDuration]);
  
  // Apply more aggressive scaling for compactness
  const dynamicScale = useMemo(() => {
    return wheelCardScale * 0.8; 
  }, [wheelCardScale]);
  
  // More compact container with tighter spacing
  const containerStyle = useMemo(() => ({
    position: 'relative',
    width: '100%',
    minHeight: 28, // Reduced minimum height
    height: 'auto',
    mb: theme.spacing(0.75), // Using theme spacing
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    zIndex: 1,
    overflow: 'visible',
    // Add subtle highlighting for better separation between components - conditional based on animations
    transition: animationsEnabled ? `background-color ${animationDuration} ease` : 'none',
    '&:hover': {
      backgroundColor: alpha(theme.palette.common.white, 0.03),
    },
    ...sx,
  }), [sx, theme, animationsEnabled, animationDuration]);
  
  // Enhanced props for better readability
  const childProps = useMemo(() => ({
    sx: {
      position: 'relative',
      top: 'auto',
      left: 'auto',
      right: 'auto',
      bottom: 'auto',
      width: '100%',
      height: '100%',
      // Enhance text readability
      '& .MuiTypography-root': {
        fontWeight: 600, // Bolder text
        textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.2)}`, // Text shadow using theme alpha
      },
      // Make value displays pop more
      '& [role="progressbar"]': {
        height: 3, // Slightly thicker progress bars
      },
      // Enhance status pills
      '& .MuiTypography-caption': {
        boxShadow: theme.shadows[1], // Using theme shadow instead of hardcoded
      },
      // Apply hardware acceleration if enabled
      willChange: settings.global.enableHardwareAcceleration ? 'transform' : 'auto',
    },
    transformForCard: true,
    compact: true,
    'aria-hidden': 'false',
    scale: dynamicScale,
    // Pass animations settings to children
    animationsEnabled,
    animationDuration,
    // Pass dashboard settings to children for unit conversions
    useImperialUnits: settings.dashboard.useImperialUnits,
    showTempInF: settings.dashboard.showTempInF,
    significantChangeThreshold: settings.dashboard.significantChangeThreshold,
    // Pass font sizes, with defaults
    ...(Object.keys(fontSizes).length > 0 ? { 
      fontSizes: {
        title: fontSizes.title || '0.6rem',
        value: fontSizes.value || '0.65rem', // Slightly larger for better readability
        label: fontSizes.label || '0.45rem'  // Slightly larger for better readability
      } 
    } : {})
  }), [
    dynamicScale, 
    fontSizes, 
    theme, 
    settings.global.enableHardwareAcceleration,
    settings.dashboard.useImperialUnits,
    settings.dashboard.showTempInF,
    settings.dashboard.significantChangeThreshold,
    animationsEnabled,
    animationDuration
  ]);
  
  if (!React.Children.count(children)) return null;
  
  return (
    <Box
      ref={ref}
      sx={containerStyle}
      role="region"
      aria-label={name || 'Telemetry overlay'}
      tabIndex={0}
    >
      {React.Children.map(children, child => {
        if (!child) return null;
        
        return React.cloneElement(child, {
          ...childProps,
          sx: { ...childProps.sx, ...(child.props.sx || {}) },
        });
      })}
    </Box>
  );
};

OverlayWrapper.propTypes = {
  children: PropTypes.node,
  compact: PropTypes.bool,
  name: PropTypes.string,
  sx: PropTypes.object,
  wheelCardScale: PropTypes.number,
  fontSizes: PropTypes.object
};

export default React.memo(OverlayWrapper);