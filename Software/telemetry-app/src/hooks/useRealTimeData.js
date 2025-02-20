import { useEffect } from 'react';
import { wsService } from '../services/websocket';

const useRealTimeData = (chartType, onNewData) => {
  useEffect(() => {
    const unsubscribe = wsService.subscribe(chartType, (message) => {
      onNewData({ time: message.time, fields: message.payload.fields });
    });
    return () => unsubscribe();
  }, [chartType, onNewData]);
};

export default useRealTimeData;
