import React, { useMemo, useContext } from 'react';
import { useTheme } from '@mui/material';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

/**
 * Redesigned factory functions for creating wheel component overlays
 * with improved styling and modern UI elements that respect theme and settings
 */

export const createSuspensionComponent = (Component, position, value, customSettings = {}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  // Animation settings based on context
  const animationsEnabled = useMemo(() => 
    customSettings.animationsEnabled !== undefined 
      ? customSettings.animationsEnabled 
      : (settings.global.animationDuration > 0 && settings.global.enableTransitions),
  [customSettings.animationsEnabled, settings.global.animationDuration, settings.global.enableTransitions]);

  const animationDuration = useMemo(() => 
    customSettings.animationDuration || `${settings.global.animationDuration}ms`,
  [customSettings.animationDuration, settings.global.animationDuration]);

  // Hardware acceleration
  const enableHardwareAcceleration = useMemo(() =>
    customSettings.enableHardwareAcceleration !== undefined
      ? customSettings.enableHardwareAcceleration
      : settings.global.enableHardwareAcceleration,
  [customSettings.enableHardwareAcceleration, settings.global.enableHardwareAcceleration]);
  
  const suspensionValues = useMemo(() => ({
    FL: position === 'FL' ? value : null,
    FR: position === 'FR' ? value : null,
    RL: position === 'RL' ? value : null,
    RR: position === 'RR' ? value : null,
  }), [position, value]);
  
  const componentSettings = useMemo(() => ({
    transformForCard: true,
    compact: true,
    // Pass animation and hardware acceleration settings
    animationsEnabled,
    animationDuration,
    enableHardwareAcceleration,
    // Pass other settings
    significantChangeThreshold: settings.dashboard.significantChangeThreshold,
    sx: {
      height: '100%', 
      padding: 0,
      margin: 0,
      boxSizing: 'border-box',
      minHeight: 'auto',
      // Modern styling using theme
      borderRadius: theme.shape.borderRadius / 4,
      '& .MuiLinearProgress-root': {
        height: 3,
        borderRadius: theme.shape.borderRadius / 2,
      },
      '& svg': {
        fontSize: '0.7rem',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
        willChange: enableHardwareAcceleration ? 'transform, filter' : 'auto',
      },
      ...(customSettings?.sx || {}),
    },
    ...customSettings,
  }), [theme, animationsEnabled, animationDuration, enableHardwareAcceleration, 
      settings.dashboard.significantChangeThreshold, customSettings]);
  
  return (
    <Component 
      wheelFilter={position} 
      suspensionValues={suspensionValues}
      {...componentSettings}
    />
  );
};

export const createWheelSpeedComponent = (Component, position, frequency, customSettings = {}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  // Animation settings based on context
  const animationsEnabled = useMemo(() => 
    customSettings.animationsEnabled !== undefined 
      ? customSettings.animationsEnabled 
      : (settings.global.animationDuration > 0 && settings.global.enableTransitions),
  [customSettings.animationsEnabled, settings.global.animationDuration, settings.global.enableTransitions]);

  const animationDuration = useMemo(() => 
    customSettings.animationDuration || `${settings.global.animationDuration}ms`,
  [customSettings.animationDuration, settings.global.animationDuration]);

  // Hardware acceleration
  const enableHardwareAcceleration = useMemo(() =>
    customSettings.enableHardwareAcceleration !== undefined
      ? customSettings.enableHardwareAcceleration
      : settings.global.enableHardwareAcceleration,
  [customSettings.enableHardwareAcceleration, settings.global.enableHardwareAcceleration]);
  
  const speedValues = useMemo(() => ({
    FL: position === 'FL' ? frequency : null,
    FR: position === 'FR' ? frequency : null,
    RL: position === 'RL' ? frequency : null,
    RR: position === 'RR' ? frequency : null,
  }), [position, frequency]);
  
  const componentSettings = useMemo(() => ({
    transformForCard: true,
    compact: true,
    // Pass animation and hardware acceleration settings
    animationsEnabled,
    animationDuration,
    enableHardwareAcceleration,
    // Pass unit conversion settings
    useImperialUnits: settings.dashboard.useImperialUnits,
    significantChangeThreshold: settings.dashboard.significantChangeThreshold,
    sx: {
      height: '100%',
      padding: 0,
      margin: 0,
      boxSizing: 'border-box',
      minHeight: 'auto',
      // Modern styling using theme
      borderRadius: theme.shape.borderRadius / 4,
      '& svg': {
        fontSize: '0.7rem',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
        willChange: enableHardwareAcceleration ? 'transform, filter' : 'auto',
      },
      ...(customSettings?.sx || {}),
    },
    ...customSettings,
  }), [theme, animationsEnabled, animationDuration, enableHardwareAcceleration, 
      settings.dashboard.useImperialUnits, settings.dashboard.significantChangeThreshold, 
      customSettings]);
  
  return (
    <Component 
      wheelFilter={position}
      speedValues={speedValues}
      {...componentSettings}
    />
  );
};

