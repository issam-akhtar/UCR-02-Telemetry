import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigation } from '../../contexts/NavigationContext';

/**
 * Simplified NavigationListener component
 * Handles route change detection and layout adjustments
 */
const NavigationListener = () => {
  const location = useLocation();
  const { isNavigating } = useNavigation();
  const prevPathRef = useRef(location.pathname);
  const resizeTimerRef = useRef(null);
  
  // Handle location changes for path tracking
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      console.log(`Route changed from ${prevPathRef.current} to ${location.pathname}`);
      prevPathRef.current = location.pathname;
      
      // Dispatch custom event that components can listen for
      window.dispatchEvent(new CustomEvent('routeChanged', { 
        detail: { 
          path: location.pathname,
          prevPath: prevPathRef.current
        } 
      }));
    }
  }, [location.pathname]);
  
  // Handle navigation state changes
  useEffect(() => {
    // When navigation completes, handle post-navigation cleanup
    if (!isNavigating) {
      // Trigger resize after navigation completes
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      
      resizeTimerRef.current = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        resizeTimerRef.current = null;
      }, 300);
    }
  }, [isNavigating]);
  
  // Listen for custom navigation events
  useEffect(() => {
    const handleNavigationComplete = (event) => {
      console.log('Navigation complete event received:', event.detail);
      
      // Trigger resize after navigation completes
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
      }
      
      resizeTimerRef.current = setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
        resizeTimerRef.current = null;
      }, 300);
    };
    
    // Register event listener
    window.addEventListener('navigationComplete', handleNavigationComplete);
    
    return () => {
      window.removeEventListener('navigationComplete', handleNavigationComplete);
    };
  }, []);
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, []);
  
  return null; // This is a non-rendering component
};

export default NavigationListener;