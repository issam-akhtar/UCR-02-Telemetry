import React, { useEffect, useRef, useContext, useState, useCallback, useMemo } from 'react';
import Plotly from 'plotly.js-dist-min';
import useRealTimeData from '../../hooks/useRealTimeData';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import PropTypes from 'prop-types';

const FONT_SIZES = {
  base: 16,
  title: 22,
  axisLabel: 20,
  tick: 14,
};

const LINE_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
  '#bcbd22', '#17becf', '#8dd3c7', '#ffffb3',
];

// Convert these to a function that reads from settings
const getPlotConfig = (hardwareAcceleration) => ({
  responsive: true,
  displayModeBar: false,
  scrollZoom: false,
  staticPlot: !hardwareAcceleration, // Use static plot for low-power devices if hardware acceleration is disabled
});

/**
 * Converts a timestamp into a valid ISO-like string in MST (UTC-7).
 * The returned format is "YYYY-MM-DDTHH:mm:ss.sss" (without the trailing "Z").
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
 * More efficient downsampling algorithm using LTTB (Largest-Triangle-Three-Buckets)
 * Better preserves visual features of the data while reducing points
 */
function downsampleLTTB(data, timestamps, targetPoints) {
  if (!data || data.length <= targetPoints) return { data, timestamps };
  
  // For simplicity, use everyNth method but with proper paired data
  const everyNth = Math.ceil(data.length / targetPoints);
  const sampled = [];
  const sampledTimestamps = [];
  
  for (let i = 0; i < data.length; i += everyNth) {
    // Find max/min in this bucket for better visual representation
    let maxVal = data[i];
    let maxIdx = i;
    
    for (let j = i; j < i + everyNth && j < data.length; j++) {
      if (data[j] > maxVal || data[j] < maxVal / 2) {
        maxVal = data[j];
        maxIdx = j;
      }
    }
    
    sampled.push(data[maxIdx]);
    sampledTimestamps.push(timestamps[maxIdx]);
  }
  
  return { data: sampled, timestamps: sampledTimestamps };
}

/**
 * Returns an appropriate Y-axis label based on chart type
 */
function getYAxisLabel(chartType) {
  const labels = {
    'pack_current': 'Current (A)',
    'pack_voltage': 'Voltage (V)',
    'cell': 'Voltage (V)',
    'thermistor': 'Temperature (°C)',
    'bamocar': 'Value',
    'ins_imu': 'Value',
    'ins_gps': 'Value',
    'front_strain_gauges_1': 'Strain',
    'front_aero': 'Position',
    'front_analog': 'Value',
    'front_frequency': 'Frequency (Hz)',
    'encoder': 'Encoder Value',
    'tcu': 'Value',
    // Add more mappings as needed
  };
  
  return labels[chartType] || 'Value';
}

