import React, { useEffect, useRef, useContext } from 'react';
import * as echarts from 'echarts';
import useHistoricalData from '../../hooks/useHistoricalData';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import PropTypes from 'prop-types';
import CellSliceChart from './CellSliceChart';
import { Box } from '@mui/material';

const FONT_SIZES = {
  base: 16,
  title: 20,
  axisLabel: 16,
  tick: 14,
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

const LINE_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
];

const downsampleData = (data, factor) => data.filter((_, i) => i % factor === 0);

const HistoricalChart = ({ endpoint, config }) => {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);

  const { data, error, loading, refresh } = useHistoricalData(endpoint);
  const { settings } = useContext(ChartSettingsContext);
  const histSettings = settings.historical;

  const theme = settings.global.theme;
  const backgroundColor = theme === 'dark' ? '#161A1D' : '#fff';
  const fontColor = theme === 'dark' ? '#ecf3e8' : '#333';
  const gridLineColor = theme === 'dark'
    ? 'rgba(255,255,255,0.1)'
    : 'rgba(0,0,0,0.1)';

  const isCellSliced = endpoint.startsWith('/cellData');
  const groupSize = config?.groupSize || 16;

  const renderStandardChart = () => {
    if (!chartRef.current) return;
    if (!chartInstanceRef.current) {
      chartInstanceRef.current = echarts.init(chartRef.current);
    }

    let chartData = data;
    if (data.length > histSettings.downsampleThreshold) {
      chartData = downsampleData(data, histSettings.downsampleFactor);
    }

    const xData = chartData.map((dp) => formatTimeMST(dp.time));
    const keys = Object.keys(chartData[0]).filter(
      (k) => k !== 'time' && !isNaN(Number(chartData[0][k]))
    );

    const legendData = keys;
    const series = keys.map((key, idx) => ({
      name: key,
      type: 'line',
      smooth: true,
      data: chartData.map((dp) => Number(dp[key])),
      lineStyle: { color: LINE_COLORS[idx % LINE_COLORS.length] },
    }));

    const tickInterval = Math.max(
      1,
      Math.floor(xData.length / histSettings.maxAxisTicks)
    );

    const option = {
      backgroundColor,
      textStyle: { fontSize: FONT_SIZES.base, color: fontColor },
      title: {
        text: config?.title || 'Historical Data',
        left: 'center',
        top: 20,
        textStyle: { fontSize: FONT_SIZES.title, color: fontColor },
      },
      tooltip: { trigger: 'axis' },
      legend: {
        orient: 'horizontal',
        bottom: 10,
        left: 'center',
        data: legendData,
        textStyle: { fontSize: FONT_SIZES.tick, color: fontColor },
      },
      // Increase bottom margin so the legend & x-axis label don't overlap
      grid: {
        top: 100,
        left: 80,
        right: 40,
        bottom: 140,
      },
      xAxis: {
        type: 'category',
        data: xData,
        name: config?.axisTitles?.x || 'Time',
        nameLocation: 'middle',
        nameGap: 70, // extra space for label
        axisLabel: {
          rotate: 45,
          interval: tickInterval - 1,
          margin: 10,
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
        nameGap: 60,
        axisLabel: { fontSize: FONT_SIZES.tick, color: fontColor },
        splitLine: {
          show: true,
          lineStyle: { color: gridLineColor },
        },
      },
      series,
    };

    chartInstanceRef.current.setOption(option);
  };

  // Force ECharts to resize with window changes
  useEffect(() => {
    const handleResize = () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isCellSliced && data && data.length > 0) {
      renderStandardChart();
    }
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.dispose();
        chartInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, endpoint, config]);

  // If endpoint is cell data, we show multiple slice charts
  if (isCellSliced) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* Refresh button */}
        <button
          onClick={refresh}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 20,
            padding: '6px 10px',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>

        {/* Loading overlay */}
        {loading && (
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(0,0,0,0.4)',
              zIndex: 10,
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>Loading...</span>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div
            style={{
              position: 'absolute',
              top: 0, left: 0,
              width: '100%',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: 'rgba(255,0,0,0.2)',
              zIndex: 10,
            }}
          >
            <span style={{ fontSize: '1.2rem', color: '#fff' }}>
              Error loading data
            </span>
          </div>
        )}

        {/* Scrollable container for multiple slices */}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            overflowY: 'auto',
            pt: '50px',
            pb: '20px',
            boxSizing: 'border-box',

            // Make the scrollbar skinny:
            scrollbarWidth: 'thin',           // Firefox
            scrollbarColor: '#666 #222',       // Firefox (#666 thumb, #222 track)
            '&::-webkit-scrollbar': {
              width: '6px',                   // Chrome, Safari
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: '#222',        // track color
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: '#666',        // thumb color
              borderRadius: '4px',
            },
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
            <div
              style={{
                width: '100%',
                height: '200px',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <span>No data</span>
            </div>
          )}
        </Box>
      </div>
    );
  }

  // Otherwise, standard single ECharts
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      <button
        onClick={refresh}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          zIndex: 20,
          padding: '6px 10px',
          fontSize: '0.9rem',
          cursor: 'pointer',
        }}
      >
        Refresh
      </button>

      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>Loading...</span>
        </div>
      )}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255,0,0,0.2)',
            zIndex: 10,
          }}
        >
          <span style={{ fontSize: '1.2rem', color: '#fff' }}>
            Error loading data
          </span>
        </div>
      )}
      <div ref={chartRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

HistoricalChart.propTypes = {
  endpoint: PropTypes.string.isRequired,
  config: PropTypes.object,
};

export default HistoricalChart;
