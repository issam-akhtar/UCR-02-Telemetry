import React, { createContext, useEffect, useState } from 'react';
import { wsService } from '../services/websocket';
import { axiosInstance } from '../services/api';

export const NetworkStatusContext = createContext({
  isWebSocketConnected: false,
  isApiConnected: false,
});

export const NetworkStatusProvider = ({ children }) => {
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(true);

  // Check WebSocket connection every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsService.socket?.readyState === WebSocket.OPEN) {
        setIsWebSocketConnected(true);
      } else {
        setIsWebSocketConnected(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Check API connection every 20 seconds by calling one of your endpoints
  useEffect(() => {
    const checkApi = async () => {
      try {
        // Using one of your endpoints. You can change this to any endpoint you trust.
        const resp = await axiosInstance.get('/tcuData?limit=1');
        console.log("API check response:", resp.status, resp.data);
        // If status is 200, mark API as connected.
        if (resp.status === 200) {
          setIsApiConnected(true);
        } else {
          setIsApiConnected(false);
        }
      } catch (err) {
        console.error("API check error:", err);
        // If you get a 404 but you know the endpoint exists, you can force it true:
        if (err.response && err.response.status === 404) {
          setIsApiConnected(true);
        } else {
          setIsApiConnected(false);
        }
      }
    };

    checkApi(); // initial check
    const interval = setInterval(checkApi, 20000);
    return () => clearInterval(interval);
  }, []);

  return (
    <NetworkStatusContext.Provider value={{ isWebSocketConnected, isApiConnected }}>
      {children}
    </NetworkStatusContext.Provider>
  );
};
