import React, { useState } from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import top_view_black from '/SVG/UCR-01-Drawing-Top.svg';
import '../styles/Dashboard.css';
import useRealTimeData from '../hooks/useRealTimeData';
import PackGauge from '../components/visulizations/PackGauge';
import SoCIndicator from '../components/visulizations/SoCIndicator';
import CellHeatmap from '../components/visulizations/CellHeatMap';
import LiveGPSMap from '../components/visulizations/LiveGPSMap';

// Extract and memoize DashboardCard so it isn't re-created on every render.
const DashboardCard = React.memo(({ title, height, children }) => (
  <Paper
    className="dashboard-card"
    elevation={3}
    sx={{
      backgroundColor: '#1E2329',
      borderRadius: 2,
      p: 1.5,
      height: height || '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}
  >
    <Typography variant="h6" className="card-title" sx={{ mb: 1.5 }}>
      {title}
    </Typography>
    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {children}
    </Box>
  </Paper>
));

const Dashboard = () => {
  const [packVoltage, setPackVoltage] = useState(0);
  const [packCurrent, setPackCurrent] = useState(0);
  const [stateOfCharge, setStateOfCharge] = useState(0);

  // <-- NEW: we store the derived speed
  const [speed, setSpeed] = useState(0);

  useRealTimeData('pack_voltage', (msg) => {
    const voltageObj = msg.payload.fields.voltage;
    if (voltageObj?.numberValue !== undefined) {
      setPackVoltage(voltageObj.numberValue);
    }
  });

  useRealTimeData('pack_current', (msg) => {
    const currentObj = msg.payload.fields.current;
    if (currentObj?.numberValue !== undefined) {
      setPackCurrent(currentObj.numberValue);
    }
  });

  useRealTimeData('aculv_fd_1', (msg) => {
    const socObj = msg.payload.fields.state_of_charge;
    if (socObj?.numberValue !== undefined) {
      setStateOfCharge(socObj.numberValue);
    }
  });

  // <-- NEW: subscribe to ins_imu, derive speed from north_vel & east_vel
  useRealTimeData('ins_imu', (msg) => {
    const fields = msg.payload.fields;
    if (!fields.north_vel || !fields.east_vel) return;

    const northVel = fields.north_vel.numberValue || 0;
    const eastVel = fields.east_vel.numberValue || 0;
    const calculatedSpeed = Math.sqrt(northVel ** 2 + eastVel ** 2); // m/s
    setSpeed(calculatedSpeed);
  });

  // Clamp SoC for the text display as well
  const displayedSoC = Math.max(0, Math.min(100, stateOfCharge));

  return (
    <Box
      sx={{
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: '#161A1D',
        p: { xs: 1, md: 2 },
        overflowY: 'auto',
      }}
    >
      <Grid container spacing={2}>
        {/* Row 1: Vehicle Overview, Pack Gauge / Current, SoC */}
        <Grid item xs={12} md={4}>
          <DashboardCard title="Vehicle Overview" height={320}>
            <Box
              component="img"
              src={top_view_black}
              alt="Car Model"
              sx={{
                width: '80%',
                maxWidth: 250,
                height: 'auto',
                transform: 'rotate(90deg)',
                filter: 'drop-shadow(0px 4px 8px rgba(0, 0, 0, 0.3))',
              }}
            />
          </DashboardCard>
        </Grid>

        <Grid item xs={12} md={5}>
          <DashboardCard title="Pack Voltage / Current" height={320}>
            <PackGauge voltage={packVoltage} current={packCurrent} />
          </DashboardCard>
        </Grid>

        <Grid item xs={12} md={3}>
          <DashboardCard title="State of Charge" height={320}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <SoCIndicator soc={stateOfCharge} />
              <Typography
                variant="h4"
                sx={{
                  mt: 1.5,
                  color:
                    displayedSoC < 20 ? 'red' :
                      displayedSoC < 50 ? 'orange' :
                        'limegreen',
                  fontWeight: 'bold',
                }}
              >
                {displayedSoC.toFixed(1)}%
              </Typography>
            </Box>
          </DashboardCard>
        </Grid>

        {/* Row 2: Cell Voltages, Live GPS Map */}
        <Grid item xs={12} md={6}>
          <DashboardCard title="Cell Voltages" height={450}>
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
              <CellHeatmap />
            </Box>
          </DashboardCard>
        </Grid>

        <Grid item xs={12} md={6}>
          <DashboardCard title="Live GPS Map" height={450}>
            <Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
              <LiveGPSMap />
            </Box>
          </DashboardCard>
        </Grid>

        {/* Row 3: Additional metrics (4 columns now) */}
        <Grid item xs={12} md={3}>
          <DashboardCard title="Temperature Sensors" height={250}>
            <Typography variant="body1" sx={{ color: '#AAAAAA', textAlign: 'center' }}>
              Temperature sensors visualization will be displayed here
            </Typography>
          </DashboardCard>
        </Grid>

        <Grid item xs={12} md={3}>
          <DashboardCard title="System Alerts" height={250}>
            <Typography variant="body1" sx={{ color: '#AAAAAA', textAlign: 'center' }}>
              Critical system alerts will be displayed here
            </Typography>
          </DashboardCard>
        </Grid>

        <Grid item xs={12} md={3}>
          <DashboardCard title="Power Consumption" height={250}>
            <Typography variant="body1" sx={{ color: '#AAAAAA', textAlign: 'center' }}>
              Power consumption metrics will be displayed here
            </Typography>
          </DashboardCard>
        </Grid>

        {/* <-- NEW card for speed */}
        <Grid item xs={12} md={3}>
          <DashboardCard title="Vehicle Speed" height={250}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Typography variant="h4" sx={{ color: '#FFFFFF', fontWeight: 'bold' }}>
                {(speed * 3.6).toFixed(2)} km/h
                <br />
                <br />
                {(speed).toFixed(2)} m/s
              </Typography>

            </Box>
          </DashboardCard>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
