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

  return (
    <Box sx={{ position: 'relative', height: 'calc(100vh - 64px)' }}>
      <Box
        sx={{
          position: 'absolute',
          top: 20,
          left: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 2,
          p: 3,
          border: '1px solid',
          borderColor: 'grey.700',
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <Box sx={{ border: '1px solid', borderColor: 'grey.600', borderRadius: 2, p: 2, textAlign: 'center', minWidth: 350 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              Pack Voltage / Current
            </Typography>
            <PackGauge voltage={packVoltage} current={packCurrent} />
          </Box>
          <Box sx={{ border: '1px solid', borderColor: 'grey.600', borderRadius: 2, p: 2, textAlign: 'center', minWidth: 250 }}>
            <Typography variant="h5" sx={{ mb: 2 }}>
              State of Charge
            </Typography>
            <SoCIndicator soc={stateOfCharge} />
          </Box>
        </Box>
        <Box sx={{ border: '1px solid', borderColor: 'grey.600', borderRadius: 2, p: 2, textAlign: 'center' }}>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Cell Voltages
          </Typography>
          <Box sx={{ width: 700, height: 400, mx: 'auto' }}>
            <CellHeatmap />
          </Box>
        </Box>
      </Box>
      <Box
        component="img"
        src={top_view_black}
        alt="Car Modal"
        sx={{
          width: '90vw',
          maxWidth: 800,
          height: 'auto',
          transform: 'rotate(90deg)',
          position: 'absolute',
          right: 0,
          bottom: 0,
        }}
      />
    </Box>
  );
};

export default Dashboard;
