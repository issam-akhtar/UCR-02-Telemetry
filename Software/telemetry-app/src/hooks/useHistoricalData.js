import { useEffect, useState, useContext } from 'react';
import { axiosInstance } from '../services/api';
import { ChartSettingsContext } from '../contexts/ChartSettingsContext';
import { z } from 'zod';

const DynamicDataPointSchema = z.object({
  time: z.string(),
}).catchall(z.union([z.number(), z.string()]));

const DynamicDataArraySchema = z.array(DynamicDataPointSchema);

const useHistoricalData = (endpoint) => {
  const { settings } = useContext(ChartSettingsContext);
  const { refreshRate, pageSize } = settings.historical;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshCounter, setRefreshCounter] = useState(0);

  const fetchData = () => {
    setLoading(true);
    axiosInstance
      .get(`${endpoint}?limit=${pageSize}`)
      .then((response) => {
        let transformedData = response.data;
        if (Array.isArray(response.data)) {
          transformedData = response.data.map((item) => {
            if (item.timestamp) {
              const { timestamp, ...rest } = item;
              return { time: timestamp, ...rest };
            }
            return item;
          });
        }
        const parsed = DynamicDataArraySchema.safeParse(transformedData);
        if (parsed.success) {
          setData(parsed.data);
          setError(null);
        } else {
          setError(parsed.error);
        }
      })
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    let interval;
    if (refreshRate > 0) {
      interval = setInterval(() => {
        fetchData();
      }, refreshRate);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endpoint, refreshRate, pageSize, refreshCounter]);

  const refresh = () => {
    setRefreshCounter((prev) => prev + 1);
  };

  return { data, loading, error, refresh };
};

export default useHistoricalData;
