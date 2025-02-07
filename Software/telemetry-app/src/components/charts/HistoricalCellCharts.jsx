import React, { useState, useContext, memo, useRef } from "react";
import ReactECharts from "echarts-for-react";
import { Grid, Typography, Button, Box, IconButton } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useHistoricalData } from "../../hooks/useHistoricalData";
import { chartSettings } from "../../config/chartSettings";
import { ChartSettingsContext } from "../../context/ChartSettingsContext";

const downsampleData = (dataArray, key, targetPoints = 300) => {
  if (dataArray.length <= targetPoints) return dataArray;
  const sampled = [];
  const bucketSize = Math.floor(dataArray.length / targetPoints);
  sampled.push(dataArray[0]);
  for (let i = 1; i < targetPoints - 1; i++) {
    const subset = dataArray.slice(i * bucketSize, (i + 1) * bucketSize);
    const avg =
      subset.reduce((sum, point) => sum + parseFloat(point[key] || 0), 0) /
      subset.length;
    let chosen = subset.reduce(
      (best, point) =>
        Math.abs(parseFloat(point[key] || 0) - avg) <
        Math.abs(parseFloat(best[key] || 0) - avg)
          ? point
          : best,
      subset[0]
    );
    sampled.push(chosen);
  }
  sampled.push(dataArray[dataArray.length - 1]);
  return sampled;
};

const buildChartOptions = (data, cellKeys, theme, maxAxisTicks, showLegend) => {
  const validData = data.filter((d) => d && d.timestamp);
  const sampledData =
    validData.length > 1000
      ? downsampleData(validData, "timestamp", 300)
      : validData;
  const xData = sampledData.map((d) =>
    new Date(d.timestamp).toLocaleTimeString()
  );
  const xInterval =
    xData.length > maxAxisTicks ? Math.floor(xData.length / maxAxisTicks) : 0;
  const colors = [
    "#ff5722",
    "#ff9800",
    "#ffc107",
    "#8bc34a",
    "#00bcd4",
    "#3f51b5",
    "#673ab7",
    "#e91e63",
  ];
  const series = cellKeys.map((key, index) => ({
    name: key,
    type: "line",
    data: sampledData.map((d) => parseFloat(d[key]) || 0),
    smooth: true,
    showSymbol: false,
    sampling: "lttb",
    lineStyle: { width: 1 },
    itemStyle: { color: colors[index % colors.length] },
  }));

  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      backgroundColor: theme.palette.background.paper,
      textStyle: { color: theme.palette.text.primary },
      borderColor: theme.palette.divider,
      borderWidth: 1,
      padding: 12,
    },
    legend: {
      show: showLegend,
      type: "scroll",
      top: "top",
      orient: "horizontal",
      textStyle: { color: theme.palette.text.primary },
    },
    grid: chartSettings.grid,
    dataZoom: chartSettings.dataZoom,
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: xData,
      axisLabel: {
        interval: xInterval,
        margin: 10,
        rotate: xData.length > 10 ? 45 : 0,
        color: theme.palette.text.secondary,
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        margin: 10,
        color: theme.palette.text.secondary,
      },
      splitNumber: maxAxisTicks,
    },
    series,
  };
};

const ChartWithControls = ({ option, style }) => {
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
    <Box>
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
        <Button variant="outlined" size="small" onClick={zoomIn} sx={{ mr: 1 }}>
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
      <ReactECharts
        ref={chartRef}
        option={option}
        style={style}
        notMerge={true}
        lazyUpdate={false}
      />
    </Box>
  );
};

const HistoricalCellCharts = memo(() => {
  const theme = useTheme();
  const { maxAxisTicks } = useContext(ChartSettingsContext);
  const { data, loading, error, refresh } = useHistoricalData({
    endpoint: "cellData",
    page: 1,
    pageSize: 10000,
  });

  const groups = [
    Array.from({ length: 32 }, (_, i) => `Cell${i + 1}`),
    Array.from({ length: 32 }, (_, i) => `Cell${i + 33}`),
    Array.from({ length: 32 }, (_, i) => `Cell${i + 65}`),
    Array.from({ length: 32 }, (_, i) => `Cell${i + 97}`),
  ];

  const [showLegend, setShowLegend] = useState(true);

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        bgcolor: theme.palette.background.paper,
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" gutterBottom>
        Historical Battery Cell Voltages
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
        <Button onClick={refresh} variant="outlined" sx={{ mr: 2 }}>
          Refresh Data
        </Button>
        <IconButton onClick={() => setShowLegend(!showLegend)}>
          {showLegend ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
        <Typography variant="body2" sx={{ ml: 1 }}>
          {showLegend ? "Hide Legend" : "Show Legend"}
        </Typography>
      </Box>
      {error && (
        <Typography color="error">
          Error: {error.message || "Unknown error"}
        </Typography>
      )}
      {loading ? (
        <Typography>Loading...</Typography>
      ) : (
        <Grid container spacing={3}>
          {groups.map((group, idx) => (
            <Grid item xs={12} md={6} key={idx}>
              <ChartWithControls
                option={buildChartOptions(
                  data,
                  group,
                  theme,
                  maxAxisTicks,
                  showLegend
                )}
                style={{ height: chartSettings.defaultHeight, width: "100%" }}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
});

export default HistoricalCellCharts;
