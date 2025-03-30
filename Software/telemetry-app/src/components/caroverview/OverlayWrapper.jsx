import React, { useContext } from 'react';
import { Box, alpha, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

/**
 * Performance-Optimized OverlayWrapper Component
 * 
 * A lightweight wrapper for telemetry overlays that provides consistent styling
 * and passes down ChartSettingsContext values with minimal rendering overhead.
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
  
  // Extract only the settings we need
  const { global = {}, dashboard = {}, realTime = {} } = settings;
  
  // Animation settings
  const animationsEnabled = global.animationDuration > 0 && global.enableTransitions;
  const animationDuration = `${global.animationDuration || 0}ms`;
  const animationEasing = realTime.enableSmoothing ? 'cubic-bezier(0.4, 0.0, 0.2, 1)' : 'ease';
  
  // Chart size adjustment
  const sizeAdjustment = dashboard.chartSize === 'large' ? 1.2 : 
                         dashboard.chartSize === 'small' ? 0.8 : 1.0;
  
  // Calculate scale once
  const dynamicScale = wheelCardScale * 0.8 * sizeAdjustment;
  
  // Simplified font size calculation
  const scaledFontSizes = {
    title: `${parseFloat(fontSizes.title || '0.6rem') * sizeAdjustment}rem`,
    value: `${parseFloat(fontSizes.value || '0.65rem') * sizeAdjustment}rem`,
    label: `${parseFloat(fontSizes.label || '0.45rem') * sizeAdjustment}rem`
  };
  
  // Create transition style only if animations are enabled
  const transitionStyle = animationsEnabled ? {
    transition: `background-color ${animationDuration} ${animationEasing}, box-shadow ${animationDuration} ${animationEasing}`,
    willChange: global.enableHardwareAcceleration ? 'background-color, box-shadow' : 'auto'
  } : {};
  
  // Optimize child transition styles
  const childTransitionStyle = animationsEnabled ? {
    '& .MuiTypography-root': {
      transition: `color ${animationDuration} ${animationEasing}`
    },
    '& .MuiTypography-caption': {
      transition: `background-color ${animationDuration} ${animationEasing}, box-shadow ${animationDuration} ${animationEasing}`
    },
    '& svg': {
      transition: `color ${animationDuration} ${animationEasing}, filter ${animationDuration} ${animationEasing}`
    }
  } : {};

  // Don't render if no children
  if (!React.Children.count(children)) return null;
  
  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        minHeight: compact ? 24 : 28,
        height: 'auto',
        mb: dashboard.chartLayout === 'grid' ? theme.spacing(0.75) : theme.spacing(1),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'auto',
        zIndex: 1,
        overflow: 'visible',
        '&:hover': {
          backgroundColor: alpha(theme.palette.common.white, 0.03),
          boxShadow: `0 1px 4px ${alpha(theme.palette.common.black, 0.1)}`
        },
        ...transitionStyle,
        ...sx
      }}
      role="region"
      aria-label={name || 'Telemetry overlay'}
      tabIndex={0}
    >
      {React.Children.map(children, child => {
        if (!child) return null;
        
        // Prepare base styles for child
        const childBaseStyle = {
          position: 'relative',
          top: 'auto',
          left: 'auto',
          right: 'auto',
          bottom: 'auto',
          width: '100%',
          height: '100%',
          // Enhance text readability
          '& .MuiTypography-root': {
            fontWeight: 600,
            textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.2)}`,
          },
          // Make value displays pop more
          '& [role="progressbar"]': {
            height: compact ? 2 : 3,
          },
          // Enhance status pills
          '& .MuiTypography-caption': {
            boxShadow: theme.shadows[1],
          },
          // Apply hardware acceleration if enabled
          willChange: global.enableHardwareAcceleration ? 'transform' : 'auto',
          ...childTransitionStyle,
          ...(child.props.sx || {})
        };
        
        // Clone the child with optimized props
        return React.cloneElement(child, {
          sx: childBaseStyle,
          transformForCard: true,
          compact,
          'aria-hidden': 'false',
          scale: dynamicScale,
          // Animation settings
          animationsEnabled,
          animationDuration,
          animationEasing,
          // Dashboard settings
          useImperialUnits: dashboard.useImperialUnits,
          showTempInF: dashboard.showTempInF,
          significantChangeThreshold: dashboard.significantChangeThreshold,
          updateInterval: dashboard.updateInterval,
          // Hardware acceleration
          enableHardwareAcceleration: global.enableHardwareAcceleration,
          // Smoothing
          enableSmoothing: realTime.enableSmoothing,
          // Font sizes
          fontSizes: scaledFontSizes
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