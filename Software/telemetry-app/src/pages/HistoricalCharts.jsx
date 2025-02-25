import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import GraphSelector from '../components/charts/GraphSelector';
import HistoricalChartWrapper from '../components/charts/HistoricalChartWrapper';

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

const defaultSelected = [
  'tcuData',
  'packCurrentData',
  'packVoltageData',
  'cellData',
];

const HistoricalCharts = () => {
  const [selectedCharts, setSelectedCharts] = useState(defaultSelected);

  const getTitle = (chartType) => {
    const found = groupedChartOptions
      .flatMap((grp) => grp.options)
      .find((opt) => opt.value === chartType);
    return found ? found.label : chartType;
  };

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>
      {/* LEFT SIDEBAR */}
      <Box
        sx={{
          width: 300,
          borderRight: '1px solid',
          borderColor: 'divider',
          p: 2,
          bgcolor: 'background.paper',
          overflowY: 'auto',
          height: '100%',
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
        <Box sx={{ p: 2 }}>
          <Typography variant="h4" sx={{ mb: 2 }}>
            Historical Graphs
          </Typography>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(600px, 1fr))',
              gap: 3,
              overflowX: 'auto',
            }}
          >
            {selectedCharts.map((type) => {
              const endpoint = `/${type}`;
              return (
                <HistoricalChartWrapper
                  key={type}
                  endpoint={endpoint}
                  title={getTitle(type)}
                  width="100%"
                  height={500}
                />
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HistoricalCharts;
