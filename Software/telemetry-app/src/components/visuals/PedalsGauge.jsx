import React, {
  useState,
  useEffect,
  useRef,
  memo,
  useContext,
  useCallback,
  useMemo
} from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Grid,
  FormControlLabel,
  Switch,
  useTheme,
  Tooltip,
  LinearProgress,
  linearProgressClasses,
  styled,
  alpha,
  Card,
  CardHeader,
  CardContent,
  Divider
} from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';
import useResizeObserver from 'use-resize-observer';
import { 
  Gauge, 
  ArrowUp, 
  ArrowDown, 
  Info
} from 'lucide-react';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';

// Constants extracted and memoized for better performance
const CONSTANTS = {
  // Baselines for sensor idle values
  SENSOR_BASELINES: {
    APPS1_IDLE: 0.805,
    APPS2_IDLE: 0.772,
    BSE_IDLE: 1.05,
    APPS_MAX: 4.0,
    BSE_MAX: 4.0
  },
  // Pedal thresholds (percentage scale)
  PEDAL_THRESHOLDS: {
    DEADZONE: 0.5,  // Minimum pedal % to consider "active"
    LIGHT: 5,
    MODERATE: 15,
    HEAVY: 30
  },
  // ~60fps limit
  FRAME_RATE_LIMIT: 16,
  // Buffer size for sensor history (reduced for better performance)
  HISTORY_BUFFER_SIZE: 30
};

// Optimized conversion functions with memoized results
const sensorConversions = {
  // Convert raw APPS sensor reading to percentage (0-100%)
  appsToPercentage: (rawValue) => {
    const { APPS1_IDLE, APPS_MAX } = CONSTANTS.SENSOR_BASELINES;
    const normalizedValue = Math.max(0, rawValue - APPS1_IDLE);
    const range = APPS_MAX - APPS1_IDLE;
    return Math.min(100, (normalizedValue / range) * 100);
  },
  
  // Convert raw BSE sensor reading to percentage (0-100%)
  bseToPercentage: (rawValue) => {
    const { BSE_IDLE, BSE_MAX } = CONSTANTS.SENSOR_BASELINES;
    const normalizedValue = Math.max(0, rawValue - BSE_IDLE);
    const range = BSE_MAX - BSE_IDLE;
    return Math.min(100, (normalizedValue / range) * 100);
  }
};

// Optimized ring buffer using TypedArray for better performance
class SensorRingBuffer {
  constructor(size = CONSTANTS.HISTORY_BUFFER_SIZE) {
    this.buffer = new Float32Array(size);
    this.index = 0;
    this.size = size;
    this.isFull = false;
    this._sum = 0; // Track sum for efficient average calculation
  }
  
  add(value) {
    // Update running sum by removing old value and adding new one
    if (this.isFull) {
      this._sum -= this.buffer[this.index];
    }
    this._sum += value;
    
    this.buffer[this.index] = value;
    this.index = (this.index + 1) % this.size;
    if (this.index === 0) this.isFull = true;
  }
  
  getAverage() {
    const count = this.isFull ? this.size : this.index;
    return count > 0 ? this._sum / count : 0;
  }
}

// Custom hook for pedal colors based on theme
const usePedalColors = () => {
  const theme = useTheme();
  
  // Memoize colors to prevent unnecessary recalculations
  return useMemo(() => ({
    APPS: theme.palette.info.main,
    APPS_LIGHT: theme.palette.info.light,
    BSE: theme.palette.error.main,
    BSE_LIGHT: theme.palette.error.light,
    WARNING: theme.palette.warning.main,
    SUCCESS: theme.palette.success.main,
    IDLE: theme.palette.text.secondary,
    TEXT: theme.palette.text.primary,
    TEXT_SECONDARY: theme.palette.text.secondary,
    BACKGROUND: alpha(
      theme.palette.mode === 'dark' 
        ? theme.palette.background.default 
        : theme.palette.background.paper, 
      theme.palette.mode === 'dark' ? 0.95 : 0.95
    ),
    PANEL_BG: alpha(
      theme.palette.mode === 'dark' 
        ? theme.palette.background.default 
        : theme.palette.background.paper, 
      theme.palette.mode === 'dark' ? 0.85 : 0.85
    ),
    BORDER: alpha(
      theme.palette.divider, 
      theme.palette.mode === 'dark' ? 0.5 : 0.6
    )
  }), [theme.palette]);
};

