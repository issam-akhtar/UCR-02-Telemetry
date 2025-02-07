import React, { useState } from "react";
import {
  Grid,
  Typography,
  Tabs,
  Tab,
  Paper,
  Container,
  Box,
} from "@mui/material";
import RealTimeChart from "../components/charts/RealTimeChart";
import HistoricalChart from "../components/charts/HistoricalChart";
import CellCharts from "../components/charts/CellCharts";
import { chartConfigs } from "../config/chartConfig";
import { chartSettings } from "../config/chartSettings";

// ✅ Updated SquareChartWrapper to prevent cutoff and ensure scaling
const SquareChartWrapper = ({ children }) => {
  return (
    <Box
      sx={{
        position: "relative",
        width: "100%",
        minHeight: "300px",
        height: "auto",
        overflow: "visible",
      }}
    >
      {children}
    </Box>
  );
};

export default function DataExplorer() {
  const allChartTypes = [...new Set(chartConfigs.map((c) => c.type))];
  const [selectedCharts] = useState(allChartTypes);
  const [mode, setMode] = useState("realtime");

  return (
    <Container
      sx={{
        py: 4,
        display: "flex",
        flexDirection: "column",
        width: "100%",
      }}
    >
      {/* Header */}
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2, mb: 3 }}>
        <Typography variant="h4" fontWeight={600} color="textPrimary">
          Data Explorer
        </Typography>
      </Paper>

      {/* Mode Tabs */}
      <Paper elevation={3} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Tabs
          value={mode}
          onChange={(e, newValue) => newValue && setMode(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab value="realtime" label="Real-Time" />
          <Tab value="historical" label="Historical" />
        </Tabs>
      </Paper>

      <Grid container spacing={3} sx={{ width: "100%", flexGrow: 1 }}>
        {chartConfigs.map((config) =>
          config.type === "Cell" ? (
            <Grid item xs={12} key="cell-charts">
              <CellCharts
                mode={mode}
                height={chartSettings.defaultHeight}
                width={chartSettings.defaultWidth}
              />
            </Grid>
          ) : (
            <Grid
              item
              xs={12}
              md={6}
              key={config.type}
              sx={{ display: "flex" }}
            >
              <Paper
                elevation={3}
                className="chart-paper-container"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  width: "100%",
                  height: "auto",
                  minHeight: "400px",
                  overflow: "hidden",
                }}
              >
                <SquareChartWrapper>
                  {mode === "realtime" ? (
                    <RealTimeChart
                      title={config.title}
                      configs={[config]}
                      showLegend={true}
                      height="100%"
                      width="100%"
                    />
                  ) : (
                    <HistoricalChart
                      title={config.title}
                      config={config}
                      showLegend={true}
                      height="100%"
                      width="100%"
                    />
                  )}
                </SquareChartWrapper>
              </Paper>
            </Grid>
          )
        )}
      </Grid>
    </Container>
  );
}
