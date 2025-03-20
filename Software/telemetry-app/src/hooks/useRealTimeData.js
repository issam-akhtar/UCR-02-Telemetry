import { useEffect, useRef, useState, useCallback } from 'react';
import { wsService } from '../services/websocket';

/**
 * Custom hook that efficiently subscribes to real-time WebSocket data
 * only when the component is visible and active.
 *
 * @param {string} chartType - The type of chart data to listen for.
 * @param {Function} onNewData - Callback to handle incoming data.
 * @returns {Object} - The reference object for tracking subscription status.
 */
const useRealTimeData = (chartType, onNewData) => {
  const [lastMessageTime, setLastMessageTime] = useState(0);
  const timeoutRef = useRef(null);
  const messageQueueRef = useRef([]);
  const processedMessages = useRef(new Set());
  
  // Use refs to store latest callback and chart type
  const onNewDataRef = useRef(onNewData);
  const chartTypeRef = useRef(chartType);
  
  // Update refs when props change
  useEffect(() => {
    onNewDataRef.current = onNewData;
    chartTypeRef.current = chartType;
  }, [onNewData, chartType]);

  // Efficient message processor with rate limiting and deduplication
  const processQueue = useCallback(() => {
    if (messageQueueRef.current.length === 0) return;
    
    const now = Date.now();
    const messages = messageQueueRef.current;
    messageQueueRef.current = [];
    
    // Batch process messages
    messages.forEach(msg => {
      // Skip if message has been processed already (for deduplication)
      if (msg.id && processedMessages.current.has(msg.id)) return;
      
      if (msg.id) {
        // Add to processed set with a limited size (to prevent memory leaks)
        processedMessages.current.add(msg.id);
        if (processedMessages.current.size > 1000) {
          // Remove oldest entries when limit is reached
          const iterator = processedMessages.current.values();
          for (let i = 0; i < 200; i++) {
            processedMessages.current.delete(iterator.next().value);
          }
        }
      }
      
      processMessage(msg);
    });
    
    setLastMessageTime(now);
  }, []);

  // Process individual messages
  const processMessage = useCallback((msg) => {
    if (!msg) return;
    
    try {
      // Check if message has direct field data structure without payload wrapper
      if (msg.front_left_pot !== undefined || 
          msg.front_right_pot !== undefined || 
          msg.rear_left_pot !== undefined || 
          msg.rear_right_pot !== undefined ||
          (typeof msg === 'object' && 
           Object.keys(msg).length > 0 && 
           !msg.payload && 
           !msg.time)) {
        onNewDataRef.current({
          time: Date.now(),
          fields: msg // Pass the raw message as fields
        });
        return;
      }
      
      // Original logic for differently structured messages
      const payload = msg.payload || {};
      const fields = payload.fields || {};
      
      onNewDataRef.current({
        time: msg.time || Date.now(),
        fields,
        payload,
      });
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }, []);

  // WebSocket message handler with batching
  const handleWebSocketMessage = useCallback((message) => {
    if (Array.isArray(message)) {
      messageQueueRef.current.push(...message);
    } else {
      messageQueueRef.current.push(message);
    }
    
    // Throttle processing to avoid overwhelming the UI
    if (!timeoutRef.current) {
      timeoutRef.current = setTimeout(() => {
        processQueue();
        timeoutRef.current = null;
      }, 50); // Process queue every 50ms at most
    }
  }, [processQueue]);

  // Subscribe to WebSocket data
  useEffect(() => {
    if (!chartTypeRef.current) return;
    
    // Clean up any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    // Subscribe to the WebSocket service
    const unsubscribe = wsService.subscribe(chartTypeRef.current, handleWebSocketMessage);
    
    return () => {
      // Clean up subscription and any pending timeouts
      unsubscribe();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      messageQueueRef.current = [];
    };
  }, [chartType, handleWebSocketMessage]);

  // Return subscription status info
  return {
    lastMessageTime,
    hasMessages: messageQueueRef.current.length > 0,
    status: lastMessageTime > 0 ? 'active' : 'waiting'
  };
};

export default useRealTimeData;