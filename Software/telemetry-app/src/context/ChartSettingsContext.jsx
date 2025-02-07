import React, { createContext, useState } from "react";

export const ChartSettingsContext = createContext();

export const ChartSettingsProvider = ({ children }) => {
  // Retained only the non-layout settings
  const [realTimeWindow, setRealTimeWindow] = useState(2000);
  const [realTimeUpdateInterval, setRealTimeUpdateInterval] = useState(100);
  const [historicalRefreshRate, setHistoricalRefreshRate] = useState(0);
  const [pageSize, setPageSize] = useState(2500);

  const [maxAxisTicks, setMaxAxisTicks] = useState(5);

  return (
    <ChartSettingsContext.Provider
      value={{
        realTimeWindow,
        setRealTimeWindow,
        realTimeUpdateInterval,
        setRealTimeUpdateInterval,
        historicalRefreshRate,
        setHistoricalRefreshRate,
        pageSize,
        setPageSize,
        maxAxisTicks,
        setMaxAxisTicks,
      }}
    >
      {children}
    </ChartSettingsContext.Provider>
  );
};
