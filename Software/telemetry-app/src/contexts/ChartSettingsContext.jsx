import React, { createContext, useState } from 'react';

const defaultSettings = {
  global: {
    theme: 'light',
  },
  realTime: {
    window: 10000,
    updateInterval: 50,
    threshold: null,
    lineWidth: 2,
  },
  historical: {
    downsampleThreshold: 2500,
    downsampleFactor: 2,
    dataZoomEnabled: true,
    brushEnabled: true,
    refreshRate: 0,
    pageSize: 5000,
    maxAxisTicks: 6,
  },
};

export const ChartSettingsContext = createContext({
  settings: defaultSettings,
  setSettings: () => {},
  toggleTheme: () => {},
});

export const ChartSettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(defaultSettings);

  const toggleTheme = () => {
    setSettings(prev => ({
      ...prev,
      global: {
        ...prev.global,
        theme: prev.global.theme === 'light' ? 'dark' : 'light'
      }
    }));
  };

  return (
    <ChartSettingsContext.Provider value={{ settings, setSettings, toggleTheme }}>
      {children}
    </ChartSettingsContext.Provider>
  );
};