const RealTimeChart = ({ chartType, config, isPaused, isVisible = true }) => {
  const containerRef = useRef(null);
  const seriesKeysRef = useRef(null);
  const dataBufferRef = useRef({
    timestamps: [],
    series: {},
    lastValues: {}, // Store last values for change detection
  });
  const lastUpdateTimeRef = useRef(0);
  const lastTimestampRef = useRef(null);
  const [chartInitialized, setChartInitialized] = useState(false);
  const [noData, setNoData] = useState(false);
  const pendingUpdatesRef = useRef(0);

  // Get all settings from context
  const { settings } = useContext(ChartSettingsContext);
  const { global, realTime: rtSettings, dashboard } = settings;
  
  // Extract settings
  const theme = global.theme;
  const enableHardwareAcceleration = global.enableHardwareAcceleration !== false;
  const enableTransitions = global.enableTransitions !== false;
  const backgroundColor = theme === 'dark' ? '#161A1D' : '#fff';
  const fontColor = theme === 'dark' ? '#ecf3e8' : '#333';
  const maxPoints = rtSettings.maxDataPoints || 500;
  const significantChangeThreshold = dashboard.significantChangeThreshold || 1.0;
  
  // Memoize plot config to avoid recreating on every render
  const PLOT_CONFIG = useMemo(() => 
    getPlotConfig(enableHardwareAcceleration), 
  [enableHardwareAcceleration]);

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
      font: { size: FONT_SIZES.title },
      x: 0.5,
      xanchor: 'center',
      yanchor: 'top',
      pad: { b: 10 },
    },
    margin: { l: 60, r: 20, b: 140, t: 60 },
    paper_bgcolor: backgroundColor,
    plot_bgcolor: backgroundColor,
    font: { color: fontColor, size: FONT_SIZES.base },
    legend: {
      orientation: 'h',
      x: 0.5,
      xanchor: 'center',
      y: -0.4,
      yanchor: 'top',
      font: { size: FONT_SIZES.tick },
    },
    // Disable animations if transitions are disabled
    transition: {
      duration: enableTransitions ? 300 : 0,
      easing: 'cubic-in-out'
    },
    // Set a reasonable frame rate for updates
    updatemenus: enableTransitions ? undefined : [],
  }), [backgroundColor, fontColor, config.title, chartType, enableTransitions]);

  // Create line chart layout with consistent styling
  const createLineChartLayout = useCallback(() => {
    const gridColor = theme === 'dark'
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.1)';

    return {
      ...baseLayout,
      hovermode: 'x unified',
      xaxis: {
        type: 'date',
        title: {
          text: `<b>${config.axisTitles?.x || 'Time'}</b>`,
          font: { size: FONT_SIZES.axisLabel },
          standoff: 0,
        },
        tickangle: -45,
        tickfont: { size: FONT_SIZES.tick },
        automargin: true,
        showgrid: true,
        gridcolor: gridColor,
        gridwidth: 1,
        // Reduce number of ticks for better performance
        nticks: Math.min(8, rtSettings.maxPoints / 100),
      },
      yaxis: {
        title: {
          text: `<b>${getYAxisLabel(chartType)}</b>`,
          font: { size: FONT_SIZES.axisLabel },
          standoff: 20,
        },
        tickfont: { size: FONT_SIZES.tick },
        automargin: true,
        showgrid: true,
        gridcolor: gridColor,
        gridwidth: 1,
        // Reduce number of ticks for better performance
        nticks: 5,
      },
    };
  }, [baseLayout, config.axisTitles, theme, chartType, rtSettings.maxPoints]);

  // Create cell bar chart layout
  const createCellBarLayout = useCallback(() => {
    const gridColor = theme === 'dark'
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.1)';

    return {
      ...baseLayout,
      showlegend: false,
      xaxis: {
        title: {
          text: '<b>Cell #</b>',
          font: { size: FONT_SIZES.axisLabel },
          standoff: 20,
        },
        tickfont: { size: FONT_SIZES.tick },
        type: 'category',
        automargin: true,
        showgrid: true,
        gridcolor: gridColor,
        gridwidth: 1,
        // Optimize tick count for performance
        nticks: 16,
      },
      yaxis: {
        title: {
          text: '<b>Voltage (V)</b>',
          font: { size: FONT_SIZES.axisLabel },
          standoff: 20,
        },
        tickfont: { size: FONT_SIZES.tick },
        automargin: true,
        showgrid: true,
        gridcolor: gridColor,
        gridwidth: 1,
        // Optimize tick count for performance
        nticks: 5,
      },
    };
  }, [baseLayout, theme]);

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

  // Process data for cell bar chart
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
          text: 'No data to graph',
          x: 0.5,
          y: 0.5,
          xref: 'paper',
          yref: 'paper',
          showarrow: false,
          font: { size: 20, color: fontColor },
        }];
        Plotly.newPlot(containerRef.current, [], layout, PLOT_CONFIG);
      }
      return;
    } else if (noData) {
      setNoData(false);
    }

    // Skip update if no significant changes
    if (!hasSignificantChanges && chartInitialized) {
      return;
    }

    const xVals = Array.from({ length: 128 }, (_, i) => i + 1);
    const colors = cellVals.map((v) => {
      if (v < 3.2) return 'red';
      if (v < 3.7) return 'orange';
      return 'green';
    });

    const trace = {
      x: xVals,
      y: cellVals,
      type: 'bar',
      name: 'Cell Voltage',
      marker: { color: colors },
    };

    const layout = createCellBarLayout();
    
    try {
      if (!chartInitialized || noData) {
        Plotly.newPlot(containerRef.current, [trace], layout, PLOT_CONFIG);
        setChartInitialized(true);
      } else {
        // Use react instead of extendTraces for better performance
        Plotly.react(containerRef.current, [trace], layout, PLOT_CONFIG);
      }
    } catch (err) {
      console.error('Error updating cell chart:', err);
    }
  }, [isVisible, noData, fontColor, createCellBarLayout, chartInitialized, hasSignificantChange, PLOT_CONFIG]);

  // Process data for line chart
  const handleLineChartUpdate = useCallback((dataPoint) => {
    // Extract time from dataPoint - use message's timestamp if available, or current time
    const messageTime = dataPoint.time || Date.now();
    const timestampField = dataPoint.fields?.timestamp?.numberValue;
    const currentTime = timestampField ? (timestampField * 1000) : messageTime; // Convert to ms if timestamp is in seconds
    
    // Skip updates if updating too frequently (based on settings)
    if (currentTime - lastUpdateTimeRef.current < rtSettings.updateInterval) return;
    lastUpdateTimeRef.current = currentTime;

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
    
    // Limit buffer size
    if (buffer.timestamps.length > maxPoints * 1.2) { // Add 20% buffer
      const removeCount = buffer.timestamps.length - maxPoints;
      buffer.timestamps = buffer.timestamps.slice(removeCount);
      Object.keys(buffer.series).forEach(key => {
        buffer.series[key] = buffer.series[key].slice(removeCount);
      });
    }
    
    // If not visible or paused, just buffer data without updating the chart
    if (!isVisible || isPaused || !containerRef.current) return;
    
    // Skip update if no significant changes and not the first update
    if (!hasSignificantChanges && chartInitialized && Object.keys(numericFields).length > 0) {
      return;
    }
    
    // Exit if we don't have data to display
    if (numericKeys.length === 0) {
      if (!noData) {
        setNoData(true);
        const layout = createLineChartLayout();
        layout.annotations = [{
          text: 'No data to graph',
          x: 0.5,
          y: 0.5,
          xref: 'paper',
          yref: 'paper',
          showarrow: false,
          font: { size: 20, color: fontColor },
        }];
        Plotly.newPlot(containerRef.current, [], layout, PLOT_CONFIG);
      }
      return;
    } else if (noData) {
      setNoData(false);
    }

    try {
      // First time we're seeing data, create new plot
      if (!seriesKeysRef.current || noData) {
        seriesKeysRef.current = numericKeys.sort();
        
        // Create traces for each series
        const traces = seriesKeysRef.current.map((key, idx) => {
          const color = LINE_COLORS[idx % LINE_COLORS.length];
          return {
            x: [formattedTime],
            y: [numericFields[key]],
            mode: 'lines',
            name: key,
            line: { 
              color, 
              width: rtSettings.lineWidth,
              shape: 'linear', // Use linear for better performance
              simplify: true   // Enable line simplification for better performance
            },
          };
        });

        const layout = createLineChartLayout();
        Plotly.newPlot(containerRef.current, traces, layout, PLOT_CONFIG);
        setChartInitialized(true);
      } else {
        // Update existing plot
        // Check if we have new fields that weren't in the plot before
        let needsFullUpdate = false;
        numericKeys.forEach(key => {
          if (!seriesKeysRef.current.includes(key)) {
            needsFullUpdate = true;
            seriesKeysRef.current.push(key);
          }
        });
        
        if (needsFullUpdate) {
          // We have new fields, need to recreate the plot
          const traces = seriesKeysRef.current.map((key, idx) => {
            const color = LINE_COLORS[idx % LINE_COLORS.length];
            
            // Perform downsampling if needed and enabled
            let xData = buffer.timestamps.slice(-buffer.series[key]?.length || 0);
            let yData = buffer.series[key] || [];
            
            if (rtSettings.downsample && yData.length > 100) {
              const { data: sampledYData, timestamps: sampledXData } = 
                downsampleLTTB(yData, xData, Math.min(maxPoints, yData.length));
              xData = sampledXData;
              yData = sampledYData;
            }
            
            return {
              x: xData,
              y: yData,
              mode: 'lines',
              name: key,
              line: { 
                color, 
                width: rtSettings.lineWidth,
                shape: 'linear',
                simplify: true
              },
            };
          });
          
          const layout = createLineChartLayout();
          Plotly.react(containerRef.current, traces, layout, PLOT_CONFIG);
        } else if (pendingUpdatesRef.current < 2) {
          // No new fields, can do an extend traces update
          // But only if we don't have too many pending updates
          pendingUpdatesRef.current++;
          
          const update = { x: [], y: [] };
          seriesKeysRef.current.forEach((key, i) => {
            update.x[i] = numericFields[key] !== undefined ? [formattedTime] : [];
            update.y[i] = numericFields[key] !== undefined ? [numericFields[key]] : [];
          });

          Plotly.extendTraces(
            containerRef.current,
            update,
            seriesKeysRef.current.map((_, i) => i),
            maxPoints
          ).finally(() => {
            pendingUpdatesRef.current--;
          });

          // Update the x-axis range to always show the most recent data
          if (rtSettings.window) {
            const currentTimeMs = currentTime;
            const leftTimeMs = currentTimeMs - rtSettings.window;
            safeRelayout({ 
              'xaxis.range': [formatTimeMST(leftTimeMs), formatTimeMST(currentTimeMs)]
            });
          }
        }
      }
    } catch (err) {
      console.error('Error updating line chart:', err);
      pendingUpdatesRef.current = 0; // Reset counter in case of error
      
      // Try to recover by reinitializing the chart
      if (containerRef.current) {
        try {
          Plotly.purge(containerRef.current);
          setChartInitialized(false);
        } catch (purgeErr) {
          console.error('Error purging chart:', purgeErr);
        }
      }
    }
  }, [
    rtSettings.updateInterval, 
    rtSettings.lineWidth, 
    rtSettings.window,
    rtSettings.downsample,
    isVisible, 
    isPaused, 
    noData, 
    fontColor, 
    createLineChartLayout, 
    safeRelayout, 
    maxPoints,
    hasSignificantChange,
    PLOT_CONFIG
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

  // Subscribe to real-time data with custom update interval
  const subscriptionOptions = useMemo(() => ({
    customInterval: dashboard.updateInterval, // Use dashboard update interval
  }), [dashboard.updateInterval]);
  
  useRealTimeData(chartType, handleNewData, subscriptionOptions);

  // Listen for window resize to ensure Plotly updates fully
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && isVisible) {
        Plotly.Plots.resize(containerRef.current);
      }
    };
    
    // Throttle resize events for better performance
    let resizeTimeout;
    const throttledResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 100);
    };
    
    window.addEventListener('resize', throttledResize);
    return () => {
      window.removeEventListener('resize', throttledResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, [isVisible]);

  // Effect to initialize/update the chart when visibility changes
  useEffect(() => {
    if (!isVisible || !containerRef.current) return;
    
    // If we have buffer data and the chart isn't initialized, initialize it now
    const buffer = dataBufferRef.current;
    
    if (!chartInitialized && chartType !== 'cell' && buffer.timestamps.length > 0) {
      try {
        // Get all keys with data
        const availableKeys = Object.keys(buffer.series).filter(key => 
          buffer.series[key] && buffer.series[key].length > 0
        );
        
        if (availableKeys.length > 0) {
          seriesKeysRef.current = availableKeys.sort();
          
          // Apply downsampling if needed
          let plotTimestamps = buffer.timestamps;
          let plotSeries = { ...buffer.series };
          
          if (rtSettings.downsample && buffer.timestamps.length > 100) {
            // Perform downsampling for each series
            availableKeys.forEach(key => {
              const { data: sampledData, timestamps: sampledTimestamps } = 
                downsampleLTTB(
                  buffer.series[key], 
                  buffer.timestamps.slice(-buffer.series[key].length), 
                  Math.min(maxPoints, buffer.series[key].length)
                );
              
              plotSeries[key] = sampledData;
              
              // We'll use the last series timestamps
              if (key === availableKeys[availableKeys.length - 1]) {
                plotTimestamps = sampledTimestamps;
              }
            });
          }
          
          // Create traces
          const traces = seriesKeysRef.current.map((key, idx) => {
            const color = LINE_COLORS[idx % LINE_COLORS.length];
            return {
              x: plotTimestamps.slice(-plotSeries[key].length),
              y: plotSeries[key],
              mode: 'lines',
              name: key,
              line: { 
                color, 
                width: rtSettings.lineWidth,
                shape: 'linear',
                simplify: true
              },
            };
          });
          
          const layout = createLineChartLayout();
          Plotly.newPlot(containerRef.current, traces, layout, PLOT_CONFIG);
          setChartInitialized(true);
          
          // Set appropriate time window if configured
          if (rtSettings.window && buffer.timestamps.length > 0) {
            const latestTime = new Date(buffer.timestamps[buffer.timestamps.length - 1]).getTime();
            const earliestTime = Math.max(
              new Date(buffer.timestamps[0]).getTime(),
              latestTime - rtSettings.window
            );
            safeRelayout({ 
              'xaxis.range': [formatTimeMST(earliestTime), formatTimeMST(latestTime)]
            });
          }
        }
      } catch (err) {
        console.error('Error initializing chart from buffer:', err);
      }
    }
  }, [
    isVisible, 
    chartInitialized, 
    chartType, 
    rtSettings.downsample, 
    rtSettings.lineWidth, 
    rtSettings.window, 
    createLineChartLayout, 
    safeRelayout, 
    maxPoints,
    PLOT_CONFIG
  ]);

  // Update theme or line width when settings change
  useEffect(() => {
    if (!chartInitialized || noData || !isVisible || !containerRef.current) return;

    safeRelayout({
      paper_bgcolor: backgroundColor,
      plot_bgcolor: backgroundColor,
      'font.color': fontColor,
    });

    if (seriesKeysRef.current && chartType !== 'cell') {
      const update = {
        'line.width': seriesKeysRef.current.map(() => rtSettings.lineWidth),
      };
      
      try {
        if (pendingUpdatesRef.current < 2) {
          pendingUpdatesRef.current++;
          Plotly.restyle(containerRef.current, update)
            .finally(() => {
              pendingUpdatesRef.current--;
            });
        }
      } catch (err) {
        console.error('Error updating line style:', err);
        pendingUpdatesRef.current = Math.max(0, pendingUpdatesRef.current - 1);
      }
    }

    if (lastTimestampRef.current && chartType !== 'cell') {
      const currentTimeMs = new Date(lastTimestampRef.current).getTime();
      const leftTimeMs = currentTimeMs - rtSettings.window;
      safeRelayout({ 
        'xaxis.range': [formatTimeMST(leftTimeMs), formatTimeMST(currentTimeMs)]
      });
    }
  }, [
    chartType,
    chartInitialized,
    noData,
    isVisible,
    backgroundColor,
    fontColor,
    rtSettings.lineWidth,
    rtSettings.window,
    safeRelayout
  ]);

  // Handle hardware acceleration changes
  useEffect(() => {
    const style = containerRef.current?.parentElement?.style;
    if (style) {
      if (enableHardwareAcceleration) {
        style.transform = 'translateZ(0)'; // Enable hardware acceleration
        style.backfaceVisibility = 'hidden';
        style.perspective = '1000px';
      } else {
        style.transform = 'none';
        style.backfaceVisibility = 'visible';
        style.perspective = 'none';
      }
    }
  }, [enableHardwareAcceleration]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
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
  const transitionStyle = enableTransitions
    ? { transition: 'opacity 0.2s ease-in-out' }
    : { transition: 'none' };

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        visibility: isVisible ? 'visible' : 'hidden',
        ...(enableHardwareAcceleration ? {
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
        } : {})
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