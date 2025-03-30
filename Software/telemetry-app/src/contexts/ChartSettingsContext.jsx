import React, { createContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
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
    updateInterval: 100, // ms between chart updates - single source of throttling
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
    brushEnabled: false,       // Disable brush by default
  },
  // Dashboard settings
  dashboard: {
    updateInterval: 300,      // Update interval for dashboard components (ms)
    useImperialUnits: false,  // Use mph instead of km/h
    showTempInF: false,       // Show temperature in Fahrenheit
    significantChangeThreshold: 1.5, // Only update when values change by this percentage
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
 * Helper to safely access localStorage
 */
const safeLocalStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn('Error accessing localStorage:', error);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.warn('Error writing to localStorage:', error);
      return false;
    }
  },
  removeItem: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Error removing from localStorage:', error);
      return false;
    }
  }
};

/**
 * Deep merge utility that properly preserves nested properties
 */
const deepMerge = (target, source) => {
  const result = { ...target };
  
  if (source && typeof source === 'object') {
    Object.keys(source).forEach(key => {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (target[key] && typeof target[key] === 'object') {
          result[key] = deepMerge(target[key], source[key]);
        } else {
          result[key] = { ...source[key] };
        }
      } else {
        result[key] = source[key];
      }
    });
  }
  
  return result;
};

/**
 * Improved deep clone function that handles all types correctly
 */
const deepClone = (obj) => {
  // Handle simple types and null/undefined
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  // Handle Array objects
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  // Handle plain objects
  const result = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = deepClone(obj[key]);
    }
  }
  
  return result;
};

/**
 * Broadcasts settings changes to all parts of the application
 */
const broadcastSettingsChange = (settings) => {
  // Use both window and document to ensure all listeners receive the event
  try {
    window.dispatchEvent(new CustomEvent('settings-updated', { 
      detail: { settings: deepClone(settings) },
      bubbles: true
    }));
  } catch (e) {
    console.error('Failed to dispatch window settings-updated event:', e);
  }
  
  try {
    document.dispatchEvent(new CustomEvent('settings-updated', { 
      detail: { settings: deepClone(settings) },
      bubbles: true
    }));
  } catch (e) {
    console.error('Failed to dispatch document settings-updated event:', e);
  }
  
  try {
    window.dispatchEvent(new Event('settingsChanged'));
  } catch (e) {
    console.error('Failed to dispatch settingsChanged event:', e);
  }
};

/**
 * Performance-optimized ChartSettingsProvider
 * - Uses localStorage for persistence
 * - Implements partial updates with Immer for better performance
 * - Provides reset functionality
 */
