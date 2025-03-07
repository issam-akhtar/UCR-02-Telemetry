import React, { createContext, useState } from 'react';

export const ChartSelectionContext = createContext({
  realTimeSelectedCharts: [],
  setRealTimeSelectedCharts: () => {},
  historicalSelectedCharts: [],
  setHistoricalSelectedCharts: () => {},

  // Sidebar collapsed states for both pages:
  realTimeSidebarCollapsed: false,
  setRealTimeSidebarCollapsed: () => {},
  historicalSidebarCollapsed: false,
  setHistoricalSidebarCollapsed: () => {},
});

export const ChartSelectionProvider = ({ children }) => {
  // Default real-time charts
  const [realTimeSelectedCharts, setRealTimeSelectedCharts] = useState([
    'tcu', 'pack_current', 'cell', 'pack_voltage'
  ]);

  // Default historical charts
  const [historicalSelectedCharts, setHistoricalSelectedCharts] = useState([
    'tcuData', 'packCurrentData','cellData', 'packVoltageData', 'thermData'
  ]);

  // Sidebar states
  const [realTimeSidebarCollapsed, setRealTimeSidebarCollapsed] = useState(false);
  const [historicalSidebarCollapsed, setHistoricalSidebarCollapsed] = useState(false);

  return (
    <ChartSelectionContext.Provider
      value={{
        realTimeSelectedCharts,
        setRealTimeSelectedCharts,
        historicalSelectedCharts,
        setHistoricalSelectedCharts,

        realTimeSidebarCollapsed,
        setRealTimeSidebarCollapsed,
        historicalSidebarCollapsed,
        setHistoricalSidebarCollapsed,
      }}
    >
      {children}
    </ChartSelectionContext.Provider>
  );
};
