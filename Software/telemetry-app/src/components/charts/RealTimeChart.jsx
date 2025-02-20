import React, { useEffect, useRef, useContext, useState } from 'react';
import Plotly from 'plotly.js-dist-min';
import useRealTimeData from '../../hooks/useRealTimeData';
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
  const year = mstDate.getFullYear();
  const month = String(mstDate.getMonth() + 1).padStart(2, '0');
  const day = String(mstDate.getDate()).padStart(2, '0');
  const hours = String(mstDate.getHours()).padStart(2, '0');
  const minutes = String(mstDate.getMinutes()).padStart(2, '0');
  const seconds = String(mstDate.getSeconds()).padStart(2, '0');
  const ms = String(Math.round(mstDate.getMilliseconds())).padStart(3, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${ms}`;
};

const LINE_COLORS = ['lime', 'orange'];

const RealTimeChart = ({ chartType, config }) => {
  const containerRef = useRef(null);
  const seriesKeysRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const lastTimestampRef = useRef(null);
  const [chartInitialized, setChartInitialized] = useState(false);
  const maxPoints = 1000;
  
  const { settings } = useContext(ChartSettingsContext);
  const rtSettings = settings.realTime;
  const theme = settings.global.theme;
  const backgroundColor = theme === 'dark' ? '#1a1a1a' : '#fff';
  const fontColor = theme === 'dark' ? '#fff' : '#333';
  
  const safeRelayout = (updateObj) => {
    if (containerRef.current && containerRef.current._fullLayout) {
      Plotly.relayout(containerRef.current, updateObj);
    }
  };

  const handleNewData = (dataPoint) => {
    const t = formatTimeMST(dataPoint.time);
    const currentTime = Date.now();
    
    if (currentTime - lastUpdateTimeRef.current < rtSettings.updateInterval) return;
    lastUpdateTimeRef.current = currentTime;
    
    if (lastTimestampRef.current && new Date(dataPoint.time) < new Date(lastTimestampRef.current)) {
      console.warn("Out-of-order data point detected, skipping update.");
      return;
    }
    lastTimestampRef.current = dataPoint.time;
    
    if (!seriesKeysRef.current) {
      seriesKeysRef.current = Object.keys(dataPoint.fields).filter(key => key !== "timestamp");
      seriesKeysRef.current.sort();
      
      const traces = seriesKeysRef.current.map((key, index) => {
        const value = dataPoint.fields[key].stringValue || dataPoint.fields[key].numberValue;
        const num = parseFloat(value) || 0;
        const color = LINE_COLORS[index % LINE_COLORS.length];
        return {
          x: [t],
          y: [num],
          mode: 'lines',
          name: key,
          line: { color, width: rtSettings.lineWidth }
        };
      });
      
      const layout = {
        title: {
          text: config.title || `Real Time Data - ${chartType}`,
          font: { size: FONT_SIZES.title }
        },
        xaxis: { 
          type: 'date', 
          title: { text: config.axisTitles?.x || 'Time', font: { size: FONT_SIZES.axisLabel } },
          automargin: true,
          tickangle: -45,
          tickfont: { size: FONT_SIZES.tick }
        },
        yaxis: { 
          title: { text: config.axisTitles?.y || 'Value', font: { size: FONT_SIZES.axisLabel } },
          automargin: true,
          tickfont: { size: FONT_SIZES.tick }
        },
        hovermode: 'x unified',
        margin: { l: 100, r: 50, b: 120, t: 50, pad: 10 },
        paper_bgcolor: backgroundColor,
        plot_bgcolor: backgroundColor,
        font: { color: fontColor, size: FONT_SIZES.base }
      };
      
      Plotly.newPlot(containerRef.current, traces, layout);
      setChartInitialized(true);
    } else {
      const update = { x: [], y: [] };
      seriesKeysRef.current.forEach((key, i) => {
        const value = dataPoint.fields[key].stringValue || dataPoint.fields[key].numberValue;
        const num = parseFloat(value) || 0;
        update.x[i] = [t];
        update.y[i] = [num];
      });
      
      Plotly.extendTraces(
        containerRef.current,
        update,
        seriesKeysRef.current.map((_, i) => i),
        maxPoints
      );
      
      const currentTimeMs = new Date(dataPoint.time).getTime();
      const leftTimeMs = currentTimeMs - rtSettings.window;
      const leftTimeStr = formatTimeMST(leftTimeMs);
      safeRelayout({ 'xaxis.range': [leftTimeStr, t] });
      
      if (rtSettings.threshold !== null) {
        seriesKeysRef.current.forEach((key, i) => {
          const value = dataPoint.fields[key].stringValue || dataPoint.fields[key].numberValue;
          const num = parseFloat(value) || 0;
          if (num > rtSettings.threshold) {
            const annotation = {
              x: t,
              y: num,
              xref: 'x',
              yref: 'y',
              text: `Alert: ${key}=${num}`,
              showarrow: true,
              arrowhead: 7,
              ax: 0,
              ay: -40,
              font: { color: 'red' }
            };
            safeRelayout({ annotations: [annotation] });
          }
        });
      }
    }
  };

  useRealTimeData(chartType, (msg) => handleNewData(msg));

  useEffect(() => {
    if (containerRef.current && chartInitialized) {
      safeRelayout({
        'xaxis.tickangle': -45,
        'margin.l': 100, 
        'margin.r': 50, 
        'margin.b': 120, 
        'margin.t': 50,
        'xaxis.automargin': true,
        'yaxis.automargin': true,
        paper_bgcolor: backgroundColor,
        plot_bgcolor: backgroundColor,
        font: { color: fontColor, size: FONT_SIZES.base }
      });
      const update = {
        'line.width': seriesKeysRef.current.map(() => rtSettings.lineWidth)
      };
      Plotly.restyle(containerRef.current, update);
      if (lastTimestampRef.current) {
        const t = formatTimeMST(lastTimestampRef.current);
        const leftTimeMs = new Date(lastTimestampRef.current).getTime() - rtSettings.window;
        const leftTimeStr = formatTimeMST(leftTimeMs);
        safeRelayout({ 'xaxis.range': [leftTimeStr, t] });
      }
    }
  }, [rtSettings, backgroundColor, fontColor, chartType, chartInitialized]);

  useEffect(() => {
    return () => {
      if (containerRef.current) Plotly.purge(containerRef.current);
    };
  }, []);

  return (
    <div style={{ width: config.dimensions?.width || '600px', height: config.dimensions?.height || '400px' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
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
  })
};

export default RealTimeChart;