// Optimized function to determine pedal status from sensor values
const computePedalStatus = (avgApps, bse) => {
  const { DEADZONE, LIGHT, MODERATE, HEAVY } = CONSTANTS.PEDAL_THRESHOLDS;
  
  // Both pedals
  if (avgApps > DEADZONE && bse > DEADZONE) {
    return { status: 'warning', desc: 'Both Pedals Active' };
  }
  // Acceleration
  if (avgApps > DEADZONE) {
    if (avgApps > HEAVY) return { status: 'accelerating', desc: 'Heavy Acceleration' };
    if (avgApps > MODERATE) return { status: 'accelerating', desc: 'Moderate Acceleration' };
    if (avgApps > LIGHT) return { status: 'accelerating', desc: 'Light Acceleration' };
    return { status: 'accelerating', desc: 'Minimal Acceleration' };
  }
  // Braking
  if (bse > DEADZONE) {
    if (bse > HEAVY) return { status: 'braking', desc: 'Heavy Braking' };
    if (bse > MODERATE) return { status: 'braking', desc: 'Moderate Braking' };
    if (bse > LIGHT) return { status: 'braking', desc: 'Light Braking' };
    return { status: 'braking', desc: 'Minimal Braking' };
  }
  // Default
  return { status: 'idle', desc: 'No Pedal Input' };
};

// Custom hook for calculating pedal stats with performance optimizations
const usePedalStats = (apps1, apps2, bse) => {
  const [stats, setStats] = useState({
    maxAcceleration: 0,
    maxBrake: 0,
    sensorDeviation: 0,
    appsConsistency: 100,
    avgApps: 0,
    status: { status: 'idle', desc: 'No Pedal Input' }
  });
  
  // Reference to track previous values to avoid unnecessary updates
  const prevValuesRef = useRef({ apps1, apps2, bse });
  const frameRequestRef = useRef(null);
  
  useEffect(() => {
    // Skip updates if values haven't changed significantly (threshold-based)
    const prevValues = prevValuesRef.current;
    if (
      Math.abs(apps1 - prevValues.apps1) < 0.05 &&
      Math.abs(apps2 - prevValues.apps2) < 0.05 &&
      Math.abs(bse - prevValues.bse) < 0.05
    ) {
      return;
    }
    
    // Update previous values
    prevValuesRef.current = { apps1, apps2, bse };
    
    // Cancel any existing animation frame to prevent multiple updates
    if (frameRequestRef.current) {
      cancelAnimationFrame(frameRequestRef.current);
    }
    
    // Schedule stats update in next animation frame for better performance
    frameRequestRef.current = requestAnimationFrame(() => {
      setStats(prev => {
        const avgApps = (apps1 + apps2) / 2;
        const deviation = Math.abs(apps1 - apps2);
        const maxApps = Math.max(apps1, apps2);

        // APPS consistency calculation
        const appsConsistency = maxApps > 5
          ? Math.max(0, 100 - (deviation / maxApps) * 100)
          : 100;
          
        // Get pedal status
        const status = computePedalStatus(avgApps, bse);
        
        // Update stats with optimized logic
        return {
          // Only update max values if they're higher than previous
          maxAcceleration: Math.max(prev.maxAcceleration, avgApps),
          maxBrake: Math.max(prev.maxBrake, bse),
          sensorDeviation: deviation,
          appsConsistency,
          avgApps,
          status
        };
      });
    });
    
    // Cleanup animation frame on unmount or update
    return () => {
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
    };
  }, [apps1, apps2, bse]);
  
  return stats;
};

// Smaller, more compact styled accelerator progress bar with theme integration
const AcceleratorBar = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== 'active'
})(({ theme, active }) => ({
  height: theme.spacing(1),
  borderRadius: theme.shape.borderRadius * 0.5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: alpha(
      theme.palette.mode === 'dark' ? '#fff' : '#000',
      theme.palette.mode === 'dark' ? 0.07 : 0.07
    ),
    boxShadow: theme.palette.mode === 'dark'
      ? `inset 0 1px 2px ${alpha('#000', 0.4)}`
      : `inset 0 1px 2px ${alpha('#000', 0.15)}`
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: theme.shape.borderRadius * 0.5,
    background: active
      ? `linear-gradient(90deg, ${theme.palette.info.light} 0%, ${theme.palette.info.main} 100%)`
      : `linear-gradient(90deg, ${alpha(theme.palette.info.light, 0.5)} 0%, ${alpha(theme.palette.info.main, 0.5)} 100%)`,
    boxShadow: active 
      ? `0 0 6px ${alpha(theme.palette.info.main, 0.7)}, inset 0 -1px 0 ${alpha('#000', 0.1)}` 
      : 'none',
    transition: theme.transitions.create(['transform', 'background', 'box-shadow'], {
      duration: theme.transitions.duration.shortest
    })
  }
}));

