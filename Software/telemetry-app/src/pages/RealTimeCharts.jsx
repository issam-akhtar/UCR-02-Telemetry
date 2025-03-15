import React, { useState, useContext, useEffect } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import GraphSelector from '../components/charts/GraphSelector';
import RealTimeChartWrapper from '../components/charts/RealTimeChartWrapper';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { ChartSelectionContext } from '../contexts/ChartSelectionContext';

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

const RealTimeCharts = () => {
  const theme = useTheme();
  // Define scrollbar styles based on the current theme
  const scrollbarStyles = {
    scrollbarWidth: 'thin', // Firefox
    scrollbarColor: theme.palette.mode === 'dark' ? '#666 #222' : '#aaa #ccc',
    '&::-webkit-scrollbar': { width: '6px' }, // Chrome, Safari
    '&::-webkit-scrollbar-track': { backgroundColor: theme.palette.mode === 'dark' ? '#222' : '#ccc' },
    '&::-webkit-scrollbar-thumb': { backgroundColor: theme.palette.mode === 'dark' ? '#666' : '#aaa', borderRadius: '4px' },
  };

  const {
    realTimeSelectedCharts,
    setRealTimeSelectedCharts,
    realTimeSidebarCollapsed,
    setRealTimeSidebarCollapsed,
  } = useContext(ChartSelectionContext);

  const [isPaused, setIsPaused] = useState(false);
  const togglePause = () => setIsPaused((p) => !p);

  const getTitle = (chartType) => {
    for (const group of groupedChartOptions) {
      const found = group.options.find((opt) => opt.value === chartType);
      if (found) return found.label;
    }
    return chartType;
  };

  // Fire a resize event after sidebar transitions so charts fill the new space
  useEffect(() => {
    const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 310);
    return () => clearTimeout(timer);
  }, [realTimeSidebarCollapsed]);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Collapsible LEFT SIDEBAR */}
      <Box
        sx={{
          width: realTimeSidebarCollapsed ? 50 : 350,
          transition: 'width 0.3s',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          maxHeight: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1,
            borderBottom: 1,
            borderColor: 'divider',
            justifyContent: realTimeSidebarCollapsed ? 'center' : 'space-between',
          }}
        >
          {realTimeSidebarCollapsed ? (
            <IconButton onClick={() => setRealTimeSidebarCollapsed(false)}>
              <MenuIcon />
            </IconButton>
          ) : (
            <>
              <Typography variant="h6">Graph Selector</Typography>
              <IconButton onClick={() => setRealTimeSidebarCollapsed(true)}>
                <CloseIcon />
              </IconButton>
            </>
          )}
        </Box>
        {!realTimeSidebarCollapsed && (
          <Box sx={{ p: 2, overflowY: 'auto', ...scrollbarStyles }}>
            <GraphSelector
              groupedOptions={groupedChartOptions}
              selected={realTimeSelectedCharts}
              onChange={setRealTimeSelectedCharts}
            />
          </Box>
        )}
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
          <Button variant="outlined" onClick={() => setIsPaused((p) => !p)}>
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
        </Box>
        <Box sx={{ p: 2 }}>
          <Typography variant="h4" align="center" sx={{ mb: 2 }}>
            Real-Time Graphs
          </Typography>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: 1,
              borderColor: 'divider',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(600px, 1fr))',
              gap: 3,
            }}
          >
            {realTimeSelectedCharts.map((type) => (
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
  );
};

export default RealTimeCharts;
