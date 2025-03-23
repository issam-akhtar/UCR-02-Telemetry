import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';

/**
 * Storage keys for persistent data
 */
const STORAGE_KEYS = {
  REAL_TIME_CHARTS: 'realTimeSelectedCharts',
  HISTORICAL_CHARTS: 'historicalSelectedCharts',
  REAL_TIME_SIDEBAR: 'realTimeSidebarCollapsed',
  HISTORICAL_SIDEBAR: 'historicalSidebarCollapsed',
  REAL_TIME_VIEWS: 'telemetryDashboardViewsRealTime',
  HISTORICAL_VIEWS: 'telemetryDashboardViewsHistorical',
  REAL_TIME_FAVORITES: 'telemetryFavoritesRealTime',
  HISTORICAL_FAVORITES: 'telemetryFavoritesHistorical',
  LAST_ACTIVE_VIEW: 'telemetryLastActiveView',
};

// Default chart selections if nothing is in localStorage
const DEFAULT_REAL_TIME_CHARTS = ['tcu', 'pack_current', 'cell', 'pack_voltage'];
const DEFAULT_HISTORICAL_CHARTS = ['tcuData', 'packCurrentData', 'cellData', 'packVoltageData', 'thermData'];

// Define context shape
export const ChartSelectionContext = createContext({
  // Real-time chart selections
  realTimeSelectedCharts: [],
  setRealTimeSelectedCharts: () => {},
  
  // Historical chart selections
  historicalSelectedCharts: [],
  setHistoricalSelectedCharts: () => {},

  // Sidebar collapsed states for both pages
  realTimeSidebarCollapsed: false,
  setRealTimeSidebarCollapsed: () => {},
  historicalSidebarCollapsed: false,
  setHistoricalSidebarCollapsed: () => {},
  
  // Saved views functionality
  savedViews: {
    realTime: [],
    historical: []
  },
  saveView: () => {},
  loadView: () => {},
  deleteView: () => {},
  updateView: () => {},
  
  // Favorites functionality
  favorites: {
    realTime: [],
    historical: []
  },
  toggleFavorite: () => {},
  isFavorite: () => {},
  
  // Additional utility functions
  clearSelection: () => {},
  selectAll: () => {},
  unselectAll: () => {},
  
  // Active view tracking
  activeView: { realTime: null, historical: null },
});

/**
 * Safe localStorage get helper with error handling and default value
 * @param {string} key - Storage key
 * @param {any} defaultValue - Default value if key not found or error occurs
 * @returns {any} Parsed value or default value
 */
const safeGetItem = (key, defaultValue) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error getting ${key} from localStorage:`, error);
    return defaultValue;
  }
};

/**
 * Safe localStorage set helper with error handling
 * @param {string} key - Storage key
 * @param {any} value - Value to store
 */
const safeSetItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error setting ${key} in localStorage:`, error);
  }
};

/**
 * Provider component for chart selection state management
 */
