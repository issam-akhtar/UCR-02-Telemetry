import React, { useRef, useEffect, useState, useMemo, useCallback, useContext } from 'react';
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
import { useTheme, alpha } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
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

// Simple debounce utility
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

const RealTimeCharts = () => {
  const theme = useTheme();
  const { settings, updateSettings } = useContext(ChartSettingsContext);
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  
  // Refs for timers and resources
  const resizeTimerRef = useRef(null);
  
  // Use the chart selection context
  const {
    realTimeSelectedCharts,
    setRealTimeSelectedCharts,
    realTimeSidebarCollapsed,
    setRealTimeSidebarCollapsed,
    savedViews,
    activeView,
  } = useChartSelection();

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

  // Local state
  const [isPaused, setIsPaused] = useState(false);
  const [visibleCharts, setVisibleCharts] = useState(realTimeSelectedCharts);
  const [layoutMode, setLayoutMode] = useState(settings.dashboard?.chartLayout || 'grid');
  const [chartSize, setChartSize] = useState(settings.dashboard?.chartSize || 'medium');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get active view details
  const currentActiveView = useMemo(() => {
    if (!activeView.realTime) return null;
    return savedViews.realTime.find(v => v.id === activeView.realTime);
  }, [activeView.realTime, savedViews.realTime]);

  // Detect low power mode
  const isLowPowerMode = useMemo(() => {
    return (
      localStorage.getItem('forceRaspberryPiMode') === 'true' ||
      navigator.deviceMemory < 4 ||
      navigator.hardwareConcurrency < 4 ||
      /Raspberry Pi/i.test(navigator.userAgent) || 
      /Linux arm/i.test(navigator.userAgent)
    );
  }, []);

  // Effect to update settings when layout or size changes
  useEffect(() => {
    updateSettings('dashboard', 'chartLayout', layoutMode);
  }, [layoutMode, updateSettings]);

  useEffect(() => {
    updateSettings('dashboard', 'chartSize', chartSize);
  }, [chartSize, updateSettings]);

  // Update visible charts when selected charts change
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleCharts(realTimeSelectedCharts);
      setIsLoading(false);
    }, 100);
    return () => clearTimeout(timer);
  }, [realTimeSelectedCharts]);

  // Controls - memoized to prevent recreation on every render
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const handleToggleLayout = useCallback(() => {
    setLayoutMode(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);

  const handleChartSizeChange = useCallback((event) => {
    setChartSize(event.target.value);
  }, []);

  // Get chart title from options
  const getTitle = useCallback((chartType) => {
    for (const group of groupedChartOptions) {
      const found = group.options.find((opt) => opt.value === chartType);
      if (found) return found.label;
    }
    return chartType;
  }, []);

  // Calculate chart height based on size setting
  const getChartHeight = useCallback(() => {
    switch (chartSize) {
      case 'large': return 650;
      case 'medium':
      default: return 500;
    }
  }, [chartSize]);

  // Calculate grid columns based on chart size and layout
  const getGridColumns = useCallback(() => {
    if (layoutMode === 'list') return 1;
    if (isSmallScreen) return 1;

    return chartSize === 'large' ? 1 : 2;
  }, [layoutMode, isSmallScreen, chartSize]);

  // Render chart items for list layout (virtualized for performance)
  const renderChartRow = useCallback(({ index, key, style }) => {
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
  }, [visibleCharts, getTitle, getChartHeight, isPaused]);

  // Fire a resize event after sidebar transitions
  useEffect(() => {
    if (resizeTimerRef.current) {
      clearTimeout(resizeTimerRef.current);
    }
    
    resizeTimerRef.current = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      resizeTimerRef.current = null;
    }, 310);
    
    return () => {
      if (resizeTimerRef.current) {
        clearTimeout(resizeTimerRef.current);
        resizeTimerRef.current = null;
      }
    };
  }, [realTimeSidebarCollapsed]);

  // Set responsive sidebar behavior
  useEffect(() => {
    if (isSmallScreen && !realTimeSidebarCollapsed) {
      setRealTimeSidebarCollapsed(true);
    }
  }, [isSmallScreen, realTimeSidebarCollapsed, setRealTimeSidebarCollapsed]);

  // Empty state message
  const emptyStateMessage = useMemo(() => (
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
          borderRadius: 2,
          bgcolor: '#212121',
          border: '1px solid rgba(255, 255, 255, 0.12)'
        }}
      >
        <AutoAwesomeIcon sx={{ 
          fontSize: 50, 
          color: '#FF3B30', 
          mb: 2,
          filter: 'drop-shadow(0 0 8px rgba(255, 59, 48, 0.4))'
        }} />
        <Typography variant="h5" color="white" gutterBottom>No Charts Selected</Typography>
        <Typography variant="body1" color="rgba(255, 255, 255, 0.7)" paragraph>
          Use the sidebar to select charts you want to display in real-time.
        </Typography>
        <Button
          variant="contained"
          startIcon={<MenuIcon />}
          onClick={() => setRealTimeSidebarCollapsed(false)}
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
  ), [setRealTimeSidebarCollapsed]);

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', bgcolor: '#121212' }}>
      {/* Collapsible LEFT SIDEBAR - as a Drawer on mobile */}
      {isSmallScreen ? (
        <Drawer
          anchor="left"
          open={!realTimeSidebarCollapsed}
          onClose={() => setRealTimeSidebarCollapsed(true)}
          PaperProps={{
            sx: {
              width: 350,
              backgroundColor: '#1A1A1A',
              boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
            }
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6" sx={{ color: 'white' }}>Graph Selector</Typography>
            <IconButton onClick={() => setRealTimeSidebarCollapsed(true)} sx={{ color: 'white' }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <Box sx={{ p: 0, overflowY: 'auto', height: 'calc(100% - 64px)', ...scrollbarStyles }}>
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
            transition: 'width 0.3s ease',
            borderRight: '1px solid rgba(255, 255, 255, 0.12)',
            bgcolor: '#1A1A1A',
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
              p: realTimeSidebarCollapsed ? 1 : 2,
              borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
              justifyContent: realTimeSidebarCollapsed ? 'center' : 'space-between',
            }}
          >
            {realTimeSidebarCollapsed ? (
              <IconButton onClick={() => setRealTimeSidebarCollapsed(false)} sx={{ color: 'white' }}>
                <MenuIcon />
              </IconButton>
            ) : (
              <>
                <Typography variant="h6" sx={{ color: 'white' }}>Graph Selector</Typography>
                <IconButton onClick={() => setRealTimeSidebarCollapsed(true)} sx={{ color: 'white' }}>
                  <CloseIcon />
                </IconButton>
              </>
            )}
          </Box>
          {!realTimeSidebarCollapsed && (
            <Box sx={{ p: 0, overflowY: 'auto', flexGrow: 1, ...scrollbarStyles }}>
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
        bgcolor: '#121212',
      }}>
        {/* Toolbar */}
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
            {isSmallScreen && (
              <IconButton onClick={() => setRealTimeSidebarCollapsed(false)} sx={{ color: 'white' }}>
                <MenuIcon />
              </IconButton>
            )}

            <Badge 
              badgeContent={realTimeSelectedCharts.length} 
              color="error"
              sx={{
                '& .MuiBadge-badge': {
                  backgroundColor: '#FF3B30',
                  color: 'white'
                }
              }}
            >
              <Typography variant="h6" sx={{ color: 'white', mr: 1 }}>Real-Time Graphs</Typography>
            </Badge>
            
            {/* Show active view name if any */}
            {currentActiveView && (
              <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                {currentActiveView.name}
              </Typography>
            )}
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
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

            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255, 255, 255, 0.12)' }} />

            <Button
              variant="contained"
              color="error"
              onClick={togglePause}
              startIcon={isPaused ? <RefreshIcon /> : <CloseIcon />}
              size="small"
              sx={{
                bgcolor: isPaused ? '#357a38' : '#FF3B30',
                '&:hover': {
                  bgcolor: isPaused ? '#2e7031' : '#D32F2F',
                },
                textTransform: 'none'
              }}
            >
              {isPaused ? 'Resume' : 'Pause All'}
            </Button>
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
          {visibleCharts.length === 0 && !isLoading && emptyStateMessage}

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
                    sx={{ borderRadius: 2, bgcolor: 'rgba(255, 255, 255, 0.1)' }}
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

export default React.memo(RealTimeCharts);