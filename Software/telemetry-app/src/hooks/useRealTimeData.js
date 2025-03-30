import { useEffect, useRef, useState, useCallback } from 'react';
import { wsService } from '../services/websocket';

/**
 * Hook for subscribing to real-time WebSocket data.
 *
 * @param {string} messageType - The type of data to subscribe to
 * @param {Function} onNewData - Callback to handle incoming data
 * @param {Object} options - Configuration options
 * @param {boolean} options.pauseOnHidden - Pause processing when tab is hidden (default: true)
 * @param {boolean} options.resubscribeOnResume - Resubscribe when WebSocket resumes (default: true)
 * @returns {Object} - Status information and control methods
 */
const useRealTimeData = (messageType, onNewData, options = {}) => {
  // Default options
  const defaultOptions = {
    pauseOnHidden: true,
    resubscribeOnResume: true
  };
  
  // Use ref for options to avoid dependency issues
  const optionsRef = useRef({ ...defaultOptions, ...options });
  
  // Update options ref when they change
  useEffect(() => {
    optionsRef.current = { ...defaultOptions, ...options };
  }, [options]);

  // State for connection status
  const [status, setStatus] = useState({
    isConnected: false,
    lastMessageTime: 0,
    messagesReceived: 0,
    status: 'waiting'
  });
  
  // Refs for internal state
  const stateRef = useRef({
    messageType,
    onNewData,
    processedIds: new Set(),
    isVisible: true,
    subscription: null
  });
  
  // Update refs when dependencies change
  useEffect(() => {
    stateRef.current.onNewData = onNewData;
  }, [onNewData]);

  useEffect(() => {
    stateRef.current.messageType = messageType;
  }, [messageType]);

  // Track document visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      stateRef.current.isVisible = document.visibilityState === 'visible';
    };
    
    stateRef.current.isVisible = document.visibilityState === 'visible';
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Message handler function
  const handleMessage = useCallback((message) => {
    if (!message) return;
    
    const { processedIds, isVisible, onNewData } = stateRef.current;
    
    // Skip if tab is hidden and pauseOnHidden is true
    if (optionsRef.current.pauseOnHidden && !isVisible) return;
    
    try {
      // Deduplicate messages if they have an ID
      if (message.id && processedIds.has(message.id)) return;
      
      // Add to processed set
      if (message.id) {
        processedIds.add(message.id);
        
        // Keep set size manageable
        if (processedIds.size > 1000) {
          // Clear oldest entries (convert to array, remove first half, convert back to set)
          const idArray = Array.from(processedIds);
          stateRef.current.processedIds = new Set(idArray.slice(idArray.length / 2));
        }
      }
      
      // Update status
      setStatus(prev => ({
        ...prev,
        lastMessageTime: Date.now(),
        messagesReceived: prev.messagesReceived + 1,
        status: 'active'
      }));
      
      // Handle different message formats
      if (typeof message === 'object' && !message.payload && !message.time && !message.type) {
        // Direct field object
        onNewData({
          time: Date.now(),
          fields: message
        });
      } else {
        // Standard payload structure
        const payload = message.payload || {};
        const fields = payload.fields || {};
        
        onNewData({
          time: message.time || Date.now(),
          fields,
          payload,
          metadata: {
            messageType: message.type
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }, []);
  
  // Subscribe to WebSocket messages
  useEffect(() => {
    if (!messageType || !wsService || typeof wsService.subscribe !== 'function') {
      return;
    }
    
    const unsubscribe = wsService.subscribe(messageType, handleMessage);
    stateRef.current.subscription = unsubscribe;
    
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
      stateRef.current.subscription = null;
    };
  }, [messageType, handleMessage]);
  
  // Handle WebSocket resume events
  useEffect(() => {
    if (!optionsRef.current.resubscribeOnResume) return;
    
    const handleResume = () => {
      // Resubscribe when connection is resumed
      if (stateRef.current.subscription) {
        stateRef.current.subscription();
      }
      
      const newSubscription = wsService.subscribe(
        stateRef.current.messageType, 
        handleMessage
      );
      
      stateRef.current.subscription = newSubscription;
    };
    
    if (wsService && typeof wsService.onResume === 'function') {
      const unsubscribe = wsService.onResume(handleResume);
      return unsubscribe;
    }
    
    return () => {};
  }, [handleMessage]);
  
  // Track connection status
  useEffect(() => {
    const handleConnectionChange = (isConnected) => {
      setStatus(prev => ({
        ...prev,
        isConnected,
        status: isConnected ? (prev.lastMessageTime > 0 ? 'active' : 'waiting') : 'disconnected'
      }));
    };
    
    if (wsService && typeof wsService.onConnectionChange === 'function') {
      const unsubscribe = wsService.onConnectionChange(handleConnectionChange);
      return unsubscribe;
    }
    
    return () => {};
  }, []);
  
  // Public methods
  const clearCache = useCallback(() => {
    stateRef.current.processedIds.clear();
  }, []);
  
  const pauseProcessing = useCallback((pause) => {
    stateRef.current.isVisible = !pause;
  }, []);
  
  const forceResubscribe = useCallback(() => {
    // Clean up existing subscription
    if (stateRef.current.subscription) {
      stateRef.current.subscription();
    }
    
    // Create new subscription
    if (stateRef.current.messageType && wsService) {
      stateRef.current.subscription = wsService.subscribe(
        stateRef.current.messageType, 
        handleMessage
      );
      return true;
    }
    
    return false;
  }, [handleMessage]);
  
  return {
    ...status,
    clearCache,
    pauseProcessing,
    forceResubscribe
  };
};

export default useRealTimeData;