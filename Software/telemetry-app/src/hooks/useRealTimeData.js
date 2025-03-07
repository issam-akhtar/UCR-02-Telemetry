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
      onNewDataRef.current({
        time: message.time,
        fields: message.payload.fields || {},
        payload: message.payload,
      });
    };

    // Subscribe once per chartType
    const unsubscribe = wsService.subscribe(chartType, callback);
    return () => unsubscribe();
  }, [chartType]);
};

export default useRealTimeData;
