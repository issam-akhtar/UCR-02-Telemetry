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

    const option = {
      backgroundColor,
      tooltip: { trigger: 'axis' },
      legend: { show: false },
      // Increased margins to prevent overlap of rotated x-axis labels
      grid: {
        top: 30,
        left: 60,
        right: 30,
        bottom: 70,
      },
      xAxis: {
        type: 'category',
        data: xData,
        nameLocation: 'middle',
        // Extra space between the axis name and labels
        nameGap: 30,
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
        nameGap: 45,
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
