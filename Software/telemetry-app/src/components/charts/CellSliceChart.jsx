import React, { useRef, useEffect, useContext, useMemo, useCallback } from 'react';
import * as echarts from 'echarts';
import PropTypes from 'prop-types';
import { useInView } from 'react-intersection-observer';
import { throttle } from 'lodash';
import { useTheme, alpha } from '@mui/material';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { DESIGN_TOKENS } from '../../theme';

// Constants moved outside component to prevent recreation on every render
const LINE_COLORS = [
  '#4A8AB8', '#FF9800', '#4CAF50', '#EF5350',
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
  '#bcbd22', '#29B6F6', '#8dd3c7', '#FFB74D',
  '#9edae5', '#f7b6d2', '#c49c94', '#dbdb8d',
  '#6AA9D3', '#FFB74D', '#81C784', '#F44336',
  '#c5b0d5', '#c49c94', '#f7b6d2', '#c7c7c7'
];

/**
 * CellSliceChart Component
 * 
 * A high-performance chart for displaying cell voltage data using ECharts.
 * Fully optimized with lazy loading, responsive resizing, and complete
 * ChartSettingsContext integration.
 */
const CellSliceChart = ({ data, groupIndex, groupSize = 16, theme }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const lastRenderedDataRef = useRef(null);
  const chartUpdateRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const resizeHandlerRef = useRef(null);
  
  const muiTheme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  // Destructure settings with defaults to prevent undefined access
  const histSettings = settings?.historical || {};
  const globalSettings = settings?.global || {};
  const realTimeSettings = settings?.realTime || {};
  const dashboardSettings = settings?.dashboard || {};
  
  // Setup intersection observer with optimized options
  const inViewOptions = useMemo(() => ({
    threshold: 0.1,
    triggerOnce: false,
    delay: 300,
    rootMargin: '200px', // Preload charts before they become visible
  }), []);
  
  const { ref: inViewRef, inView } = useInView(inViewOptions);

  // Combine refs using callback to prevent unnecessary recreations
  const setRefs = useCallback((element) => {
    containerRef.current = element;
    inViewRef(element);
  }, [inViewRef]);

  // Calculate cell range values - memoized to prevent recalculation
  const cellRangeInfo = useMemo(() => {
    const startCell = groupIndex * groupSize + 1;
    const endCell = Math.min(startCell + groupSize - 1, 128);
    const groupTitle = `Cells ${startCell} - ${endCell}`;
    
    return { startCell, endCell, groupTitle };
  }, [groupIndex, groupSize]);
  
  // Extract values from memoized object for easier access
  const { startCell, endCell, groupTitle } = cellRangeInfo;

  // Format time data - memoized to prevent recalculation
  const xData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    return data.map((row) => {
      const dt = new Date(row.time);
      return dt.toLocaleTimeString();
    });
  }, [data]);

  // Check if data has changed - memoized to prevent recalculation
  const hasDataChanged = useMemo(() => {
    if (!lastRenderedDataRef.current || !data) return true;
    if (!data.length) return false;
    if (data.length !== lastRenderedDataRef.current.length) return true;
    
    if (data.length > 0 && lastRenderedDataRef.current.length > 0) {
      const firstNew = data[0].time;
      const firstOld = lastRenderedDataRef.current[0].time;
      const lastNew = data[data.length - 1].time;
      const lastOld = lastRenderedDataRef.current[lastRenderedDataRef.current.length - 1].time;
      return firstNew !== firstOld || lastNew !== lastOld;
    }
    
    return false;
  }, [data]);

  // Memoize theme-dependent values to prevent recalculation
  const themeValues = useMemo(() => {
    const isDark = (theme === 'dark' || globalSettings.theme === 'dark');
    
    return {
      backgroundColor: isDark
        ? muiTheme.palette.background.paper
        : muiTheme.palette.background.default,
      fontColor: muiTheme.palette.text.primary,
      gridLineColor: isDark
        ? alpha(muiTheme.palette.divider, 0.3)
        : alpha(muiTheme.palette.divider, 0.7),
      tooltipBackgroundColor: isDark
        ? alpha(muiTheme.palette.background.paper, 0.9)
        : alpha(muiTheme.palette.background.paper, 0.9),
      tooltipBorderColor: muiTheme.palette.divider,
      tooltipTextColor: muiTheme.palette.text.primary
    };
  }, [theme, globalSettings.theme, muiTheme.palette]);

  // Create chart options based on current data and settings
  const createChartOptions = useCallback((chartData, xAxisData) => {
    if (!chartData || !chartData.length || !xAxisData || !xAxisData.length) {
      return null;
    }
    
    const { backgroundColor, fontColor, gridLineColor, tooltipBackgroundColor, tooltipBorderColor, tooltipTextColor } = themeValues;
    
    // Extract settings with defaults
    const downsampleThreshold = histSettings.downsampleThreshold || 1000;
    const downsampleFactor = histSettings.downsampleFactor || 2;
    const dataZoomEnabled = histSettings.dataZoomEnabled !== false;
    const maxAxisTicks = histSettings.maxAxisTicks || 4;
    const brushEnabled = histSettings.brushEnabled || false;
    const enableSmoothing = histSettings.enableSmoothing !== false;
    const lineWidth = Math.max(0.5, realTimeSettings.lineWidth || 1.5);
    const animationDuration = globalSettings.animationDuration || 0;
    const enableHardwareAcceleration = globalSettings.enableHardwareAcceleration !== false;
    
    // Use imperial units if configured
    const useImperialUnits = dashboardSettings.useImperialUnits || false;
    
    // Create series for each cell
    const series = [];
    for (let cellNum = startCell; cellNum <= endCell; cellNum++) {
      const cellName = `cell${cellNum}`;
      const yValues = chartData.map((row) => {
        const value = Number(row[cellName]);
        return isNaN(value) ? 0 : value;
      });
      
      series.push({
        name: cellName,
        type: 'line',
        smooth: enableSmoothing,
        showSymbol: false,
        sampling: chartData.length > 1000 ? 'lttb' : undefined, // Use sampling only for large datasets
        animation: !!animationDuration,
        animationDuration: animationDuration,
        animationEasing: enableSmoothing ? 'cubicInOut' : 'linear',
        data: yValues,
        lineStyle: {
          color: LINE_COLORS[(cellNum - startCell) % LINE_COLORS.length],
          width: lineWidth,
        },
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: lineWidth + 1
          }
        },
        progressive: 200, // Enable progressive rendering for better performance
        progressiveThreshold: 1000
      });
    }

    // Calculate appropriate axis label interval
    const dataCount = xAxisData.length;
    const desiredTickCount = Math.min(maxAxisTicks, 8);
    const showLabelInterval = Math.max(1, Math.ceil(dataCount / desiredTickCount));

    return {
      backgroundColor,
      title: {
        text: groupTitle,
        left: 'center',
        textStyle: { color: fontColor, fontSize: 14 }
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        backgroundColor: tooltipBackgroundColor,
        borderColor: tooltipBorderColor,
        textStyle: { color: tooltipTextColor },
        formatter: (params) => {
          if (!params.length) return '';
          const timeLabel = params[0].axisValueLabel;
          let html = `<div style="font-weight:bold;margin-bottom:4px">Time: ${timeLabel}</div>`;
          html += `<div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
          
          // Sort cells by number for better readability
          const sortedParams = [...params].sort((a, b) => {
            const aNum = parseInt(a.seriesName.replace('cell', ''));
            const bNum = parseInt(b.seriesName.replace('cell', ''));
            return aNum - bNum;
          });
          
          sortedParams.forEach((p) => {
            const cellNum = p.seriesName.replace('cell', '');
            html += `
              <div style="margin-right: 10px; white-space: nowrap; min-width: 100px;">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background-color:${p.color};margin-right:5px"></span>
                Cell ${cellNum}: <strong>${parseFloat(p.value).toFixed(3)}V</strong>
              </div>
            `;
          });
          
          html += '</div>';
          return html;
        },
        axisPointer: {
          type: 'line',
          snap: true,
          lineStyle: {
            color: alpha(fontColor, 0.2),
            width: 1
          }
        }
      },
      legend: {
        show: false
      },
      grid: {
        top: 40,
        left: 60,
        right: 30,
        bottom: dataZoomEnabled ? 90 : 30,
        containLabel: true,
      },
      dataZoom: [{
        type: 'inside',
        show: dataZoomEnabled,
        xAxisIndex: 0,
        start: 0,
        end: 100,
        throttle: 100,
      }, {
        type: 'slider',
        show: dataZoomEnabled,
        xAxisIndex: 0,
        bottom: 10,
        height: 20,
        borderColor: 'transparent',
        fillerColor: alpha(fontColor, 0.1),
        textStyle: { color: fontColor }
      }],
      brush: brushEnabled ? {
        xAxisIndex: 0,
        throttleType: 'debounce',
        throttleDelay: 300
      } : undefined,
      toolbox: {
        feature: {
          saveAsImage: { show: true, title: 'Save', icon: 'path://M4,4H20V20H4V4M6,8V18H18V8H6Z', pixelRatio: 2 }
        },
        iconStyle: {
          borderColor: fontColor,
          color: fontColor
        }
      },
      xAxis: {
        type: 'category',
        data: xAxisData,
        axisLabel: {
          rotate: 45,
          interval: showLabelInterval - 1,
          fontSize: 12,
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
        name: 'Voltage (V)',
        nameLocation: 'middle',
        nameGap: 35,
        axisLabel: {
          fontSize: 12,
          color: fontColor,
          formatter: (value) => value.toFixed(2)
        },
        splitLine: {
          show: true,
          lineStyle: { color: gridLineColor },
        },
        scale: true
      },
      series,
      animation: !!animationDuration,
      animationDuration: animationDuration,
      animationEasing: enableSmoothing ? 'cubicInOut' : 'linear',
      renderer: enableHardwareAcceleration ? 'canvas' : 'svg', // Use canvas for hardware acceleration
      useUTC: false,
      hoverLayerThreshold: 500, // Optimize hover layer for performance
      progressive: 200, // Enable progressive rendering for better performance
      progressiveThreshold: 1000 // Start progressive rendering after 1000 data points
    };
  }, [
    startCell, 
    endCell, 
    groupTitle, 
    themeValues, 
    histSettings, 
    realTimeSettings, 
    globalSettings,
    dashboardSettings
  ]);

  // Create a properly throttled chart update function
  const createThrottledUpdate = useCallback(() => {
    // Cancel previous update if exists
    if (chartUpdateRef.current && chartUpdateRef.current.cancel) {
      chartUpdateRef.current.cancel();
    }
    
    // Calculate throttle delay based on dataset size
    const dataLength = data?.length || 0;
    const throttleDelay = dataLength > 5000 ? 
      200 : (dataLength > 1000 ? 150 : 100);
    
    // Create throttled update function
    chartUpdateRef.current = throttle((options) => {
      if (chartRef.current) {
        try {
          chartRef.current.setOption(options);
        } catch (err) {
          console.error('Error updating chart:', err);
        }
      }
    }, throttleDelay);
    
    return chartUpdateRef.current;
  }, [data]);

  // Initialize chart and handle updates
  useEffect(() => {
    // Skip if not in view or no container
    if (!inView || !containerRef.current) return;
    
    // Skip if data hasn't changed and chart exists
    if (!hasDataChanged && chartRef.current) return;
    
    // Skip if no data
    if (!data || data.length === 0) return;
    
    // Initialize chart if needed
    if (!chartRef.current) {
      // Use hardware acceleration if enabled
      const renderer = globalSettings.enableHardwareAcceleration !== false ? 'canvas' : 'svg';
      
      chartRef.current = echarts.init(containerRef.current, null, {
        renderer,
        useDirtyRect: true, // Enable dirty rectangle rendering for better performance
      });
    }
    
    // Update reference to last rendered data
    lastRenderedDataRef.current = data;

    // Downsample data if necessary
    const downsampleThreshold = histSettings.downsampleThreshold || 1000;
    const downsampleFactor = histSettings.downsampleFactor || 2;
    let chartData = data;
    
    if (data.length > downsampleThreshold) {
      chartData = data.filter((_, i) => i % downsampleFactor === 0);
    }

    // Get chart options
    const option = createChartOptions(chartData, xData);
    if (!option) return;

    // Get or create throttled update function
    const throttledUpdate = chartUpdateRef.current || createThrottledUpdate();
    
    // Execute the update
    throttledUpdate(option);
    
    // Set up ResizeObserver for chart container
    if (typeof ResizeObserver !== 'undefined' && !resizeObserverRef.current) {
      // Calculate throttle delay based on chart settings
      const throttleDelay = globalSettings.enableHardwareAcceleration ? 100 : 200;
      
      // Create a throttled resize handler
      const throttledResize = throttle(() => {
        if (chartRef.current) {
          chartRef.current.resize();
        }
      }, throttleDelay);
      
      // Create observer
      resizeObserverRef.current = new ResizeObserver(throttledResize);
      resizeObserverRef.current.observe(containerRef.current);
    } 
    // Fallback to window resize for older browsers
    else if (!resizeHandlerRef.current) {
      resizeHandlerRef.current = throttle(() => {
        if (chartRef.current) {
          chartRef.current.resize();
        }
      }, 250);
      
      window.addEventListener('resize', resizeHandlerRef.current);
    }

    // Return cleanup function
    return () => {
      if (throttledUpdate && throttledUpdate.cancel) {
        throttledUpdate.cancel();
      }
    };
  }, [
    data, 
    inView, 
    hasDataChanged, 
    xData, 
    createChartOptions,
    histSettings.downsampleThreshold,
    histSettings.downsampleFactor,
    globalSettings.enableHardwareAcceleration,
    createThrottledUpdate
  ]);

  // Handle theme changes
  useEffect(() => {
    // Skip if not in view, no chart, or no data
    if (!inView || !chartRef.current || !data || data.length === 0) return;
    
    // Get theme values
    const { backgroundColor, fontColor, gridLineColor } = themeValues;
    
    // Update chart theme
    chartRef.current.setOption({
      backgroundColor,
      title: {
        textStyle: { color: fontColor }
      },
      xAxis: {
        axisLabel: { color: fontColor },
        splitLine: { lineStyle: { color: gridLineColor } }
      },
      yAxis: {
        axisLabel: { color: fontColor },
        splitLine: { lineStyle: { color: gridLineColor } }
      },
      dataZoom: [{}, {
        textStyle: { color: fontColor }
      }]
    });
  }, [themeValues, inView, data]);

  // Handle component unmount - cleanup resources
  useEffect(() => {
    return () => {
      // Clean up chart instance
      if (chartRef.current) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
      
      // Clean up resize observer
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      
      // Remove resize handler
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
        if (resizeHandlerRef.current.cancel) {
          resizeHandlerRef.current.cancel();
        }
        resizeHandlerRef.current = null;
      }
      
      // Clean up chart update function
      if (chartUpdateRef.current && chartUpdateRef.current.cancel) {
        chartUpdateRef.current.cancel();
        chartUpdateRef.current = null;
      }
    };
  }, []);

  // Render empty state if no data - memoized to prevent recreation
  const emptyState = useMemo(() => (
    <div style={{
      width: '100%',
      height: '200px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: alpha(muiTheme.palette.background.paper, 0.1),
      color: muiTheme.palette.text.secondary,
      borderRadius: `${DESIGN_TOKENS.borderRadius.md}px`,
      marginBottom: muiTheme.spacing(2.5),
      fontSize: '0.875rem',
      border: `1px dashed ${alpha(muiTheme.palette.divider, 0.3)}`
    }}>
      <span>No cell data available</span>
    </div>
  ), [muiTheme]);

  // Memoize container height
  const containerHeight = useMemo(() => {
    // Apply chart size from settings if available
    if (dashboardSettings.chartSize === 'large') {
      return '450px';
    } else if (dashboardSettings.chartSize === 'small') {
      return '250px';
    } else {
      return '350px'; // default
    }
  }, [dashboardSettings.chartSize]);

  // Memoize container style
  const containerStyle = useMemo(() => ({
    width: '100%',
    height: containerHeight,
    marginBottom: muiTheme.spacing(2.5),
    borderRadius: `${DESIGN_TOKENS.borderRadius.lg}px`,
    overflow: 'hidden',
    boxShadow: globalSettings.enableHardwareAcceleration ? 
      '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)' : 'none',
    transition: globalSettings.enableTransitions ? 
      `height ${globalSettings.animationDuration}ms ${histSettings.enableSmoothing ? 'cubic-bezier(0.4, 0.0, 0.2, 1)' : 'ease'}` : 'none'
  }), [
    containerHeight,
    muiTheme.spacing,
    globalSettings.enableHardwareAcceleration,
    globalSettings.enableTransitions,
    globalSettings.animationDuration,
    histSettings.enableSmoothing
  ]);

  // Render empty state if no data
  if (!data || data.length === 0) {
    return emptyState;
  }

  return (
    <div
      ref={setRefs}
      style={containerStyle}
    />
  );
};

CellSliceChart.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object),
  groupIndex: PropTypes.number.isRequired,
  groupSize: PropTypes.number,
  theme: PropTypes.string,
};

CellSliceChart.defaultProps = {
  data: [],
  groupSize: 16,
  theme: 'light'
};

export default React.memo(CellSliceChart);