export const createStrainComponent = (Component, position, strain, customSettings = {}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  // Animation settings based on context
  const animationsEnabled = useMemo(() => 
    customSettings.animationsEnabled !== undefined 
      ? customSettings.animationsEnabled 
      : (settings.global.animationDuration > 0 && settings.global.enableTransitions),
  [customSettings.animationsEnabled, settings.global.animationDuration, settings.global.enableTransitions]);

  const animationDuration = useMemo(() => 
    customSettings.animationDuration || `${settings.global.animationDuration}ms`,
  [customSettings.animationDuration, settings.global.animationDuration]);

  // Hardware acceleration
  const enableHardwareAcceleration = useMemo(() =>
    customSettings.enableHardwareAcceleration !== undefined
      ? customSettings.enableHardwareAcceleration
      : settings.global.enableHardwareAcceleration,
  [customSettings.enableHardwareAcceleration, settings.global.enableHardwareAcceleration]);
  
  const strainValues = useMemo(() => ({
    FL: position === 'FL' ? strain : null,
    FR: position === 'FR' ? strain : null,
    RL: position === 'RL' ? strain : null,
    RR: position === 'RR' ? strain : null,
  }), [position, strain]);
  
  const componentSettings = useMemo(() => ({
    transformForCard: true,
    compact: true,
    // Pass animation and hardware acceleration settings
    animationsEnabled,
    animationDuration,
    enableHardwareAcceleration,
    significantChangeThreshold: settings.dashboard.significantChangeThreshold,
    sx: {
      height: '100%',
      padding: 0,
      margin: 0,
      boxSizing: 'border-box',
      minHeight: 'auto',
      // Modern styling using theme
      borderRadius: theme.shape.borderRadius / 4,
      '&::after': {
        inset: -2,
      },
      '& svg': {
        fontSize: '0.7rem',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
        willChange: enableHardwareAcceleration ? 'transform, filter' : 'auto',
      },
      ...(customSettings?.sx || {}),
    },
    ...customSettings,
  }), [theme, animationsEnabled, animationDuration, enableHardwareAcceleration, 
      settings.dashboard.significantChangeThreshold, customSettings]);
  
  return (
    <Component 
      wheelFilter={position}
      strainValues={strainValues}
      {...componentSettings}
    />
  );
};

export const createAeroComponent = (Component, position, data, customSettings = {}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  // Animation settings based on context
  const animationsEnabled = useMemo(() => 
    customSettings.animationsEnabled !== undefined 
      ? customSettings.animationsEnabled 
      : (settings.global.animationDuration > 0 && settings.global.enableTransitions),
  [customSettings.animationsEnabled, settings.global.animationDuration, settings.global.enableTransitions]);

  const animationDuration = useMemo(() => 
    customSettings.animationDuration || `${settings.global.animationDuration}ms`,
  [customSettings.animationDuration, settings.global.animationDuration]);

  // Hardware acceleration
  const enableHardwareAcceleration = useMemo(() =>
    customSettings.enableHardwareAcceleration !== undefined
      ? customSettings.enableHardwareAcceleration
      : settings.global.enableHardwareAcceleration,
  [customSettings.enableHardwareAcceleration, settings.global.enableHardwareAcceleration]);
  
  const aeroValues = useMemo(() => {
    const pressure = data?.pressure;
    const temperature = data?.temperature;
    return {
      FL: position === 'FL' ? { pressure, temperature } : null,
      FR: position === 'FR' ? { pressure, temperature } : null,
      RL: position === 'RL' ? { pressure, temperature } : null,
      RR: position === 'RR' ? { pressure, temperature } : null,
    };
  }, [position, data]);
  
  const componentSettings = useMemo(() => ({
    transformForCard: true,
    compact: true,
    // Pass animation and hardware acceleration settings
    animationsEnabled,
    animationDuration,
    enableHardwareAcceleration,
    // Pass temperature unit setting
    showTempInF: settings.dashboard.showTempInF,
    significantChangeThreshold: settings.dashboard.significantChangeThreshold,
    sx: {
      height: '100%',
      padding: 0,
      margin: 0,
      boxSizing: 'border-box',
      minHeight: 'auto',
      // Modern styling using theme
      borderRadius: theme.shape.borderRadius / 4,
      '& > .MuiBox-root': {
        py: 0.3,
        borderRadius: theme.shape.borderRadius / 4,
      },
      '& .MuiBox-root + .MuiBox-root': {
        mt: 0.2,
      },
      '& svg': {
        fontSize: '0.7rem',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))',
        willChange: enableHardwareAcceleration ? 'transform, filter' : 'auto',
      },
      ...(customSettings?.sx || {}),
    },
    ...customSettings,
  }), [theme, animationsEnabled, animationDuration, enableHardwareAcceleration, 
      settings.dashboard.showTempInF, settings.dashboard.significantChangeThreshold, 
      customSettings]);
  
  return (
    <Component 
      wheelFilter={position}
      aeroValues={aeroValues}
      {...componentSettings}
    />
  );
};