import React, { useEffect, useRef, useContext, useState, useCallback, useMemo } from 'react';
import Plotly from 'plotly.js-dist-min';
import useRealTimeData from '../../hooks/useRealTimeData';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import PropTypes from 'prop-types';

// Enhanced visual styles - moved outside component to prevent recreation
const FONT_SIZES = {
  base: 14,
  title: 18,
  axisLabel: 16,
  tick: 12,
};

// Color palette - more professional colors with better contrast
const LINE_COLORS = [
  '#4285F4', '#EA4335', '#34A853', '#FBBC05', // Google-inspired colors
  '#7B1FA2', '#0097A7', '#FF6D00', '#757575', // Material design colors
  '#43A047', '#E53935', '#3949AB', '#8E24AA', // Additional material colors
];

/**
 * Converts a timestamp into a valid ISO-like string in MST (UTC-7).
 * Moved outside component to prevent recreation on every render.
 */
function formatTimeMST(timestamp) {
  const date = new Date(timestamp);
  // Convert to MST (subtract 7 hours)
  const mstTime = date.getTime() - 7 * 3600000;
  const mstDate = new Date(mstTime);
  const pad = (num, size = 2) => String(num).padStart(size, '0');
  return `${mstDate.getFullYear()}-${pad(mstDate.getMonth() + 1)}-${pad(mstDate.getDate())}T${pad(mstDate.getHours())}:${pad(mstDate.getMinutes())}:${pad(mstDate.getSeconds())}.${pad(mstDate.getMilliseconds(), 3)}`;
}

/**
 * Returns an appropriate Y-axis label based on chart type
 * Moved outside component to prevent recreation on every render.
 */
function getYAxisLabel(chartType) {
  const labels = {
    'pack_current': 'Current (A)',
    'pack_voltage': 'Voltage (V)',
    'cell': 'Voltage (V)',
    'thermistor': 'Temperature (°C)',
    'bamocar': 'Value',
    'ins_imu': 'IMU Value',
    'ins_gps': 'GPS Value',
    'front_strain_gauges_1': 'Strain',
    'front_aero': 'Position',
    'front_analog': 'Analog Value',
    'front_frequency': 'Frequency (Hz)',
    'encoder': 'Encoder Value',
    'tcu': 'TCU Value',
    // Add more mappings as needed
  };
  
  return labels[chartType] || 'Value';
}

