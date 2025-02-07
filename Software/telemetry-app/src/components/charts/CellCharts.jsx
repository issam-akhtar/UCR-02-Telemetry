import React, { useContext, memo, useState, useEffect, useRef } from "react";
import { Box, Typography, useTheme, Button } from "@mui/material";
import { Bar } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { ChartSettingsContext } from "../../context/ChartSettingsContext";
import HistoricalCellCharts from "./HistoricalCellCharts";
import { wsService } from "../../services/websocket";
import { chartSettings } from "../../config/chartSettings";

Chart.register(...registerables, zoomPlugin);

const CellCharts = ({ mode }) => {
  const theme = useTheme();
  const { maxAxisTicks } = useContext(ChartSettingsContext);
  const [liveCells, setLiveCells] = useState({});
  const chartRef = useRef(null);

  useEffect(() => {
    let unsubscribe;
    if (mode === "realtime") {
      unsubscribe = wsService.subscribe("Cell", (msg) => {
        setLiveCells(msg.payload || {});
      });
    }
    return () => unsubscribe?.();
  }, [mode]);

  // Function to determine the bar color based on voltage thresholds
  const getBarColor = (voltage) => {
    if (voltage < chartSettings.cellThresholds.veryLow) {
      return chartSettings.cellColors.veryLow;
    } else if (voltage < chartSettings.cellThresholds.low) {
      return chartSettings.cellColors.low;
    } else if (voltage < chartSettings.cellThresholds.moderate) {
      return chartSettings.cellColors.moderate;
    } else if (voltage < chartSettings.cellThresholds.high) {
      return chartSettings.cellColors.high;
    } else {
      return chartSettings.cellColors.veryHigh;
    }
  };

  // Build an array of colors for each cell based on its voltage
  const cellColors = Array.from({ length: 128 }, (_, i) => {
    const voltage = parseFloat(liveCells[`Cell${i + 1}`]) || 0;
    return getBarColor(voltage);
  });

  const realTimeData = {
    labels: Array.from({ length: 128 }, (_, i) => `Cell ${i + 1}`),
    datasets: [
      {
        label: "Voltage",
        data: Array.from(
          { length: 128 },
          (_, i) => parseFloat(liveCells[`Cell${i + 1}`]) || 0
        ),
        backgroundColor: cellColors,
        borderColor: cellColors,
        borderWidth: 0,
        barThickness: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          drag: { enabled: true },
          pinch: { enabled: true },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: theme.palette.text.secondary,
          maxTicksLimit: maxAxisTicks,
        },
        grid: { color: theme.palette.divider },
      },
      y: {
        ticks: {
          color: theme.palette.text.secondary,
          maxTicksLimit: maxAxisTicks,
        },
        grid: { color: theme.palette.divider },
      },
    },
  };

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  return (
    <Box
      sx={{
        mt: 2,
        p: 2,
        bgcolor: theme.palette.background.paper,
        borderRadius: 2,
      }}
    >
      <Typography variant="h6" gutterBottom color="textPrimary">
        Battery Cell Voltages (
        {mode === "realtime" ? "Real-Time" : "Historical"})
      </Typography>
      {mode === "realtime" ? (
        <>
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
            <Button variant="outlined" size="small" onClick={resetZoom}>
              Reset View
            </Button>
          </Box>
          <Box
            sx={{
              height: chartSettings.defaultHeight,
              width: chartSettings.defaultWidth,
              position: "relative", // Ensure that the chart fills this container
            }}
          >
            <Bar
              ref={chartRef}
              data={realTimeData}
              options={chartOptions}
              style={{
                height: "100%",
                width: "100%",
              }}
            />
          </Box>
        </>
      ) : (
        <HistoricalCellCharts />
      )}
    </Box>
  );
};

export default memo(CellCharts);