// Professional styled brake progress bar with theme integration
const BrakeBar = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== 'active'
})(({ theme, active }) => ({
  height: theme.spacing(1),
  borderRadius: theme.shape.borderRadius * 0.5,
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: alpha(
      theme.palette.mode === 'dark' ? '#fff' : '#000',
      theme.palette.mode === 'dark' ? 0.07 : 0.07
    ),
    boxShadow: theme.palette.mode === 'dark'
      ? `inset 0 1px 2px ${alpha('#000', 0.4)}`
      : `inset 0 1px 2px ${alpha('#000', 0.15)}`
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: theme.shape.borderRadius * 0.5,
    background: active
      ? `linear-gradient(90deg, ${theme.palette.error.light} 0%, ${theme.palette.error.main} 100%)`
      : `linear-gradient(90deg, ${alpha(theme.palette.error.light, 0.5)} 0%, ${alpha(theme.palette.error.main, 0.5)} 100%)`,
    boxShadow: active 
      ? `0 0 6px ${alpha(theme.palette.error.main, 0.7)}, inset 0 -1px 0 ${alpha('#000', 0.1)}` 
      : 'none',
    transition: theme.transitions.create(['transform', 'background', 'box-shadow'], {
      duration: theme.transitions.duration.shortest
    })
  }
}));

