import React, { useEffect, useContext, useState, useMemo } from 'react';
import { Box, Typography, IconButton, Paper, Grid, 
  Badge, Alert, Button, Tooltip, useMediaQuery, alpha, 
  FormControl, InputLabel, Select, MenuItem, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { DESIGN_TOKENS } from '../theme';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import GridViewIcon from '@mui/icons-material/GridView';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GraphSelector from '../components/charts/GraphSelector';
import HistoricalChartWrapper from '../components/charts/HistoricalChartWrapper';
import { ChartSelectionContext } from '../contexts/ChartSelectionContext';
import { ChartSettingsContext } from '../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';

// Chart type options from HistoricalCharts.jsx
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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));
  
  // Access context data
  const {
    historicalSelectedCharts,
    historicalSidebarCollapsed,
    setHistoricalSidebarCollapsed,
  } = useContext(ChartSelectionContext);

  const { settings, updateSettings } = useContext(ChartSettingsContext);
  
  // Local state for UI functionality
  const [globalRefreshTrigger, setGlobalRefreshTrigger] = useState(0);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [gridMode, setGridMode] = useState(settings.dashboard?.chartLayout || 'grid');
  const [chartSize, setChartSize] = useState(settings.dashboard?.chartSize || 'medium');
  const [rootRef, rootInView] = useInView();

  // Effect to handle layout modes
  useEffect(() => {
    // Update settings when layout changes
    if (gridMode !== settings.dashboard?.chartLayout) {
      updateSettings('dashboard', 'chartLayout', gridMode);
    }
    
    // Update settings when chart size changes
    if (chartSize !== settings.dashboard?.chartSize) {
      updateSettings('dashboard', 'chartSize', chartSize);
    }
    
    // Force resize event after state changes to ensure charts adjust
    setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
  }, [gridMode, chartSize, settings.dashboard, updateSettings]);

  // Compute chart heights based on size setting
  const chartHeight = useMemo(() => {
    return chartSize === 'large' ? 700 : 480; // Medium is 480px
  }, [chartSize]);

  // Helper to get chart title from chart type
  const getTitle = (chartType) => {
    for (const group of groupedChartOptions) {
      const found = group.options.find((opt) => opt.value === chartType);
      if (found) return found.label;
    }
    return chartType;
  };

  // Helper to check if a chart is for cell data
  const isCellData = (chartType) => {
    return chartType.toLowerCase().includes('cell');
  };

  // Function to refresh all charts
  const refreshAllCharts = () => {
    setRefreshingAll(true);
    setGlobalRefreshTrigger(prev => prev + 1);
    setTimeout(() => setRefreshingAll(false), 1000);
  };

  // Handle chart size change
  const handleChartSizeChange = (event) => {
    setChartSize(event.target.value);
    
    // Force charts to redraw after size change
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      setGlobalRefreshTrigger(prev => prev + 0.1); // Partial increment to trigger refresh without full reload
    }, 150);
  };

  // Handle toggle layout
  const handleToggleLayout = () => {
    setGridMode(prev => prev === 'grid' ? 'list' : 'grid');
  };

  // Fire resize event after sidebar transitions to ensure charts resize correctly
  useEffect(() => {
    // Use timing from theme transition settings
    const transitionDuration = theme.transitions.duration.standard;
    const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), transitionDuration + 10);
    return () => clearTimeout(timer);
  }, [historicalSidebarCollapsed, theme.transitions.duration.standard]);

  return (
    <Box ref={rootRef} sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Collapsible LEFT SIDEBAR */}
      <Box
        sx={{
          width: historicalSidebarCollapsed ? 50 : 350,
          transition: theme.transitions.create('width'),
          borderRight: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
          height: '100%',
          zIndex: DESIGN_TOKENS.zIndex.drawer,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: theme.spacing(1.5),
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
          <Box sx={{ p: theme.spacing(2), overflowY: 'auto' }}>
            <GraphSelector
              groupedOptions={groupedChartOptions}
              viewType="historical"
            />
          </Box>
        )}
      </Box>

      {/* MAIN CONTENT */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflowY: 'auto',
        overflowX: 'hidden',
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)',
      }}>
        {/* Top toolbar with controls */}
        <Box 
          sx={{ 
            borderBottom: 1,
            borderColor: 'divider',
            p: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile && (
              <IconButton onClick={() => setHistoricalSidebarCollapsed(false)}>
                <MenuIcon />
              </IconButton>
            )}

            <Badge badgeContent={historicalSelectedCharts.length} color="primary">
              <Typography variant="h6" sx={{ mr: 1 }}>
                Historical Graphs
              </Typography>
            </Badge>
          </Box>
          
          <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 1,
            }}
          >
            {/* Layout controls - Grid icon and Fullscreen icon */}
            <Tooltip title="Toggle Layout">
              <IconButton onClick={handleToggleLayout} color="primary" sx={{ color: theme.palette.error.main }}>
                <GridViewIcon />
              </IconButton>
            </Tooltip>
            
            
            {/* Chart size dropdown */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="historical-chart-size-label">Chart Size</InputLabel>
              <Select
                labelId="historical-chart-size-label"
                id="historical-chart-size-select"
                value={chartSize}
                label="Chart Size"
                onChange={handleChartSizeChange}
                sx={{ height: 40 }}
              >
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="large">Large</MenuItem>
              </Select>
            </FormControl>
            
            <Divider orientation="vertical" flexItem />
            
            {/* Refresh all button */}
            <Button 
              variant="contained"
              color="primary" 
              startIcon={<RefreshIcon />}
              size="small"
              onClick={refreshAllCharts}
              disabled={refreshingAll}
            >
              Refresh All
            </Button>
          </Box>
        </Box>
        
        {/* No charts selected message */}
        {historicalSelectedCharts.length === 0 && !refreshingAll && (
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: 2,
            p: 2
          }}>
            <Paper
              elevation={3}
              sx={{
                p: 4,
                textAlign: 'center',
                maxWidth: 600,
                borderRadius: 2
              }}
            >
              <AutoAwesomeIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
              <Typography variant="h5" gutterBottom>No Charts Selected</Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Use the sidebar to select historical charts you want to display.
              </Typography>
              <Button
                variant="contained"
                startIcon={<MenuIcon />}
                onClick={() => setHistoricalSidebarCollapsed(false)}
              >
                Open Chart Selector
              </Button>
            </Paper>
          </Box>
        )}
        
        {/* Charts grid */}
        {historicalSelectedCharts.length > 0 && (
          <Box sx={{ p: 2 }}>
            <Grid 
              container 
              spacing={3}  // Increased spacing between charts
              sx={{ 
                width: '100%',
                margin: '0 auto'
              }}
            >
              {historicalSelectedCharts.map((chartType) => {
                const endpoint = `/${chartType}`;
                const isCellChart = isCellData(chartType);
                
                // In list view, all charts take full width
                // In grid view, cell charts always take full width, others take one column based on size
                let colSpan;
                if (gridMode === 'list') {
                  colSpan = 12; // Full width in list view
                } else {
                  // Grid mode logic
                  if (isCellChart) {
                    colSpan = 12; // Cell charts always take full width
                  } else {
                    colSpan = chartSize === 'large' ? 12 : 6;
                  }
                }
                
                // Dynamic height calculation
                let height;
                if (isCellChart) {
                  height = chartHeight * 1.5;
                } else if (gridMode === 'list') {
                  height = Math.floor(chartHeight * 1.1); // Slightly taller in list view
                } else {
                  height = chartHeight;
                }
                
                return (
                  <Grid 
                    item 
                    xs={12}           // Full width on extra small devices
                    sm={colSpan === 6 ? 6 : 12}  // On small devices, maintain sizing
                    md={colSpan}      // Regular sizing for medium+ devices
                    key={chartType}
                    sx={{ 
                      height: `${height}px`,
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.3s ease-in-out',
                    }}
                  >
                    <HistoricalChartWrapper
                      endpoint={endpoint}
                      title={getTitle(chartType)}
                      height="100%" 
                      refreshTrigger={globalRefreshTrigger}
                      pageSize={settings.historical.pageSize}
                      rootInView={rootInView}
                      key={`${chartType}-${chartSize}-${gridMode}`}
                      customStyles={{ 
                        flex: 1, 
                        display: 'flex', 
                        flexDirection: 'column',
                        minHeight: isCellChart ? '400px' : '300px' 
                      }}
                    />
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default HistoricalCharts;