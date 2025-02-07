import React, {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useContext,
} from "react";
import { Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { Typography, Button, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { wsService } from "../../services/websocket";
import { ChartSettingsContext } from "../../context/ChartSettingsContext";
import { chartSettings } from "../../config/chartSettings";

Chart.register(...registerables, zoomPlugin);

export default React.memo(function RealTimeChart({
  title,
  configs,
  showLegend = true,
}) {
  const theme = useTheme();
  const { realTimeWindow, realTimeUpdateInterval, maxAxisTicks } =
    useContext(ChartSettingsContext);
  const [data, setData] = useState([]);
  const lastUpdateRef = useRef(Date.now());
  const animationFrameRef = useRef(null);
  const chartRef = useRef(null);

  const updateData = useCallback(
    (config, msg) => {
      if (Date.now() - lastUpdateRef.current < realTimeUpdateInterval) return;
      lastUpdateRef.current = Date.now();
      const timestamp = new Date(msg.time).toLocaleTimeString();
      animationFrameRef.current = requestAnimationFrame(() => {
        setData((prev) => {
          const newData = [...prev];
          const existing = newData.find((d) => d.timestamp === timestamp);
          if (existing) {
            config.fields.forEach((f) => {
              existing[f.key] = msg.payload[f.key] ?? msg[f.key];
            });
          } else {
            const newRecord = { timestamp };
            config.fields.forEach((f) => {
              newRecord[f.key] = msg.payload[f.key] ?? msg[f.key];
            });
            newData.push(newRecord);
          }
          return newData.slice(-realTimeWindow);
        });
      });
    },
    [realTimeUpdateInterval, realTimeWindow]
  );

  useEffect(() => {
    const unsubscribers = configs.map((config) =>
      wsService.subscribe(config.type, (msg) => updateData(config, msg))
    );
    return () => {
      unsubscribers.forEach((unsub) => unsub());
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [configs, updateData]);

  const resetZoom = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom();
    }
  };

  const chartData = useMemo(
    () => ({
      labels: data.map((d) => d.timestamp),
      datasets: configs.flatMap((config) =>
        config.fields.map((field, idx) => ({
          label: field.label,
          data: data.map((d) => parseFloat(d[field.key] || 0)),
          borderColor: field.color || config.colors[idx % config.colors.length],
          borderWidth: 1.8,
          pointRadius: 0,
          tension: 0.4,
        }))
      ),
    }),
    [data, configs]
  );

  const options = useMemo(
    () => ({
      responsive: true,
      ...chartSettings.chartJsDefaults,
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: showLegend,
          position: "top",
          labels: { color: theme.palette.text.primary },
        },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: theme.palette.background.paper,
          titleColor: theme.palette.text.primary,
          bodyColor: theme.palette.text.secondary,
          borderColor: theme.palette.divider,
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(3)}`,
          },
        },
        zoom: {
          zoom: {
            wheel: { enabled: true },
            pinch: { enabled: true },
            drag: { enabled: false },
          },
          pan: {
            enabled: true,
            mode: "xy",
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: theme.palette.text.secondary,
            maxTicksLimit: maxAxisTicks,
            minRotation: 45,
            maxRotation: 45,
          },
          grid: {
            color: "rgba(255, 255, 255, 0.2)",
          },
        },
        y: {
          ticks: {
            color: theme.palette.text.secondary,
            maxTicksLimit: maxAxisTicks,
          },
          grid: {
            color: "rgba(255, 255, 255, 0.2)",
          },
        },
      },
    }),
    [theme, showLegend, maxAxisTicks]
  );

  return (
    <Box
      sx={{
        height: chartSettings.defaultHeight,
        width: chartSettings.defaultWidth,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        margin: "20px 0",
      }}
    >
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h6" color="textPrimary">
          {title}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          onClick={resetZoom}
          sx={{ ml: 2 }}
        >
          Reset View
        </Button>
      </Box>
      <Box
        sx={{
          flexGrow: 1,
          minHeight: 0, // Important for proper flex behavior
          position: "relative",
          width: "100%",
        }}
      >
        <Line
          ref={chartRef}
          data={chartData}
          options={options}
          style={{
            height: "100%",
            width: "100%",
          }}
        />
      </Box>
    </Box>
  );
});
