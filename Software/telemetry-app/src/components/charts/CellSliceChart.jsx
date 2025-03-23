import React, { useRef, useEffect, useContext, useMemo } from 'react';
import * as echarts from 'echarts';
import PropTypes from 'prop-types';
import { useInView } from 'react-intersection-observer';
import { throttle } from 'lodash';
import { useTheme, alpha } from '@mui/material';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { DESIGN_TOKENS } from '../../theme';

const LINE_COLORS = [
  '#4A8AB8', '#FF9800', '#4CAF50', '#EF5350',
  '#9467bd', '#8c564b', '#e377c2', '#7f7f7f',
  '#bcbd22', '#29B6F6', '#8dd3c7', '#FFB74D',
  '#9edae5', '#f7b6d2', '#c49c94', '#dbdb8d',
  '#6AA9D3', '#FFB74D', '#81C784', '#F44336',
  '#c5b0d5', '#c49c94', '#f7b6d2', '#c7c7c7'
];

const OptimizedCellSliceChart = ({ data, groupIndex, groupSize = 16, theme }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const lastRenderedData = useRef(null);
  const muiTheme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const histSettings = settings.historical;
  const globalSettings = settings.global;
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false,
    delay: 300
  });

  const setRefs = (element) => {
    containerRef.current = element;
    inViewRef(element);
  };

  if (!data || data.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '200px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.1)',
        borderRadius: '4px',
      }}>
        <span>No cell data</span>
      </div>
    );
  }

  const startCell = groupIndex * groupSize + 1;
  const endCell = Math.min(startCell + groupSize - 1, 128);
  const groupTitle = `Cells ${startCell} - ${endCell}`;

  const xData = useMemo(() => {
    return data.map((row) => {
      const dt = new Date(row.time);
      return dt.toLocaleTimeString();
    });
  }, [data]);

  const hasDataChanged = useMemo(() => {
    if (!lastRenderedData.current) return true;
    if (data.length !== lastRenderedData.current.length) return true;
    if (data.length > 0 && lastRenderedData.current.length > 0) {
      const firstNew = data[0].time;
      const firstOld = lastRenderedData.current[0].time;
      const lastNew = data[data.length - 1].time;
      const lastOld = lastRenderedData.current[lastRenderedData.current.length - 1].time;
      if (firstNew !== firstOld || lastNew !== lastOld) return true;
    }
    return false;
  }, [data]);

  useEffect(() => {
    if (!inView || !containerRef.current) return;
    if (!hasDataChanged && chartRef.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, null, {
        renderer: 'canvas',
        useDirtyRect: true,
      });
    }
    lastRenderedData.current = data;

    const chartData = data.length > histSettings.downsampleThreshold
      ? data.filter((_, i) => i % histSettings.downsampleFactor === 0)
      : data;

    const series = [];
    for (let cellNum = startCell; cellNum <= endCell; cellNum++) {
      const cellName = `cell${cellNum}`;
      const yValues = chartData.map((row) => Number(row[cellName]) || 0);
      series.push({
        name: cellName,
        type: 'line',
        smooth: settings.realTime?.enableSmoothing !== false,
        showSymbol: false,
        sampling: 'lttb',
        animation: !!globalSettings.animationDuration,
        animationDuration: globalSettings.animationDuration || 0,
        data: yValues,
        lineStyle: {
          color: LINE_COLORS[(cellNum - startCell) % LINE_COLORS.length],
          width: settings.realTime?.lineWidth || 1.5,
        },
        emphasis: {
          focus: 'series',
          lineStyle: {
            width: (settings.realTime?.lineWidth || 1.5) + 1
          }
        }
      });
    }

    const dataCount = xData.length;
    const desiredTickCount = Math.min(histSettings.maxAxisTicks || 4, 8);
    const showLabelInterval = Math.ceil(dataCount / desiredTickCount);
    const isDark = (theme === 'dark' || globalSettings.theme === 'dark');
    const backgroundColor = isDark
      ? muiTheme.palette.background.paper
      : muiTheme.palette.background.default;
    const fontColor = isDark
      ? muiTheme.palette.text.primary
      : muiTheme.palette.text.primary;
    const gridLineColor = isDark
      ? alpha(muiTheme.palette.divider, 0.3)
      : alpha(muiTheme.palette.divider, 0.7);

    const option = {
      backgroundColor,
      title: {
        text: groupTitle,
        left: 'center',
        textStyle: { color: fontColor, fontSize: 14 }
      },
      tooltip: {
        trigger: 'axis',
        confine: true,
        formatter: (params) => {
          if (!params.length) return '';
          const timeLabel = params[0].axisValueLabel;
          let html = `<div style="font-weight:bold;margin-bottom:4px">Time: ${timeLabel}</div>`;
          html += `<div style="display: flex; flex-wrap: wrap; gap: 8px;">`;
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
      },
      legend: {
        show: false
      },
      grid: {
        top: 40,
        left: 60,
        right: 30,
        // Increased bottom spacing from 70 to 90 to allow more room
        bottom: 90,
        containLabel: true,
      },
      dataZoom: [{
        type: 'inside',
        show: histSettings.dataZoomEnabled,
        xAxisIndex: 0,
        start: 0,
        end: 100,
        throttle: 100,
      }, {
        type: 'slider',
        show: histSettings.dataZoomEnabled,
        xAxisIndex: 0,
        bottom: 10,
        height: 20,
        borderColor: 'transparent',
        fillerColor: 'rgba(128, 128, 160, 0.2)',
        textStyle: { color: fontColor }
      }],
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
    };

    const updateChart = throttle(() => {
      if (chartRef.current) {
        chartRef.current.setOption(option);
      }
    }, 100);

    updateChart();

    const handleResize = throttle(() => {
      if (chartRef.current) {
        chartRef.current.resize();
      }
    }, 250);

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      updateChart.cancel();
      handleResize.cancel();
    };
  }, [
    data, groupIndex, groupSize, theme, inView, hasDataChanged,
    xData, settings, histSettings, globalSettings, startCell, endCell,
    muiTheme, alpha
  ]);

  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.dispose();
        chartRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={setRefs}
      style={{
        width: '100%',
        // Increased container height to reduce vertical squishing
        height: '350px',
        marginBottom: muiTheme.spacing(2.5),
        borderRadius: `${DESIGN_TOKENS.borderRadius.lg}px`,
        overflow: 'hidden'
      }}
    />
  );
};

OptimizedCellSliceChart.propTypes = {
  data: PropTypes.array.isRequired,
  groupIndex: PropTypes.number.isRequired,
  groupSize: PropTypes.number,
  theme: PropTypes.string,
};

export default React.memo(OptimizedCellSliceChart);
