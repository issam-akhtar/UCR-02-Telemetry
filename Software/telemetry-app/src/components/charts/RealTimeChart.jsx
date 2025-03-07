import React, { useEffect, useRef, useContext, useState } from 'react';
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

const PLOT_CONFIG = {
  responsive: true,
  displayModeBar: false,
  scrollZoom: false,
};

function formatTimeMST(timestamp) {
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
}

function getYAxisLabel(chartType) {
  switch (chartType) {
    case 'pack_current':
      return 'Current (A)';
    case 'pack_voltage':
      return 'Voltage (V)';
    default:
      return 'Value';
  }
}

const RealTimeChart = ({ chartType, config, isPaused }) => {
  const containerRef = useRef(null);
  const seriesKeysRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const lastTimestampRef = useRef(null);
  const [chartInitialized, setChartInitialized] = useState(false);
  const [noData, setNoData] = useState(false);
  const maxPoints = 1000;

  const { settings } = useContext(ChartSettingsContext);
  const rtSettings = settings.realTime;
  const theme = settings.global.theme;
  const backgroundColor = theme === 'dark' ? '#161A1D' : '#fff';
  const fontColor = theme === 'dark' ? '#ecf3e8' : '#333';

  // Helper to safely apply layout changes
  const safeRelayout = (updateObj) => {
    if (containerRef.current && containerRef.current._fullLayout) {
      Plotly.relayout(containerRef.current, updateObj);
    }
  };

  // More bottom margin to avoid overlap with legend
  const baseLayout = {
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
  };

  const createLineChartLayout = () => {
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
      },
      yaxis: {
        title: {
          text: getYAxisLabel(chartType),
          font: { size: FONT_SIZES.axisLabel },
          standoff: 20,
        },
        tickfont: { size: FONT_SIZES.tick },
        automargin: true,
        showgrid: true,
        gridcolor: gridColor,
        gridwidth: 1,
      },
    };
  };

  const createCellBarLayout = () => {
    const gridColor = theme === 'dark'
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.1)';

    return {
      ...baseLayout,
      showlegend: false,
      xaxis: {
        title: {
          text: 'Cell #',
          font: { size: FONT_SIZES.axisLabel },
          standoff: 20,
        },
        tickfont: { size: FONT_SIZES.tick },
        type: 'category',
        automargin: true,
        showgrid: true,
        gridcolor: gridColor,
        gridwidth: 1,
      },
      yaxis: {
        title: {
          text: 'Voltage (V)',
          font: { size: FONT_SIZES.axisLabel },
          standoff: 20,
        },
        tickfont: { size: FONT_SIZES.tick },
        automargin: true,
        showgrid: true,
        gridcolor: gridColor,
        gridwidth: 1,
      },
    };
  };

  const handleCellBarChartUpdate = (dataPoint) => {
    const cellVals = new Array(128).fill(0);
    let foundAnyData = false;

    for (let i = 1; i <= 128; i++) {
      const fieldName = `cell${i}`;
      const fieldObj = dataPoint.fields[fieldName];
      if (fieldObj) {
        foundAnyData = true;
        const raw = fieldObj.stringValue ?? fieldObj.numberValue;
        const val = parseFloat(raw) || 0;
        cellVals[i - 1] = val;
      }
    }

    if (!foundAnyData) {
      setNoData(true);
      const layout = createCellBarLayout();
      layout.annotations = [
        {
          text: 'No data to graph',
          x: 0.5,
          y: 0.5,
          xref: 'paper',
          yref: 'paper',
          showarrow: false,
          font: { size: 20, color: fontColor },
        },
      ];
      Plotly.newPlot(containerRef.current, [], layout, PLOT_CONFIG);
      return;
    } else {
      setNoData(false);
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
    if (!chartInitialized || noData) {
      Plotly.newPlot(containerRef.current, [trace], layout, PLOT_CONFIG);
      setChartInitialized(true);
    } else {
      Plotly.react(containerRef.current, [trace], layout, PLOT_CONFIG);
    }
  };

  const handleLineChartUpdate = (dataPoint) => {
    const t = formatTimeMST(dataPoint.time);
    const currentTime = Date.now();
    if (currentTime - lastUpdateTimeRef.current < rtSettings.updateInterval) return;
    lastUpdateTimeRef.current = currentTime;

    if (lastTimestampRef.current && new Date(dataPoint.time) < new Date(lastTimestampRef.current)) {
      console.warn('Out-of-order data point, skipping.');
      return;
    }
    lastTimestampRef.current = dataPoint.time;

    const numericKeys = Object.keys(dataPoint.fields).filter((k) => {
      if (k === 'timestamp') return false;
      const v = dataPoint.fields[k];
      return v?.numberValue !== undefined || (!isNaN(parseFloat(v?.stringValue)));
    });

    if (numericKeys.length === 0) {
      setNoData(true);
      const layout = createLineChartLayout();
      layout.annotations = [
        {
          text: 'No data to graph',
          x: 0.5,
          y: 0.5,
          xref: 'paper',
          yref: 'paper',
          showarrow: false,
          font: { size: 20, color: fontColor },
        },
      ];
      Plotly.newPlot(containerRef.current, [], layout, PLOT_CONFIG);
      return;
    } else {
      setNoData(false);
    }

    if (!seriesKeysRef.current || noData) {
      seriesKeysRef.current = numericKeys.sort();

      const traces = seriesKeysRef.current.map((key, idx) => {
        const rawVal = dataPoint.fields[key].stringValue || dataPoint.fields[key].numberValue;
        const num = parseFloat(rawVal) || 0;
        const color = LINE_COLORS[idx % LINE_COLORS.length];
        return {
          x: [t],
          y: [num],
          mode: 'lines',
          name: key,
          line: { color, width: rtSettings.lineWidth },
        };
      });

      const layout = createLineChartLayout();
      Plotly.newPlot(containerRef.current, traces, layout, PLOT_CONFIG);
      setChartInitialized(true);
    } else {
      const update = { x: [], y: [] };
      seriesKeysRef.current.forEach((key, i) => {
        const rawVal = dataPoint.fields[key].stringValue || dataPoint.fields[key].numberValue;
        const num = parseFloat(rawVal) || 0;
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
      safeRelayout({ 'xaxis.range': [leftTimeMs, currentTimeMs] });
    }
  };

  const handleNewData = (dataPoint) => {
    if (isPaused) return;
    if (chartType === 'cell') {
      handleCellBarChartUpdate(dataPoint);
    } else {
      handleLineChartUpdate(dataPoint);
    }
  };

  useRealTimeData(chartType, handleNewData);

  // Listen for window resize to ensure Plotly updates fully
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        Plotly.Plots.resize(containerRef.current);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Re-apply theme or line width changes if user toggles settings
  useEffect(() => {
    if (!chartInitialized || noData) return;
    if (!containerRef.current) return;

    safeRelayout({
      paper_bgcolor: backgroundColor,
      plot_bgcolor: backgroundColor,
      'font.color': fontColor,
    });

    if (seriesKeysRef.current && chartType !== 'cell') {
      const update = {
        'line.width': seriesKeysRef.current.map(() => rtSettings.lineWidth),
      };
      Plotly.restyle(containerRef.current, update);
    }

    if (lastTimestampRef.current && chartType !== 'cell') {
      const currentTimeMs = new Date(lastTimestampRef.current).getTime();
      const leftTimeMs = currentTimeMs - rtSettings.window;
      safeRelayout({ 'xaxis.range': [leftTimeMs, currentTimeMs] });
    }
  }, [
    chartType,
    chartInitialized,
    noData,
    backgroundColor,
    fontColor,
    rtSettings.lineWidth,
    rtSettings.window,
  ]);

  useEffect(() => {
    return () => {
      if (containerRef.current) {
        Plotly.purge(containerRef.current);
      }
    };
  }, []);

  return (
    <div
      style={{
        // Use 100% so it fills the wrapper from RealTimeChartWrapper
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
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
  }),
  isPaused: PropTypes.bool,
};

export default RealTimeChart;
