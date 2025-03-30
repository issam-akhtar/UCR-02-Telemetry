import React from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from 'react-error-boundary';
import App from './App';
import './index.css';

/**
 * Error fallback component that displays when an unhandled error occurs
 * @param {Object} props - Component props
 * @param {Error} props.error - The error that was caught
 * @param {Function} props.resetErrorBoundary - Function to reset the error boundary
 */
const ErrorFallback = ({ error, resetErrorBoundary }) => {
  // Function to handle reset and reload
  const handleReset = () => {
    // Reset the error boundary
    if (typeof resetErrorBoundary === 'function') {
      resetErrorBoundary();
    }
    // Reload the page as a fallback
    window.location.reload();
  };

  return (
    <div 
      role="alert" 
      aria-live="assertive"
      style={{ 
        padding: '20px', 
        margin: '20px', 
        border: '1px solid #f56565', 
        borderRadius: '5px',
        backgroundColor: '#0F1C2E',
        color: '#E0E0E0',
        maxWidth: '800px',
      }}
    >
      <h2>Something went wrong</h2>
      <pre style={{ 
        whiteSpace: 'pre-wrap', 
        background: 'rgba(0,0,0,0.2)', 
        padding: '10px', 
        borderRadius: '4px',
        maxHeight: '50vh',
        overflow: 'auto'
      }}>
        {error.message}
      </pre>
      <button
        onClick={handleReset}
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
const removeLoadingIndicator = () => {
  const loadingIndicator = document.querySelector('.loading-indicator');
  if (!loadingIndicator) return;
  
  // Check for low performance mode
  const isLowPerformanceMode = 
    document.documentElement.classList.contains('low-performance-mode') || 
    window.localStorage.getItem('lowPerformanceMode') === 'true';
  
  if (isLowPerformanceMode) {
    // Remove immediately without animation for better performance
    loadingIndicator.remove();
  } else {
    // Fade out with animation
    loadingIndicator.style.opacity = '0';
    loadingIndicator.style.transition = 'opacity 0.3s ease';
    setTimeout(() => {
      if (loadingIndicator.parentNode) {
        loadingIndicator.parentNode.removeChild(loadingIndicator);
      }
    }, 300);
  }
};

// Setup error logging
const logError = (error, info) => {
  console.error('Application error:', error);
  console.error('Component stack:', info?.componentStack);
  
  // Here you would typically send to error monitoring service
  // if (typeof window.errorReportingService?.captureError === 'function') {
  //   window.errorReportingService.captureError(error, info);
  // }
};

// Better structured clone polyfill
if (!window.structuredClone) {
  window.structuredClone = (obj) => {
    // For null or undefined or primitive values
    if (obj === null || obj === undefined || typeof obj !== 'object') {
      return obj;
    }
    
    // Handle Date
    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }
    
    // Handle Array
    if (Array.isArray(obj)) {
      return obj.map(item => window.structuredClone(item));
    }
    
    // Handle Object
    if (obj instanceof Object) {
      const copy = {};
      for (const [key, value] of Object.entries(obj)) {
        copy[key] = window.structuredClone(value);
      }
      return copy;
    }
    
    // Fallback for unsupported types
    console.warn('structuredClone polyfill: Unsupported type, returning reference', obj);
    return obj;
  };
}

// Performance monitoring - load asynchronously in development only
if (process.env.NODE_ENV !== 'production') {
  const reportWebVitals = (metric) => {
    console.log(`Web Vital: ${metric.name} - ${Math.round(metric.value)}ms`);
  };
  
  // Use dynamic import for code splitting
  import('web-vitals')
    .then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      [getCLS, getFID, getFCP, getLCP, getTTFB].forEach(fn => {
        if (typeof fn === 'function') {
          try {
            fn(reportWebVitals);
          } catch (e) {
            console.warn(`Failed to measure ${fn.name}:`, e);
          }
        }
      });
    })
    .catch(error => {
      console.warn('Web vitals could not be loaded:', error);
    });
}

// Remove the loading indicator before rendering
removeLoadingIndicator();

// Render the application
root.render(
  process.env.NODE_ENV !== 'production' ? (
    <React.StrictMode>
      <ErrorBoundary 
        FallbackComponent={ErrorFallback}
        onError={logError}
      >
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  ) : (
    <ErrorBoundary 
      FallbackComponent={ErrorFallback}
      onError={logError}
    >
      <App />
    </ErrorBoundary>
  )
);