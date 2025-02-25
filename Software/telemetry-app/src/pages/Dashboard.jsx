import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import '../styles/Dashboard.css';
import top_view_black from '/SVG/UCR-01-Drawing-Top-Black.svg';
import useRealTimeData from '../hooks/useRealTimeData';

import PackGauge from '../components/visulizations/PackGauge';
import SoCIndicator from '../components/visulizations/SoCIndicator';
import CellHeatmap from '../components/visulizations/CellHeatMap';

const Dashboard = () => {
  const [packVoltage, setPackVoltage] = useState(0);
  const [packCurrent, setPackCurrent] = useState(0);
  const [stateOfCharge, setStateOfCharge] = useState(0);

  // Subscribe to "pack_voltage"
  useRealTimeData('pack_voltage', (msg) => {
    const voltageObj = msg.payload.fields.voltage;
    if (voltageObj?.numberValue !== undefined) {
      setPackVoltage(voltageObj.numberValue);
    }
  });

  // Subscribe to "pack_current"
  useRealTimeData('pack_current', (msg) => {
    const currentObj = msg.payload.fields.current;
    if (currentObj?.numberValue !== undefined) {
      setPackCurrent(currentObj.numberValue);
    }
  });

  // Subscribe to "aculv_fd_1" for SoC
  useRealTimeData('aculv_fd_1', (msg) => {
    const socObj = msg.payload.fields.state_of_charge;
    if (socObj?.numberValue !== undefined) {
      setStateOfCharge(socObj.numberValue);
    }
  });

  return (
    <div className="dashboard-container">
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: 2,
          p: 3,
          border: '1px solid #ccc',
        }}
      >
        {/* Gauges row */}
        <Box sx={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          <Box
            sx={{
              border: '1px solid #666',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
              minWidth: '350px',
            }}
          >
            <Typography variant="h5" sx={{ mb: 2 }}>
              Pack Voltage / Current
            </Typography>
            <PackGauge voltage={packVoltage} current={packCurrent} />
          </Box>

          <Box
            sx={{
              border: '1px solid #666',
              borderRadius: 2,
              p: 2,
              textAlign: 'center',
              minWidth: '250px',
            }}
          >
            <Typography variant="h5" sx={{ mb: 2 }}>
              State of Charge
            </Typography>
            <SoCIndicator soc={stateOfCharge} />
          </Box>
        </Box>

        {/* Cell Heatmap for 128 cells in a single "cell" message */}
        <Box
          sx={{
            border: '1px solid #666',
            borderRadius: 2,
            p: 2,
            textAlign: 'center',
          }}
        >
          <Typography variant="h5" sx={{ mb: 2 }}>
            Cell Voltages
          </Typography>
          <Box sx={{ width: '700px', height: '400px', mx: 'auto' }}>
            <CellHeatmap />
          </Box>
        </Box>
      </Box>

      <img src={top_view_black} alt="Car Modal" className="car-modal-image" />
    </div>
  );
};

export default Dashboard;