// Professional pedal indicator - optimized with memo
const PedalIndicator = memo(({ type, value, active }) => {
  const theme = useTheme();
  const colors = usePedalColors();
  const isAccel = type === 'accelerator';
  const color = isAccel ? colors.APPS : colors.BSE;
  
  // Get animation settings from context
  const { settings } = useContext(ChartSettingsContext);
  const animationsEnabled = settings?.global?.enableTransitions !== false;
  
  // Round value for ARIA attributes
  const roundedValue = Math.round(value);
  const icon = isAccel ? <ArrowUp size={16} /> : <ArrowDown size={16} />;
  
  return (
    <Box
      sx={{
        position: 'relative',
        borderRadius: theme.shape.borderRadius,
        backgroundColor: theme.palette.mode === 'dark'
          ? alpha('#000', 0.3)
          : alpha('#000', 0.03),
        px: theme.spacing(1),
        py: theme.spacing(0.75),
        display: 'flex',
        alignItems: 'center',
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${
          active ? alpha(color, 0.6) : alpha(theme.palette.mode === 'dark' ? '#fff' : '#000', theme.palette.mode === 'dark' ? 0.1 : 0.1)
        }`,
        boxShadow: active
          ? `0 0 8px ${alpha(color, 0.4)}, inset 0 1px 2px ${alpha('#000', 0.1)}`
          : theme.palette.mode === 'dark' 
            ? `inset 0 1px 2px ${alpha('#000', 0.3)}` 
            : `inset 0 1px 2px ${alpha('#000', 0.05)}`,
        height: '40px',
        overflow: 'hidden',
        transition: animationsEnabled ? theme.transitions.create(['border', 'box-shadow', 'background-color'], {
          duration: theme.transitions.duration.short
        }) : 'none',
        ...(active && {
          backgroundColor: theme.palette.mode === 'dark'
            ? alpha(color, 0.1)
            : alpha(color, 0.05),
        })
      }}
      role="meter"
      aria-label={`${isAccel ? 'Accelerator' : 'Brake'} pedal at ${value.toFixed(1)}%`}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={roundedValue}
      aria-valuetext={`${roundedValue}%`}
    >
      <Tooltip title={`${isAccel ? 'Accelerator' : 'Brake'} pedal input`} arrow placement="top" enterDelay={200} leaveDelay={0}>
        <Box sx={{ 
          color: active ? color : theme.palette.text.secondary, 
          opacity: active ? 1 : 0.7,
          display: 'flex',
          alignItems: 'center',
          mr: theme.spacing(0.75),
          transition: animationsEnabled ? theme.transitions.create(['color', 'opacity'], {
            duration: theme.transitions.duration.short
          }) : 'none'
        }}>
          {icon}
        </Box>
      </Tooltip>
      <Box sx={{ 
        flex: 1, 
        minWidth: 0, // Ensure flex item can shrink below content size
        mx: theme.spacing(0.5)
      }}>
        {isAccel ? (
          <AcceleratorBar variant="determinate" value={value} active={active} />
        ) : (
          <BrakeBar variant="determinate" value={value} active={active} />
        )}
      </Box>
      <Typography
        variant="body2"
        sx={{
          fontWeight: active ? theme.typography.fontWeightBold : theme.typography.fontWeightMedium,
          color: active ? color : theme.palette.text.secondary,
          fontSize: '0.8rem',
          ml: theme.spacing(0.75),
          minWidth: 42,
          textAlign: 'right',
          transition: animationsEnabled ? theme.transitions.create('color', {
            duration: theme.transitions.duration.short
          }) : 'none'
        }}
      >
        {value.toFixed(1)}%
      </Typography>
    </Box>
  );
});

PedalIndicator.propTypes = {
  type: PropTypes.oneOf(['accelerator', 'brake']).isRequired,
  value: PropTypes.number.isRequired,
  active: PropTypes.bool.isRequired
};


// Main pedal gauge component with optimization for React-Grid-Layout
const PedalsGauge = () => {
  const theme = useTheme();
  const colors = usePedalColors();
  const { settings } = useContext(ChartSettingsContext);
  
  // Use InView for visibility detection
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  // Use resize observer to make component responsive
  const { ref: resizeRef } = useResizeObserver({
    box: 'border-box'
  });
  
  // State management for pedal values
  const [rawApps1, setRawApps1] = useState(CONSTANTS.SENSOR_BASELINES.APPS1_IDLE);
  const [rawApps2, setRawApps2] = useState(CONSTANTS.SENSOR_BASELINES.APPS2_IDLE);
  const [rawBse, setRawBse] = useState(CONSTANTS.SENSOR_BASELINES.BSE_IDLE);
  
  const [apps1, setApps1] = useState(0);
  const [apps2, setApps2] = useState(0);
  const [bse, setBse] = useState(0);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Calculate pedal stats
  const stats = usePedalStats(apps1, apps2, bse);
  
  // Refs for tracking data and updates
  const lastUpdateTimeRef = useRef(Date.now());
  const frameRequestRef = useRef(null);
  
  // Sensor history buffers for smoothing
  const sensorHistoryRef = useRef({
    apps1: new SensorRingBuffer(),
    apps2: new SensorRingBuffer(),
    bse: new SensorRingBuffer()
  });
  
  // Settings with defaults from context
  const updateInterval = settings?.dashboard?.updateInterval;
  const changeThreshold = settings?.dashboard?.significantChangeThreshold || 0.5;
  
  // Check for animation and hardware acceleration settings
  const animationsEnabled = settings?.global?.enableTransitions !== false;
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;
  
  // Frame limiting for performance
  const shouldUpdateFrame = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastUpdateTimeRef.current;
    if (elapsed >= CONSTANTS.FRAME_RATE_LIMIT) {
      lastUpdateTimeRef.current = now;
      return true;
    }
    return false;
  }, []);
  
  // Determine status color based on current state (memoized)
  const getStatusColor = useCallback(() => {
    switch (stats.status.status) {
      case 'accelerating':
        return colors.APPS;
      case 'braking':
        return colors.BSE;
      case 'warning':
        return colors.WARNING;
      default:
        return colors.IDLE;
    }
  }, [stats.status.status, colors]);
  
  // Process incoming data with optimized approach
  const processData = useCallback((data) => {
    if (!data || !data.fields) return false;
    
    const fields = data.fields;
    
    if (error) setError(null);
    
    // Update sensor history buffers
    if (fields.apps1?.numberValue !== undefined) {
      sensorHistoryRef.current.apps1.add(fields.apps1.numberValue);
    }
    if (fields.apps2?.numberValue !== undefined) {
      sensorHistoryRef.current.apps2.add(fields.apps2.numberValue);
    }
    if (fields.bse?.numberValue !== undefined) {
      sensorHistoryRef.current.bse.add(fields.bse.numberValue);
    }
    
    return true;
  }, [error]);
  
  // Update visual state based on sensor data with optimized performance
  const updateVisualState = useCallback(() => {
    const apps1Buffer = sensorHistoryRef.current.apps1;
    const apps2Buffer = sensorHistoryRef.current.apps2;
    const bseBuffer = sensorHistoryRef.current.bse;
    
    const newApps1Raw = apps1Buffer.getAverage();
    const newApps2Raw = apps2Buffer.getAverage();
    const newBseRaw = bseBuffer.getAverage();
    
    // Only update state if there's a significant change
    if (Math.abs(newApps1Raw - rawApps1) > changeThreshold / 100) {
      setRawApps1(newApps1Raw);
      setApps1(sensorConversions.appsToPercentage(newApps1Raw));
    }
    
    if (Math.abs(newApps2Raw - rawApps2) > changeThreshold / 100) {
      setRawApps2(newApps2Raw);
      setApps2(sensorConversions.appsToPercentage(newApps2Raw));
    }
    
    if (Math.abs(newBseRaw - rawBse) > changeThreshold / 100) {
      setRawBse(newBseRaw);
      setBse(sensorConversions.bseToPercentage(newBseRaw));
    }
    
    if (isLoading) setIsLoading(false);
  }, [rawApps1, rawApps2, rawBse, isLoading, changeThreshold]);
  
  // Handle incoming data with batched updates for better performance
  const handleNewData = useCallback((msg) => {
    // Skip updates if component is not in view
    if (!inView) return;
    
    try {
      if (!processData(msg)) return;
      
      // Throttle visual updates for performance
      if (!shouldUpdateFrame() && !isLoading) return;
      
      // Cancel any existing frame request
      if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current);
      
      // Schedule update in next animation frame
      frameRequestRef.current = requestAnimationFrame(updateVisualState);
    } catch (err) {
      console.error('Error processing pedal data:', err);
      setError('Failed to process pedal input data');
    }
  }, [processData, shouldUpdateFrame, isLoading, updateVisualState, inView]);
  
  // Use real-time data hook to get telemetry updates
  const { ref: dataRef } = useRealTimeData(
    'tcu',
    handleNewData,
    { 
      customInterval: updateInterval,
      threshold: 0.1,
      triggerOnce: false
    }
  );
  
  // Combine refs
  const setRefs = useCallback(node => {
    resizeRef(node);
    inViewRef(node);
    if (dataRef) dataRef(node);
  }, [resizeRef, inViewRef, dataRef]);
  
  // Clean up resources on unmount
  useEffect(() => {
    return () => {
      if (frameRequestRef.current) cancelAnimationFrame(frameRequestRef.current);
    };
  }, []);
  
  // Computed values for UI
  const sensorDeviationPercent = Math.min(100, stats.sensorDeviation * 10);
  const statusColor = getStatusColor();
  
  return (
    <Card
      ref={setRefs}
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: theme.shape.borderRadius,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: theme.palette.background.paper,
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(
          theme.palette.primary.main, 
          theme.palette.mode === 'dark' ? 0.2 : 0.1
        )}`,
        position: 'relative',
        transition: animationsEnabled ? theme.transitions.create(['border', 'background-color', 'box-shadow'], {
          duration: theme.transitions.duration.short
        }) : 'none',
        boxShadow: theme.custom?.shadows?.md,
        transform: hardwareAcceleration ? 'translateZ(0)' : 'none'
      }}
      role="region"
      aria-label="Pedal inputs monitor"
    >
      {/* Professional header */}
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
            <Gauge size={20} color={theme.palette.primary.main} />
            <Typography
              variant="h6"
              sx={{ fontWeight: theme.typography.fontWeightMedium,
                lineHeight: 1.2,
                m: 0.5
               }}
            >
              Pedal Inputs
            </Typography>
          </Box>
        }
        sx={{
          p: theme.spacing(0.5),
          backgroundColor: theme.palette.mode === 'dark' 
            ? alpha(theme.palette.background.subtle, 0.4) 
            : alpha(theme.palette.primary.main, 0.02),
          borderBottom: `1px solid ${alpha(
            theme.palette.primary.main,
            theme.palette.mode === 'dark' ? 0.1 : 0.05
          )}`,
          '& .MuiCardHeader-action': {
            p: theme.spacing(0.5),
            m: 0,
            alignSelf: 'center'
          }
        }}
      />
      <Divider />

      {/* Main content */}
      <CardContent
        sx={{ 
          p: theme.spacing(1.5), 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: inView ? 'auto' : 'hidden', // Allow scrolling only when in view
          '&:last-child': {
            pb: theme.spacing(1.5),
          }
        }}
      >
        {!inView ? (
          // Minimal content when not in view
          <Box 
            sx={{ 
              flex: 1, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              textAlign: 'center',
              color: theme.palette.text.secondary
            }}
          >
            <Typography variant="body2">
              Pedal data monitoring paused
            </Typography>
          </Box>
        ) : isLoading ? (
          // Simple loading state
          <Box 
            sx={{ 
              flex: 1, 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <Typography variant="body1">
              Loading...
            </Typography>
          </Box>
        ) : (
          // Full content when in view
          <>
            {/* Professional gauge bars with side-by-side layout */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'row', 
              mb: theme.spacing(1.25), 
              gap: theme.spacing(1),
              flexShrink: 0
            }}>
              <Box sx={{ flex: 1 }}>
                <PedalIndicator
                  type="accelerator"
                  value={stats.avgApps}
                  active={stats.status.status === 'accelerating' || stats.status.status === 'warning'}
                />
              </Box>
              <Box sx={{ flex: 1 }}>
                <PedalIndicator
                  type="brake"
                  value={bse}
                  active={stats.status.status === 'braking' || stats.status.status === 'warning'}
                />
              </Box>
            </Box>

            {/* Professional layout for sensor readings and analytics */}
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: theme.spacing(1), 
              width: '100%',
              flex: 1,
              overflow: 'hidden' // Prevent any overflow issues
            }}>
              {/* Professional Sensor Readings section */}
              <Box
                sx={{
                  backgroundColor: theme.palette.mode === 'dark'
                    ? alpha(theme.palette.background.subtle, 0.4)
                    : alpha(theme.palette.background.paper, 0.8),
                  borderRadius: theme.shape.borderRadius,
                  border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(
                    theme.palette.primary.main,
                    theme.palette.mode === 'dark' ? 0.15 : 0.1
                  )}`,
                  p: theme.spacing(1),
                  boxShadow: theme.palette.mode === 'dark'
                    ? `0 2px 4px ${alpha('#000', 0.2)}`
                    : `0 2px 4px ${alpha('#000', 0.05)}`,
                  transition: animationsEnabled ? theme.transitions.create(['box-shadow', 'border-color'], {
                    duration: theme.transitions.duration.standard
                  }) : 'none'
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{ 
                    color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
                    fontSize: '0.75rem',
                    flexShrink: 0,
                    mb: theme.spacing(0.75),
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing(0.5),
                    fontWeight: theme.typography.fontWeightSemiBold,
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    borderBottom: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(
                      theme.palette.primary.main, 
                      theme.palette.mode === 'dark' ? 0.15 : 0.1
                    )}`,
                    paddingBottom: theme.spacing(0.5)
                  }}
                >
                  <Info size={14} /> Sensor Readings
                </Typography>
                
                <Box sx={{ 
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: theme.spacing(0.75)
                }}>
                  {/* APPS1 */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: theme.spacing(0.5),
                    px: theme.spacing(0.5),
                    py: theme.spacing(0.35),
                    borderRadius: theme.shape.borderRadius,
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.background.default, 0.4) 
                      : alpha(theme.palette.background.subtle, 0.5),
                    border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(
                      theme.palette.info.main, 
                      theme.palette.mode === 'dark' ? 0.2 : 0.1
                    )}`,
                    boxShadow: `inset 0 1px 2px ${alpha('#000', 0.05)}`,
                    transition: animationsEnabled ? theme.transitions.create(['background-color', 'border-color'], {
                      duration: theme.transitions.duration.short
                    }) : 'none'
                  }}>
                    <Box sx={{ 
                      bgcolor: colors.APPS, 
                      borderRadius: '50%', 
                      p: theme.spacing(0.5), 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: `0 1px 2px ${alpha('#000', 0.2)}`
                    }}>
                      <ArrowUp size={10} color="white" />
                    </Box>
                    <Typography variant="caption" sx={{ 
                      color: colors.APPS, 
                      fontSize: '0.7rem',
                      fontWeight: theme.typography.fontWeightSemiBold
                    }}>
                      APPS1:
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.75rem', 
                      fontWeight: theme.typography.fontWeightMedium,
                      ml: 'auto',
                      color: apps1 > 5 ? colors.APPS : theme.palette.text.primary,
                      transition: animationsEnabled ? theme.transitions.create('color', {
                        duration: theme.transitions.duration.shortest
                      }) : 'none'
                    }}>
                      {`${apps1.toFixed(1)}%`}
                    </Typography>
                  </Box>
                  
                  {/* APPS2 */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: theme.spacing(0.5),
                    px: theme.spacing(0.5),
                    py: theme.spacing(0.35),
                    borderRadius: theme.shape.borderRadius,
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.background.default, 0.4) 
                      : alpha(theme.palette.background.subtle, 0.5),
                    border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(
                      theme.palette.info.main, 
                      theme.palette.mode === 'dark' ? 0.2 : 0.1
                    )}`,
                    boxShadow: `inset 0 1px 2px ${alpha('#000', 0.05)}`,
                    transition: animationsEnabled ? theme.transitions.create(['background-color', 'border-color'], {
                      duration: theme.transitions.duration.short
                    }) : 'none'
                  }}>
                    <Box sx={{ 
                      bgcolor: colors.APPS, 
                      borderRadius: '50%', 
                      p: theme.spacing(0.5), 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: `0 1px 2px ${alpha('#000', 0.2)}`
                    }}>
                      <ArrowUp size={10} color="white" />
                    </Box>
                    <Typography variant="caption" sx={{ 
                      color: colors.APPS, 
                      fontSize: '0.7rem',
                      fontWeight: theme.typography.fontWeightSemiBold
                    }}>
                      APPS2:
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.75rem', 
                      fontWeight: theme.typography.fontWeightMedium,
                      ml: 'auto',
                      color: apps2 > 5 ? colors.APPS : theme.palette.text.primary,
                      transition: animationsEnabled ? theme.transitions.create('color', {
                        duration: theme.transitions.duration.shortest
                      }) : 'none'
                    }}>
                      {`${apps2.toFixed(1)}%`}
                    </Typography>
                  </Box>
                  
                  {/* Brake */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: theme.spacing(0.5),
                    px: theme.spacing(0.5),
                    py: theme.spacing(0.35),
                    borderRadius: theme.shape.borderRadius,
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.background.default, 0.4) 
                      : alpha(theme.palette.background.subtle, 0.5),
                    border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(
                      theme.palette.error.main, 
                      theme.palette.mode === 'dark' ? 0.2 : 0.1
                    )}`,
                    boxShadow: `inset 0 1px 2px ${alpha('#000', 0.05)}`,
                    transition: animationsEnabled ? theme.transitions.create(['background-color', 'border-color'], {
                      duration: theme.transitions.duration.short
                    }) : 'none'
                  }}>
                    <Box sx={{ 
                      bgcolor: colors.BSE, 
                      borderRadius: '50%', 
                      p: theme.spacing(0.5), 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: `0 1px 2px ${alpha('#000', 0.2)}`
                    }}>
                      <ArrowDown size={10} color="white" />
                    </Box>
                    <Typography variant="caption" sx={{ 
                      color: colors.BSE, 
                      fontSize: '0.7rem',
                      fontWeight: theme.typography.fontWeightSemiBold
                    }}>
                      Brake:
                    </Typography>
                    <Typography variant="body2" sx={{ 
                      fontSize: '0.75rem', 
                      fontWeight: theme.typography.fontWeightMedium,
                      ml: 'auto',
                      color: bse > 5 ? colors.BSE : theme.palette.text.primary,
                      transition: animationsEnabled ? theme.transitions.create('color', {
                        duration: theme.transitions.duration.shortest
                      }) : 'none'
                    }}>
                      {`${bse.toFixed(1)}%`}
                    </Typography>
                  </Box>
                  
                  {/* Max Values */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: theme.spacing(0.5),
                    px: theme.spacing(0.5),
                    py: theme.spacing(0.35),
                    borderRadius: theme.shape.borderRadius,
                    backgroundColor: theme.palette.mode === 'dark' 
                      ? alpha(theme.palette.background.default, 0.4) 
                      : alpha(theme.palette.background.subtle, 0.5),
                    border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(
                      theme.palette.primary.main, 
                      theme.palette.mode === 'dark' ? 0.2 : 0.1
                    )}`,
                    boxShadow: `inset 0 1px 2px ${alpha('#000', 0.05)}`,
                    transition: animationsEnabled ? theme.transitions.create(['background-color', 'border-color'], {
                      duration: theme.transitions.duration.short
                    }) : 'none'
                  }}>
                    <Box sx={{ 
                      bgcolor: theme.palette.info.main, 
                      borderRadius: '50%', 
                      p: theme.spacing(0.5), 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      boxShadow: `0 1px 2px ${alpha('#000', 0.2)}`
                    }}>
                      <Info size={10} color="white" />
                    </Box>
                    <Typography variant="caption" sx={{ 
                      color: theme.palette.info.main, 
                      fontSize: '0.7rem',
                      fontWeight: theme.typography.fontWeightSemiBold
                    }}>
                      Max:
                    </Typography>
                    <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: theme.spacing(0.75) }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(0.25) }}>
                        <ArrowUp size={10} color={colors.APPS} />
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.75rem', 
                          color: colors.APPS, 
                          fontWeight: theme.typography.fontWeightMedium 
                        }}>
                          {`${stats.maxAcceleration.toFixed(1)}%`}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(0.25) }}>
                        <ArrowDown size={10} color={colors.BSE} />
                        <Typography variant="body2" sx={{ 
                          fontSize: '0.75rem', 
                          color: colors.BSE, 
                          fontWeight: theme.typography.fontWeightMedium 
                        }}>
                          {`${stats.maxBrake.toFixed(1)}%`}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                
                {/* Metrics with progress bars */}
                <Box sx={{ mt: theme.spacing(0.75), display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing(0.75) }}>
                  {/* Deviation */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ 
                        color: theme.palette.text.secondary, 
                        fontSize: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing(0.25)
                      }}>
                        <Info size={10} /> Deviation
                      </Typography>
                      <Box sx={{ 
                        bgcolor: stats.sensorDeviation > 8 
                          ? alpha(theme.palette.error.main, 0.2)
                          : stats.sensorDeviation > 3 
                            ? alpha(theme.palette.warning.main, 0.2)
                            : alpha(theme.palette.info.main, 0.2),
                        px: theme.spacing(0.75),
                        py: theme.spacing(0.15),
                        borderRadius: theme.shape.borderRadius,
                        display: 'inline-block'
                      }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color:
                              stats.sensorDeviation > 8
                                ? theme.palette.error.main
                                : stats.sensorDeviation > 3
                                ? theme.palette.warning.main
                                : theme.palette.info.main,
                            fontSize: '0.7rem',
                            fontWeight: theme.typography.fontWeightSemiBold
                          }}
                        >
                          {`${stats.sensorDeviation.toFixed(1)}%`}
                        </Typography>
                      </Box>
                    </Box>
                    <Tooltip title={`Difference between APPS1 and APPS2: ${stats.sensorDeviation.toFixed(1)}%`} arrow>
                      <LinearProgress
                        variant="determinate"
                        value={sensorDeviationPercent}
                        sx={{
                          height: theme.spacing(0.5),
                          borderRadius: theme.shape.borderRadius,
                          mt: theme.spacing(0.25),
                          backgroundColor: alpha(
                            theme.palette.mode === 'dark' ? '#fff' : '#000',
                            theme.palette.mode === 'dark' ? 0.08 : 0.08
                          ),
                          boxShadow: `inset 0 1px 2px ${alpha('#000', 0.1)}`,
                          '& .MuiLinearProgress-bar': {
                            borderRadius: theme.shape.borderRadius,
                            backgroundImage:
                              stats.sensorDeviation > 8
                                ? `linear-gradient(90deg, ${theme.palette.error.light} 0%, ${theme.palette.error.main} 100%)`
                                : stats.sensorDeviation > 3
                                ? `linear-gradient(90deg, ${theme.palette.warning.light} 0%, ${theme.palette.warning.main} 100%)`
                                : `linear-gradient(90deg, ${theme.palette.info.light} 0%, ${theme.palette.info.main} 100%)`,
                            boxShadow: stats.sensorDeviation > 3 ? `0 0 4px ${alpha('#000', 0.2)}` : 'none',
                            transition: animationsEnabled ? theme.transitions.create(['transform', 'background-image'], {
                              duration: theme.transitions.duration.short
                            }) : 'none'
                          }
                        }}
                      />
                    </Tooltip>
                  </Box>
                  
                  {/* Consistency */}
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ 
                        color: theme.palette.text.secondary, 
                        fontSize: '0.65rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing(0.25)
                      }}>
                        <Info size={10} /> Consistency
                      </Typography>
                      <Box sx={{ 
                        bgcolor: stats.appsConsistency < 80 
                          ? alpha(theme.palette.error.main, 0.2)
                          : stats.appsConsistency < 90 
                            ? alpha(theme.palette.warning.main, 0.2)
                            : alpha(theme.palette.success.main, 0.2),
                        px: theme.spacing(0.75),
                        py: theme.spacing(0.15),
                        borderRadius: theme.shape.borderRadius,
                        display: 'inline-block'
                      }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color:
                              stats.appsConsistency < 80
                                ? theme.palette.error.main
                                : stats.appsConsistency < 90
                                ? theme.palette.warning.main
                                : theme.palette.success.main,
                            fontSize: '0.7rem',
                            fontWeight: theme.typography.fontWeightSemiBold
                          }}
                        >
                          {`${stats.appsConsistency.toFixed(1)}%`}
                        </Typography>
                      </Box>
                    </Box>
                    <Tooltip title={`APPS sensor consistency: ${stats.appsConsistency.toFixed(1)}%`} arrow>
                      <LinearProgress
                        variant="determinate"
                        value={stats.appsConsistency}
                        sx={{
                          height: theme.spacing(0.5),
                          borderRadius: theme.shape.borderRadius,
                          mt: theme.spacing(0.25),
                          backgroundColor: alpha(
                            theme.palette.mode === 'dark' ? '#fff' : '#000',
                            theme.palette.mode === 'dark' ? 0.08 : 0.08
                          ),
                          boxShadow: `inset 0 1px 2px ${alpha('#000', 0.1)}`,
                          '& .MuiLinearProgress-bar': {
                            borderRadius: theme.shape.borderRadius,
                            backgroundImage:
                              stats.appsConsistency < 80
                                ? `linear-gradient(90deg, ${theme.palette.error.light} 0%, ${theme.palette.error.main} 100%)`
                                : stats.appsConsistency < 90
                                ? `linear-gradient(90deg, ${theme.palette.warning.light} 0%, ${theme.palette.warning.main} 100%)`
                                : `linear-gradient(90deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`,
                            boxShadow: stats.appsConsistency < 90 
                              ? `0 0 4px ${alpha('#000', 0.2)}` 
                              : `0 0 6px ${alpha('#008000', 0.2)}`,
                            transition: animationsEnabled ? theme.transitions.create(['transform', 'background-image'], {
                              duration: theme.transitions.duration.short
                            }) : 'none'
                          }
                        }}
                      />
                    </Tooltip>
                  </Box>
                </Box>
              </Box>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(PedalsGauge);