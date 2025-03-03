// useRealTimeData.js
import { useEffect } from 'react';
import { wsService } from '../services/websocket';

/**
 * Custom hook that subscribes to a WebSocket service for real-time data.
 * @param {string} chartType - The type of chart to listen for.
 * @param {Function} onNewData - Callback to handle incoming data.
 */
const useRealTimeData = (chartType, onNewData) => {
  useEffect(() => {
    const unsubscribe = wsService.subscribe(chartType, (message) => {
      onNewData({
        time: message.time,
        fields: message.payload.fields || {},
        payload: message.payload,
      });
    });
    return () => unsubscribe();
  }, [chartType, onNewData]);
};

export default useRealTimeData;
