import { useEffect, useState, useContext, useRef } from 'react';
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
  const { settings } = useContext(ChartSettingsContext);
  const { refreshRate, pageSize: settingsPageSize } = settings.historical;
  
  // Use custom page size or fall back to settings
  const pageSize = customPageSize || settingsPageSize;

  // State for data management
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);
  
  // Cache previous successful responses
  const dataCache = useRef(new Map());
  
  // Track active requests to prevent race conditions
  const activeRequest = useRef(null);
  
  // Track if component is mounted
  const isMounted = useRef(true);

  // Function to fetch data with error handling and caching
  // Using throttle to prevent excessive requests
  const fetchData = throttle(async () => {
    // Skip if there's already an active request for this endpoint
    if (activeRequest.current === endpoint) return;
    
    // Set loading state and active request
    setLoading(true);
    activeRequest.current = endpoint;
    
    // Check cache first
    const cacheKey = `${endpoint}_${pageSize}`;
    if (dataCache.current.has(cacheKey)) {
      setData(dataCache.current.get(cacheKey));
      setLoading(false);
      activeRequest.current = null;
      return;
    }
    
    try {
      // Construct URL with parameters
      const url = `${endpoint}?limit=${pageSize}`;
      
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
                const oldestKey = dataCache.current.keys().next().value;
                dataCache.current.delete(oldestKey);
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
        activeRequest.current = null;
      }
    }
  }, 300);

  // Initial fetch and refresh interval
  useEffect(() => {
    // Set mounted flag
    isMounted.current = true;
    
    // Perform initial fetch
    fetchData();
    
    // Set up auto-refresh interval if enabled
    let interval;
    if (refreshRate > 0) {
      interval = setInterval(fetchData, refreshRate);
    }
    
    // Cleanup function
    return () => {
      isMounted.current = false;
      if (interval) clearInterval(interval);
      if (fetchData.cancel) fetchData.cancel();
    };
  }, [endpoint, refreshRate, pageSize, refreshCounter]);
  // Adding the throttled function to the dependencies array would cause an infinite loop,
  // so we're omitting it and handling cleanup in the effect.

  // Manual refresh function
  const refresh = () => {
    // Clear cache for this endpoint to force fresh data
    const cacheKey = `${endpoint}_${pageSize}`;
    dataCache.current.delete(cacheKey);
    
    // Increment counter to trigger useEffect
    setRefreshCounter((prev) => prev + 1);
  };

  return { data, loading, error, refresh };
};

export default useHistoricalData;