export const ChartSettingsProvider = ({ children }) => {
  // Track if component is mounted to prevent updates after unmount
  const isMountedRef = useRef(true);
  
  // Track whether we've already applied media query preferences
  const initialSetupDoneRef = useRef({
    motionPreferences: false,
    colorSchemePreferences: false
  });
  
  // Refs for media query listeners to ensure proper cleanup
  const mediaQueryRefs = useRef({
    prefersReducedMotion: null,
    prefersDarkMode: null
  });

  // Ref to track that settings have actually changed
  const settingsChangeRef = useRef(0);
  
  // Initialize settings from localStorage or defaults
  const [settings, setSettingsState] = useState(() => {
    const storedSettings = safeLocalStorage.getItem(STORAGE_KEY);
    
    if (storedSettings) {
      try {
        const parsed = JSON.parse(storedSettings);
        // Use deep merge to ensure all properties from defaults are preserved
        return deepMerge(defaultSettings, parsed);
      } catch (error) {
        console.error('Error parsing settings from localStorage:', error);
      }
    }
    
    return deepClone(defaultSettings);
  });
  
  // Create a debounced save function that persists settings to localStorage
  const debouncedSave = useRef(
    _.debounce((settingsToSave) => {
      if (!isMountedRef.current) return;
      
      try {
        safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
        console.log('Settings saved to localStorage');
      } catch (error) {
        console.error('Error saving settings to localStorage:', error);
      }
    }, 200) // Reduced debounce time to ensure settings are saved promptly
  ).current;
  
  // Save settings to localStorage when they change
  useEffect(() => {
    // Only save if settings have actually changed
    if (settingsChangeRef.current > 0) {
      // Save settings to localStorage
      debouncedSave(settings);
    }
    
    return () => {
      // Cancel any pending debounced saves
      debouncedSave.cancel();
    };
  }, [settings, debouncedSave]);
  
  // Safe setter function that respects the mounted state
  const safeSetSettingsState = useCallback((updater) => {
    if (!isMountedRef.current) return;
    
    settingsChangeRef.current += 1; // Mark that settings have changed
    
    if (typeof updater === 'function') {
      setSettingsState(prevSettings => {
        const newSettings = updater(prevSettings);
        return newSettings;
      });
    } else {
      setSettingsState(updater);
    }
  }, []);
  
  // Complete settings replacement - FIXED VERSION
  const setSettings = useCallback((newSettings) => {
    console.log('Setting new settings:', newSettings);
    
    // Ensure we have a valid settings object
    if (!newSettings || typeof newSettings !== 'object') {
      console.error('Invalid settings object received:', newSettings);
      return;
    }
    
    // Make sure we're setting the entire settings object with all sections
    const validatedSettings = deepClone({
      global: { ...defaultSettings.global, ...(newSettings.global || {}) },
      realTime: { ...defaultSettings.realTime, ...(newSettings.realTime || {}) },
      historical: { ...defaultSettings.historical, ...(newSettings.historical || {}) },
      dashboard: { ...defaultSettings.dashboard, ...(newSettings.dashboard || {}) }
    });
    
    // Update the state with the validated settings
    safeSetSettingsState(validatedSettings);
    
    // Force an immediate save to localStorage
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(validatedSettings));
    
    // Broadcast settings changes immediately without setTimeout
    broadcastSettingsChange(validatedSettings);
    
    // Update external services directly
    if (window.wsService && typeof window.wsService.updateSettings === 'function') {
      window.wsService.updateSettings(validatedSettings);
    }
    
    if (window.animationContext && typeof window.animationContext.setConfig === 'function') {
      window.animationContext.setConfig({
        enabled: validatedSettings?.global?.enableTransitions ?? true,
        duration: validatedSettings?.global?.animationDuration ?? 300
      });
    }
  }, [safeSetSettingsState]);
  
  // Partial settings update with Immer - FIXED VERSION
  const updateSettings = useCallback((section, key, value) => {
    console.log(`Updating settings: ${section}.${key} =`, value);
    
    safeSetSettingsState(produce(draft => {
      if (key === undefined && typeof value === 'object') {
        // Update entire section with object
        draft[section] = { ...draft[section], ...value };
      } else if (key !== undefined) {
        // Update specific key in section
        draft[section][key] = value;
      }
      return draft;
    }));
    
    // Get the updated settings for broadcasting
    setTimeout(() => {
      const updatedSettings = deepClone(settings);
      if (key === undefined && typeof value === 'object') {
        updatedSettings[section] = { ...updatedSettings[section], ...value };
      } else if (key !== undefined) {
        updatedSettings[section][key] = value;
      }
      
      // Broadcast the change
      broadcastSettingsChange(updatedSettings);
    }, 0);
  }, [safeSetSettingsState, settings]);
  
  // Reset to default settings - FIXED VERSION
  const resetToDefaults = useCallback(() => {
    console.log('Resetting settings to defaults');
    
    // Clone to avoid reference issues
    const clonedDefaults = deepClone(defaultSettings);
    
    // Update state
    safeSetSettingsState(clonedDefaults);
    
    // Save immediately to localStorage
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(clonedDefaults));
    
    // Broadcast the reset immediately
    broadcastSettingsChange(clonedDefaults);
    
    // Update external services directly
    if (window.wsService && typeof window.wsService.updateSettings === 'function') {
      window.wsService.updateSettings(clonedDefaults);
    }
    
    if (window.animationContext && typeof window.animationContext.setConfig === 'function') {
      window.animationContext.setConfig({
        enabled: clonedDefaults?.global?.enableTransitions ?? true,
        duration: clonedDefaults?.global?.animationDuration ?? 300
      });
    }
  }, [safeSetSettingsState]);
  
  // Toggle between light and dark theme
  const toggleTheme = useCallback(() => {
    safeSetSettingsState(produce(draft => {
      draft.global.theme = draft.global.theme === 'light' ? 'dark' : 'light';
      return draft;
    }));
    
    // Notify of theme change specifically
    setTimeout(() => {
      try {
        window.dispatchEvent(new CustomEvent('theme-changed'));
      } catch (e) {
        console.warn('Error dispatching theme-changed event:', e);
      }
    }, 0);
  }, [safeSetSettingsState]);
  
  // Setup listeners for events from other parts of the application
  useEffect(() => {
    const handleSettingsUpdateEvent = (event) => {
      console.log('Context received settings-updated event:', event?.detail);
      
      if (event?.detail?.settings) {
        // When receiving complete settings from elsewhere
        const newSettings = event.detail.settings;
        setSettingsState(current => {
          // Only update if different to prevent loops
          if (JSON.stringify(current) !== JSON.stringify(newSettings)) {
            return deepClone(newSettings);
          }
          return current;
        });
      } else if (event?.detail?.section && (event?.detail?.key !== undefined || event?.detail?.partial)) {
        // Handle partial update events
        const { section, key, value } = event.detail;
        setSettingsState(produce(draft => {
          if (key === undefined && typeof value === 'object') {
            draft[section] = { ...draft[section], ...value };
          } else if (key !== undefined) {
            draft[section][key] = value;
          }
          return draft;
        }));
      }
    };
    
    const handleForceUpdate = () => {
      console.log('Context received force-ui-update event');
      // Force a re-render by making a copy of settings
      setSettingsState(current => deepClone(current));
    };
    
    // Listen on both window and document to catch all events
    window.addEventListener('settings-updated', handleSettingsUpdateEvent);
    document.addEventListener('settings-updated', handleSettingsUpdateEvent);
    window.addEventListener('force-ui-update', handleForceUpdate);
    
    return () => {
      window.removeEventListener('settings-updated', handleSettingsUpdateEvent);
      document.removeEventListener('settings-updated', handleSettingsUpdateEvent);
      window.removeEventListener('force-ui-update', handleForceUpdate);
    };
  }, []);
  
  // Handle media query preferences (reduced motion and color scheme)
  useEffect(() => {
    // Create media query matchers
    const createMediaMatchers = () => {
      try {
        mediaQueryRefs.current.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        mediaQueryRefs.current.prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
      } catch (error) {
        console.warn('Media query not supported:', error);
      }
    };
    
    // Apply accessibility settings based on reduced motion preference
    const applyAccessibilitySettings = () => {
      if (!initialSetupDoneRef.current.motionPreferences) {
        initialSetupDoneRef.current.motionPreferences = true;
        
        const prefersReducedMotion = mediaQueryRefs.current.prefersReducedMotion;
        if (prefersReducedMotion && prefersReducedMotion.matches) {
          // Use safest approach to update without triggering re-renders
          safeSetSettingsState(produce(draft => {
            draft.global.animationDuration = 0;
            draft.global.enableTransitions = false;
            return draft;
          }));
        }
      }
    };
    
    // Apply color scheme based on system preference
    const applyColorScheme = () => {
      if (!initialSetupDoneRef.current.colorSchemePreferences) {
        initialSetupDoneRef.current.colorSchemePreferences = true;
        
        const prefersDarkMode = mediaQueryRefs.current.prefersDarkMode;
        if (prefersDarkMode) {
          // Check if user has explicitly set a theme
          const storedSettings = safeLocalStorage.getItem(STORAGE_KEY);
          const userHasSetTheme = storedSettings && 
            JSON.parse(storedSettings)?.global?.theme !== undefined;
          
          if (!userHasSetTheme) {
            safeSetSettingsState(produce(draft => {
              draft.global.theme = prefersDarkMode.matches ? 'dark' : 'light';
              return draft;
            }));
          }
        }
      }
    };
    
    // Setup media query listeners
    const setupMediaListeners = () => {
      const reducedMotion = mediaQueryRefs.current.prefersReducedMotion;
      const darkMode = mediaQueryRefs.current.prefersDarkMode;
      
      if (reducedMotion) {
        const handleReducedMotionChange = () => {
          if (reducedMotion.matches) {
            safeSetSettingsState(produce(draft => {
              draft.global.animationDuration = 0;
              draft.global.enableTransitions = false;
              return draft;
            }));
          }
        };
        
        // Modern browsers use addEventListener, older use addListener
        if (reducedMotion.addEventListener) {
          reducedMotion.addEventListener('change', handleReducedMotionChange);
        } else if (reducedMotion.addListener) {
          reducedMotion.addListener(handleReducedMotionChange);
        }
      }
      
      if (darkMode) {
        const handleDarkModeChange = () => {
          // Only update if user hasn't explicitly set a theme
          const storedSettings = safeLocalStorage.getItem(STORAGE_KEY);
          const userHasSetTheme = storedSettings && 
            JSON.parse(storedSettings)?.global?.theme !== undefined;
          
          if (!userHasSetTheme) {
            safeSetSettingsState(produce(draft => {
              draft.global.theme = darkMode.matches ? 'dark' : 'light';
              return draft;
            }));
          }
        };
        
        // Modern browsers use addEventListener, older use addListener
        if (darkMode.addEventListener) {
          darkMode.addEventListener('change', handleDarkModeChange);
        } else if (darkMode.addListener) {
          darkMode.addListener(handleDarkModeChange);
        }
      }
    };
    
    // Initialize everything
    createMediaMatchers();
    applyAccessibilitySettings();
    applyColorScheme();
    setupMediaListeners();
    
    // Cleanup function to remove all listeners
    return () => {
      isMountedRef.current = false;
      
      const reducedMotion = mediaQueryRefs.current.prefersReducedMotion;
      const darkMode = mediaQueryRefs.current.prefersDarkMode;
      
      // Safely remove listeners using appropriate method
      if (reducedMotion) {
        if (reducedMotion.removeEventListener) {
          reducedMotion.removeEventListener('change', applyAccessibilitySettings);
        } else if (reducedMotion.removeListener) {
          reducedMotion.removeListener(applyAccessibilitySettings);
        }
      }
      
      if (darkMode) {
        if (darkMode.removeEventListener) {
          darkMode.removeEventListener('change', applyColorScheme);
        } else if (darkMode.removeListener) {
          darkMode.removeListener(applyColorScheme);
        }
      }
    };
  }, [safeSetSettingsState]); // Removed settings from dependencies to prevent unnecessary updates
  
  // Synchronize with external services immediately when settings change
  useEffect(() => {
    // Update any external services that need settings
    if (window.wsService && typeof window.wsService.updateSettings === 'function') {
      window.wsService.updateSettings(settings);
    }
    
    // Update any animation contexts
    if (window.animationContext && typeof window.animationContext.setConfig === 'function') {
      window.animationContext.setConfig({
        enabled: settings?.global?.enableTransitions ?? true,
        duration: settings?.global?.animationDuration ?? 300
      });
    }
  }, [settings]);
  
  // Memoize the context value to prevent unnecessary renders
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