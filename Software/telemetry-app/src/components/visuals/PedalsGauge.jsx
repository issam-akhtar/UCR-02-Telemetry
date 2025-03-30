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
import { 
  Gauge, 
  ArrowUp, 
  ArrowDown, 
  Info
} from 'lucide-react';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';

// Constants - moved outside component to prevent recreation
const CONSTANTS = {
  SENSOR_BASELINES: {
    APPS1_IDLE: 0.5,
    APPS2_IDLE: 0.5,
    BSE_IDLE: 0.5,
    APPS_MAX: 100.0,
    BSE_MAX: 100.0
  },
  PEDAL_THRESHOLDS: {
    DEADZONE: 1.0,
    LIGHT: 5,
    MODERATE: 15,
    HEAVY: 30
  },
  FRAME_RATE_LIMIT: 16,
  HISTORY_BUFFER_SIZE: 10 // Reduced for better performance
};

// Optimized sensor conversion functions
const sensorConversions = {
  appsToPercentage: (rawValue) => Math.min(100, Math.max(0, rawValue)),
  bseToPercentage: (rawValue) => Math.min(100, Math.max(0, rawValue * 20))
};

// Optimized ring buffer for sensor smoothing
class SensorRingBuffer {
  constructor(size = CONSTANTS.HISTORY_BUFFER_SIZE) {
    this.buffer = new Float32Array(size);
    this.index = 0;
    this.size = size;
    this.isFull = false;
    this._sum = 0;
  }
  
  add(value) {
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

// Helper function to determine pedal status
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

// Styled components - defined outside component to prevent recreation
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
      : 'none'
  }
}));

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
      : 'none'
  }
}));

