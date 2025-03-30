import React, { createContext, useState, useContext, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { wsService } from '../services/websocket';

// Default context value
const defaultContextValue = {
  navigateTo: () => {},
  isNavigating: false,
};

// Create navigation context
export const NavigationContext = createContext(defaultContextValue);

// Navigation provider that handles transitions
export const NavigationProvider = ({ children }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Simple navigation function with WebSocket handling
  const navigateTo = useCallback(async (path) => {
    // Don't navigate if already navigating
    if (isNavigating) {
      console.log('Navigation already in progress, skipping');
      return;
    }
    
    // Don't navigate if already on this path
    if (location.pathname === path) {
      console.log('Already on this path, skipping navigation');
      return;
    }
    
    try {
      // Start navigation
      console.log(`Navigating from ${location.pathname} to ${path}`);
      setIsNavigating(true);
      
      // Pause WebSocket activity first
      if (wsService?.pauseSubscriptions) {
        try {
          await wsService.pauseSubscriptions();
        } catch (error) {
          console.warn('Error pausing WebSocket:', error);
        }
      }
      
      // Perform the actual navigation
      navigate(path);
    } catch (error) {
      console.error('Navigation error:', error);
      
      // Resume WebSocket in case of error
      if (wsService?.resumeSubscriptions) {
        wsService.resumeSubscriptions().catch(err => {
          console.warn('Error resuming WebSocket after navigation error:', err);
        });
      }
      
      // Reset navigation state
      setIsNavigating(false);
    }
  }, [navigate, location.pathname, isNavigating]);
  
  // Listen for location changes to handle navigation completion
  useEffect(() => {
    // Function to resume WebSocket after navigation completes
    const resumeWebSocket = async () => {
      if (wsService?.resumeSubscriptions) {
        try {
          await wsService.resumeSubscriptions();
        } catch (err) {
          console.warn('Error resuming WebSocket after navigation:', err);
          
          // Try once more if first attempt fails
          setTimeout(async () => {
            try {
              await wsService.resumeSubscriptions();
            } catch (e) {
              console.error('Second WebSocket resume attempt failed:', e);
            }
          }, 500);
        }
      }
    };
    
    // If we were navigating, complete the navigation
    if (isNavigating) {
      console.log('Navigation completed to:', location.pathname);
      
      // Give components time to mount before resuming WebSocket
      const timeoutId = setTimeout(() => {
        resumeWebSocket().finally(() => {
          // Reset navigation state after everything is done
          setIsNavigating(false);
          
          // Dispatch event for components that need to know navigation is complete
          window.dispatchEvent(new CustomEvent('navigationComplete', {
            detail: { path: location.pathname }
          }));
        });
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [location.pathname, isNavigating]);
  
  return (
    <NavigationContext.Provider value={{ navigateTo, isNavigating }}>
      {children}
    </NavigationContext.Provider>
  );
};

// Custom hook for using navigation
export const useNavigation = () => {
  return useContext(NavigationContext);
};