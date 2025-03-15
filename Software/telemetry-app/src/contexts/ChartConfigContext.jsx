import React, { createContext, useContext, useMemo } from 'react';
import defaultChartConfig from '../config/chart-config';

const ChartConfigContext = createContext();

export const ChartConfigProvider = ({ children, customConfig }) => {
  const mergedConfig = useMemo(() => ({
    ...defaultChartConfig,
    ...customConfig,
    realTime: {
      ...defaultChartConfig.realTime,
      ...(customConfig?.realTime || {})
    },
    historical: {
      ...defaultChartConfig.historical,
      ...(customConfig?.historical || {})
    }
  }), [customConfig]);

  return (
    <ChartConfigContext.Provider value={mergedConfig}>
      {children}
    </ChartConfigContext.Provider>
  );
};

export const useChartConfig = () => {
  const context = useContext(ChartConfigContext);
  if (!context) {
    throw new Error('useChartConfig must be used within a ChartConfigProvider');
  }
  return context;
};

// Helper functions for common config operations
export const getChartTypeConfig = (chartType, isHistorical = false) => {
  const config = useChartConfig();
  return isHistorical 
    ? config.historical[chartType]
    : config.realTime[chartType];
};

export const getFieldConfig = (chartType, fieldName) => {
  const config = useChartConfig();
  const chartConfig = config.realTime[chartType] || config.historical[chartType];
  
  return {
    displayName: chartConfig?.fieldLabels?.[fieldName] || fieldName,
    color: chartConfig?.colors?.[fieldName] || '#2A9D8F',
    unit: chartConfig?.units?.[fieldName] || '',
    precision: chartConfig?.precision?.[fieldName] || 2
  };
};

export const getColorPalette = (paletteName = 'primary') => {
  const config = useChartConfig();
  return config.defaultStyles.colorPalettes[paletteName];
};