// Pedal indicator component - memoized for performance
const PedalIndicator = memo(({ type, value, active }) => {
  const theme = useTheme();
  const isAccel = type === 'accelerator';
  const color = isAccel ? theme.palette.info.main : theme.palette.error.main;
  const { settings } = useContext(ChartSettingsContext);
  const animationsEnabled = settings?.global?.enableTransitions !== false;
  const roundedValue = Math.round(value);
  
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
      <Tooltip title={`${isAccel ? 'Accelerator' : 'Brake'} pedal input`} arrow placement="top">
        <Box sx={{ 
          color: active ? color : theme.palette.text.secondary, 
          opacity: active ? 1 : 0.7,
          display: 'flex',
          alignItems: 'center',
          mr: theme.spacing(0.75)
        }}>
          {isAccel ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
        </Box>
      </Tooltip>
      <Box sx={{ 
        flex: 1, 
        minWidth: 0,
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
          textAlign: 'right'
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

// Optimized SensorValue component for consistent rendering
const SensorValue = memo(({ label, value, icon, color, isActive }) => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: theme.spacing(0.5),
      px: theme.spacing(0.5),
      py: theme.spacing(0.35),
      borderRadius: theme.shape.borderRadius,
      backgroundColor: theme.palette.mode === 'dark' 
        ? alpha(theme.palette.background.default, 0.4) 
        : alpha(theme.palette.background.paper, 0.5),
      border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(
        color, 
        theme.palette.mode === 'dark' ? 0.2 : 0.1
      )}`,
      boxShadow: `inset 0 1px 2px ${alpha('#000', 0.05)}`
    }}>
      <Box sx={{ 
        bgcolor: color, 
        borderRadius: '50%', 
        p: theme.spacing(0.5), 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        boxShadow: `0 1px 2px ${alpha('#000', 0.2)}`
      }}>
        {icon}
      </Box>
      <Typography variant="caption" sx={{ 
        color: color, 
        fontSize: '0.7rem',
        fontWeight: theme.typography.fontWeightSemiBold || 600
      }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ 
        fontSize: '0.75rem', 
        fontWeight: theme.typography.fontWeightMedium,
        ml: 'auto',
        color: isActive ? color : theme.palette.text.primary
      }}>
        {`${value.toFixed(1)}%`}
      </Typography>
    </Box>
  );
});

SensorValue.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  icon: PropTypes.node.isRequired,
  color: PropTypes.string.isRequired,
  isActive: PropTypes.bool.isRequired
};

// Main component
const PedalsGauge = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  // Use InView for visibility detection
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  // Get settings with defaults
  const updateInterval = settings?.dashboard?.updateInterval || 300;
  const changeThreshold = settings?.dashboard?.significantChangeThreshold || 0.5;
  const animationsEnabled = settings?.global?.enableTransitions !== false;
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;
  
  // State for sensor values
  const [apps1, setApps1] = useState(0);
  const [apps2, setApps2] = useState(0);
  const [bse, setBse] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // State for derived stats
  const [stats, setStats] = useState({
    avgApps: 0,
    maxAcceleration: 0,
    maxBrake: 0,
    sensorDeviation: 0,
    appsConsistency: 100,
    status: { status: 'idle', desc: 'No Pedal Input' }
  });
  
  // Refs for tracking and optimization
  const sensorHistoryRef = useRef({
    apps1: new SensorRingBuffer(),
    apps2: new SensorRingBuffer(),
    bse: new SensorRingBuffer()
  });
  
  const lastUpdateTimeRef = useRef(Date.now());
  const frameRequestRef = useRef(null);
  const isComponentMounted = useRef(true);
  const valuesRef = useRef({ apps1: 0, apps2: 0, bse: 0 });
  
  // Component lifecycle management
  useEffect(() => {
    isComponentMounted.current = true;
    
    return () => {
      isComponentMounted.current = false;
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
    };
  }, []);
  
  // Theme colors (memoized to prevent recalculation)
  const colors = useMemo(() => ({
    apps: theme.palette.info.main,
    appsLight: theme.palette.info.light,
    bse: theme.palette.error.main,
    bseLight: theme.palette.error.light,
    warning: theme.palette.warning.main,
    success: theme.palette.success.main,
    idle: theme.palette.text.secondary
  }), [theme.palette]);
  
  // Determine status color based on current state
  const statusColor = useMemo(() => {
    switch (stats.status.status) {
      case 'accelerating': return colors.apps;
      case 'braking': return colors.bse;
      case 'warning': return colors.warning;
      default: return colors.idle;
    }
  }, [stats.status.status, colors]);
  
  // Frame-limiting for performance
  const shouldUpdateFrame = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastUpdateTimeRef.current;
    if (elapsed >= CONSTANTS.FRAME_RATE_LIMIT) {
      lastUpdateTimeRef.current = now;
      return true;
    }
    return false;
  }, []);
  
  // Update visual state based on sensor data
  const updateVisualState = useCallback(() => {
    if (!isComponentMounted.current) return;
    
    try {
      // Get averaged values from sensor history
      const apps1Value = sensorHistoryRef.current.apps1.getAverage();
      const apps2Value = sensorHistoryRef.current.apps2.getAverage();
      const bseValue = sensorHistoryRef.current.bse.getAverage();
      
      // Convert to percentages
      const apps1Percent = sensorConversions.appsToPercentage(apps1Value);
      const apps2Percent = sensorConversions.appsToPercentage(apps2Value);
      const bsePercent = sensorConversions.bseToPercentage(bseValue);
      
      // Calculate derived values
      const avgApps = (apps1Percent + apps2Percent) / 2;
      const deviation = Math.abs(apps1Percent - apps2Percent);
      const maxApps = Math.max(apps1Percent, apps2Percent);
      const appsConsistency = maxApps > 5
        ? Math.max(0, 100 - (deviation / maxApps) * 100)
        : 100;
      
      // Get current status
      const status = computePedalStatus(avgApps, bsePercent);
      
      // Update state only if values have changed sufficiently
      const thresholdPercent = changeThreshold / 100;
      
      // Update pedal values
      if (Math.abs(apps1Percent - valuesRef.current.apps1) > thresholdPercent) {
        setApps1(apps1Percent);
        valuesRef.current.apps1 = apps1Percent;
      }
      
      if (Math.abs(apps2Percent - valuesRef.current.apps2) > thresholdPercent) {
        setApps2(apps2Percent);
        valuesRef.current.apps2 = apps2Percent;
      }
      
      if (Math.abs(bsePercent - valuesRef.current.bse) > thresholdPercent) {
        setBse(bsePercent);
        valuesRef.current.bse = bsePercent;
      }
      
      // Update stats (only if changed)
      setStats(prevStats => {
        // Prepare updates
        const updates = {};
        
        if (Math.abs(avgApps - prevStats.avgApps) > thresholdPercent) {
          updates.avgApps = avgApps;
        }
        
        if (deviation !== prevStats.sensorDeviation) {
          updates.sensorDeviation = deviation;
        }
        
        if (appsConsistency !== prevStats.appsConsistency) {
          updates.appsConsistency = appsConsistency;
        }
        
        // Update max values if needed
        if (avgApps > prevStats.maxAcceleration) {
          updates.maxAcceleration = avgApps;
        }
        
        if (bsePercent > prevStats.maxBrake) {
          updates.maxBrake = bsePercent;
        }
        
        // Update status if changed
        if (status.status !== prevStats.status.status || 
            status.desc !== prevStats.status.desc) {
          updates.status = status;
        }
        
        // Only update state if there are changes
        return Object.keys(updates).length > 0 ? { ...prevStats, ...updates } : prevStats;
      });
      
      // Clear loading state
      if (isLoading) {
        setIsLoading(false);
      }
      
      // Clear error state if we got this far
      if (error) {
        setError(null);
      }
    } catch (err) {
      console.error('Error updating visual state:', err);
      if (isComponentMounted.current) {
        setError('Failed to update pedal display');
      }
    }
  }, [isLoading, error, changeThreshold]);
  
  // Handle incoming data
  const handleDataMessage = useCallback((data) => {
    if (!inView || !isComponentMounted.current) return;
    
    try {
      // Extract values from the message
      const fields = data?.fields;
      if (!fields) return;
      
      // Get sensor values
      const apps1Value = fields.apps1?.numberValue;
      const apps2Value = fields.apps2?.numberValue;
      const bseValue = fields.bse?.numberValue;
      
      // Add to history buffers for smoothing
      if (apps1Value !== undefined) {
        sensorHistoryRef.current.apps1.add(apps1Value);
      }
      
      if (apps2Value !== undefined) {
        sensorHistoryRef.current.apps2.add(apps2Value);
      }
      
      if (bseValue !== undefined) {
        sensorHistoryRef.current.bse.add(bseValue);
      }
      
      // Throttle visual updates for performance
      if (!shouldUpdateFrame() && !isLoading) return;
      
      // Cancel any existing frame request
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
      
      // Schedule update in next animation frame
      frameRequestRef.current = requestAnimationFrame(() => {
        if (isComponentMounted.current) {
          updateVisualState();
        }
      });
    } catch (err) {
      console.error('Error processing pedal data:', err);
      if (isComponentMounted.current) {
        setError('Failed to process pedal input data');
      }
    }
  }, [inView, shouldUpdateFrame, isLoading, updateVisualState]);
  
  // Subscribe to real-time data
  const { ref: dataRef } = useRealTimeData(
    'tcu',
    handleDataMessage,
    { customInterval: updateInterval }
  );
  
  // Combine refs
  const setRefs = useCallback(node => {
    if (node) {
      inViewRef(node);
      if (dataRef) dataRef(node); // Only call dataRef if it exists
    }
  }, [inViewRef, dataRef]);
  
  // Render the main content
  const renderContent = useCallback(() => {
    if (!inView) {
      return (
        <Box 
          sx={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            color: theme.palette.text.secondary
          }}
        >
          <Typography variant="body2">
            Pedal data monitoring paused
          </Typography>
        </Box>
      );
    }
    
    if (isLoading) {
      return (
        <Box 
          sx={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
          }}
        >
          <Typography variant="body1">
            Loading...
          </Typography>
        </Box>
      );
    }
    
    return (
      <>
        {/* Pedal indicator bars */}
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

        {/* Sensor readings panel */}
        <Box
          sx={{
            backgroundColor: alpha(theme.palette.background.paper, 0.8),
            borderRadius: theme.shape.borderRadius,
            border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(
              theme.palette.primary.main, 0.1
            )}`,
            p: theme.spacing(1),
            boxShadow: `0 1px 2px ${alpha('#000', 0.05)}`,
            flex: 1
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{ 
              color: theme.palette.primary.main,
              fontSize: '0.75rem',
              mb: theme.spacing(0.75),
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing(0.5),
              fontWeight: theme.typography.fontWeightSemiBold || 600,
              textTransform: 'uppercase',
              borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              paddingBottom: theme.spacing(0.5)
            }}
          >
            <Info size={14} /> Sensor Readings
          </Typography>
          
          {/* Sensor readings grid */}
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: theme.spacing(0.75),
            mb: theme.spacing(0.75)
          }}>
            {/* APPS1 */}
            <SensorValue
              label="APPS1"
              value={apps1}
              icon={<ArrowUp size={10} color="white" />}
              color={colors.apps}
              isActive={apps1 > 5}
            />
            
            {/* APPS2 */}
            <SensorValue
              label="APPS2"
              value={apps2}
              icon={<ArrowUp size={10} color="white" />}
              color={colors.apps}
              isActive={apps2 > 5}
            />
            
            {/* Brake */}
            <SensorValue
              label="Brake"
              value={bse}
              icon={<ArrowDown size={10} color="white" />}
              color={colors.bse}
              isActive={bse > 5}
            />
            
            {/* Max Values */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: theme.spacing(0.5),
              px: theme.spacing(0.5),
              py: theme.spacing(0.35),
              borderRadius: theme.shape.borderRadius,
              backgroundColor: alpha(theme.palette.background.paper, 0.5),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              boxShadow: `inset 0 1px 2px ${alpha('#000', 0.05)}`
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
                fontWeight: theme.typography.fontWeightSemiBold || 600
              }}>
                Max:
              </Typography>
              <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: theme.spacing(0.75) }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(0.25) }}>
                  <ArrowUp size={10} color={colors.apps} />
                  <Typography variant="body2" sx={{ 
                    fontSize: '0.75rem', 
                    color: colors.apps, 
                    fontWeight: theme.typography.fontWeightMedium 
                  }}>
                    {`${stats.maxAcceleration.toFixed(1)}%`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(0.25) }}>
                  <ArrowDown size={10} color={colors.bse} />
                  <Typography variant="body2" sx={{ 
                    fontSize: '0.75rem', 
                    color: colors.bse, 
                    fontWeight: theme.typography.fontWeightMedium 
                  }}>
                    {`${stats.maxBrake.toFixed(1)}%`}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
          
          {/* Metrics with progress bars */}
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing(0.75) }}>
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
                  borderRadius: theme.shape.borderRadius
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
                      fontWeight: theme.typography.fontWeightSemiBold || 600
                    }}
                  >
                    {`${stats.sensorDeviation.toFixed(1)}%`}
                  </Typography>
                </Box>
              </Box>
              <Tooltip title={`Difference between APPS1 and APPS2: ${stats.sensorDeviation.toFixed(1)}%`} arrow>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, stats.sensorDeviation * 10)} // Scale for better visualization
                  sx={{
                    height: theme.spacing(0.5),
                    borderRadius: theme.shape.borderRadius,
                    mt: theme.spacing(0.25),
                    backgroundColor: alpha(theme.palette.mode === 'dark' ? '#fff' : '#000', 0.08),
                    boxShadow: `inset 0 1px 2px ${alpha('#000', 0.1)}`,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: theme.shape.borderRadius,
                      backgroundImage:
                        stats.sensorDeviation > 8
                          ? `linear-gradient(90deg, ${theme.palette.error.light} 0%, ${theme.palette.error.main} 100%)`
                          : stats.sensorDeviation > 3
                          ? `linear-gradient(90deg, ${theme.palette.warning.light} 0%, ${theme.palette.warning.main} 100%)`
                          : `linear-gradient(90deg, ${theme.palette.info.light} 0%, ${theme.palette.info.main} 100%)`
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
                  borderRadius: theme.shape.borderRadius
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
                      fontWeight: theme.typography.fontWeightSemiBold || 600
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
                    backgroundColor: alpha(theme.palette.mode === 'dark' ? '#fff' : '#000', 0.08),
                    boxShadow: `inset 0 1px 2px ${alpha('#000', 0.1)}`,
                    '& .MuiLinearProgress-bar': {
                      borderRadius: theme.shape.borderRadius,
                      backgroundImage:
                        stats.appsConsistency < 80
                          ? `linear-gradient(90deg, ${theme.palette.error.light} 0%, ${theme.palette.error.main} 100%)`
                          : stats.appsConsistency < 90
                          ? `linear-gradient(90deg, ${theme.palette.warning.light} 0%, ${theme.palette.warning.main} 100%)`
                          : `linear-gradient(90deg, ${theme.palette.success.light} 0%, ${theme.palette.success.main} 100%)`
                    }
                  }}
                />
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </>
    );
  }, [
    theme, colors, inView, isLoading, 
    stats, apps1, apps2, bse
  ]);
  
  // Render error info if needed
  const renderErrorInfo = useCallback(() => {
    if (!error) return null;
    
    return (
      <Box sx={{ 
        p: 1, 
        backgroundColor: alpha(theme.palette.error.main, 0.1),
        borderTop: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
        color: theme.palette.error.main,
        fontSize: '0.7rem'
      }}>
        <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Error: {error}</Typography>
      </Box>
    );
  }, [error, theme]);
  
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
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
        position: 'relative',
        boxShadow: theme.custom?.shadows?.md || '0 2px 4px rgba(0,0,0,0.1)',
        transform: hardwareAcceleration ? 'translateZ(0)' : 'none'
      }}
      role="region"
      aria-label="Pedal inputs monitor"
    >
      {/* Header */}
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
            <Gauge size={20} color={theme.palette.primary.main} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: theme.typography.fontWeightMedium,
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
          backgroundColor: alpha(theme.palette.background.default, 0.4),
          '& .MuiCardHeader-action': {
            m: 0
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
          overflow: inView ? 'auto' : 'hidden',
          '&:last-child': {
            pb: theme.spacing(1.5)
          }
        }}
      >
        {renderContent()}
      </CardContent>
      
      {/* Error info if needed */}
      {renderErrorInfo()}
    </Card>
  );
};

export default memo(PedalsGauge);