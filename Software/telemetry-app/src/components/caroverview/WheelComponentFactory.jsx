import React, { useMemo, useContext } from 'react';
import { useTheme } from '@mui/material';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

/**
 * Performance-optimized factory functions for creating wheel component overlays
 * Simplified implementation focusing on speed and minimal re-rendering
 */

/**
 * Creates common settings once to avoid recalculation in each factory function
 */
const useCommonSettings = (customSettings = {}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  return useMemo(() => {
    // Extract global settings with fallbacks
    const {
      animationDuration = 0,
      enableTransitions = false,
      enableHardwareAcceleration = true
    } = settings.global || {};
    
    // Extract dashboard settings with fallbacks
    const {
      chartSize = 'medium',
      significantChangeThreshold = 1.5,
      updateInterval = 300,
      useImperialUnits = false,
      showTempInF = false
    } = settings.dashboard || {};
    
    // Animation settings - using simple defaults and overrides
    const animationsEnabled = customSettings.animationsEnabled ?? 
      (animationDuration > 0 && enableTransitions);
    
    const animDuration = customSettings.animationDuration ?? 
      (typeof animationDuration === 'string' ? animationDuration : `${animationDuration}ms`);
    
    const animEasing = customSettings.animationEasing ?? 'ease-out';
    
    const hwAcceleration = customSettings.enableHardwareAcceleration ?? 
      enableHardwareAcceleration;
    
    // Calculate size scale once
    const sizeScale = chartSize === 'large' ? 1.2 : 
                      chartSize === 'small' ? 0.8 : 1.0;
    
    // Base styles for all components
    const baseStyles = {
      height: '100%',
      padding: 0,
      margin: 0,
      boxSizing: 'border-box',
      minHeight: 'auto',
      borderRadius: theme.shape.borderRadius / 4,
      // SVG styling
      '& svg': {
        fontSize: `${0.7 * sizeScale}rem`,
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
        ...(hwAcceleration ? { willChange: 'transform' } : {})
      },
      // Typography styles pre-computed for all components
      '& .MuiTypography-body2': {
        fontSize: `${0.65 * sizeScale}rem`
      },
      '& .MuiTypography-caption': {
        fontSize: `${0.6 * sizeScale}rem`
      }
    };
    
    return {
      theme,
      settings,
      animationsEnabled,
      animationDuration: animDuration,
      animationEasing: animEasing,
      enableHardwareAcceleration: hwAcceleration,
      significantChangeThreshold,
      updateInterval,
      useImperialUnits,
      showTempInF,
      sizeScale,
      baseStyles
    };
  }, [theme, settings, customSettings]);
};

/**
 * Creates a suspension component with optimized settings
 */
export const createSuspensionComponent = (Component, position, value, customSettings = {}) => {
  // Get common settings - only recalculated when dependencies change
  const commonSettings = useCommonSettings(customSettings);
  
  // Create suspension values object - only recreated when position or value changes
  const suspensionValues = {
    FL: position === 'FL' ? value : null,
    FR: position === 'FR' ? value : null,
    RL: position === 'RL' ? value : null,
    RR: position === 'RR' ? value : null
  };
  
  // Component-specific styles
  const componentStyles = {
    ...commonSettings.baseStyles,
    '& .MuiLinearProgress-root': {
      height: 3 * commonSettings.sizeScale,
      borderRadius: commonSettings.theme.shape.borderRadius / 2
    },
    ...(customSettings.sx || {})
  };
  
  return (
    <Component 
      wheelFilter={position} 
      suspensionValues={suspensionValues}
      transformForCard={true}
      compact={true}
      animationsEnabled={commonSettings.animationsEnabled}
      animationDuration={commonSettings.animationDuration}
      animationEasing={commonSettings.animationEasing}
      enableHardwareAcceleration={commonSettings.enableHardwareAcceleration}
      significantChangeThreshold={commonSettings.significantChangeThreshold}
      updateInterval={commonSettings.updateInterval}
      useImperialUnits={commonSettings.useImperialUnits}
      sx={componentStyles}
      {...customSettings}
    />
  );
};

/**
 * Creates a wheel speed component with optimized settings
 */
