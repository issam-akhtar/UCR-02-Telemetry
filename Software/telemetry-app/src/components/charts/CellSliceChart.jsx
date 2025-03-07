import React, { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

const LINE_COLORS = [
  '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728',
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
  '#bcbd22', '#17becf', '#8dd3c7', '#ffffb3',
  '#9edae5', '#f7b6d2', '#c49c94', '#dbdb8d',
];

const CellSliceChart = ({ data, groupIndex, groupSize = 16, theme }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  if (!data || data.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)',
      }}>
        <span>No cell data</span>
      </div>
    );
  }

  const xData = data.map((row) => {
    const dt = new Date(row.time);
    return dt.toLocaleTimeString();
  });

  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current);
    }

    const series = [];
    const startCell = groupIndex * groupSize + 1;
    const endCell = Math.min(startCell + groupSize - 1, 128);

    for (let cellNum = startCell; cellNum <= endCell; cellNum++) {
      const cellName = `cell${cellNum}`;
      const yVals = data.map((row) => Number(row[cellName]) || 0);

      series.push({
        name: cellName,
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: yVals,
        lineStyle: {
          color: LINE_COLORS[(cellNum - startCell) % LINE_COLORS.length],
          width: 2,
        },
      });
    }

    const dataCount = xData.length;
    const desiredTickCount = 10;
    const showLabelInterval = Math.ceil(dataCount / desiredTickCount);

    const isDark = (theme === 'dark');
    const backgroundColor = isDark ? '#161A1D' : '#fff';
    const fontColor = isDark ? '#ecf3e8' : '#333';
    const gridLineColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

    // 1) Enable confine to prevent the tooltip from going off-canvas
    // 2) Use a custom formatter to list each series horizontally
    const option = {
      backgroundColor,
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (params) => {
          if (!params.length) return '';
          const timeLabel = params[0].axisValueLabel;
          // First line: the time
          let html = `<div>Time: <strong>${timeLabel}</strong></div>`;
          // Then each series horizontally, with colored dots
          html += `<div style="display: flex; flex-wrap: wrap; margin-top: 4px;">`;
          params.forEach((p) => {
            html += `
              <div style="margin-right: 12px; white-space: nowrap;">
                <span style="color:${p.color};">●</span> 
                ${p.seriesName}: <strong>${p.value}</strong>
              </div>
            `;
          });
          html += '</div>';
          return html;
        },
      },
      legend: { show: false },
      grid: {
        top: 30,
        left: 60,
        right: 30,
        bottom: 70,
      },
      xAxis: {
        type: 'category',
        data: xData,
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
        axisLabel: { fontSize: 12, color: fontColor },
        splitLine: {
          show: true,
          lineStyle: { color: gridLineColor },
        },
      },
      series,
    };

    chartRef.current.setOption(option);

    return () => {
      if (chartRef.current) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
    };
  }, [data, groupIndex, groupSize, theme, xData]);

  // Listen for window resize so the chart resizes properly
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '200px',
      }}
    />
  );
};

export default CellSliceChart;
