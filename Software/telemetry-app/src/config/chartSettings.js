// chartSettings.js
export const chartSettings = {
  defaultHeight: "600px",
  defaultWidth: "100%",
  defaultAspectRatio: 1,
  layoutPadding: { top: 20, bottom: 20, left: 20, right: 20 },
  dataZoom: [
    { type: "inside", start: 0, end: 100 },
    { type: "slider", start: 0, end: 100 },
  ],
  grid: {
    left: "10%",
    right: "5%",
    bottom: "15%",
    top: "15%",
    containLabel: true,
  },
  chartJsDefaults: {
    maintainAspectRatio: false,
    animation: { duration: 250 },
    layout: { padding: { top: 20, bottom: 20, left: 20, right: 20 } },
  },
  cellThresholds: { veryLow: 3.0, low: 3.4, moderate: 3.8, high: 4.1 },
  cellColors: {
    veryLow: "#ff0000",
    low: "#ffa500",
    moderate: "#ffff00",
    high: "#adff2f",
    veryHigh: "#00ff00",
    default: "#1976d2",
  },
};