export const ChartSelectionProvider = ({ children }) => {
  // Initialize state from localStorage with error handling
  const [realTimeSelectedCharts, setRealTimeSelectedChartsState] = useState(() => 
    safeGetItem(STORAGE_KEYS.REAL_TIME_CHARTS, DEFAULT_REAL_TIME_CHARTS)
  );

  const [historicalSelectedCharts, setHistoricalSelectedChartsState] = useState(() => 
    safeGetItem(STORAGE_KEYS.HISTORICAL_CHARTS, DEFAULT_HISTORICAL_CHARTS)
  );

  const [realTimeSidebarCollapsed, setRealTimeSidebarCollapsedState] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.REAL_TIME_SIDEBAR) === 'true'
  );
  
  const [historicalSidebarCollapsed, setHistoricalSidebarCollapsedState] = useState(() => 
    localStorage.getItem(STORAGE_KEYS.HISTORICAL_SIDEBAR) === 'true'
  );

  // Saved views state
  const [savedViews, setSavedViews] = useState(() => ({
    realTime: safeGetItem(STORAGE_KEYS.REAL_TIME_VIEWS, []),
    historical: safeGetItem(STORAGE_KEYS.HISTORICAL_VIEWS, [])
  }));

  // Favorites state
  const [favorites, setFavorites] = useState(() => ({
    realTime: safeGetItem(STORAGE_KEYS.REAL_TIME_FAVORITES, []),
    historical: safeGetItem(STORAGE_KEYS.HISTORICAL_FAVORITES, [])
  }));
  
  // Track which view is currently active
  const [activeView, setActiveView] = useState(() => ({
    realTime: safeGetItem(STORAGE_KEYS.LAST_ACTIVE_VIEW, { realTime: null, historical: null }).realTime,
    historical: safeGetItem(STORAGE_KEYS.LAST_ACTIVE_VIEW, { realTime: null, historical: null }).historical
  }));
  
  // Initial charts loaded flag
  const [initialChartsLoaded, setInitialChartsLoaded] = useState(false);

  // Persistence effects

  // Persist real-time selected charts to localStorage
  useEffect(() => {
    safeSetItem(STORAGE_KEYS.REAL_TIME_CHARTS, realTimeSelectedCharts);
  }, [realTimeSelectedCharts]);

  // Persist historical selected charts to localStorage
  useEffect(() => {
    safeSetItem(STORAGE_KEYS.HISTORICAL_CHARTS, historicalSelectedCharts);
  }, [historicalSelectedCharts]);

  // Persist sidebar states to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REAL_TIME_SIDEBAR, realTimeSidebarCollapsed);
  }, [realTimeSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.HISTORICAL_SIDEBAR, historicalSidebarCollapsed);
  }, [historicalSidebarCollapsed]);
  
  // Persist active view to localStorage
  useEffect(() => {
    safeSetItem(STORAGE_KEYS.LAST_ACTIVE_VIEW, activeView);
  }, [activeView]);
  
  // Mark initial charts as loaded after first render
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialChartsLoaded(true);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Auto-load default view on startup
  useEffect(() => {
    const loadDefaultViews = () => {
      const realTimeViews = savedViews.realTime;
      const historicalViews = savedViews.historical;
      
      const realTimeDefault = realTimeViews.find(v => v.isDefault);
      const historicalDefault = historicalViews.find(v => v.isDefault);
      
      // Only load defaults if we're using the default chart selections
      const isUsingDefaultRealTime = JSON.stringify(realTimeSelectedCharts) === JSON.stringify(DEFAULT_REAL_TIME_CHARTS);
      const isUsingDefaultHistorical = JSON.stringify(historicalSelectedCharts) === JSON.stringify(DEFAULT_HISTORICAL_CHARTS);
      
      if (realTimeDefault && isUsingDefaultRealTime) {
        setRealTimeSelectedChartsState(realTimeDefault.charts);
        setActiveView(prev => ({ ...prev, realTime: realTimeDefault.id }));
      }
      
      if (historicalDefault && isUsingDefaultHistorical) {
        setHistoricalSelectedChartsState(historicalDefault.charts);
        setActiveView(prev => ({ ...prev, historical: historicalDefault.id }));
      }
    };
    
    loadDefaultViews();
  }, [savedViews, realTimeSelectedCharts, historicalSelectedCharts]);

  // Wrapper functions for state setters with additional logic
  const setRealTimeSelectedCharts = useCallback((charts) => {
    setRealTimeSelectedChartsState(prev => {
      if (typeof charts === 'function') {
        return charts(prev);
      }
      return charts;
    });
  }, []);

  const setHistoricalSelectedCharts = useCallback((charts) => {
    setHistoricalSelectedChartsState(prev => {
      if (typeof charts === 'function') {
        return charts(prev);
      }
      return charts;
    });
  }, []);

  const setRealTimeSidebarCollapsed = useCallback((collapsed) => {
    setRealTimeSidebarCollapsedState(prev => {
      if (typeof collapsed === 'function') {
        return collapsed(prev);
      }
      return collapsed;
    });
  }, []);

  const setHistoricalSidebarCollapsed = useCallback((collapsed) => {
    setHistoricalSidebarCollapsedState(prev => {
      if (typeof collapsed === 'function') {
        return collapsed(prev);
      }
      return collapsed;
    });
  }, []);

  // Internal function to update saved views with persistence
  const updateSavedViews = useCallback((newViews) => {
    setSavedViews(newViews);
    
    // Update in localStorage
    safeSetItem(STORAGE_KEYS.REAL_TIME_VIEWS, newViews.realTime);
    safeSetItem(STORAGE_KEYS.HISTORICAL_VIEWS, newViews.historical);
  }, []);

  // Save a new view
  const saveView = useCallback((name, charts, viewType = 'realTime', options = {}) => {
    const newView = {
      id: `view-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      charts: [...charts],
      timestamp: Date.now(),
      lastUsed: Date.now(),
      description: options.description || '',
      isDefault: options.isDefault || false
    };
    
    // If this is set as default, unset any existing defaults
    let updatedViews = { ...savedViews };
    
    if (newView.isDefault) {
      updatedViews[viewType] = updatedViews[viewType].map(view => ({
        ...view,
        isDefault: false
      }));
    }
    
    // Add the new view
    updatedViews = {
      ...updatedViews,
      [viewType]: [...updatedViews[viewType], newView]
    };
    
    updateSavedViews(updatedViews);
    
    // Set as active view
    setActiveView(prev => ({
      ...prev,
      [viewType]: newView.id
    }));
    
    return newView.id;
  }, [savedViews, updateSavedViews]);

  // Update an existing view
  const updateViewInternal = useCallback((viewId, updates, viewType = 'realTime') => {
    setSavedViews(prev => {
      const viewIndex = prev[viewType].findIndex(v => v.id === viewId);
      
      if (viewIndex === -1) return prev;
      
      const updatedView = {
        ...prev[viewType][viewIndex],
        ...updates,
        timestamp: Date.now() // Always update timestamp
      };
      
      // If we're updating isDefault to true, unset all other defaults
      let updatedViews = [...prev[viewType]];
      
      if (updates.isDefault) {
        updatedViews = updatedViews.map(view => ({
          ...view,
          isDefault: false
        }));
      }
      
      updatedViews[viewIndex] = updatedView;
      
      const result = {
        ...prev,
        [viewType]: updatedViews
      };
      
      // Update in localStorage
      safeSetItem(
        viewType === 'realTime' 
          ? STORAGE_KEYS.REAL_TIME_VIEWS 
          : STORAGE_KEYS.HISTORICAL_VIEWS,
        result[viewType]
      );
      
      return result;
    });
  }, []);
  
  // Public update view function
  const updateView = useCallback((viewId, updates, viewType = 'realTime') => {
    // Make a copy of updates to avoid modifying the original
    const updatesCopy = { ...updates };
    
    // If charts are provided, create a copy to avoid modifying the original
    if (updatesCopy.charts) {
      updatesCopy.charts = [...updatesCopy.charts];
    }
    
    updateViewInternal(viewId, updatesCopy, viewType);
    
    // If this view is active and we're updating charts, update the selected charts
    if (activeView[viewType] === viewId && updatesCopy.charts) {
      if (viewType === 'realTime') {
        setRealTimeSelectedCharts(updatesCopy.charts);
      } else {
        setHistoricalSelectedCharts(updatesCopy.charts);
      }
    }
    
    return true;
  }, [activeView, updateViewInternal, setRealTimeSelectedCharts, setHistoricalSelectedCharts]);

  // Load a saved view
  const loadView = useCallback((viewId, viewType = 'realTime') => {
    const views = savedViews[viewType];
    const viewToLoad = views.find(v => v.id === viewId);
    
    if (!viewToLoad) return false;
    
    // Update last used timestamp
    updateViewInternal(viewId, { lastUsed: Date.now() }, viewType);
    
    // Load charts
    if (viewType === 'realTime') {
      setRealTimeSelectedCharts(viewToLoad.charts);
    } else {
      setHistoricalSelectedCharts(viewToLoad.charts);
    }
    
    // Set as active view
    setActiveView(prev => ({
      ...prev,
      [viewType]: viewId
    }));
    
    return true;
  }, [savedViews, updateViewInternal, setRealTimeSelectedCharts, setHistoricalSelectedCharts]);

  // Delete a saved view
  const deleteView = useCallback((viewId, viewType = 'realTime') => {
    setSavedViews(prev => {
      const newViews = { ...prev };
      
      // Find the view to check if it's the default
      const deletedView = newViews[viewType].find(v => v.id === viewId);
      
      // Remove the view
      newViews[viewType] = newViews[viewType].filter(v => v.id !== viewId);
      
      // Update in localStorage
      safeSetItem(
        viewType === 'realTime' 
          ? STORAGE_KEYS.REAL_TIME_VIEWS 
          : STORAGE_KEYS.HISTORICAL_VIEWS,
        newViews[viewType]
      );
      
      // If this was the active view, clear it
      if (activeView[viewType] === viewId) {
        setActiveView(prev => ({
          ...prev,
          [viewType]: null
        }));
      }
      
      // If we deleted the default view, and there are other views, set the first as default
      if (deletedView?.isDefault && newViews[viewType].length > 0) {
        const firstView = newViews[viewType][0];
        updateViewInternal(firstView.id, { isDefault: true }, viewType);
      }
      
      return newViews;
    });
  }, [activeView, updateViewInternal]);

  // Toggle a chart as favorite
  const toggleFavorite = useCallback((chartId, viewType = 'realTime') => {
    setFavorites(prev => {
      const newFavorites = { ...prev };
      
      if (newFavorites[viewType].includes(chartId)) {
        newFavorites[viewType] = newFavorites[viewType].filter(id => id !== chartId);
      } else {
        newFavorites[viewType] = [...newFavorites[viewType], chartId];
      }
      
      // Persist to localStorage
      safeSetItem(
        viewType === 'realTime' 
          ? STORAGE_KEYS.REAL_TIME_FAVORITES 
          : STORAGE_KEYS.HISTORICAL_FAVORITES,
        newFavorites[viewType]
      );
      
      return newFavorites;
    });
  }, []);
  
  // Check if a chart is favorited
  const isFavorite = useCallback((chartId, viewType = 'realTime') => {
    return favorites[viewType].includes(chartId);
  }, [favorites]);

  // Clear all selected charts
  const clearSelection = useCallback((viewType = 'realTime') => {
    if (viewType === 'realTime') {
      setRealTimeSelectedCharts([]);
    } else {
      setHistoricalSelectedCharts([]);
    }
    
    // Clear active view since we now have a custom selection
    setActiveView(prev => ({
      ...prev,
      [viewType]: null
    }));
  }, [setRealTimeSelectedCharts, setHistoricalSelectedCharts]);

  // Select all charts from a specific category
  const selectAll = useCallback((category, viewType = 'realTime') => {
    const chartValues = category.options.map(opt => opt.value);
    
    if (viewType === 'realTime') {
      setRealTimeSelectedCharts(prev => {
        const uniqueValues = Array.from(new Set([...prev, ...chartValues]));
        return uniqueValues;
      });
    } else {
      setHistoricalSelectedCharts(prev => {
        const uniqueValues = Array.from(new Set([...prev, ...chartValues]));
        return uniqueValues;
      });
    }
    
    // Clear active view since we now have a custom selection
    setActiveView(prev => ({
      ...prev,
      [viewType]: null
    }));
  }, [setRealTimeSelectedCharts, setHistoricalSelectedCharts]);

  // Unselect all charts from a specific category
  const unselectAll = useCallback((category, viewType = 'realTime') => {
    const chartValues = category.options.map(opt => opt.value);
    
    if (viewType === 'realTime') {
      setRealTimeSelectedCharts(prev => 
        prev.filter(value => !chartValues.includes(value))
      );
    } else {
      setHistoricalSelectedCharts(prev => 
        prev.filter(value => !chartValues.includes(value))
      );
    }
    
    // Clear active view since we now have a custom selection
    setActiveView(prev => ({
      ...prev,
      [viewType]: null
    }));
  }, [setRealTimeSelectedCharts, setHistoricalSelectedCharts]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // Chart selections
    realTimeSelectedCharts,
    setRealTimeSelectedCharts,
    historicalSelectedCharts,
    setHistoricalSelectedCharts,

    // Sidebar states
    realTimeSidebarCollapsed,
    setRealTimeSidebarCollapsed,
    historicalSidebarCollapsed,
    setHistoricalSidebarCollapsed,
    
    // Saved views
    savedViews,
    saveView,
    loadView,
    deleteView,
    updateView,
    
    // Favorites
    favorites,
    toggleFavorite,
    isFavorite,
    
    // Utility functions
    clearSelection,
    selectAll,
    unselectAll,
    
    // Active view tracking
    activeView,
  }), [
    // Dependencies
    realTimeSelectedCharts,
    setRealTimeSelectedCharts,
    historicalSelectedCharts,
    setHistoricalSelectedCharts,
    realTimeSidebarCollapsed,
    setRealTimeSidebarCollapsed,
    historicalSidebarCollapsed,
    setHistoricalSidebarCollapsed,
    savedViews,
    saveView,
    loadView,
    deleteView,
    updateView,
    favorites,
    toggleFavorite,
    isFavorite,
    clearSelection,
    selectAll,
    unselectAll,
    activeView,
  ]);

  return (
    <ChartSelectionContext.Provider value={contextValue}>
      {children}
    </ChartSelectionContext.Provider>
  );
};

// Custom hook for easier access to the context
export const useChartSelection = () => {
  const context = React.useContext(ChartSelectionContext);
  if (context === undefined) {
    throw new Error('useChartSelection must be used within a ChartSelectionProvider');
  }
  return context;
};