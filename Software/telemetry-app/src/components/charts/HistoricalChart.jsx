import React, { useEffect, useRef, useContext, useMemo, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import PropTypes from 'prop-types';
import { debounce, throttle } from 'lodash';
import CellSliceChart from './CellSliceChart';
import { Box, CircularProgress, useTheme, alpha } from '@mui/material';
import { DESIGN_TOKENS } from '../../theme';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Constants moved outside component to prevent recreation on every render
const FONT_SIZES = {
  base: 16,
  title: 18,
  axisLabel: 14,
  tick: 12,
};

const LINE_COLORS = [
  '#4A8AB8', '#FF9800', '#4CAF50', '#EF5350',
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
  '#bcbd22', '#29B6F6', '#8dd3c7', '#FFB74D',
  '#9edae5', '#f7b6d2', '#c49c94', '#dbdb8d',
];

/**
 * Formats timestamp in MST timezone
 * Moved outside component to prevent recreation on every render
 */
const formatTimeMST = (timestamp) => {
  const date = new Date(timestamp);
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const mstDate = new Date(utc - 7 * 3600000);
  const hours = String(mstDate.getHours()).padStart(2, '0');
  const minutes = String(mstDate.getMinutes()).padStart(2, '0');
  const seconds = String(mstDate.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Downsamples data array by factor
 * Moved outside component to prevent recreation on every render
 */
const downsampleData = (data, factor) => {
  if (!data || factor <= 1) return data;
  return data.filter((_, i) => i % factor === 0);
};

const HistoricalChart = ({ endpoint, data = null, config }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const renderedDataRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const resizeHandlerRef = useRef(null);
  const updateChartRef = useRef(null);
  
  const [isRendering, setIsRendering] = useState(false);
  
  const muiTheme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  // Destructure settings with defaults to prevent undefined access
  const histSettings = settings?.historical || {};
  const globalSettings = settings?.global || {};
  const theme = globalSettings.theme || 'light';
  
  // Memoize theme-dependent values to prevent recalculation
  const themeValues = useMemo(() => ({
    backgroundColor: theme === 'dark' 
      ? muiTheme.palette.background.paper 
      : muiTheme.palette.background.default,
    fontColor: muiTheme.palette.text.primary,
    gridLineColor: theme === 'dark'
      ? alpha(muiTheme.palette.divider, 0.3)
      : alpha(muiTheme.palette.divider, 0.7)
  }), [theme, muiTheme.palette]);
  
  // Check if this is a cell data chart
  const isCellSliced = useMemo(() => 
    endpoint.includes('/cellData'), 
  [endpoint]);
  
  const groupSize = config?.groupSize || 16;
  
  // Check if data has changed to prevent unnecessary rerenders
  const hasDataChanged = useMemo(() => {
    if (!data || !renderedDataRef.current) return true;
    if (data.length !== renderedDataRef.current.length) return true;
    if (data.length > 0 && renderedDataRef.current.length > 0) {
      const firstNew = data[0]?.time;
      const firstOld = renderedDataRef.current[0]?.time;
      const lastNew = data[data.length - 1]?.time;
      const lastOld = renderedDataRef.current[renderedDataRef.current.length - 1]?.time;
      return firstNew !== firstOld || lastNew !== lastOld;
    }
    return false;
  }, [data]);
  
  // Memoize chart data processing to avoid redundant calculations
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return { chartData: [], xData: [], keys: [], legendData: [] };
    
    let chartData = data;
    const downsampleThreshold = histSettings.downsampleThreshold || 1000;
    const downsampleFactor = histSettings.downsampleFactor || 2;
    
    // Apply downsampling if data exceeds threshold
    if (data.length > downsampleThreshold) {
      chartData = downsampleData(data, downsampleFactor);
    }
    
    // Extract x-axis timestamps
    const xData = chartData.map((dp) => formatTimeMST(dp.time));
    
    // Get numeric keys excluding time property
    const keys = chartData[0] ? Object.keys(chartData[0]).filter(
      (k) => k !== 'time' && !isNaN(Number(chartData[0][k]))
    ) : [];
    
    return { chartData, xData, keys, legendData: keys };
  }, [data, histSettings.downsampleThreshold, histSettings.downsampleFactor]);
  
  // Method to resize chart - expose via ref
  const handleChartResize = useCallback(() => {
    if (chartInstanceRef.current) {
      chartInstanceRef.current.resize();
    }
  }, []);
  
  // Expose resize method via ref
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.resize = handleChartResize;
    }
    
    return () => {
      if (chartRef.current) {
        chartRef.current.resize = null;
      }
    };
  }, [handleChartResize]);
  
  // Create chart options - memoized to prevent recreation on every render
  const createChartOptions = useCallback((chartData, xData, keys) => {
    if (!chartData || !xData || !keys || keys.length === 0) {
      return null;
    }
    
    const { backgroundColor, fontColor, gridLineColor } = themeValues;
    const maxAxisTicks = histSettings.maxAxisTicks || 10;
    const enableSmoothing = histSettings.enableSmoothing || false;
    const lineWidth = settings?.realTime?.lineWidth || 2;
    const animationDuration = globalSettings.animationDuration || 0;
    const dataZoomEnabled = histSettings.dataZoomEnabled !== false;
    
    // Calculate appropriate tick interval
    const tickInterval = Math.max(1, Math.ceil(xData.length / maxAxisTicks));
    
    // Create series array
    const series = keys.map((key, idx) => ({
      name: key,
      type: 'line',
      showSymbol: false,
      sampling: 'lttb',
      smooth: enableSmoothing,
      lineStyle: { 
        width: lineWidth,
        color: LINE_COLORS[idx % LINE_COLORS.length] 
      },
      emphasis: {
        focus: 'series',
        lineStyle: {
          width: lineWidth + 1
        }
      },
      animation: !!animationDuration,
      animationDuration: animationDuration,
      data: chartData.map((dp) => Number(dp[key])),
    }));
    
    return {
      backgroundColor,
      textStyle: { fontSize: FONT_SIZES.base, color: fontColor },
      useUTC: false,
      title: {
        text: config?.title || 'Historical Data',
        left: 'center',
        top: 10,
        textStyle: { fontSize: FONT_SIZES.title, color: fontColor },
      },
      tooltip: { 
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          animation: false,
        },
        confine: true,
        formatter: (params) => {
          if (params.length === 0) return '';
          const time = params[0].axisValue;
          let tooltipContent = `<div style="font-weight:bold;margin-bottom:5px">${time}</div>`;
          params.forEach(param => {
            const value = typeof param.value === 'number' 
              ? param.value.toFixed(2) 
              : param.value;
            tooltipContent += `
              <div style="display:flex;justify-content:space-between;margin:3px 0">
                <span style="display:inline-block;margin-right:10px">
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${param.color};margin-right:5px"></span>
                  ${param.seriesName}:
                </span>
                <span style="font-weight:bold">${value}</span>
              </div>
            `;
          });
          return tooltipContent;
        }
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        data: keys,
        textStyle: { fontSize: FONT_SIZES.tick, color: fontColor },
        type: keys.length > 15 ? 'scroll' : 'plain', 
        pageIconSize: 12,
        pageButtonItemGap: 5,
        pageButtonGap: 5,
        pageButtonPosition: 'end',
        selector: keys.length > 8, 
        selectorLabel: {
          show: true
        },
        selectorPosition: 'end'
      },
      grid: {
        top: 65,
        left: 75,
        right: 30,
        bottom: 65,
        containLabel: true,
      },
      dataZoom: [{
        type: 'inside',
        show: dataZoomEnabled,
        xAxisIndex: 0,
        start: 0,
        end: 100,
        minValueSpan: 10,
        throttle: 100,
      }, {
        type: 'slider',
        show: dataZoomEnabled,
        xAxisIndex: 0,
        bottom: 40,
        height: 20,
        start: 0,
        end: 100,
        textStyle: { color: fontColor },
        borderColor: 'transparent',
        fillerColor: 'rgba(128, 128, 160, 0.2)',
        handleIcon: 'M10.7,11.9v-1.3H9.3v1.3c-4.9,0.3-8.8,4.4-8.8,9.4c0,5,3.9,9.1,8.8,9.4v1.3h1.3v-1.3c4.9-0.3,8.8-4.4,8.8-9.4C19.5,16.3,15.6,12.2,10.7,11.9z M13.3,24.4H6.7V23h6.6V24.4z M13.3,19.6H6.7v-1.4h6.6V19.6z',
        handleSize: '80%',
        handleStyle: {
          color: '#fff',
          shadowBlur: 3,
          shadowColor: 'rgba(0, 0, 0, 0.6)',
          shadowOffsetX: 2,
          shadowOffsetY: 2
        }
      }],
      xAxis: {
        type: 'category',
        data: xData,
        nameLocation: 'middle',
        nameGap: 35,
        axisLabel: {
          rotate: 45,
          interval: tickInterval - 1,
          margin: 12,
          fontSize: FONT_SIZES.tick,
          color: fontColor,
          hideOverlap: true,
        },
        splitLine: {
          show: true,
          lineStyle: { color: gridLineColor },
        },
      },
      yAxis: {
        type: 'value',
        name: config?.axisTitles?.y || 'Value',
        nameLocation: 'middle',
        nameGap: 75,
        axisLabel: { 
          fontSize: FONT_SIZES.tick, 
          color: fontColor,
          margin: 16,
          formatter: (value) => value.toFixed(2)
        },
        splitLine: {
          show: true,
          lineStyle: { color: gridLineColor },
        },
        scale: true,
      },
      series,
    };
  }, [
    config, 
    themeValues, 
    histSettings.maxAxisTicks, 
    histSettings.enableSmoothing, 
    histSettings.dataZoomEnabled,
    settings?.realTime?.lineWidth, 
    globalSettings.animationDuration
  ]);
  
  // Create chart update function - memoized to prevent recreation
  const createUpdateChartFunction = useCallback((option, chartData) => {
    if (!option) return () => {};
    
    // If many data points, use throttle, otherwise directly update
    if (chartData && chartData.length > 1000) {
      return throttle(() => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.setOption(option, { notMerge: true });
          setIsRendering(false);
          
          // Force resize to ensure proper rendering
          setTimeout(() => {
            if (chartInstanceRef.current) {
              chartInstanceRef.current.resize();
            }
          }, 10);
        }
      }, 100);
    } else {
      return () => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.setOption(option, { notMerge: true });
          setIsRendering(false);
          
          // Force resize to ensure proper rendering
          setTimeout(() => {
            if (chartInstanceRef.current) {
              chartInstanceRef.current.resize();
            }
          }, 10);
        }
      };
    }
  }, []);
  
  // Main function to render the standard chart
  const renderStandardChart = useCallback(() => {
    if (!chartRef.current || !data || data.length === 0) return null;
    if (!hasDataChanged && chartInstanceRef.current) return null;
    
    setIsRendering(true);
    
    // Initialize chart if needed
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, null, {
        renderer: 'canvas',
        useDirtyRect: true,
      });
    }
    
    const { chartData, xData, keys } = processedData;
    renderedDataRef.current = chartData;
    
    // Create chart options
    const option = createChartOptions(chartData, xData, keys);
    if (!option) {
      setIsRendering(false);
      return null;
    }
    
    // Cancel any previous update function
    if (updateChartRef.current && updateChartRef.current.cancel) {
      updateChartRef.current.cancel();
    }
    
    // Create new update function and store it
    updateChartRef.current = createUpdateChartFunction(option, chartData);
    
    // Execute the update
    updateChartRef.current();
    
    // Return cleanup function
    return () => {
      if (updateChartRef.current && updateChartRef.current.cancel) {
        updateChartRef.current.cancel();
      }
    };
  }, [
    data, 
    hasDataChanged, 
    processedData, 
    createChartOptions, 
    createUpdateChartFunction
  ]);
  
  // Set up resize observer instead of window event listener
  useEffect(() => {
    if (!chartRef.current || !chartInstanceRef.current) return;
    
    // Use debounced resize handler
    const debouncedResize = debounce(() => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize();
      }
    }, 250);
    
    // Create ResizeObserver if supported
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserverRef.current = new ResizeObserver(debouncedResize);
      resizeObserverRef.current.observe(chartRef.current);
    } else {
      // Fallback to window resize event
      window.addEventListener('resize', debouncedResize);
      resizeHandlerRef.current = debouncedResize;
    }
    
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      } else if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        if (resizeHandlerRef.current.cancel) {
          resizeHandlerRef.current.cancel();
        }
        resizeHandlerRef.current = null;
      }
    };
  }, []);
  
  // Render or dispose chart based on data and type
  useEffect(() => {
    // Only render standard chart if not cell sliced and has data
    if (!isCellSliced && data && data.length > 0) {
      const cleanup = renderStandardChart();
      return () => {
        if (cleanup) cleanup();
      };
    }
    
    // Clean up chart if data changes or component unmounts
    return () => {
      if (updateChartRef.current && updateChartRef.current.cancel) {
        updateChartRef.current.cancel();
        updateChartRef.current = null;
      }
      
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [data, isCellSliced, renderStandardChart]);
  
  // Component cleanup on unmount
  useEffect(() => {
    return () => {
      if (updateChartRef.current && updateChartRef.current.cancel) {
        updateChartRef.current.cancel();
        updateChartRef.current = null;
      }
      
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
      
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        if (resizeHandlerRef.current.cancel) {
          resizeHandlerRef.current.cancel();
        }
        resizeHandlerRef.current = null;
      }
    };
  }, []);
  
  // Render cell sliced chart if needed
  if (isCellSliced) {
    return (
      <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
        {isRendering && (
          <Box
            sx={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.2)',
              zIndex: 10,
            }}
          >
            <CircularProgress size={24} />
          </Box>
        )}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            pt: muiTheme.spacing(2.5),
            pb: muiTheme.spacing(2.5),
            boxSizing: 'border-box',
          }}
        >
          {data && data.length > 0 ? (
            Array.from({ length: Math.ceil(128 / groupSize) }, (_, i) => (
              <CellSliceChart
                key={`group-${i}`}
                xData={processedData.xData}
                data={data}
                groupIndex={i}
                groupSize={groupSize}
                theme={theme}
              />
            ))
          ) : (
            <Box
              sx={{
                width: '100%',
                height: '200px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <span>No cell data available</span>
            </Box>
          )}
        </Box>
      </Box>
    );
  }
  
  // Render standard chart
  return (
    <Box sx={{ width: '100%', height: '100%', position: 'relative', flexGrow: 1 }}>
      {isRendering && (
        <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
          <CircularProgress size={20} />
        </Box>
      )}
      <Box 
        ref={chartRef} 
        sx={{ 
          width: '100%', 
          height: '100%',
          minHeight: '250px',  
          flexGrow: 1,
          transition: 'height 0.3s ease'
        }} 
      />
    </Box>
  );
};

HistoricalChart.propTypes = {
  endpoint: PropTypes.string.isRequired,
  data: PropTypes.arrayOf(PropTypes.object),
  config: PropTypes.shape({
    title: PropTypes.string,
    axisTitles: PropTypes.shape({
      x: PropTypes.string,
      y: PropTypes.string
    }),
    showDataLabels: PropTypes.bool,
    dimensions: PropTypes.shape({
      width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      height: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
    }),
    groupSize: PropTypes.number
  })
};

export default React.memo(HistoricalChart);