const RealTimeChart = ({ chartType, config, isPaused, isVisible = true }) => {
  // Use refs for performance-critical state to avoid re-renders
  const containerRef = useRef(null);
  const seriesKeysRef = useRef(null);
  const dataBufferRef = useRef({
    timestamps: [],
    series: {},
    lastValues: {}, // Store last values for change detection
  });
  
  // Animation frame reference for RAF-based updates
  const updateRequestRef = useRef(null);
  
  // Performance tracking refs
  const lastUpdateTimeRef = useRef(0);
  const lastTimestampRef = useRef(null);
  const pendingUpdatesRef = useRef(0);
  const pendingDataPointsRef = useRef([]);
  
  // UI state (minimal to reduce re-renders)
  const [chartInitialized, setChartInitialized] = useState(false);
  const [noData, setNoData] = useState(false);

  // Get settings from context
  const { settings } = useContext(ChartSettingsContext);
  const { global = {}, realTime: rtSettings = {}, dashboard = {} } = settings;
  
  // Extract settings
  const theme = global.theme || 'light';
  const enableHardwareAcceleration = global.enableHardwareAcceleration !== false;
  const enableTransitions = global.enableTransitions !== false;
  const backgroundColor = theme === 'dark' ? '#1a1a2e' : '#ffffff';
  const fontColor = theme === 'dark' ? '#e6e6e6' : '#333333';
  const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)';
  const significantChangeThreshold = dashboard.significantChangeThreshold || 1.0;
  
  // Ensure update interval is at least 16ms (60fps) to be physically achievable
  const updateInterval = useMemo(() => 
    Math.max(16, rtSettings.updateInterval || 16),
  [rtSettings.updateInterval]);
  
  // Log warning if requested update interval is too low - only log once
  useEffect(() => {
    if (rtSettings.updateInterval && rtSettings.updateInterval < 16) {
      console.warn(
        `Update interval of ${rtSettings.updateInterval}ms is below the browser's minimum frame time (16.6ms). Using ${updateInterval}ms instead.`
      );
    }
  }, [rtSettings.updateInterval, updateInterval]);

  // Get plot configuration based on hardware acceleration setting
  const PLOT_CONFIG = useMemo(() => ({
    responsive: true,
    displayModeBar: false,
    scrollZoom: false,
    staticPlot: !enableHardwareAcceleration,
    plotGlPixelRatio: enableHardwareAcceleration ? 2 : 1, // WebGL rendering optimization
    toImageButtonOptions: { format: 'svg' }
  }), [enableHardwareAcceleration]);

  // Helper to safely apply layout changes
  const safeRelayout = useCallback((updateObj) => {
    if (containerRef.current && containerRef.current._fullLayout) {
      try {
        // Only apply if we're not overloaded with pending updates
        if (pendingUpdatesRef.current < 3) {
          pendingUpdatesRef.current++;
          Plotly.relayout(containerRef.current, updateObj)
            .finally(() => {
              pendingUpdatesRef.current--;
            });
        }
      } catch (err) {
        console.error('Error in relayout:', err);
        pendingUpdatesRef.current = Math.max(0, pendingUpdatesRef.current - 1);
      }
    }
  }, []);

  // Base layout shared by both chart types
  const baseLayout = useMemo(() => ({
    autosize: true,
    title: {
      text: `<b>${config.title || `Real Time Data - ${chartType}`}</b>`,
      font: { size: FONT_SIZES.title, color: fontColor },
      x: 0.5,
      xanchor: 'center',
      yanchor: 'top',
      pad: { b: 10 },
    },
    margin: { l: 60, r: 20, b: 100, t: 60 },
    paper_bgcolor: backgroundColor,
    plot_bgcolor: backgroundColor,
    font: { color: fontColor, size: FONT_SIZES.base, family: 'Inter, system-ui, sans-serif' },
    legend: {
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.4,
      yanchor: 'top',
      font: { size: FONT_SIZES.tick, color: fontColor },
      bgcolor: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
      bordercolor: gridColor,
      borderwidth: 1,
      tracegroupgap: 10, // Add spacing between legend items
    },
    // Disable animations if transitions are disabled
    transition: {
      duration: enableTransitions ? 300 : 0,
      easing: 'cubic-in-out'
    },
  }), [backgroundColor, fontColor, config.title, chartType, enableTransitions, gridColor, theme]);

  // Create line chart layout with consistent styling
  const createLineChartLayout = useCallback(() => {
    return {
      ...baseLayout,
      hovermode: 'x unified',
      hoverlabel: {
        bgcolor: theme === 'dark' ? 'rgba(40,40,40,0.9)' : 'rgba(255,255,255,0.9)',
        bordercolor: gridColor,
        font: { color: fontColor }
      },
      xaxis: {
        type: 'date',
        title: {
          font: { size: FONT_SIZES.axisLabel, color: fontColor },
          standoff: 10, // Increased standoff for better spacing
        },
        tickangle: -45,
        tickfont: { size: FONT_SIZES.tick, color: fontColor },
        automargin: true,
        showgrid: true,
        gridcolor: gridColor,
        gridwidth: 1,
        nticks: 8,
        zeroline: false,
        rangemode: 'tozero', // Added to ensure proper scaling
        tickformat: '%H:%M:%S', // Simplified time format for readability
      },
      yaxis: {
        title: {
          text: `<b>${getYAxisLabel(chartType)}</b>`,
          font: { size: FONT_SIZES.axisLabel, color: fontColor },
          standoff: 20,
        },
        tickfont: { size: FONT_SIZES.tick, color: fontColor },
        automargin: true,
        showgrid: true,
        gridcolor: gridColor,
        gridwidth: 1,
        nticks: 5,
        zeroline: false,
      },
    };
  }, [baseLayout, chartType, fontColor, gridColor, theme]);

  // Create cell bar chart layout
  const createCellBarLayout = useCallback(() => {
    return {
      ...baseLayout,
      showlegend: false,
      xaxis: {
        title: {
          text: '<b>Cell #</b>',
          font: { size: FONT_SIZES.axisLabel, color: fontColor },
          standoff: 20,
        },
        tickfont: { size: FONT_SIZES.tick, color: fontColor },
        type: 'category',
        automargin: true,
        showgrid: true,
        gridcolor: gridColor,
        gridwidth: 1,
        nticks: 16,
        zeroline: false,
      },
      yaxis: {
        title: {
          text: '<b>Voltage (V)</b>',
          font: { size: FONT_SIZES.axisLabel, color: fontColor },
          standoff: 20,
        },
        tickfont: { size: FONT_SIZES.tick, color: fontColor },
        automargin: true,
        showgrid: true,
        gridcolor: gridColor,
        gridwidth: 1,
        nticks: 5,
        zeroline: false,
      },
      hoverlabel: {
        bgcolor: theme === 'dark' ? 'rgba(40,40,40,0.9)' : 'rgba(255,255,255,0.9)',
        bordercolor: gridColor,
        font: { color: fontColor }
      },
    };
  }, [baseLayout, theme, fontColor, gridColor]);

  // Function to check if data has changed significantly (based on settings threshold)
  const hasSignificantChange = useCallback((key, newValue) => {
    const lastValue = dataBufferRef.current.lastValues[key];
    if (lastValue === undefined) return true;
    
    // Calculate percent change
    const percentChange = Math.abs((newValue - lastValue) / lastValue * 100);
    
    // Update last value regardless of result
    dataBufferRef.current.lastValues[key] = newValue;
    
    return percentChange >= significantChangeThreshold;
  }, [significantChangeThreshold]);

  // Process data for cell bar chart - optimized with RAF
  const handleCellBarChartUpdate = useCallback((dataPoint) => {
    if (!isVisible || !containerRef.current) return;
    
    const cellVals = new Array(128).fill(0);
    let foundAnyData = false;
    let hasSignificantChanges = false;

    for (let i = 1; i <= 128; i++) {
      const fieldName = `cell${i}`;
      const fieldObj = dataPoint.fields[fieldName];
      if (fieldObj) {
        foundAnyData = true;
        // Handle different data formats
        let rawVal;
        if (typeof fieldObj === 'object' && fieldObj !== null) {
          rawVal = fieldObj.numberValue ?? fieldObj.stringValue;
        } else {
          rawVal = fieldObj;
        }
        const val = parseFloat(rawVal) || 0;
        cellVals[i - 1] = val;
        
        // Check for significant changes
        if (hasSignificantChange(`cell${i}`, val)) {
          hasSignificantChanges = true;
        }
      }
    }

    if (!foundAnyData) {
      if (!noData) {
        setNoData(true);
        const layout = createCellBarLayout();
        layout.annotations = [{
          text: '<b>No Data</b>', // Changed from "No data available" to "No Data" with bold formatting
          x: 0.5,
          y: 0.5,
          xref: 'paper',
          yref: 'paper',
          showarrow: false,
          font: { size: 28, color: fontColor }, // Increased font size from 20 to 28
          bgcolor: theme === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', // Added subtle background
          bordercolor: gridColor,
          borderwidth: 1,
          borderpad: 12, // Added padding
          align: 'center',
        }];
        Plotly.newPlot(containerRef.current, [], layout, PLOT_CONFIG);
      }
      return;
    } else if (noData) {
      setNoData(false);
    }

    // Skip update if no significant changes and not in debug mode
    if (!hasSignificantChanges && chartInitialized) {
      return;
    }

    const xVals = Array.from({ length: 128 }, (_, i) => i + 1);
    const colors = cellVals.map((v) => {
      if (v < 3.2) return '#FF5252'; // Red - danger
      if (v < 3.7) return '#FFD740'; // Amber - warning
      return '#4CAF50'; // Green - good
    });

    const trace = {
      x: xVals,
      y: cellVals,
      type: 'bar',
      name: 'Cell Voltage',
      marker: { 
        color: colors,
        line: {
          width: 1,
          color: theme === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)'
        }
      },
      hovertemplate: 'Cell %{x}<br>Voltage: %{y:.3f}V<extra></extra>'
    };

    const layout = createCellBarLayout();
    
    // Cancel existing update request if any
    if (updateRequestRef.current) {
      cancelAnimationFrame(updateRequestRef.current);
    }
    
    // Schedule update using requestAnimationFrame for better performance
    updateRequestRef.current = requestAnimationFrame(() => {
      try {
        if (!chartInitialized || noData) {
          Plotly.newPlot(containerRef.current, [trace], layout, PLOT_CONFIG);
          setChartInitialized(true);
        } else {
          // Use react for complete trace updates
          Plotly.react(containerRef.current, [trace], layout, PLOT_CONFIG);
        }
      } catch (err) {
        console.error('Error updating cell chart:', err);
      }
      updateRequestRef.current = null;
    });
  }, [isVisible, noData, fontColor, createCellBarLayout, chartInitialized, hasSignificantChange, PLOT_CONFIG, theme, gridColor]);

  // Batch processing function for line chart updates
  const processPendingUpdates = useCallback(() => {
    if (!isVisible || isPaused || !containerRef.current || !chartInitialized || pendingDataPointsRef.current.length === 0) return;
    
    const pendingPoints = pendingDataPointsRef.current;
    pendingDataPointsRef.current = [];
    
    // Process each data point
    const latestPoint = pendingPoints[pendingPoints.length - 1];
    const seriesData = {};
    const timestamp = formatTimeMST(latestPoint.time || Date.now());
    
    // Extract data from latest point
    Object.entries(latestPoint.fields || {}).forEach(([key, value]) => {
      if (key === 'timestamp') return;
      
      let numericValue;
      if (typeof value === 'object' && value !== null) {
        numericValue = value.numberValue !== undefined 
          ? value.numberValue 
          : (value.stringValue !== undefined ? parseFloat(value.stringValue) : null);
      } else {
        numericValue = parseFloat(value);
      }
      
      if (!isNaN(numericValue) && numericValue !== null) {
        seriesData[key] = numericValue;
      }
    });
    
    // Skip if no series data
    if (Object.keys(seriesData).length === 0) return;
    
    // Check if we have new series that weren't in the plot before
    const numericKeys = Object.keys(seriesData);
    let needsFullRedraw = false;
    
    // If we don't have series keys yet, we'll need a full redraw
    if (!seriesKeysRef.current) {
      seriesKeysRef.current = numericKeys.sort();
      needsFullRedraw = true;
    } else {
      numericKeys.forEach(key => {
        if (!seriesKeysRef.current.includes(key)) {
          needsFullRedraw = true;
          seriesKeysRef.current.push(key);
        }
      });
    }
    
    if (needsFullRedraw) {
      // Create complete traces for full redraw
      const traces = seriesKeysRef.current.map((key, idx) => {
        const color = LINE_COLORS[idx % LINE_COLORS.length];
        
        // Get data from buffer
        const buffer = dataBufferRef.current;
        return {
          x: buffer.timestamps,
          y: buffer.series[key] || [],
          mode: 'lines',
          name: key,
          line: { 
            color, 
            width: rtSettings.lineWidth || 1.5,
            shape: 'linear',
          },
          hovertemplate: '%{y:.3f}<extra>' + key + '</extra>'
        };
      });
      
      const layout = createLineChartLayout();
      Plotly.react(containerRef.current, traces, layout, PLOT_CONFIG);
    } else {
      // Use efficient extendTraces for incremental updates
      const update = { x: [], y: [] };
      const traceIndices = [];
      
      seriesKeysRef.current.forEach((key, i) => {
        if (seriesData[key] !== undefined) {
          update.x.push([timestamp]);
          update.y.push([seriesData[key]]);
          traceIndices.push(i);
        }
      });
      
      if (traceIndices.length > 0) {
        Plotly.extendTraces(containerRef.current, update, traceIndices);
        
        // Update x-axis range if we have a time window setting
        if (rtSettings.window) {
          const currentTimeMs = new Date().getTime();
          const leftTimeMs = currentTimeMs - rtSettings.window;
          safeRelayout({ 
            'xaxis.range': [formatTimeMST(leftTimeMs), formatTimeMST(currentTimeMs)]
          });
        }
      }
    }
  }, [
    isVisible, 
    isPaused, 
    chartInitialized, 
    createLineChartLayout, 
    rtSettings.lineWidth, 
    rtSettings.window, 
    PLOT_CONFIG, 
    safeRelayout
  ]);

  // RAF-based update loop for line chart
  useEffect(() => {
    if (!isVisible || isPaused) return;
    
    let rafId = null;
    let lastUpdate = 0;
    
    const updateLoop = (timestamp) => {
      rafId = requestAnimationFrame(updateLoop);
      
      // Check if it's time to process updates (based on update interval)
      if (timestamp - lastUpdate >= updateInterval) {
        lastUpdate = timestamp;
        processPendingUpdates();
      }
    };
    
    rafId = requestAnimationFrame(updateLoop);
    
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [isVisible, isPaused, updateInterval, processPendingUpdates]);

  // Process data for line chart
  const handleLineChartUpdate = useCallback((dataPoint) => {
    // Extract time from dataPoint - use message's timestamp if available, or current time
    const messageTime = dataPoint.time || Date.now();
    const timestampField = dataPoint.fields?.timestamp?.numberValue;
    const currentTime = timestampField ? (timestampField * 1000) : messageTime; // Convert to ms if timestamp is in seconds
    
    // Check for out-of-order data
    if (lastTimestampRef.current && currentTime < lastTimestampRef.current) {
      console.warn('Out-of-order data point, skipping.');
      return;
    }
    lastTimestampRef.current = currentTime;

    // Extract numeric fields from dataPoint
    const fields = dataPoint.fields || {};
    const numericFields = {};
    let hasSignificantChanges = false;
    
    // Process fields to extract numeric values properly handling different data formats
    Object.entries(fields).forEach(([key, value]) => {
      if (key === 'timestamp') return; // Skip timestamp field
      
      // Handle different data structures
      let numericValue;
      if (typeof value === 'object' && value !== null) {
        // Extract from {numberValue: x} or {stringValue: y} format
        numericValue = value.numberValue !== undefined 
          ? value.numberValue 
          : (value.stringValue !== undefined ? parseFloat(value.stringValue) : null);
      } else {
        // Direct value
        numericValue = parseFloat(value);
      }
      
      if (!isNaN(numericValue) && numericValue !== null) {
        numericFields[key] = numericValue;
        
        // Check for significant changes
        if (hasSignificantChange(key, numericValue)) {
          hasSignificantChanges = true;
        }
      }
    });

    // Update our data buffer regardless of visibility
    const numericKeys = Object.keys(numericFields);
    const buffer = dataBufferRef.current;
    
    // Add timestamp to buffer
    const formattedTime = formatTimeMST(currentTime);
    buffer.timestamps.push(formattedTime);
    
    // Add values to series buffers
    numericKeys.forEach(key => {
      if (!buffer.series[key]) {
        buffer.series[key] = [];
      }
      buffer.series[key].push(numericFields[key]);
    });
    
    // Limit buffer size based on time window (last 60 seconds max)
    const maxBufferSize = Math.ceil(60000 / updateInterval);
    if (buffer.timestamps.length > maxBufferSize) {
      const removeCount = buffer.timestamps.length - maxBufferSize;
      buffer.timestamps = buffer.timestamps.slice(removeCount);
      Object.keys(buffer.series).forEach(key => {
        buffer.series[key] = buffer.series[key].slice(removeCount);
      });
    }
    
    // If not visible or paused, just buffer data without updating the chart
    if (!isVisible || isPaused || !containerRef.current) return;
    
    // Skip update if no significant changes and not in debug mode
    if (!hasSignificantChanges && chartInitialized && Object.keys(numericFields).length > 0) {
      return;
    }
    
    // Exit if we don't have data to display
    if (numericKeys.length === 0) {
      if (!noData) {
        setNoData(true);
        const layout = createLineChartLayout();
        layout.annotations = [{
          text: '<b>No Data</b>', // Changed from "No data available" to "No Data" with bold formatting
          x: 0.5,
          y: 0.5,
          xref: 'paper',
          yref: 'paper',
          showarrow: false,
          font: { size: 28, color: fontColor }, // Increased font size from 20 to 28
          bgcolor: theme === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)', // Added subtle background
          bordercolor: gridColor,
          borderwidth: 1,
          borderpad: 12, // Added padding
          align: 'center',
        }];
        Plotly.newPlot(containerRef.current, [], layout, PLOT_CONFIG);
      }
      return;
    } else if (noData) {
      setNoData(false);
    }

    // Add to pending data points for batch processing
    pendingDataPointsRef.current.push(dataPoint);

    // For first initialization only, we need to create the plot immediately
    if (!chartInitialized) {
      // Create traces for each series
      const traces = numericKeys.sort().map((key, idx) => {
        const color = LINE_COLORS[idx % LINE_COLORS.length];
        return {
          x: [formattedTime],
          y: [numericFields[key]],
          mode: 'lines',
          name: key,
          line: { 
            color, 
            width: rtSettings.lineWidth || 1.5,
            shape: 'linear',
          },
          hovertemplate: '%{y:.3f}<extra>' + key + '</extra>'
        };
      });

      seriesKeysRef.current = numericKeys.sort();
      const layout = createLineChartLayout();
      
      Plotly.newPlot(containerRef.current, traces, layout, PLOT_CONFIG);
      setChartInitialized(true);
    }
  }, [
    updateInterval, 
    rtSettings.lineWidth,
    isVisible, 
    isPaused, 
    noData, 
    fontColor, 
    createLineChartLayout, 
    hasSignificantChange,
    PLOT_CONFIG,
    chartInitialized,
    theme,
    gridColor
  ]);

  // Process new data from WebSocket
  const handleNewData = useCallback((dataPoint) => {
    if (isPaused) return;
    
    if (chartType === 'cell') {
      handleCellBarChartUpdate(dataPoint);
    } else {
      handleLineChartUpdate(dataPoint);
    }
  }, [chartType, handleCellBarChartUpdate, handleLineChartUpdate, isPaused]);

  // Subscribe to real-time data using settings from context
  useRealTimeData(chartType, handleNewData);

  // Listen for window resize to ensure Plotly updates fully
  useEffect(() => {
    let resizeTimer = null;
    
    const handleResize = () => {
      // Clear previous timer
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
      
      // Use a small timeout to avoid too many resize operations
      resizeTimer = setTimeout(() => {
        if (containerRef.current && isVisible) {
          Plotly.Plots.resize(containerRef.current);
        }
        resizeTimer = null;
      }, 100);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimer) {
        clearTimeout(resizeTimer);
      }
    };
  }, [isVisible]);

  // Effect to update when settings change
  useEffect(() => {
    if (!chartInitialized || noData || !isVisible || !containerRef.current) return;

    // Use a timeout to batch these changes
    const timeoutId = setTimeout(() => {
      safeRelayout({
        paper_bgcolor: backgroundColor,
        plot_bgcolor: backgroundColor,
        'font.color': fontColor,
        'xaxis.gridcolor': gridColor,
        'yaxis.gridcolor': gridColor
      });

      if (rtSettings.window && lastTimestampRef.current && chartType !== 'cell') {
        const currentTimeMs = new Date(lastTimestampRef.current).getTime();
        const leftTimeMs = currentTimeMs - rtSettings.window;
        safeRelayout({ 
          'xaxis.range': [formatTimeMST(leftTimeMs), formatTimeMST(currentTimeMs)]
        });
      }
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [
    chartType,
    chartInitialized,
    noData,
    isVisible,
    backgroundColor,
    fontColor,
    gridColor,
    rtSettings.window,
    safeRelayout
  ]);

  // Handle hardware acceleration changes
  useEffect(() => {
    const style = containerRef.current?.parentElement?.style;
    if (style) {
      if (enableHardwareAcceleration) {
        style.transform = 'translateZ(0)';
        style.backfaceVisibility = 'hidden';
        style.perspective = '1000px';
        style.willChange = 'transform'; // Additional hint for browser
      } else {
        style.transform = 'none';
        style.backfaceVisibility = 'visible';
        style.perspective = 'none';
        style.willChange = 'auto';
      }
    }
  }, [enableHardwareAcceleration]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (updateRequestRef.current) {
        cancelAnimationFrame(updateRequestRef.current);
      }
      
      if (containerRef.current) {
        try {
          pendingUpdatesRef.current = 0;
          Plotly.purge(containerRef.current);
        } catch (err) {
          console.error('Error cleaning up chart:', err);
        }
      }
    };
  }, []);

  // Determine if we should render with CSS opacity transition
  const transitionStyle = useMemo(() => (
    enableTransitions
      ? { transition: 'opacity 0.2s ease-in-out' }
      : { transition: 'none' }
  ), [enableTransitions]);

  return (
    <div
      className="plot-container"
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        visibility: isVisible ? 'visible' : 'hidden',
        transform: enableHardwareAcceleration ? 'translateZ(0)' : 'none',
        backfaceVisibility: enableHardwareAcceleration ? 'hidden' : 'visible',
        willChange: enableHardwareAcceleration ? 'transform' : 'auto',
      }}
    >
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          opacity: isVisible ? 1 : 0,
          ...transitionStyle
        }} 
      />
    </div>
  );
};

RealTimeChart.propTypes = {
  chartType: PropTypes.string.isRequired,
  config: PropTypes.shape({
    title: PropTypes.string,
    axisTitles: PropTypes.object,
    showLegend: PropTypes.bool,
    dimensions: PropTypes.object,
  }),
  isPaused: PropTypes.bool,
  isVisible: PropTypes.bool,
};

export default React.memo(RealTimeChart);