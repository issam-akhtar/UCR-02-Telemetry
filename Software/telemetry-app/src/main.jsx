import React from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import './index.css';

// Error fallback component
const ErrorFallback = ({ error }) => {
  return (
    <div role="alert" style={{ 
      padding: '20px', 
      margin: '20px', 
      border: '1px solid #f56565', 
      borderRadius: '5px',
      backgroundColor: '#0F1C2E',
      color: '#E0E0E0'
    }}>
      <h2>Something went wrong:</h2>
      <pre style={{ 
        whiteSpace: 'pre-wrap', 
        background: 'rgba(0,0,0,0.2)', 
        padding: '10px', 
        borderRadius: '4px',
        maxHeight: '50vh',
        overflow: 'auto'
      }}>{error.message}</pre>
      <button
        onClick={() => window.location.reload()}
        style={{
          backgroundColor: '#2A6F97',
          color: 'white',
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginTop: '16px'
        }}
      >
        Reload Application
      </button>
    </div>
  );
};

// Initialize app with error boundary
const container = document.getElementById('root');
const root = createRoot(container);

// Remove loading indicator if present
const loadingIndicator = document.querySelector('.loading-indicator');
if (loadingIndicator) {
  // On Raspberry Pi, avoid animations for better performance
  if (navigator.userAgent.includes('Linux arm') || localStorage.getItem('forceRaspberryPiMode')) {
    loadingIndicator.remove();
  } else {
    loadingIndicator.style.opacity = '0';
    loadingIndicator.style.transition = 'opacity 0.3s ease';
    setTimeout(() => loadingIndicator.remove(), 300);
  }
}

// Performance monitoring function
const reportWebVitals = process.env.NODE_ENV !== 'production' 
  ? (metric) => {
      console.log(`${metric.name}: ${Math.round(metric.value)}ms`);
    }
  : () => {};

// Polyfill for older browsers if needed
if (!window.structuredClone) {
  window.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Only load performance monitoring in development
if (process.env.NODE_ENV !== 'production') {
  import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
    try {
      // Ensure these functions exist before calling
      if (typeof getCLS === 'function') {
        getCLS(reportWebVitals);
      }
      if (typeof getFID === 'function') {
        getFID(reportWebVitals);
      }
      if (typeof getFCP === 'function') {
        getFCP(reportWebVitals);
      }
      if (typeof getLCP === 'function') {
        getLCP(reportWebVitals);
      }
      if (typeof getTTFB === 'function') {
        getTTFB(reportWebVitals);
      }
    } catch (error) {
      console.error('Error setting up web-vitals:', error);
    }
  }).catch(error => {
    console.error('Failed to load web-vitals:', error);
  });
}

root.render(
  // Disable StrictMode in production for Raspberry Pi performance
  process.env.NODE_ENV === 'production' ? (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <App />
    </ErrorBoundary>
  ) : (
    <React.StrictMode>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
);