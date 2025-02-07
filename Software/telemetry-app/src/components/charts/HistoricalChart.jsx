import React, { useMemo, useContext, useRef } from "react";
import ReactECharts from "echarts-for-react";
import { Typography, Button, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useHistoricalData } from "../../hooks/useHistoricalData";
import { chartSettings } from "../../config/chartSettings";
import { ChartSettingsContext } from "../../context/ChartSettingsContext";

export default function HistoricalChart({ title, config, showLegend = true }) {
  const theme = useTheme();
  const { maxAxisTicks } = useContext(ChartSettingsContext);
  const { data, loading, error, refresh } = useHistoricalData({
    endpoint: config.historicalEndpoint,
    page: 1,
  });

  const chartGlobalSettings = {
    eChartsOptions: {
      xAxis: {
        type: "category",
        boundaryGap: false,
        axisLabel: { color: theme.palette.text.secondary },
      },
      yAxis: {
        type: "value",
        axisLabel: { color: theme.palette.text.secondary },
      },
    },
  };

  const downsampleData = (dataArray, key, targetPoints = 500) => {
    if (dataArray.length <= targetPoints) return dataArray;
    const sampled = [];
    const bucketSize = Math.floor(dataArray.length / targetPoints);
    let a = 0;
    sampled.push(dataArray[a]);
    for (let i = 1; i < targetPoints - 1; i++) {
      const start = Math.floor(i * bucketSize);
      const end = Math.floor((i + 1) * bucketSize);
      const subset = dataArray.slice(start, end);
      let avgX = 0,
        avgY = 0;
      for (let j = 0; j < subset.length; j++) {
        avgX += j;
        avgY += parseFloat(subset[j][key] || 0);
      }
      avgX /= subset.length;
      avgY /= subset.length;
      let maxArea = -1;
      let maxAreaPoint = subset[0];
      for (let j = 0; j < subset.length; j++) {
        const area =
          Math.abs(
            (a - avgX) *
              (parseFloat(subset[j][key] || 0) -
                parseFloat(dataArray[a][key] || 0)) -
              (a - parseFloat(dataArray[a][key] || 0)) *
                (parseFloat(subset[j][key] || 0) - avgY)
          ) * 0.5;
        if (area > maxArea) {
          maxArea = area;
          maxAreaPoint = subset[j];
        }
      }
      sampled.push(maxAreaPoint);
      a = end;
    }
    sampled.push(dataArray[dataArray.length - 1]);
    return sampled;
  };

  const chartOptions = useMemo(() => {
    const validData = data.filter((d) => d && d.timestamp);
    const sampledData =
      validData.length > 1000
        ? downsampleData(validData, "timestamp", 500)
        : validData;
    const xData = sampledData.map((d) =>
      new Date(d.timestamp).toLocaleTimeString()
    );
    const xInterval =
      xData.length > maxAxisTicks ? Math.floor(xData.length / maxAxisTicks) : 0;

    const series = config.fields.map((field, idx) => ({
      name: field.label,
      type: "line",
      data: sampledData.map((d) => parseFloat(d[field.key]) || 0),
      smooth: true,
      showSymbol: false,
      sampling: "lttb",
      itemStyle: {
        color: field.color || config.colors[idx % config.colors.length],
      },
    }));

    return {
      animation: false,
      color: config.fields.map(
        (field, idx) => field.color || config.colors[idx % config.colors.length]
      ),
      tooltip: {
        trigger: "axis",
        backgroundColor: theme.palette.background.paper,
        textStyle: { color: theme.palette.text.primary },
        borderColor: theme.palette.divider,
        borderWidth: 1,
        padding: 12,
        formatter: (params) =>
          params
            .map(
              (p) => `<div>${p.seriesName}: ${Number(p.value).toFixed(3)}</div>`
            )
            .join(""),
      },
      legend: {
        show: showLegend,
        type: "scroll",
        top: "top",
        orient: "horizontal",
        textStyle: { color: theme.palette.text.primary },
      },
      grid: {
        left: "10%",
        right: "1%",
        top: "12%",
        bottom: "24%",
        containLabel: true,
      },
      dataZoom: chartSettings.dataZoom,
      xAxis: {
        ...chartGlobalSettings.eChartsOptions.xAxis,
        data: xData,
        axisLabel: {
          ...chartGlobalSettings.eChartsOptions.xAxis.axisLabel,
          interval: xInterval,
          margin: 20,
          rotate: xData.length > 10 ? 25 : 0,
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: "rgba(255, 255, 255, 0.05)",
            width: 0.8,
            type: "solid",
          },
        },
      },
      yAxis: {
        ...chartGlobalSettings.eChartsOptions.yAxis,
        axisLabel: {
          ...chartGlobalSettings.eChartsOptions.yAxis.axisLabel,
          margin: 10,
        },
        splitNumber: maxAxisTicks,
        splitLine: {
          show: true,
          lineStyle: {
            color: "rgba(255, 255, 255, 0.05)",
            width: 0.8,
            type: "solid",
          },
        },
      },
      series,
    };
  }, [data, config, showLegend, theme, maxAxisTicks]);

  const chartRef = useRef(null);

  const zoomIn = () => {
    const instance = chartRef.current.getEchartsInstance();
    const currentOption = instance.getOption();
    const dz = currentOption.dataZoom[0];
    let start = dz.start;
    let end = dz.end;
    const center = (start + end) / 2;
    let range = end - start;
    let newRange = range * 0.8;
    let newStart = center - newRange / 2;
    let newEnd = center + newRange / 2;
    if (newStart < 0) {
      newStart = 0;
      newEnd = newRange;
    }
    if (newEnd > 100) {
      newEnd = 100;
      newStart = 100 - newRange;
    }
    instance.setOption({
      dataZoom: [{ start: newStart, end: newEnd }],
    });
  };

  const zoomOut = () => {
    const instance = chartRef.current.getEchartsInstance();
    const currentOption = instance.getOption();
    const dz = currentOption.dataZoom[0];
    let start = dz.start;
    let end = dz.end;
    const center = (start + end) / 2;
    let range = end - start;
    let newRange = range * 1.25;
    if (newRange > 100) newRange = 100;
    let newStart = center - newRange / 2;
    let newEnd = center + newRange / 2;
    if (newStart < 0) {
      newStart = 0;
      newEnd = newRange;
    }
    if (newEnd > 100) {
      newEnd = 100;
      newStart = 100 - newRange;
    }
    instance.setOption({
      dataZoom: [{ start: newStart, end: newEnd }],
    });
  };

  const resetView = () => {
    const instance = chartRef.current.getEchartsInstance();
    instance.setOption({
      dataZoom: [{ start: 0, end: 100 }],
    });
  };

  return (
    <Box
      sx={{
        height: "600px",
        width: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
        <Button onClick={refresh} variant="outlined">
          Refresh Data
        </Button>
        <Box>
          <Button
            variant="outlined"
            size="small"
            onClick={zoomIn}
            sx={{ mr: 1 }}
          >
            Zoom In
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={zoomOut}
            sx={{ mr: 1 }}
          >
            Zoom Out
          </Button>
          <Button variant="outlined" size="small" onClick={resetView}>
            Reset View
          </Button>
        </Box>
      </Box>
      {error && (
        <Typography color="error">
          Error fetching data: {error.message || "Unknown error"}
        </Typography>
      )}
      {loading ? (
        <Typography color="textSecondary">Loading...</Typography>
      ) : (
        <Box
          sx={{
            flexGrow: 1,
            position: "relative",
            width: "100%",
            minHeight: 0, // ensures proper flex behavior
          }}
        >
          <ReactECharts
            ref={chartRef}
            option={chartOptions}
            style={{
              height: "100%",
              width: "100%",
            }}
            notMerge={true}
            lazyUpdate={false}
          />
        </Box>
      )}
    </Box>
  );
}
