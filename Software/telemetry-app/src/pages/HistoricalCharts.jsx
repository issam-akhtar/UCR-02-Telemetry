import React, { useEffect, useContext, useState, useMemo, useCallback, useRef } from 'react';
import {
  Box, Typography, IconButton, Paper, Grid,
  Badge, Button, Tooltip, useMediaQuery,
  FormControl, InputLabel, Select, MenuItem, Divider
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import GridViewIcon from '@mui/icons-material/GridView';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import GraphSelector from '../components/charts/GraphSelector';
import HistoricalChartWrapper from '../components/charts/HistoricalChartWrapper';
import { ChartSelectionContext } from '../contexts/ChartSelectionContext';
import { ChartSettingsContext } from '../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';

// Chart type options - moved outside component to prevent recreation
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

// Create a lookup map for faster title lookups
const chartTitleMap = (() => {
  const map = new Map();
  groupedChartOptions.forEach(group => {
    group.options.forEach(opt => {
      map.set(opt.value, opt.label);
    });
  });
  return map;
})();

// Simple debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const HistoricalCharts = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  // Refs for managing timers and preventing memory leaks
  const resizeTimerRef = useRef(null);
  const refreshTimerRef = useRef(null);
  const chartSizeTimerRef = useRef(null);
  const isFirstRenderRef = useRef(true);
  const prevSettingsRef = useRef({});
  const lastRefreshTimeRef = useRef(0); // Track last refresh time

  // Define scrollbar styles
  const scrollbarStyles = useMemo(() => ({
    '&::-webkit-scrollbar': {
      width: '8px',
      height: '8px',
    },
    '&::-webkit-scrollbar-track': {
      background: '#1A1A1A',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#1E88E5',
      borderRadius: '4px',
    },
    '&::-webkit-scrollbar-thumb:hover': {
      background: '#1976D2',
    },
  }), []);

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
  const [gridMode, setGridMode] = useState(() => settings?.dashboard?.chartLayout || 'grid');
  const [chartSize, setChartSize] = useState(() => settings?.dashboard?.chartSize || 'medium');
  const [rootRef, rootInView] = useInView();

  // Effect to refresh charts when relevant settings change
  useEffect(() => {
    // Skip the first render as we don't want to refresh initially
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      // Store initial settings
      prevSettingsRef.current = {
        historical: { ...settings?.historical },
        global: { ...settings?.global }
      };
      return;
    }

    // Check if relevant settings have changed
    const historicalSettingsChanged =
      settings?.historical?.pageSize !== prevSettingsRef.current?.historical?.pageSize ||
      settings?.historical?.dataZoomEnabled !== prevSettingsRef.current?.historical?.dataZoomEnabled ||
      settings?.historical?.downsampleThreshold !== prevSettingsRef.current?.historical?.downsampleThreshold ||
      settings?.historical?.downsampleFactor !== prevSettingsRef.current?.historical?.downsampleFactor ||
      settings?.historical?.enableSmoothing !== prevSettingsRef.current?.historical?.enableSmoothing ||
      settings?.historical?.maxAxisTicks !== prevSettingsRef.current?.historical?.maxAxisTicks;

    const globalSettingsChanged =
      settings?.global?.theme !== prevSettingsRef.current?.global?.theme ||
      settings?.global?.animationDuration !== prevSettingsRef.current?.global?.animationDuration ||
      settings?.global?.enableTransitions !== prevSettingsRef.current?.global?.enableTransitions;

    // If relevant settings changed, trigger a refresh
    if (historicalSettingsChanged || globalSettingsChanged) {
      console.log('Chart settings changed, refreshing historical charts');

      // Clear any existing refresh timer
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }

      // Trigger refresh with a slight delay to allow settings to propagate
      refreshTimerRef.current = setTimeout(() => {
        // Force charts to resize and redraw
        window.dispatchEvent(new Event('resize'));

        // Increment global refresh trigger to refresh all charts
        triggerRefresh();

        refreshTimerRef.current = null;
      }, 300);
    }

    // Update the ref with current settings
    prevSettingsRef.current = {
      historical: { ...settings?.historical },
      global: { ...settings?.global }
    };

  }, [settings?.historical, settings?.global]);

  // Centralized refresh trigger function with debounce mechanism
  const triggerRefresh = useCallback(() => {
    // Prevent multiple refreshes within 2 seconds
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 2000) {
      console.log('Skipping refresh, too soon since last refresh');
      return;
    }
    
    // Update last refresh time
    lastRefreshTimeRef.current = now;
    
    // Increment the refresh trigger
    setGlobalRefreshTrigger(prev => prev + 1);
  }, []);

  // Effect to handle layout and size changes without causing infinite loops
  useEffect(() => {
    // Check if values have changed compared to stored values
    const prevSettings = prevSettingsRef.current || {};
    const gridModeChanged = gridMode !== prevSettings.chartLayout;
    const chartSizeChanged = chartSize !== prevSettings.chartSize;

    if ((gridModeChanged || chartSizeChanged) && typeof updateSettings === 'function') {
      // Use requestAnimationFrame to batch updates
      requestAnimationFrame(() => {
        if (gridModeChanged) {
          updateSettings('dashboard', 'chartLayout', gridMode);
        }
        if (chartSizeChanged) {
          updateSettings('dashboard', 'chartSize', chartSize);
        }

        // Update ref to current values
        prevSettingsRef.current = {
          ...prevSettings,
          chartLayout: gridMode,
          chartSize: chartSize
        };
      });
    }
  }, [gridMode, chartSize, updateSettings]);

  // Trigger resize when layout or size changes
  useEffect(() => {
    // Clear any existing timer
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
    }

    // Schedule a new resize event
    resizeTimerRef.current = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      resizeTimerRef.current = null;
    }, 150);

    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [gridMode, chartSize]);

  // Compute chart heights based on size setting
  const chartHeight = useMemo(() => {
    return chartSize === 'large' ? 700 : 480; // Medium is 480px
  }, [chartSize]);

  // Helper to get chart title from chart type
  const getTitle = useCallback((chartType) => {
    return chartTitleMap.get(chartType) || chartType;
  }, []);

  // Helper to check if a chart is for cell data
  const isCellData = useCallback((chartType) => {
    return chartType.toLowerCase().includes('cell');
  }, []);

  // Function to refresh all charts with proper cleanup and debouncing
  const refreshAllCharts = useCallback(() => {
    // Skip if already refreshing
    if (refreshingAll) return;
    
    // Clear any existing timer
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    // Prevent multiple refreshes within 2 seconds
    const now = Date.now();
    if (now - lastRefreshTimeRef.current < 2000) {
      console.log('Skipping refresh, too soon since last refresh');
      return;
    }

    setRefreshingAll(true);
    
    // Update last refresh time
    lastRefreshTimeRef.current = now;
    
    // Increment the refresh trigger
    setGlobalRefreshTrigger(prev => prev + 1);

    refreshTimerRef.current = setTimeout(() => {
      setRefreshingAll(false);
      refreshTimerRef.current = null;
    }, 1000);
  }, [refreshingAll]);

  // Handle chart size change with proper cleanup
  const handleChartSizeChange = useCallback((event) => {
    if (!event?.target?.value) return;

    setChartSize(event.target.value);

    // Clear any existing timer
    if (chartSizeTimerRef.current) {
      clearTimeout(chartSizeTimerRef.current);
    }

    // Force charts to redraw after size change
    chartSizeTimerRef.current = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      // Only trigger a partial refresh for size changes
      if (Date.now() - lastRefreshTimeRef.current > 2000) {
        lastRefreshTimeRef.current = Date.now();
        setGlobalRefreshTrigger(prev => prev + 0.1); // Partial increment to trigger refresh without full reload
      }
      chartSizeTimerRef.current = null;
    }, 150);
  }, []);

  // Handle toggle layout
  const handleToggleLayout = useCallback(() => {
    setGridMode(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  // Handle sidebar toggle
  const handleToggleSidebar = useCallback(() => {
    setHistoricalSidebarCollapsed(prev => !prev);
  }, [setHistoricalSidebarCollapsed]);

  // Fire resize event after sidebar transitions to ensure charts resize correctly
  useEffect(() => {
    // Clear any existing timer
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
    }

    // Use timing from theme transition settings
    const transitionDuration = theme.transitions.duration.standard;
    resizeTimerRef.current = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      resizeTimerRef.current = null;
    }, transitionDuration + 50);

    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [historicalSidebarCollapsed, theme.transitions.duration.standard]);

  // Clean up all timers on unmount
  useEffect(() => {
    return () => {
      if (resizeTimerRef.current) clearTimeout(resizeTimerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      if (chartSizeTimerRef.current) clearTimeout(chartSizeTimerRef.current);
    };
  }, []);

  // Memoize the empty state view to prevent unnecessary re-renders
  const emptyStateView = useMemo(() => (
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
        elevation={0}
        sx={{
          p: 5,
          textAlign: 'center',
          maxWidth: 600,
          borderRadius: 2,
          bgcolor: '#212121',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <AutoAwesomeIcon sx={{ 
          fontSize: 48, 
          color: '#FF3B30', 
          mb: 2,
          filter: 'drop-shadow(0 0 8px rgba(255, 59, 48, 0.4))'
        }} />
        <Typography variant="h5" color="white" gutterBottom>No Charts Selected</Typography>
        <Typography 
          variant="body1" 
          color="rgba(255, 255, 255, 0.7)" 
          paragraph
          sx={{ mb: 3 }}
        >
          Use the sidebar to select historical charts you want to display.
        </Typography>
        <Button
          variant="contained"
          startIcon={<MenuIcon />}
          onClick={() => setHistoricalSidebarCollapsed(false)}
          sx={{
            bgcolor: '#FF3B30',
            '&:hover': {
              bgcolor: '#D32F2F',
            },
            textTransform: 'none',
            px: 3,
            py: 1
          }}
        >
          Open Chart Selector
        </Button>
      </Paper>
    </Box>
  ), [setHistoricalSidebarCollapsed]);

  // Memoize sidebar content to prevent unnecessary re-renders
  const sidebarContent = useMemo(() => (
    <Box
      sx={{
        width: historicalSidebarCollapsed ? 60 : 350,
        transition: 'width 0.3s ease',
        borderRight: '1px solid rgba(255, 255, 255, 0.12)',
        bgcolor: '#1A1A1A',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        height: '100%',
        zIndex: 1200,
        ...scrollbarStyles
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: historicalSidebarCollapsed ? 1 : 2,
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          justifyContent: historicalSidebarCollapsed ? 'center' : 'space-between',
        }}
      >
        {historicalSidebarCollapsed ? (
          <IconButton onClick={handleToggleSidebar} sx={{ color: 'white' }}>
            <MenuIcon />
          </IconButton>
        ) : (
          <>
            <Typography variant="h6" sx={{ color: 'white' }}>Graph Selector</Typography>
            <IconButton onClick={handleToggleSidebar} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </>
        )}
      </Box>
      {!historicalSidebarCollapsed && (
        <Box sx={{ p: 0, overflowY: 'auto', flexGrow: 1 }}>
          <GraphSelector
            groupedOptions={groupedChartOptions}
            viewType="historical"
          />
        </Box>
      )}
    </Box>
  ), [
    historicalSidebarCollapsed, 
    handleToggleSidebar,
    scrollbarStyles
  ]);

  // Memoize toolbar content to prevent unnecessary re-renders
  const toolbarContent = useMemo(() => (
    <Box
      sx={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
        p: 1.5,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1,
        backgroundColor: '#1A1A1A',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {isMobile && (
          <IconButton onClick={handleToggleSidebar} sx={{ color: 'white' }}>
            <MenuIcon />
          </IconButton>
        )}

        <Badge 
          badgeContent={historicalSelectedCharts.length} 
          color="error"
          sx={{
            '& .MuiBadge-badge': {
              backgroundColor: '#FF3B30',
              color: 'white'
            }
          }}
        >
          <Typography variant="h6" sx={{ color: 'white', mr: 1 }}>
            Historical Graphs
          </Typography>
        </Badge>
      </Box>

      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.5,
      }}>
        {/* Layout controls - Grid icon */}
        <Tooltip title="Toggle Layout">
          <IconButton onClick={handleToggleLayout} sx={{ color: '#FF3B30' }}>
            <GridViewIcon />
          </IconButton>
        </Tooltip>

        {/* Chart size dropdown */}
        <FormControl 
          size="small" 
          sx={{ 
            minWidth: 120,
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.23)',
              },
              '&:hover fieldset': {
                borderColor: 'rgba(255, 255, 255, 0.4)',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#FF3B30',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'rgba(255, 255, 255, 0.7)',
            },
            '& .MuiSvgIcon-root': {
              color: 'rgba(255, 255, 255, 0.7)',
            }
          }}
        >
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

        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255, 255, 255, 0.12)' }} />

        {/* Refresh all button */}
        <Button
          variant="contained"
          color="primary"
          startIcon={<RefreshIcon />}
          size="small"
          onClick={refreshAllCharts}
          disabled={refreshingAll}
          sx={{
            bgcolor: '#FF3B30',
            '&:hover': {
              bgcolor: '#D32F2F',
            },
            textTransform: 'none'
          }}
        >
          Refresh All
        </Button>
      </Box>
    </Box>
  ), [
    isMobile, 
    historicalSelectedCharts.length, 
    refreshingAll,
    chartSize,
    handleToggleSidebar,
    handleToggleLayout,
    handleChartSizeChange,
    refreshAllCharts
  ]);

  // Calculate the chart layout - memoized to prevent recalculation
  const chartGridLayout = useMemo(() => {
    if (historicalSelectedCharts.length === 0) return null;
    
    return (
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
                pageSize={settings?.historical?.pageSize || 100}
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
    );
  }, [
    historicalSelectedCharts, 
    gridMode, 
    chartSize, 
    chartHeight, 
    getTitle, 
    isCellData, 
    globalRefreshTrigger, 
    settings?.historical?.pageSize,
    rootInView
  ]);

  return (
    <Box ref={rootRef} sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', bgcolor: '#121212' }}>
      {/* Collapsible LEFT SIDEBAR */}
      {sidebarContent}

      {/* MAIN CONTENT */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        overflowX: 'hidden',
        ...scrollbarStyles,
      }}>
        {/* Top toolbar with controls */}
        {toolbarContent}

        {/* No charts selected message */}
        {historicalSelectedCharts.length === 0 && !refreshingAll && emptyStateView}

        {/* Charts grid */}
        {historicalSelectedCharts.length > 0 && (
          <Box sx={{ p: 2 }}>
            {chartGridLayout}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default React.memo(HistoricalCharts);