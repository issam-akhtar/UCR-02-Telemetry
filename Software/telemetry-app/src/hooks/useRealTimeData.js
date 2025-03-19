import { useEffect, useRef } from 'react';
import { wsService } from '../services/websocket';

/**
 * Custom hook that subscribes to a WebSocket service for real-time data.
 * @param {string} chartType - The type of chart to listen for (e.g., "ins_gps", "pack_voltage", etc.).
 * @param {Function} onNewData - Callback to handle incoming data.
 */
const useRealTimeData = (chartType, onNewData) => {
  // Use a ref to store the latest callback, preventing re-subscriptions on each render.
  const onNewDataRef = useRef(onNewData);

  // Update ref if onNewData changes
  useEffect(() => {
    onNewDataRef.current = onNewData;
  }, [onNewData]);

  useEffect(() => {
    // Wrap callback so it always calls the latest onNewDataRef
    const callback = (message) => {
      // Handle both single message and batch of messages
      if (Array.isArray(message)) {
        // It's a batch of messages
        message.forEach(msg => processMessage(msg));
      } else {
        // It's a single message
        processMessage(message);
      }
    };

    function processMessage(msg) {
      // Ensure message has all expected properties before passing to callback
      if (!msg) return;
      
      // Safe access pattern for nested properties
      const payload = msg.payload || {};
      const fields = payload.fields || {};
      
      onNewDataRef.current({
        time: msg.time || Date.now(),
        fields: fields,
        payload: payload
      });
    }

    // Check if chartType is valid before subscribing
    if (chartType) {
      // Subscribe once per chartType
      const unsubscribe = wsService.subscribe(chartType, callback);
      console.log(`Subscribed to ${chartType}`);
      return () => {
        unsubscribe();
        console.log(`Unsubscribed from ${chartType}`); 
      };
    }
    
    return () => {}; // Return empty function if no subscription was made
  }, [chartType]);
};

export default useRealTimeData;