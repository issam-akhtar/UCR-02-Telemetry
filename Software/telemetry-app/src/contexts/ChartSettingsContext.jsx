import React, { createContext, useState } from 'react';

const defaultSettings = {
  global: { theme: 'dark' },
  realTime: {
    window: 10000,      // ms of data to show in the rolling window
    updateInterval: 50, // ms between chart updates
    threshold: null,    // optional numeric threshold for annotation
    lineWidth: 2,       // thickness of plot lines
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
    setSettings((prev) => ({
      ...prev,
      global: {
        ...prev.global,
        theme: prev.global.theme === 'light' ? 'dark' : 'light',
      },
    }));
  };

  return (
    <ChartSettingsContext.Provider value={{ settings, setSettings, toggleTheme }}>
      {children}
    </ChartSettingsContext.Provider>
  );
};
