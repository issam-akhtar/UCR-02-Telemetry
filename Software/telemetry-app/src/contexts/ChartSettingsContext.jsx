import React, { createContext, useState, useCallback, useMemo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { produce } from 'immer';
import _ from 'lodash';

const defaultSettings = {
  global: { 
    theme: 'dark',
    animationDuration: 0, // Disabled animations by default for better performance
    enableHardwareAcceleration: true,
    enableTransitions: false, // Disabled transitions for better performance
  },
  realTime: {
    window: 10000,      // ms of data to show (10 seconds by default)
    updateInterval: 150, // ms between chart updates - single source of throttling
    lineWidth: 1,     // line thickness
    enableSmoothing: true, // Enable smoothing for real-time charts
  },
  historical: {
    dataZoomEnabled: false,   // Disable data zoom by default for better performance
    refreshRate: 0,           // Manual refresh only by default
    pageSize: 2000,           // Smaller page size for better performance
    maxAxisTicks: 5,          // Fewer axis ticks for better performance
    downsampleThreshold: 2000, // New threshold for applying downsampling
    downsampleFactor: 5,       // Factor used when downsampling is applied
    enableSmoothing: true,     // Enable smoothing for historical charts
  },
  // Dashboard settings
  dashboard: {
    updateInterval: 300,      // Update interval for dashboard components (ms)
    useImperialUnits: false,  // Use mph instead of km/h
    showTempInF: false,       // Show temperature in Fahrenheit
    significantChangeThreshold: 1.0, // Only update when values change by this percentage
    chartLayout: 'grid',      // grid or list
    chartSize: 'medium',      // medium, large
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
  const [settings, setSettingsState] = useState(() => {
    try {
      const storedSettings = localStorage.getItem(STORAGE_KEY);
      if (storedSettings) {
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
  
  useEffect(() => {
    debouncedSave(settings);
    return () => debouncedSave.cancel();
  }, [settings, debouncedSave]);
  
  const setSettings = useCallback((newSettings) => {
    setSettingsState(newSettings);
  }, []);
  
  const updateSettings = useCallback((section, key, value) => {
    setSettingsState(produce(draft => {
      if (key === undefined) {
        draft[section] = { ...draft[section], ...value };
      } else {
        draft[section][key] = value;
      }
    }));
  }, []);
  
  const resetToDefaults = useCallback(() => {
    setSettingsState(defaultSettings);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Error removing settings from localStorage:', error);
    }
  }, []);
  
  const toggleTheme = useCallback(() => {
    setSettingsState(produce(draft => {
      draft.global.theme = draft.global.theme === 'light' ? 'dark' : 'light';
    }));
  }, []);
  
  // Additional effect for accessibility and color scheme
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const applyAccessibilitySettings = () => {
      if (prefersReducedMotion.matches) {
        updateSettings('global', 'animationDuration', 0);
        updateSettings('global', 'enableTransitions', false);
      }
    };
    applyAccessibilitySettings();
    prefersReducedMotion.addEventListener('change', applyAccessibilitySettings);
    return () => {
      prefersReducedMotion.removeEventListener('change', applyAccessibilitySettings);
    };
  }, [updateSettings]);
  
  useEffect(() => {
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
    const applyColorScheme = () => {
      const userHasSetTheme = localStorage.getItem(STORAGE_KEY) 
        ? JSON.parse(localStorage.getItem(STORAGE_KEY))?.global?.theme !== undefined
        : false;
      if (!userHasSetTheme) {
        updateSettings('global', 'theme', prefersDarkMode.matches ? 'dark' : 'light');
      }
    };
    applyColorScheme();
    prefersDarkMode.addEventListener('change', applyColorScheme);
    return () => {
      prefersDarkMode.removeEventListener('change', applyColorScheme);
    };
  }, [updateSettings]);
  
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