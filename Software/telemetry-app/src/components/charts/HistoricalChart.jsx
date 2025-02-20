import React, { useEffect, useRef, useContext } from 'react';
import * as echarts from 'echarts';
import useHistoricalData from '../../hooks/useHistoricalData';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import PropTypes from 'prop-types';

const FONT_SIZES = {
  base: 16,
  title: 24,
  axisLabel: 14,
  tick: 12
};

const formatTimeMST = (timestamp) => {
  const date = new Date(timestamp);
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const mstDate = new Date(utc - 7 * 3600000);
  const hours = String(mstDate.getHours()).padStart(2, '0');
  const minutes = String(mstDate.getMinutes()).padStart(2, '0');
  const seconds = String(mstDate.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const LINE_COLORS = ['lime', 'orange'];

const downsampleData = (data, factor) => data.filter((_, index) => index % factor === 0);

const HistoricalChart = ({ endpoint, title, config }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const { settings } = useContext(ChartSettingsContext);
  const histSettings = settings.historical;
  const theme = settings.global.theme;
  const backgroundColor = theme === 'dark' ? '#1a1a1a' : '#fff';
  const fontColor = theme === 'dark' ? '#fff' : '#333';
  
  // Use the hook and extract the refresh function
  const { data, error, loading, refresh } = useHistoricalData(endpoint);
  
  useEffect(() => {
    if (chartRef.current && !chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }
    if (data && chartInstanceRef.current && data.length > 0) {
      let chartData = data;
      if (data.length > histSettings.downsampleThreshold) {
        chartData = downsampleData(data, histSettings.downsampleFactor);
      }
      
      const keys = Object.keys(chartData[0]).filter(
        key => key !== 'time' && !isNaN(Number(chartData[0][key]))
      );
      
      const series = keys.map((key, index) => ({
        name: key,
        type: 'line',
        smooth: true,
        data: chartData.map(dp => Number(dp[key])),
        lineStyle: { color: LINE_COLORS[index % LINE_COLORS.length] }
      }));
      
      const xData = chartData.map(dp => formatTimeMST(dp.time));
      const tickInterval = Math.max(1, Math.floor(xData.length / histSettings.maxAxisTicks));
      
      const option = {
        title: { 
          text: config?.title || 'Historical Data',
          textStyle: { fontSize: FONT_SIZES.title, color: fontColor }
        },
        tooltip: { trigger: 'axis' },
        legend: { data: keys, textStyle: { fontSize: FONT_SIZES.tick, color: fontColor } },
        grid: { left: '10%', right: '10%', bottom: '20%' },
        xAxis: {
          type: 'category',
          name: config?.axisTitles?.x || 'Time',
          nameLocation: 'middle',
          nameGap: 60,
          data: xData,
          axisLabel: {
            rotate: 45,
            interval: tickInterval - 1,
            margin: 10,
            fontSize: FONT_SIZES.tick,
            color: fontColor
          },
          nameTextStyle: { fontSize: FONT_SIZES.axisLabel, color: fontColor },
        },
        yAxis: {
          type: 'value',
          name: config?.axisTitles?.y || 'Value',
          nameLocation: 'middle',
          nameGap: 40,
          axisLabel: { fontSize: FONT_SIZES.tick, color: fontColor },
          nameTextStyle: { fontSize: FONT_SIZES.axisLabel, color: fontColor },
        },
        series: series,
        backgroundColor: backgroundColor,
        textStyle: { fontSize: FONT_SIZES.base, color: fontColor },
      };
      
      chartInstanceRef.current.setOption(option);
    }
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
  }, [data, title, histSettings, backgroundColor, fontColor, config]);
  
  return (
    <div style={{ 
      width: config?.dimensions?.width || '600px', 
      height: config?.dimensions?.height || '400px', 
      position: 'relative' 
    }}>
      {/* Refresh button added */}
      <button 
        onClick={refresh} 
        style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 20 }}
      >
        Refresh
      </button>
      {loading && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 10
        }}>
          <span>Loading...</span>
        </div>
      )}
      {error && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 10
        }}>
          <span>Error loading data</span>
        </div>
      )}
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

HistoricalChart.propTypes = {
  endpoint: PropTypes.string.isRequired,
  title: PropTypes.string,
  config: PropTypes.object,
};

export default HistoricalChart;
