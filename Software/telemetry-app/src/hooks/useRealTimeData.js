import { useEffect, useRef, useState, useCallback } from 'react';
import { wsService } from '../services/websocket';

/**
 * Optimized hook for subscribing to real-time WebSocket data.
 * Relies on upstream throttling from websocket.js and settings from ChartSettingsContext.
 *
 * @param {string} messageType - The type of data to subscribe to
 * @param {Function} onNewData - Callback to handle incoming data
 * @param {Object} options - Configuration options
 * @param {boolean} options.pauseOnHidden - Pause processing when tab is hidden (default: true)
 * @returns {Object} - Status information and control methods
 */
const useRealTimeData = (messageType, onNewData, options = {}) => {
  // Get device capabilities for adaptive settings
  const isLowPowerDevice = useRef(
    /Raspberry Pi/i.test(navigator.userAgent) || 
    /Linux arm/i.test(navigator.userAgent) ||
    navigator.deviceMemory < 4 || 
    navigator.hardwareConcurrency < 4 ||
    localStorage.getItem('forceRaspberryPiMode') === 'true'
  ).current;

  // Default options - removing duplicate throttling
  const defaultOptions = {
    pauseOnHidden: true,
  };
  
  // Merge provided options with defaults
  const mergedOptions = { ...defaultOptions, ...options };
  const optionsRef = useRef(mergedOptions);
  
  // Update options ref if they change
  useEffect(() => {
    optionsRef.current = { ...defaultOptions, ...options };
  }, [options]);

  // State and refs
  const [stats, setStats] = useState({
    lastMessageTime: 0,
    messagesReceived: 0,
    messagesProcessed: 0,
    droppedMessages: 0,
    status: 'waiting',
    isConnected: false
  });
  
  const processedMessages = useRef(new Map()); // Map to store IDs with timestamps
  const isVisibleRef = useRef(true);
  
  // Use refs to store latest callback and message type
  const onNewDataRef = useRef(onNewData);
  const messageTypeRef = useRef(messageType);
  
  // Update refs when props change
  useEffect(() => {
    onNewDataRef.current = onNewData;
    messageTypeRef.current = messageType;
  }, [onNewData, messageType]);

  // Track document visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  // Clean up old processed message IDs
  const cleanupProcessedIds = useCallback(() => {
    if (processedMessages.current.size <= 1000) return;
    
    const now = Date.now();
    const expiryTime = now - 60000; // Remove entries older than 1 minute
    
    let removed = 0;
    processedMessages.current.forEach((timestamp, id) => {
      if (timestamp < expiryTime) {
        processedMessages.current.delete(id);
        removed++;
      }
    });
    
    // If time-based cleanup didn't remove enough, remove oldest entries
    if (processedMessages.current.size > 1000) {
      const entries = Array.from(processedMessages.current.entries())
        .sort((a, b) => a[1] - b[1]);
      
      const toRemove = Math.floor(500);
      entries.slice(0, toRemove).forEach(([id]) => {
        processedMessages.current.delete(id);
        removed++;
      });
    }
  }, []);

  // Process individual messages
  const processMessage = useCallback((msg) => {
    if (!msg) return;
    
    // Skip processing if tab is hidden and pauseOnHidden is true
    if (optionsRef.current.pauseOnHidden && !isVisibleRef.current) {
      return;
    }
    
    try {
      // Skip if message has been processed already (for deduplication)
      if (msg.id && processedMessages.current.has(msg.id)) return;
      
      if (msg.id) {
        // Add to processed map with timestamp
        processedMessages.current.set(msg.id, Date.now());
      }
      
      // Default detection of direct field messages
      if (
        // Specific sensor fields
        msg.front_left_pot !== undefined || 
        msg.front_right_pot !== undefined || 
        msg.rear_left_pot !== undefined || 
        msg.rear_right_pot !== undefined ||
        // General structure check for direct field objects
        (typeof msg === 'object' && 
         Object.keys(msg).length > 0 && 
         !msg.payload && 
         !msg.time && 
         !msg.type)
      ) {
        onNewDataRef.current({
          time: Date.now(),
          fields: msg
        });
        return;
      }
      
      // Standard payload structure
      const payload = msg.payload || {};
      const fields = payload.fields || {};
      
      onNewDataRef.current({
        time: msg.time || Date.now(),
        fields,
        payload,
        metadata: {
          messageType: msg.type
        }
      });
      
      // Update stats after successful processing
      setStats(prev => ({
        ...prev,
        lastMessageTime: Date.now(),
        messagesProcessed: prev.messagesProcessed + 1,
        status: 'active'
      }));
      
      // Periodically clean up old processed IDs
      if (Date.now() % 10000 < 1000) { // Approximately every 10 seconds
        cleanupProcessedIds();
      }
    } catch (error) {
      console.error('Error in message processing:', error);
    }
  }, [cleanupProcessedIds]);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message) => {
    // Update received counter
    setStats(prev => ({
      ...prev,
      messagesReceived: prev.messagesReceived + (Array.isArray(message) ? message.length : 1)
    }));
    
    // Process message array or single message
    if (Array.isArray(message)) {
      message.forEach(msg => processMessage(msg));
    } else {
      processMessage(message);
    }
  }, [processMessage]);

  // Subscribe to WebSocket connection status
  useEffect(() => {
    const unsubscribe = wsService.onConnectionChange((isConnected) => {
      setStats(prev => ({
        ...prev,
        isConnected,
        status: isConnected ? (prev.lastMessageTime > 0 ? 'active' : 'waiting') : 'disconnected'
      }));
    });
    
    return unsubscribe;
  }, []);

  // Subscribe to WebSocket data
  useEffect(() => {
    if (!messageTypeRef.current) return;
    
    console.log(`Subscribing to ${messageTypeRef.current} messages`);
    
    // Subscribe to the WebSocket service
    const unsubscribe = wsService.subscribe(messageTypeRef.current, handleWebSocketMessage);
    
    return () => {
      // Clean up subscription
      console.log(`Unsubscribing from ${messageTypeRef.current} messages`);
      unsubscribe();
    };
  }, [messageType, handleWebSocketMessage]);

  // Return subscription status info and control methods
  return {
    // Status information
    ...stats,
    
    // Control functions
    clearCache: useCallback(() => {
      processedMessages.current.clear();
      console.log("Message cache cleared");
    }, []),
    
    pauseProcessing: useCallback((pause) => {
      isVisibleRef.current = !pause;
    }, [])
  };
};

export default useRealTimeData;