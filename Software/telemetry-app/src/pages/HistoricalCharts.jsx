import React, { useEffect, useContext } from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import GraphSelector from '../components/charts/GraphSelector';
import HistoricalChartWrapper from '../components/charts/HistoricalChartWrapper';
import { ChartSelectionContext } from '../contexts/ChartSelectionContext';

const groupedChartOptions = [
  {
    category: "Battery History",
    options: [
      { value: 'tcuData', label: 'Historical TCU Data', icon: 'Cpu' },
      { value: 'packCurrentData', label: 'Historical Pack Current', icon: 'BatteryCharging' },
      { value: 'packVoltageData', label: 'Historical Pack Voltage', icon: 'BatteryCharging' },
      { value: 'cellData', label: 'Historical Cell Data', icon: 'BarChart' },
    ],
  },
  {
    category: "Temperature & Transmissions",
    options: [
      { value: 'thermData', label: 'Historical Therm Data', icon: 'Thermostat' },
      { value: 'bamocarData', label: 'Historical Bamocar Data', icon: 'DirectionsCar' },
      { value: 'bamocarTxData', label: 'Historical Bamocar Tx Data', icon: 'Send' },
      { value: 'bamoCarReTransmitData', label: 'Historical Bamocar Re-Transmit Data', icon: 'Autorenew' },
    ],
  },
  {
    category: "Power & PDM",
    options: [
      { value: 'pdmCurrentData', label: 'Historical PDM Current', icon: 'FlashOn' },
      { value: 'pdmReTransmitData', label: 'Historical PDM Re-Transmit', icon: 'Repeat' },
      { value: 'pdm1Data', label: 'Historical PDM1 Data', icon: 'FlashOn' },
    ],
  },
  {
    category: "Sensors",
    options: [
      { value: 'encoderData', label: 'Historical Encoder Data', icon: 'Dashboard' },
      { value: 'insGPSData', label: 'Historical INS GPS Data', icon: 'LocationOn' },
      { value: 'insIMUData', label: 'Historical INS IMU Data', icon: 'Vibration' },
    ],
  },
  {
    category: "Front Sensors",
    options: [
      { value: 'frontFrequencyData', label: 'Historical Front Frequency', icon: 'Speed' },
      { value: 'frontStrainGauges1Data', label: 'Historical Front Strain Gauges 1', icon: 'BarChart' },
      { value: 'frontStrainGauges2Data', label: 'Historical Front Strain Gauges 2', icon: 'BarChart' },
      { value: 'frontAeroData', label: 'Historical Front Aero Data', icon: 'Air' },
      { value: 'frontAnalogData', label: 'Historical Front Analog Data', icon: 'BarChart' },
    ],
  },
  {
    category: "Rear Sensors",
    options: [
      { value: 'rearStrainGauges1Data', label: 'Historical Rear Strain Gauges 1', icon: 'BarChart' },
      { value: 'rearStrainGauges2Data', label: 'Historical Rear Strain Gauges 2', icon: 'BarChart' },
      { value: 'rearAnalogData', label: 'Historical Rear Analog Data', icon: 'BarChart' },
      { value: 'rearAeroData', label: 'Historical Rear Aero Data', icon: 'Air' },
      { value: 'rearFrequencyData', label: 'Historical Rear Frequency', icon: 'Speed' },
    ],
  },
  {
    category: "GPS & ACULV",
    options: [
      { value: 'gpsBestPosData', label: 'Historical GPS Best Position', icon: 'LocationOn' },
      { value: 'aculvFd1Data', label: 'Historical ACULV FD1 Data', icon: 'Settings' },
      { value: 'aculvFd2Data', label: 'Historical ACULV FD2 Data', icon: 'Settings' },
      { value: 'aculv1Data', label: 'Historical ACULV1 Data', icon: 'Settings' },
      { value: 'aculv2Data', label: 'Historical ACULV2 Data', icon: 'Settings' },
    ],
  },
  {
    category: "Other",
    options: [
      { value: 'bamocarRxData', label: 'Historical Bamocar Rx Data', icon: 'Download' },
    ],
  },
];

const HistoricalCharts = () => {
  const theme = useTheme();
  const scrollbarStyles = {
    scrollbarWidth: 'thin', // Firefox
    scrollbarColor: theme.palette.mode === 'dark' ? '#666 #222' : '#aaa #ccc',
    '&::-webkit-scrollbar': { width: '6px' },
    '&::-webkit-scrollbar-track': { backgroundColor: theme.palette.mode === 'dark' ? '#222' : '#ccc' },
    '&::-webkit-scrollbar-thumb': { backgroundColor: theme.palette.mode === 'dark' ? '#666' : '#aaa', borderRadius: '4px' },
  };

  const {
    historicalSelectedCharts,
    setHistoricalSelectedCharts,
    historicalSidebarCollapsed,
    setHistoricalSidebarCollapsed,
  } = useContext(ChartSelectionContext);

  const getTitle = (chartType) => {
    for (const group of groupedChartOptions) {
      const found = group.options.find((opt) => opt.value === chartType);
      if (found) return found.label;
    }
    return chartType;
  };

  // Fire resize event after sidebar transitions
  useEffect(() => {
    const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 310);
    return () => clearTimeout(timer);
  }, [historicalSidebarCollapsed]);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Collapsible LEFT SIDEBAR */}
      <Box
        sx={{
          width: historicalSidebarCollapsed ? 50 : 350,
          transition: 'width 0.3s',
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          height: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1,
            borderBottom: 1,
            borderColor: 'divider',
            justifyContent: historicalSidebarCollapsed ? 'center' : 'space-between',
          }}
        >
          {historicalSidebarCollapsed ? (
            <IconButton onClick={() => setHistoricalSidebarCollapsed(false)}>
              <MenuIcon />
            </IconButton>
          ) : (
            <>
              <Typography variant="h6">Graph Selector</Typography>
              <IconButton onClick={() => setHistoricalSidebarCollapsed(true)}>
                <CloseIcon />
              </IconButton>
            </>
          )}
        </Box>
        {!historicalSidebarCollapsed && (
          <Box sx={{ p: 2, overflowY: 'auto', ...scrollbarStyles }}>
            <GraphSelector
              groupedOptions={groupedChartOptions}
              selected={historicalSelectedCharts}
              onChange={setHistoricalSelectedCharts}
            />
          </Box>
        )}
      </Box>

      {/* MAIN CONTENT */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Historical Graphs
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
              overflowX: 'auto',
            }}
          >
            {historicalSelectedCharts.map((type) => {
              const endpoint = `/${type}`;
              const isCellData = type.toLowerCase().includes('cell');
              return (
                <Box key={type} sx={{ gridColumn: isCellData ? 'span 2' : 'auto' }}>
                  <HistoricalChartWrapper
                    endpoint={endpoint}
                    title={getTitle(type)}
                    width="100%"
                    height={isCellData ? 750 : 500}
                  />
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HistoricalCharts;