export const createWheelSpeedComponent = (Component, position, frequency, tireSize, customSettings = {}) => {
  // Get common settings
  const commonSettings = useCommonSettings(customSettings);
  
  // Create speed values object
  const speedValues = {
    FL: position === 'FL' ? frequency : null,
    FR: position === 'FR' ? frequency : null,
    RL: position === 'RL' ? frequency : null,
    RR: position === 'RR' ? frequency : null
  };
  
  // Component-specific styles
  const componentStyles = {
    ...commonSettings.baseStyles,
    ...(customSettings.sx || {})
  };
  
  return (
    <Component 
      wheelFilter={position}
      speedValues={speedValues}
      transformForCard={true}
      compact={true}
      animationsEnabled={commonSettings.animationsEnabled}
      animationDuration={commonSettings.animationDuration}
      animationEasing={commonSettings.animationEasing}
      enableHardwareAcceleration={commonSettings.enableHardwareAcceleration}
      significantChangeThreshold={commonSettings.significantChangeThreshold}
      updateInterval={commonSettings.updateInterval}
      useImperialUnits={commonSettings.useImperialUnits}
      tireSize={tireSize}
      sx={componentStyles}
      {...customSettings}
    />
  );
};

/**
 * Creates a strain component with optimized settings
 */
export const createStrainComponent = (Component, position, strain, customSettings = {}) => {
  // Get common settings
  const commonSettings = useCommonSettings(customSettings);
  
  // Create strain values object
  const strainValues = {
    FL: position === 'FL' ? strain : null,
    FR: position === 'FR' ? strain : null,
    RL: position === 'RL' ? strain : null,
    RR: position === 'RR' ? strain : null
  };
  
  // Component-specific styles
  const componentStyles = {
    ...commonSettings.baseStyles,
    '&::after': {
      inset: -2
    },
    '& .MuiTypography-caption': {
      padding: `${0.2 * commonSettings.sizeScale}px ${0.5 * commonSettings.sizeScale}px`
    },
    ...(customSettings.sx || {})
  };
  
  return (
    <Component 
      wheelFilter={position}
      strainValues={strainValues}
      transformForCard={true}
      compact={true}
      animationsEnabled={commonSettings.animationsEnabled}
      animationDuration={commonSettings.animationDuration}
      animationEasing={commonSettings.animationEasing}
      enableHardwareAcceleration={commonSettings.enableHardwareAcceleration}
      significantChangeThreshold={commonSettings.significantChangeThreshold}
      updateInterval={commonSettings.updateInterval}
      sx={componentStyles}
      {...customSettings}
    />
  );
};

/**
 * Creates an aero component with optimized settings
 */
export const createAeroComponent = (Component, position, data, customSettings = {}) => {
  // Get common settings
  const commonSettings = useCommonSettings(customSettings);
  
  // Create aero values object with null safety
  const aeroValues = {
    FL: position === 'FL' ? { pressure: data?.pressure ?? 0, temperature: data?.temperature ?? 0 } : null,
    FR: position === 'FR' ? { pressure: data?.pressure ?? 0, temperature: data?.temperature ?? 0 } : null,
    RL: position === 'RL' ? { pressure: data?.pressure ?? 0, temperature: data?.temperature ?? 0 } : null,
    RR: position === 'RR' ? { pressure: data?.pressure ?? 0, temperature: data?.temperature ?? 0 } : null
  };
  
  // Component-specific styles
  const componentStyles = {
    ...commonSettings.baseStyles,
    '& > .MuiBox-root': {
      py: 0.3 * commonSettings.sizeScale,
      borderRadius: commonSettings.theme.shape.borderRadius / 4
    },
    '& .MuiBox-root + .MuiBox-root': {
      mt: 0.2 * commonSettings.sizeScale
    },
    '& .MuiTypography-caption': {
      padding: `${0.2 * commonSettings.sizeScale}px ${0.5 * commonSettings.sizeScale}px`
    },
    ...(customSettings.sx || {})
  };
  
  return (
    <Component 
      wheelFilter={position}
      aeroValues={aeroValues}
      transformForCard={true}
      compact={true}
      animationsEnabled={commonSettings.animationsEnabled}
      animationDuration={commonSettings.animationDuration}
      animationEasing={commonSettings.animationEasing}
      enableHardwareAcceleration={commonSettings.enableHardwareAcceleration}
      significantChangeThreshold={commonSettings.significantChangeThreshold}
      updateInterval={commonSettings.updateInterval}
      useImperialUnits={commonSettings.useImperialUnits}
      showTempInF={commonSettings.showTempInF}
      sx={componentStyles}
      {...customSettings}
    />
  );
};