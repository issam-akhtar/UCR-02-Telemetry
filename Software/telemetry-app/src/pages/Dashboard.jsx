import React from "react";
import { Grid, Typography, Box } from "@mui/material";
import SummaryCard from "../components/charts/SummaryCard";
import RealTimeChart from "../components/charts/RealTimeChart";
import { chartConfigs } from "../config/chartConfig";

export default function Dashboard() {
  const activeDashboardConfigs = chartConfigs.filter(
    (config) => config.dashboard && config.type === "TCU"
  );

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom color="textPrimary">
        Telemetry Dashboard
      </Typography>
      <Grid container spacing={3}>
        {activeDashboardConfigs.map((config) => (
          <Grid item xs={12} md={6} lg={4} key={config.type}>
            <SummaryCard
              title={config.title}
              currentValue={0}
              unit={config.unit}
              color={config.color || "primary"}
              details={`Additional details about ${config.title}.`}
            />
          </Grid>
        ))}
        <Grid item xs={12}>
          <RealTimeChart
            title="Key Metrics"
            configs={activeDashboardConfigs}
            // When used in dashboard we pass height explicitly if desired.
            showLegend={true}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
