import React, { useState } from 'react';
import { Box, Typography, Button } from '@mui/material';
import GraphSelector from '../components/charts/GraphSelector';
import RealTimeChartWrapper from '../components/charts/RealTimeChartWrapper';

const groupedChartOptions = [
  {
    category: "Vehicle Control",
    options: [
      { value: 'tcu', label: 'TCU Real-Time Data', icon: 'Cpu' },
      { value: 'ins_imu', label: 'INS IMU Data', icon: 'Activity' },
      { value: 'ins_gps', label: 'INS GPS Data', icon: 'MapPin' },
      { value: 'gps_best_pos', label: 'GPS Best Pos Data', icon: 'MapPin' },
    ],
  },
  {
    category: "Battery",
    options: [
      { value: 'pack_current', label: 'Pack Current', icon: 'BatteryCharging' },
      { value: 'pack_voltage', label: 'Pack Voltage', icon: 'BatteryCharging' },
      { value: 'cell', label: 'Cell Data', icon: 'BarChart' },
      { value: 'thermistor', label: 'Thermistor Data', icon: 'Thermometer' },
      { value: 'aculv1', label: 'ACU LV 1', icon: 'BatteryCharging' },
      { value: 'aculv_fd_1', label: 'ACU LV FD1', icon: 'BatteryCharging' },
      { value: 'aculv2', label: 'ACU LV2', icon: 'BatteryCharging' },
      { value: 'aculv_fd_2', label: 'ACU LV FD2', icon: 'BatteryCharging' },
    ],
  },
  {
    category: "Motor & Bamocar",
    options: [
      { value: 'bamocar', label: 'Bamocar', icon: 'Cpu' },
      { value: 'bamocar_rx_data', label: 'Bamocar RX Data', icon: 'Cpu' },
      { value: 'bamocar_tx_data', label: 'Bamocar TX Data', icon: 'Cpu' },
      { value: 'bamo_car_re_transmit', label: 'BamoCar Re-Transmit', icon: 'Cpu' },
    ],
  },
  {
    category: "PDM",
    options: [
      { value: 'pdm1', label: 'PDM1 Data', icon: 'Gauge' },
      { value: 'pdm_current', label: 'PDM Current', icon: 'Gauge' },
      { value: 'pdm_re_transmit', label: 'PDM Re-Transmit', icon: 'Gauge' },
    ],
  },
  {
    category: "Strain Gauges",
    options: [
      { value: 'front_strain_gauges_1', label: 'Front Strain Gauges 1', icon: 'Activity' },
      { value: 'front_strain_gauges_2', label: 'Front Strain Gauges 2', icon: 'Activity' },
      { value: 'rear_strain_gauges1', label: 'Rear Strain Gauges 1', icon: 'Activity' },
      { value: 'rear_strain_gauges2', label: 'Rear Strain Gauges 2', icon: 'Activity' },
    ],
  },
  {
    category: "Aero",
    options: [
      { value: 'front_aero', label: 'Front Aero', icon: 'Activity' },
      { value: 'rear_aero', label: 'Rear Aero', icon: 'Activity' },
    ],
  },
  {
    category: "Analog",
    options: [
      { value: 'front_analog', label: 'Front Analog', icon: 'Activity' },
      { value: 'rear_analog', label: 'Rear Analog', icon: 'Activity' },
    ],
  },
  {
    category: "Frequency",
    options: [
      { value: 'front_frequency', label: 'Front Frequency', icon: 'Activity' },
      { value: 'rear_frequency', label: 'Rear Frequency', icon: 'Activity' },
    ],
  },
  {
    category: "Misc",
    options: [
      { value: 'encoder', label: 'Encoder Data', icon: 'HelpCircle' },
    ],
  },
];

const defaultSelected = ['tcu', 'pack_current', 'cell', 'pack_voltage'];

const RealTimeCharts = () => {
  const [selectedCharts, setSelectedCharts] = useState(defaultSelected);
  const [isPaused, setIsPaused] = useState(false);

  const togglePause = () => setIsPaused((p) => !p);

  const getTitle = (chartType) => {
    for (const group of groupedChartOptions) {
      const found = group.options.find((opt) => opt.value === chartType);
      if (found) return found.label;
    }
    return chartType;
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* LEFT SIDEBAR */}
      <Box
        sx={{
          width: 350,
          borderRight: 1,
          borderColor: 'divider',
          p: 2,
          bgcolor: 'background.paper',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 64px)',

          // Ensure stable scrollbar
          scrollbarGutter: 'stable',
          scrollbarWidth: 'thin',
          scrollbarColor: 'grey.700 background.default',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            backgroundColor: 'background.default',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: 'grey.700',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            backgroundColor: 'grey.600',
          },
        }}
      >
        <Typography variant="h5" sx={{ mb: 2 }}>
          Graph Selector
        </Typography>
        <GraphSelector
          groupedOptions={groupedChartOptions}
          selected={selectedCharts}
          onChange={setSelectedCharts}
        />
      </Box>

      {/* MAIN CONTENT */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <Box
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            p: 1,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button variant="outlined" onClick={togglePause}>
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
        </Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Real-Time Graphs
          </Typography>
          <Box sx={{ p: 2, borderRadius: 2, border: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {selectedCharts.map((type) => (
                <RealTimeChartWrapper
                  key={type}
                  chartType={type}
                  title={getTitle(type)}
                  width="100%"
                  height={500}
                  isPaused={isPaused}
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default RealTimeCharts;
