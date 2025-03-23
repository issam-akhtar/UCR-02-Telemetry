import React, { useEffect, useRef, useContext, useMemo, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import PropTypes from 'prop-types';
import { debounce, throttle } from 'lodash';
import CellSliceChart from './CellSliceChart';
import { Box, CircularProgress, useTheme, alpha } from '@mui/material';
import { DESIGN_TOKENS } from '../../theme';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

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

const formatTimeMST = (timestamp) => {
  const date = new Date(timestamp);
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const mstDate = new Date(utc - 7 * 3600000);
  const hours = String(mstDate.getHours()).padStart(2, '0');
  const minutes = String(mstDate.getMinutes()).padStart(2, '0');
  const seconds = String(mstDate.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const downsampleData = (data, factor) => {
  if (factor <= 1) return data;
  return data.filter((_, i) => i % factor === 0);
};

// Create a standard component instead of forwardRef
const HistoricalChart = ({ endpoint, data = null, config }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const renderedDataRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);
  const muiTheme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const histSettings = settings.historical;
  const globalSettings = settings.global;
  const theme = globalSettings.theme;
  const backgroundColor = theme === 'dark' 
    ? muiTheme.palette.background.paper 
    : muiTheme.palette.background.default;
  const fontColor = theme === 'dark' 
    ? muiTheme.palette.text.primary 
    : muiTheme.palette.text.primary;
  const gridLineColor = theme === 'dark'
    ? alpha(muiTheme.palette.divider, 0.3)
    : alpha(muiTheme.palette.divider, 0.7);
  
  const isCellSliced = endpoint.includes('/cellData');
  const groupSize = config?.groupSize || 16;
  
  const hasDataChanged = useMemo(() => {
    if (!data || !renderedDataRef.current) return true;
    if (data.length !== renderedDataRef.current.length) return true;
    if (data.length > 0 && renderedDataRef.current.length > 0) {
      const firstNew = data[0]?.time;
      const firstOld = renderedDataRef.current[0]?.time;
      const lastNew = data[data.length - 1]?.time;
      const lastOld = renderedDataRef.current[renderedDataRef.current.length - 1]?.time;
      if (firstNew !== firstOld || lastNew !== lastOld) return true;
    }
    return false;
  }, [data]);
  
  // Method to resize chart - expose via ref.current directly
  React.useEffect(() => {
    if (chartRef.current) {
      chartRef.current.resize = () => {
        if (chartInstanceRef.current) {
          chartInstanceRef.current.resize();
        }
      };
    }
  }, []);
  
  const renderStandardChart = useCallback(() => {
    if (!chartRef.current || !data || data.length === 0) return;
    if (!hasDataChanged && chartInstanceRef.current) return;
    setIsRendering(true);
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current, null, {
        renderer: 'canvas',
        useDirtyRect: true,
      });
    }
    
    let chartData = data;
    if (data.length > histSettings.downsampleThreshold) {
      const factor = histSettings.downsampleFactor;
      chartData = downsampleData(data, factor);
    }
    
    renderedDataRef.current = chartData;
    const xData = chartData.map((dp) => formatTimeMST(dp.time));
    const keys = Object.keys(chartData[0]).filter(
      (k) => k !== 'time' && !isNaN(Number(chartData[0][k]))
    );
    const legendData = keys;
    const series = keys.map((key, idx) => ({
      name: key,
      type: 'line',
      showSymbol: false,
      sampling: 'lttb',
      smooth: histSettings.enableSmoothing,
      lineStyle: { 
        width: settings.realTime?.lineWidth,
        color: LINE_COLORS[idx % LINE_COLORS.length] 
      },
      emphasis: {
        focus: 'series',
        lineStyle: {
          width: (settings.realTime?.lineWidth) + 1
        }
      },
      animation: !!globalSettings.animationDuration,
      animationDuration: globalSettings.animationDuration || 0,
      data: chartData.map((dp) => Number(dp[key])),
    }));
    
    const tickInterval = Math.max(
      1,
      Math.ceil(xData.length / (histSettings.maxAxisTicks || 4))
    );
    
    const option = {
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
        bottom: 0,  // Moved closer to the bottom of the chart
        left: 'center',
        data: legendData,
        textStyle: { fontSize: FONT_SIZES.tick, color: fontColor },
        type: legendData.length > 15 ? 'scroll' : 'plain', 
        pageIconSize: 12,
        pageButtonItemGap: 5,
        pageButtonGap: 5,
        pageButtonPosition: 'end',
        selector: legendData.length > 8, 
        selectorLabel: {
          show: true
        },
        selectorPosition: 'end'
      },
      grid: {
        top: 65,        // Reduced slightly
        left: 75,       // Keep enough room for y-axis labels
        right: 30,
        bottom: 65,     // Significantly reduced to bring legend closer to chart
        containLabel: true,
      },
      dataZoom: [{
        type: 'inside',
        show: histSettings.dataZoomEnabled,
        xAxisIndex: 0,
        start: 0,
        end: 100,
        minValueSpan: 10,
        throttle: 100,
      }, {
        type: 'slider',
        show: histSettings.dataZoomEnabled,
        xAxisIndex: 0,
        bottom: 40,    // Moved closer to the chart
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
    
    const updateChart = chartData.length > 1000
      ? throttle(() => {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.setOption(option, { notMerge: true });
            setIsRendering(false);
            
            // Force resize to ensure proper display
            setTimeout(() => {
              if (chartInstanceRef.current) {
                chartInstanceRef.current.resize();
              }
            }, 10);
          }
        }, 100)
      : () => {
          if (chartInstanceRef.current) {
            chartInstanceRef.current.setOption(option, { notMerge: true });
            setIsRendering(false);
            
            // Force resize to ensure proper display
            setTimeout(() => {
              if (chartInstanceRef.current) {
                chartInstanceRef.current.resize();
              }
            }, 10);
          }
        };
    
    updateChart();
    
    return () => {
      if (updateChart.cancel) {
        updateChart.cancel();
      }
    };
  }, [data, hasDataChanged, histSettings, config, settings, globalSettings, theme]);
  
  useEffect(() => {
    const handleResize = debounce(() => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize();
      }
    }, 250);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      handleResize.cancel();
    };
  }, []);
  
  useEffect(() => {
    if (!isCellSliced && data && data.length > 0) {
      const cleanup = renderStandardChart();
      return cleanup;
    }
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [data, isCellSliced, renderStandardChart]);
  
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
                key={i}
                xData={data.map((row) => formatTimeMST(row.time))}
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
  data: PropTypes.array,
  config: PropTypes.object,
};

export default React.memo(HistoricalChart);