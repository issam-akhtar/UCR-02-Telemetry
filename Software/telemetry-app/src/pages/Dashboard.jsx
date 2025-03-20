// Dashboard.jsx
import React, { memo, useState, useContext, useMemo, useEffect, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useTheme } from '@mui/material/styles';
import { Box, useMediaQuery } from '@mui/material';
import { ChartSettingsContext } from '../contexts/ChartSettingsContext';

// Import components
import RaceCarTelemetry from '../components/caroverview/RaceCarTelemetry';
import SoCIndicator from '../components/visuals/SoCIndicator';
import LiveGPSMap from '../components/visuals/LiveGPSMap';
import CellHeatmap from '../components/visuals/CellHeatmap';
import SpeedometerGauge from '../components/visuals/SpeedometerGauge';
import PedalsGauge from '../components/visuals/PedalsGauge';
import MotorControllerTempGauge from '../components/visuals/MotorControllerTempGauge';
import WeatherVisual from '../components/visuals/Weather';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Dashboard = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const scrollContainerRef = useRef(null);

  const animationsEnabled = useMemo(
    () => settings.global.animationDuration > 0 && settings.global.enableTransitions,
    [settings.global.animationDuration, settings.global.enableTransitions]
  );

  const animationDuration = useMemo(
    () => `${settings.global.animationDuration}ms`,
    [settings.global.animationDuration]
  );

  const useHardwareAcceleration = useMemo(
    () => settings.global.enableHardwareAcceleration,
    [settings.global.enableHardwareAcceleration]
  );

  const defaultLayouts = useMemo(() => ({
    lg: [
      { i: 'soc-indicator', x: 0, y: 0, w: 8, h: 6 },
      { i: 'speedometer-gauge', x: 22, y: 0, w: 8, h: 8 },
      { i: 'motor-controller-temp-gauge', x: 0, y: 5, w: 8, h: 10 },
      { i: 'car-overview', x: 8, y: 0, w: 14, h: 16 },
      { i: 'live-gps-map', x: 22, y: 8, w: 8, h: 8 },
      { i: 'pedals', x: 0, y: 16, w: 12, h: 5.5 },
      { i: 'cell-heatmap', x: 12, y: 16, w: 18, h: 15 },
      { i: 'weather-visual', x: 0, y: 21, w: 12, h: 9.5 }
    ],
    md: [
      { i: 'soc-indicator', x: 0, y: 0, w: 6, h: 6 },
      { i: 'speedometer-gauge', x: 18, y: 0, w: 7, h: 8 },
      { i: 'motor-controller-temp-gauge', x: 0, y: 6, w: 6, h: 10 },
      { i: 'car-overview', x: 6, y: 0, w: 12, h: 16 },
      { i: 'live-gps-map', x: 18, y: 8, w: 7, h: 8 },
      { i: 'pedals', x: 0, y: 16, w: 10, h: 5.5 },
      { i: 'cell-heatmap', x: 10, y: 16, w: 15, h: 15 },
      { i: 'weather-visual', x: 0, y: 21, w: 10, h: 9.5 }
    ],
    sm: [
      { i: 'soc-indicator', x: 0, y: 0, w: 7, h: 6 },
      { i: 'speedometer-gauge', x: 7, y: 0, w: 8, h: 6 },
      { i: 'motor-controller-temp-gauge', x: 0, y: 6, w: 7, h: 8 },
      { i: 'car-overview', x: 0, y: 14, w: 15, h: 16 },
      { i: 'live-gps-map', x: 7, y: 6, w: 8, h: 8 },
      { i: 'pedals', x: 0, y: 30, w: 15, h: 5.5 },
      { i: 'cell-heatmap', x: 0, y: 35.5, w: 15, h: 12 },
      { i: 'weather-visual', x: 0, y: 47.5, w: 15, h: 8 }
    ],
    xs: [
      { i: 'soc-indicator', x: 0, y: 0, w: 10, h: 6 },
      { i: 'speedometer-gauge', x: 0, y: 6, w: 10, h: 6 },
      { i: 'motor-controller-temp-gauge', x: 0, y: 12, w: 10, h: 8 },
      { i: 'car-overview', x: 0, y: 20, w: 10, h: 16 },
      { i: 'live-gps-map', x: 0, y: 36, w: 10, h: 8 },
      { i: 'pedals', x: 0, y: 44, w: 10, h: 5.5 },
      { i: 'cell-heatmap', x: 0, y: 49.5, w: 10, h: 12 },
      { i: 'weather-visual', x: 0, y: 61.5, w: 10, h: 8 }
    ],
  }), []);

  const [layouts, setLayouts] = useState(defaultLayouts);

  const onLayoutChange = (currentLayout, allLayouts) => {
    setLayouts(allLayouts);
  };

  const rowHeight = useMemo(() => (isMobile ? 35 : 40), [isMobile]);
  const layoutMargin = useMemo(() => (isMobile ? [5, 5] : [10, 10]), [isMobile]);
  const containerPadding = useMemo(() => (isMobile ? [5, 5] : [10, 10]), [isMobile]);

  const getMaxGridHeight = useMemo(() => {
    if (!layouts.lg) return 0;
    
    const maxItemBottom = layouts.lg.reduce((maxHeight, item) => {
      const verticalMargin = layoutMargin[1];
      const itemBottom = 
        (item.y + item.h) * rowHeight + 
        (item.y + item.h - 1) * verticalMargin;
      return Math.max(maxHeight, itemBottom);
    }, 0);
    
    const totalPadding = containerPadding[1] * 2;
    return maxItemBottom + totalPadding + 50;
  }, [layouts.lg, rowHeight, layoutMargin, containerPadding]);

  useEffect(() => {
    const ensureFullVisibility = () => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.style.minHeight = `${getMaxGridHeight}px`;
      }
    };
    
    ensureFullVisibility();
    const timeoutId = setTimeout(ensureFullVisibility, 100);
    return () => clearTimeout(timeoutId);
  }, [getMaxGridHeight, layouts]);

  return (
    <Box
      sx={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.background.default,
        p: { xs: 1, sm: 1.5 },
        transition: animationsEnabled ? `background-color ${animationDuration}` : 'none',
        willChange: useHardwareAcceleration ? 'background-color' : 'auto',
        height: '100vh',
        overflow: 'auto',
      }}
      role="main"
      aria-label="Vehicle Telemetry Dashboard"
    >
      {/* Scrollable Container */}
      <Box 
        ref={scrollContainerRef}
        sx={{
          flex: 1,
          overflow: 'auto',
          width: '100%',
          height: '100%', 
          position: 'relative',
        }}
        data-testid="dashboard-scroll-container"
      >
        <Box 
          sx={{ 
            minHeight: `${getMaxGridHeight}px`,
            width: '100%',
            position: 'relative',
          }}
          data-testid="dashboard-height-container"
        >
          <ResponsiveGridLayout
            className="dashboard-layout"
            layouts={layouts}
            breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
            cols={{ lg: 30, md: 25, sm: 15, xs: 10 }}
            rowHeight={rowHeight}
            margin={layoutMargin}
            containerPadding={containerPadding}
            isDraggable={false}
            isResizable={false}
            useCSSTransforms={useHardwareAcceleration}
            measureBeforeMount={false}
            compactType={null}
            preventCollision
            onLayoutChange={onLayoutChange}
            style={{
              width: '100%',
              transition: animationsEnabled ? `all ${animationDuration}` : 'none',
            }}
          >
            <div key="soc-indicator" style={{ height: '100%', willChange: useHardwareAcceleration ? 'transform' : 'auto' }}>
              <SoCIndicator />
            </div>
            
            <div key="speedometer-gauge" style={{ height: '100%', willChange: useHardwareAcceleration ? 'transform' : 'auto' }}>
              <SpeedometerGauge />
            </div>

            <div key="motor-controller-temp-gauge" style={{ height: '100%', willChange: useHardwareAcceleration ? 'transform' : 'auto' }}>
              <MotorControllerTempGauge />
            </div>

            <div key="car-overview" style={{ height: '100%', willChange: useHardwareAcceleration ? 'transform' : 'auto' }}>
              <RaceCarTelemetry />
            </div>

            <div key="live-gps-map" style={{ height: '100%', willChange: useHardwareAcceleration ? 'transform' : 'auto' }}>
              <LiveGPSMap />
            </div>

            <div key="pedals" style={{ height: '100%', willChange: useHardwareAcceleration ? 'transform' : 'auto' }}>
              <PedalsGauge />
            </div>

            <div key="cell-heatmap" style={{ height: '100%', willChange: useHardwareAcceleration ? 'transform' : 'auto' }}>
              <CellHeatmap />
            </div>

            <div key="weather-visual" style={{ height: '100%', willChange: useHardwareAcceleration ? 'transform' : 'auto' }}>
              <WeatherVisual />
            </div>
          </ResponsiveGridLayout>
        </Box>
      </Box>
    </Box>
  );
};

export default memo(Dashboard);