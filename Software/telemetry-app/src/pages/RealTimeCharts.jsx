import React, { useRef, useEffect, useContext, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  IconButton,
  Divider,
  Tooltip,
  Badge,
  Grid,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Drawer,
  useMediaQuery,
  Skeleton,
  Fade,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import GridViewIcon from '@mui/icons-material/GridView';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

import GraphSelector from '../components/charts/GraphSelector';
import RealTimeChartWrapper from '../components/charts/RealTimeChartWrapper';
import { useChartSelection } from '../contexts/ChartSelectionContext';
import { ChartSettingsContext } from '../contexts/ChartSettingsContext';
import { AutoSizer, List, WindowScroller } from 'react-virtualized';

// Chart options with categories
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
  const { settings, updateSettings, toggleTheme } = useContext(ChartSettingsContext);
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  // Use the enhanced chart selection context
  const {
    realTimeSelectedCharts,
    setRealTimeSelectedCharts,
    realTimeSidebarCollapsed,
    setRealTimeSidebarCollapsed,
    savedViews,
    loadView,
    activeView,
  } = useChartSelection();

  // Define scrollbar styles based on the current theme
  const scrollbarStyles = {
    scrollbarWidth: 'thin', // Firefox
    scrollbarColor: theme.palette.mode === 'dark' ? '#666 #222' : '#aaa #eee',
    '&::-webkit-scrollbar': { width: '8px' }, // Chrome, Safari
    '&::-webkit-scrollbar-track': { backgroundColor: theme.palette.mode === 'dark' ? '#222' : '#eee' },
    '&::-webkit-scrollbar-thumb': { backgroundColor: theme.palette.mode === 'dark' ? '#666' : '#aaa', borderRadius: '4px' },
  };

  // Local state
  const [isPaused, setIsPaused] = useState(false);
  const [settingsMenuAnchor, setSettingsMenuAnchor] = useState(null);
  const [visibleCharts, setVisibleCharts] = useState(realTimeSelectedCharts);
  const [layoutMode, setLayoutMode] = useState(settings.dashboard.chartLayout || 'grid');
  const [chartSize, setChartSize] = useState(settings.dashboard.chartSize || 'medium');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get active view details
  const currentActiveView = useMemo(() => {
    if (!activeView.realTime) return null;
    return savedViews.realTime.find(v => v.id === activeView.realTime);
  }, [activeView.realTime, savedViews.realTime]);

  // Effect to update settings when layout or size changes
  useEffect(() => {
    updateSettings('dashboard', 'chartLayout', layoutMode);
  }, [layoutMode, updateSettings]);

  useEffect(() => {
    updateSettings('dashboard', 'chartSize', chartSize);
  }, [chartSize, updateSettings]);

  // Update visible charts when selected charts change
  useEffect(() => {
    // Use a slight delay to create a smoother transition
    const timer = setTimeout(() => {
      setVisibleCharts(realTimeSelectedCharts);
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [realTimeSelectedCharts]);

  // Controls
  const togglePause = () => setIsPaused((p) => !p);

  const handleSettingsClick = (event) => {
    setSettingsMenuAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsMenuAnchor(null);
  };

  const handleToggleLayout = () => {
    setLayoutMode(prev => prev === 'grid' ? 'list' : 'grid');
  };

  const handleChartSizeChange = (event) => {
    setChartSize(event.target.value);
  };

  // Detect low power mode from system information or localStorage override
  const isLowPowerMode = useMemo(() => {
    return (
      localStorage.getItem('forceRaspberryPiMode') === 'true' ||
      navigator.deviceMemory < 4 ||
      navigator.hardwareConcurrency < 4 ||
      /Raspberry Pi/i.test(navigator.userAgent) || 
      /Linux arm/i.test(navigator.userAgent)
    );
  }, []);

  // Get chart title from options
  const getTitle = (chartType) => {
    for (const group of groupedChartOptions) {
      const found = group.options.find((opt) => opt.value === chartType);
      if (found) return found.label;
    }
    return chartType;
  };

  // Calculate chart height based on size setting
  const getChartHeight = () => {
    switch (chartSize) {
      case 'large': return 650;
      case 'medium':
      default: return 500;
    }
  };

  // Calculate grid columns based on chart size and layout
  const getGridColumns = () => {
    if (layoutMode === 'list') return 1;

    // For grid mode, adjust columns based on chart size
    if (isSmallScreen) return 1;

    switch (chartSize) {
      case 'large': return 1;
      case 'medium':
      default: return 2;
    }
  };

  // Render chart items for list layout (virtualized for performance)
  const renderChartRow = ({ index, key, style }) => {
    const chartType = visibleCharts[index];
    const title = getTitle(chartType);
    const height = getChartHeight();

    return (
      <div key={key} style={{ ...style, paddingRight: 16, paddingLeft: 16, paddingBottom: 16 }}>
        <RealTimeChartWrapper
          chartType={chartType}
          title={title}
          width="100%"
          height={height}
          isPaused={isPaused}
        />
      </div>
    );
  };

  // Fire a resize event after sidebar transitions so charts fill the new space
  useEffect(() => {
    const timer = setTimeout(() => window.dispatchEvent(new Event('resize')), 310);
    return () => clearTimeout(timer);
  }, [realTimeSidebarCollapsed]);

  // Set responsive sidebar behavior
  useEffect(() => {
    if (isSmallScreen && !realTimeSidebarCollapsed) {
      setRealTimeSidebarCollapsed(true);
    }
  }, [isSmallScreen, realTimeSidebarCollapsed, setRealTimeSidebarCollapsed]);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Collapsible LEFT SIDEBAR - as a Drawer on mobile */}
      {isSmallScreen ? (
        <Drawer
          anchor="left"
          open={!realTimeSidebarCollapsed}
          onClose={() => setRealTimeSidebarCollapsed(true)}
          PaperProps={{
            sx: {
              width: 350,
              backgroundColor: theme.palette.background.paper
            }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              borderBottom: 1,
              borderColor: 'divider',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6">Chart Selector</Typography>
            <IconButton onClick={() => setRealTimeSidebarCollapsed(true)}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ p: 2, overflowY: 'auto', height: 'calc(100% - 64px)', ...scrollbarStyles }}>
            <GraphSelector
              groupedOptions={groupedChartOptions}
              viewType="realTime"
            />
          </Box>
        </Drawer>
      ) : (
        <Box
          sx={{
            width: realTimeSidebarCollapsed ? 60 : 350,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.standard,
            }),
            borderRight: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
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
                <Typography variant="h6">Chart Selector</Typography>
                <IconButton onClick={() => setRealTimeSidebarCollapsed(true)}>
                  <CloseIcon />
                </IconButton>
              </>
            )}
          </Box>
          {!realTimeSidebarCollapsed && (
            <Box sx={{ p: 2, overflowY: 'auto', flexGrow: 1, ...scrollbarStyles }}>
              <GraphSelector
                groupedOptions={groupedChartOptions}
                viewType="realTime"
              />
            </Box>
          )}
        </Box>
      )}

      {/* MAIN CONTENT */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.1)' : 'rgba(0,0,0,0.02)',
      }}>
        {/* Toolbar */}
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
            {isSmallScreen && (
              <IconButton onClick={() => setRealTimeSidebarCollapsed(false)}>
                <MenuIcon />
              </IconButton>
            )}

            <Badge badgeContent={realTimeSelectedCharts.length} color="primary">
              <Typography variant="h6" sx={{ mr: 1 }}>Real-Time Graphs</Typography>
            </Badge>
            
            {/* Show active view name if any */}
            {currentActiveView && (
              <Typography variant="body2" color="text.secondary">
                {currentActiveView.name}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {/* Layout controls - Grid icon and Fullscreen icon */}
            <Tooltip title="Toggle Layout">
              <IconButton onClick={handleToggleLayout} color="primary" sx={{ color: theme.palette.error.main }}>
                <GridViewIcon />
              </IconButton>
            </Tooltip>


            {/* Chart size dropdown */}
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel id="chart-size-label">Chart Size</InputLabel>
              <Select
                labelId="chart-size-label"
                id="chart-size-select"
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

            <Button
              variant="contained"
              color={isPaused ? "primary" : "error"}
              onClick={togglePause}
              startIcon={isPaused ? <RefreshIcon /> : <CloseIcon />}
              size="small"
            >
              {isPaused ? 'Resume' : 'Pause All'}
            </Button>


            {/* Settings menu */}
            <Menu
              anchorEl={settingsMenuAnchor}
              open={Boolean(settingsMenuAnchor)}
              onClose={handleSettingsClose}
              PaperProps={{
                sx: { width: 250 }
              }}
            >
            </Menu>
          </Box>
        </Box>

        {/* Charts container */}
        <Box sx={{
          flex: 1,
          overflowY: isLoading ? 'hidden' : 'auto',
          ...scrollbarStyles,
          p: 2
        }}>
          {/* No charts selected message */}
          {visibleCharts.length === 0 && !isLoading && (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 2
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
                  Use the sidebar to select charts you want to display in real-time.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<MenuIcon />}
                  onClick={() => setRealTimeSidebarCollapsed(false)}
                >
                  Open Chart Selector
                </Button>
              </Paper>
            </Box>
          )}

          {/* Loading state */}
          {isLoading && (
            <Grid container spacing={3}>
              {[1, 2, 3, 4].map((item) => (
                <Grid item xs={12} md={6} key={`skeleton-${item}`}>
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={500}
                    animation="wave"
                    sx={{ borderRadius: 2 }}
                  />
                </Grid>
              ))}
            </Grid>
          )}

          {/* Chart display - Grid Layout */}
          {!isLoading && visibleCharts.length > 0 && layoutMode === 'grid' && (
            <Grid container spacing={3} columns={12}>
              {visibleCharts.map((chartType) => (
                <Grid
                  item
                  xs={12}
                  md={12 / getGridColumns()}
                  key={chartType}
                  sx={{
                    transition: 'all 0.3s ease-in-out'
                  }}
                >
                  <Fade in={true} timeout={500}>
                    <div>
                      <RealTimeChartWrapper
                        chartType={chartType}
                        title={getTitle(chartType)}
                        width="100%"
                        height={getChartHeight()}
                        isPaused={isPaused}
                      />
                    </div>
                  </Fade>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Chart display - List Layout (Virtualized) */}
          {!isLoading && visibleCharts.length > 0 && layoutMode === 'list' && (
            <WindowScroller>
              {({ height, isScrolling, onChildScroll, scrollTop }) => (
                <AutoSizer disableHeight>
                  {({ width }) => (
                    <List
                      autoHeight
                      height={height}
                      isScrolling={isScrolling}
                      onScroll={onChildScroll}
                      rowCount={visibleCharts.length}
                      rowHeight={getChartHeight() + 16} // Add some padding
                      rowRenderer={renderChartRow}
                      scrollTop={scrollTop}
                      width={width}
                      overscanRowCount={2} // Render a couple extra for smoother scrolling
                    />
                  )}
                </AutoSizer>
              )}
            </WindowScroller>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default RealTimeCharts;