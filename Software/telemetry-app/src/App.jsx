import React, { useState, useContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import ChartSettingsModal from './components/ChartSettingsModal';
import ErrorBoundary from './components/ErrorBoundary';
import { ChartSettingsProvider, ChartSettingsContext } from './contexts/ChartSettingsContext';
import { ChartConfigProvider } from './contexts/ChartConfigContext';
import './index.css';

function AppContent() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings, toggleTheme } = useContext(ChartSettingsContext);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.global.theme);
  }, [settings.global.theme]);

  return (
    <div style={{ padding: '1rem' }}>
      <nav>
        <NavLink to="/" style={{ marginRight: '1rem' }}>Dashboard</NavLink>
        <button onClick={() => setIsSettingsOpen(true)}>Settings</button>
        <button onClick={toggleTheme} style={{ marginLeft: '1rem' }}>
          Toggle Theme
        </button>
      </nav>
      <ErrorBoundary>
        <Routes>
          <Route path="/*" element={<Dashboard />} />
        </Routes>
      </ErrorBoundary>
      <ChartSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

function App() {
  return (
    <ChartSettingsProvider>
      <ChartConfigProvider>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </ChartConfigProvider>
    </ChartSettingsProvider>
  );
}

export default App;
