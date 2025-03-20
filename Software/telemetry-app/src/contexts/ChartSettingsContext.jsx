import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { produce } from 'immer';
import _ from 'lodash';

// Enhanced default settings with performance optimizations
const defaultSettings = {
  global: { 
    theme: 'dark',
    animationDuration: 0, // Disabled animations by default for better performance
    enableHardwareAcceleration: true,
    enableTransitions: false, // Disabled transitions for better performance
  },
  realTime: {
    window: 10000,      // ms of data to show
    updateInterval: 150, // ms between chart updates - increased for better performance
    lineWidth: 1.5,     // thinner lines for better performance
    maxDataPoints: 500, // Limit data points for better performance
    downsample: true,   // Enable downsampling
  },
  historical: {
    downsampleThreshold: 1000, // Lower threshold for better performance
    downsampleFactor: 4,      // More aggressive downsampling
    dataZoomEnabled: false,   // Disable data zoom by default for better performance
    refreshRate: 0,           // Manual refresh only by default
    pageSize: 2000,           // Smaller page size for better performance
    maxAxisTicks: 4,          // Fewer axis ticks for better performance
  },
  // Dashboard settings
  dashboard: {
    updateInterval: 300,      // Update interval for all dashboard components (ms)
    useImperialUnits: false,  // Use mph instead of km/h
    showTempInF: false,       // Show temperature in Fahrenheit
    significantChangeThreshold: 1.0, // Only update when values change by this percentage
  }
};

// Storage key for localStorage
const STORAGE_KEY = 'telemetrySettings';

// Create the context with default values
export const ChartSettingsContext = createContext({
  settings: defaultSettings,
  setSettings: () => {},
  updateSettings: () => {},
  resetToDefaults: () => {},
  toggleTheme: () => {}
});

/**
 * Performance-optimized ChartSettingsProvider
 * - Uses localStorage for persistence
 * - Implements partial updates with Immer for better performance
 * - Provides reset functionality
 */
export const ChartSettingsProvider = ({ children }) => {
  // Try to load stored settings from localStorage
  const [settings, setSettingsState] = useState(() => {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);
      if (storedSettings) {
        // Merge stored settings with defaults for safety
        const parsed = JSON.parse(storedSettings);
        return {
          global: { ...defaultSettings.global, ...parsed.global },
          realTime: { ...defaultSettings.realTime, ...parsed.realTime },
          historical: { ...defaultSettings.historical, ...parsed.historical },
          dashboard: { ...defaultSettings.dashboard, ...parsed.dashboard },
        };
      }
    } catch (error) {
      console.error('Error loading settings from localStorage:', error);
    }
    return defaultSettings;
  });
  
  // Save settings to localStorage when they change, with debounce
  const debouncedSave = useMemo(
    () => _.debounce((settingsToSave) => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
      } catch (error) {
        console.error('Error saving settings to localStorage:', error);
      }
    }, 500),
    []
  );
  
  // Apply debounced save when settings change
  useEffect(() => {
    debouncedSave(settings);
    return () => debouncedSave.cancel();
  }, [settings, debouncedSave]);
  
  // Update entire settings object
  const setSettings = useCallback((newSettings) => {
    setSettingsState(newSettings);
  }, []);
  
  // Update specific section or key with minimal re-renders using Immer
  const updateSettings = useCallback((section, key, value) => {
    setSettingsState(produce(draft => {
      // If updating an entire section
      if (key === undefined) {
        draft[section] = { ...draft[section], ...value };
      } else {
        // If updating a specific key
        draft[section][key] = value;
      }
    }));
  }, []);
  
  // Reset settings to defaults
  const resetToDefaults = useCallback(() => {
    setSettingsState(defaultSettings);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error removing settings from localStorage:', error);
    }
  }, []);
  
  // Toggle theme
  const toggleTheme = useCallback(() => {
    setSettingsState(produce(draft => {
      draft.global.theme = draft.global.theme === 'light' ? 'dark' : 'light';
    }));
  }, []);
  
  // Check for prefers-reduced-motion media query for accessibility
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const applyAccessibilitySettings = () => {
      if (prefersReducedMotion.matches) {
        updateSettings('global', 'animationDuration', 0);
        updateSettings('global', 'enableTransitions', false);
      }
    };
    
    // Apply immediately and also on preference change
    applyAccessibilitySettings();
    
    // Add event listener for preference changes
    prefersReducedMotion.addEventListener('change', applyAccessibilitySettings);
    
    // Cleanup
    return () => {
      prefersReducedMotion.removeEventListener('change', applyAccessibilitySettings);
    };
  }, [updateSettings]);
  
  // Detect Raspberry Pi and apply optimizations
  useEffect(() => {
    // Disable animations on Raspberry Pi
    const isRaspberryPi = /Raspberry Pi/i.test(navigator.userAgent) || 
                          /Linux arm/i.test(navigator.userAgent) ||
                          localStorage.getItem('forceRaspberryPiMode') === 'true';
    
    if (isRaspberryPi) {
      console.log('Raspberry Pi detected, applying performance optimizations');
      
      // Apply performance optimizations
      updateSettings('global', {
        animationDuration: 0,
        enableTransitions: false,
        enableHardwareAcceleration: true,
      });
      
      updateSettings('dashboard', {
        updateInterval: 500
      });
      
      // More aggressive data point reduction for charts
      updateSettings('realTime', {
        maxDataPoints: 250,
        updateInterval: 250
      });
    }
  }, [updateSettings]);
  
  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    settings,
    setSettings,
    updateSettings,
    resetToDefaults,
    toggleTheme
  }), [settings, setSettings, updateSettings, resetToDefaults, toggleTheme]);
  
  return (
    <ChartSettingsContext.Provider value={contextValue}>
      {children}
    </ChartSettingsContext.Provider>
  );
};

ChartSettingsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default ChartSettingsContext;