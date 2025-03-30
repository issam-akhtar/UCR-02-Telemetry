import { useEffect, useState, useContext, useRef, useCallback } from 'react';
import { axiosInstance } from '../services/api';
import { ChartSettingsContext } from '../contexts/ChartSettingsContext';
import { throttle } from 'lodash';

/**
 * Custom hook for fetching and managing historical data
 * Optimized for performance with caching, error handling, and automatic refresh
 * 
 * @param {string} endpoint - API endpoint to fetch data from
 * @param {number} customPageSize - Override page size from settings (optional)
 * @returns {Object} - { data, loading, error, refresh }
 */
const useHistoricalData = (endpoint, customPageSize) => {
  // Safely access context with fallback values
  const settingsContext = useContext(ChartSettingsContext);
  const settings = settingsContext?.settings || {};
  const historical = settings.historical || {};
  
  // Use custom page size or fall back to settings with safe defaults
  const settingsPageSize = historical.pageSize || 1000;
  const refreshRate = historical.refreshRate || 0;
  const pageSize = customPageSize || settingsPageSize;

  // State for data management
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Refs to maintain stable values between renders
  const dataCache = useRef(new Map());
  const activeRequest = useRef(null);
  const isMounted = useRef(true);
  const intervalRef = useRef(null);
  const refreshRateRef = useRef(refreshRate);
  const pageSizeRef = useRef(pageSize);
  const endpointRef = useRef(endpoint);
  
  // Update refs when props change
  useEffect(() => {
    refreshRateRef.current = refreshRate;
    pageSizeRef.current = pageSize;
    endpointRef.current = endpoint;
  }, [refreshRate, pageSize, endpoint]);

  // Create a stable fetch function using useCallback
  const fetchDataCore = useCallback(async () => {
    // Skip if there's already an active request for this endpoint
    if (activeRequest.current === endpointRef.current) return;
    
    // Set loading state and active request
    if (isMounted.current) {
      setLoading(true);
    }
    activeRequest.current = endpointRef.current;
    
    // Check cache first
    const cacheKey = `${endpointRef.current}_${pageSizeRef.current}`;
    if (dataCache.current.has(cacheKey)) {
      if (isMounted.current) {
        setData(dataCache.current.get(cacheKey));
        setLoading(false);
      }
      activeRequest.current = null;
      return;
    }
    
    try {
      // Validate that axiosInstance is available
      if (!axiosInstance || typeof axiosInstance.get !== 'function') {
        throw new Error('API client not available');
      }
      
      // Construct URL with parameters
      const url = `${endpointRef.current}?limit=${pageSizeRef.current}`;
      
      // Fetch data with timeout
      const response = await axiosInstance.get(url, { 
        timeout: 10000 // 10 second timeout
      });
      
      // Process data if request was successful
      if (response.status === 200 && response.data) {
        let transformedData = response.data;
        
        // Transform data if it's an array
        if (Array.isArray(response.data)) {
          transformedData = response.data.map((item) => {
            // Normalize timestamp to time field if needed
            if (item.timestamp) {
              const { timestamp, ...rest } = item;
              return { time: timestamp, ...rest };
            }
            return item;
          });
          
          // Validate data has minimum requirements
          const isValidData = transformedData.length > 0 && 
            transformedData.every(item => 
              (item.time || item.timestamp) && 
              Object.keys(item).length > 1
            );
          
          if (isValidData) {
            // Update state only if component is still mounted
            if (isMounted.current) {
              setData(transformedData);
              setError(null);
              
              // Cache the successful response
              dataCache.current.set(cacheKey, transformedData);
              
              // Limit cache size to prevent memory issues
              if (dataCache.current.size > 10) {
                const oldestKey = Array.from(dataCache.current.keys())[0];
                if (oldestKey) {
                  dataCache.current.delete(oldestKey);
                }
              }
            }
          } else {
            throw new Error('Invalid data format');
          }
        } else {
          throw new Error('Expected array data');
        }
      } else {
        throw new Error(`Unexpected response: ${response.status}`);
      }
    } catch (err) {
      // Only update error state if component is still mounted
      if (isMounted.current) {
        console.error('Error fetching historical data:', err);
        setError(err);
      }
    } finally {
      // Clear loading state and active request if component is still mounted
      if (isMounted.current) {
        setLoading(false);
      }
      activeRequest.current = null;
    }
  }, []); // Empty dependency array since we use refs for changing values
  
  // Use throttle with memoization to prevent excessive renders
  const fetchData = useRef(
    throttle(fetchDataCore, 300, { leading: true, trailing: true })
  ).current;

  // Manual refresh function that doesn't recreate on each render
  const refresh = useCallback(() => {
    // Clear cache for this endpoint to force fresh data
    const cacheKey = `${endpointRef.current}_${pageSizeRef.current}`;
    dataCache.current.delete(cacheKey);
    
    // Increment counter to trigger useEffect
    setRefreshCounter(prev => prev + 1);
  }, []);

  // Setup and cleanup effect
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Perform initial fetch
    fetchData();
    
    // Clean up previous interval if it exists
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Set up auto-refresh interval if enabled
    if (refreshRateRef.current > 0) {
      intervalRef.current = setInterval(() => {
        if (isMounted.current) {
          fetchData();
        }
      }, refreshRateRef.current);
    }
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Cancel any in-flight throttled fetch
      if (fetchData && typeof fetchData.cancel === 'function') {
        fetchData.cancel();
      }
      
      // Clear active request
      activeRequest.current = null;
    };
  }, [fetchData, refreshCounter]);
  // We don't need refreshRate, pageSize, endpoint in deps since we use refs

  return { 
    data, 
    loading, 
    error, 
    refresh,
    pageSize: pageSizeRef.current  // Expose current page size
  };
};

export default useHistoricalData;