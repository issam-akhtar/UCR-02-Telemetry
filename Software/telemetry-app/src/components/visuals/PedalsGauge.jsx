import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Tooltip,
  useTheme,
  Alert,
  LinearProgress,
  linearProgressClasses,
  styled,
  Skeleton
} from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';
import useResizeObserver from 'use-resize-observer';
import { useDebounce } from 'use-debounce';
import { Gauge, AlertCircle, Footprints, Info } from 'lucide-react';

// Constants for raw sensor values
const SENSOR_BASELINES = {
  APPS1_IDLE: 0.805,
  APPS2_IDLE: 0.772,
  BSE_IDLE: 1.05,
  APPS_MAX: 4.0,
  BSE_MAX: 4.0
};

// Constants for gauge visualization (after conversion to 0-100 scale)
const PEDAL_THRESHOLDS = {
  DEADZONE: 0.5,
  LIGHT: 5,
  MODERATE: 15,
  HEAVY: 30
};

// Config constants
const DATA_STALE_TIMEOUT = 5000; // Time in ms to consider data stale
const FRAME_RATE_LIMIT = 16; // ~60fps in ms

// Convert raw sensor value to percentage (0-100 scale) - optimized for performance
const convertAppsToPercentage = (rawValue) => {
  const normalizedValue = Math.max(0, rawValue - SENSOR_BASELINES.APPS1_IDLE);
  return Math.min(100, (normalizedValue / (SENSOR_BASELINES.APPS_MAX - SENSOR_BASELINES.APPS1_IDLE)) * 100);
};

const convertBseToPercentage = (rawValue) => {
  const normalizedValue = Math.max(0, rawValue - SENSOR_BASELINES.BSE_IDLE);
  return Math.min(100, (normalizedValue / (SENSOR_BASELINES.BSE_MAX - SENSOR_BASELINES.BSE_IDLE)) * 100);
};

// Custom hook for pedal gauge colors
const usePedalColors = () => {
  const theme = useTheme();
  
  // Memoize color values to prevent recalculations
  return useMemo(() => ({
    APPS: theme.palette.info.main,
    APPS_LIGHT: theme.palette.info.light,
    BSE: theme.palette.error.main,
    BSE_LIGHT: theme.palette.error.light,
    WARNING: theme.palette.warning.main,
    IDLE: theme.palette.text.secondary,
    TEXT: theme.palette.text.primary,
    TEXT_SECONDARY: theme.palette.text.secondary,
    BACKGROUND: theme.palette.mode === 'dark'
      ? 'rgba(26, 26, 26, 0.95)'
      : 'rgba(245, 245, 245, 0.95)',
    PANEL_BG: theme.palette.mode === 'dark'
      ? 'rgba(18, 18, 18, 0.85)'
      : 'rgba(240, 240, 240, 0.85)',
    BORDER: theme.palette.mode === 'dark'
      ? 'rgba(60, 60, 60, 0.5)'
      : 'rgba(200, 200, 200, 0.6)',
    SUCCESS: theme.palette.success.main,
  }), [theme.palette]); // Only re-compute when theme palette changes
};

// Custom hook for tracking pedal stats and status - optimized with memoization
const usePedalStats = (apps1, apps2, bse) => {
  const [stats, setStats] = useState({
    maxAcceleration: 0,
    maxBrake: 0,
    sensorDeviation: 0,
    appsConsistency: 100,
    avgApps: 0,
    status: { status: 'idle', desc: 'No Pedal Input' }
  });

  const prevValuesRef = useRef({ apps1, apps2, bse });
  
  // Calculate stats and status based on pedal values
  useEffect(() => {
    // Skip update if values haven't changed significantly (reduces processing)
    if (
      Math.abs(apps1 - prevValuesRef.current.apps1) < 0.1 &&
      Math.abs(apps2 - prevValuesRef.current.apps2) < 0.1 &&
      Math.abs(bse - prevValuesRef.current.bse) < 0.1
    ) {
      return;
    }
    
    prevValuesRef.current = { apps1, apps2, bse };
    
    const frameId = requestAnimationFrame(() => {
      setStats(prev => {
        // Calculate average apps
        const avgApps = (apps1 + apps2) / 2;

        // Calculate deviation between apps sensors
        const deviation = Math.abs(apps1 - apps2);

        // Calculate APPS consistency score (100% = perfect match)
        const maxApps = Math.max(apps1, apps2);
        const appsConsistency = maxApps > 5
          ? Math.max(0, 100 - (deviation / maxApps * 100))
          : 100;

        // Determine pedal status
        let status;
        
        if (avgApps > PEDAL_THRESHOLDS.DEADZONE && bse > PEDAL_THRESHOLDS.DEADZONE) {
          status = { status: 'warning', desc: 'Both Pedals Active' };
        } else if (avgApps > PEDAL_THRESHOLDS.HEAVY) {
          status = { status: 'accelerating', desc: 'Heavy Acceleration' };
        } else if (avgApps > PEDAL_THRESHOLDS.MODERATE) {
          status = { status: 'accelerating', desc: 'Moderate Acceleration' };
        } else if (avgApps > PEDAL_THRESHOLDS.LIGHT) {
          status = { status: 'accelerating', desc: 'Light Acceleration' };
        } else if (avgApps > PEDAL_THRESHOLDS.DEADZONE) {
          status = { status: 'accelerating', desc: 'Minimal Acceleration' };
        } else if (bse > PEDAL_THRESHOLDS.HEAVY) {
          status = { status: 'braking', desc: 'Heavy Braking' };
        } else if (bse > PEDAL_THRESHOLDS.MODERATE) {
          status = { status: 'braking', desc: 'Moderate Braking' };
        } else if (bse > PEDAL_THRESHOLDS.LIGHT) {
          status = { status: 'braking', desc: 'Light Braking' };
        } else if (bse > PEDAL_THRESHOLDS.DEADZONE) {
          status = { status: 'braking', desc: 'Minimal Braking' };
        } else {
          status = { status: 'idle', desc: 'No Pedal Input' };
        }

        return {
          maxAcceleration: Math.max(prev.maxAcceleration, avgApps),
          maxBrake: Math.max(prev.maxBrake, bse),
          sensorDeviation: deviation,
          appsConsistency: appsConsistency,
          avgApps: avgApps,
          status: status
        };
      });
    });
    
    return () => cancelAnimationFrame(frameId);
  }, [apps1, apps2, bse]);

  return stats;
};

// Styled progress bar for Accelerator with customized colors
const AcceleratorBar = styled(LinearProgress)(({ theme, active }) => ({
  height: 10,
  borderRadius: 5,
  willChange: 'transform',
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.1)',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    background: `linear-gradient(90deg, 
      ${theme.palette.info.light}${theme.palette.mode === 'dark' ? '90' : '60'} 0%, 
      ${theme.palette.info.main} 100%)`,
    transition: 'transform 0.2s linear',
    boxShadow: active ? `0 0 8px ${theme.palette.info.main}40` : 'none',
  },
}));

// Styled progress bar for Brake
const BrakeBar = styled(LinearProgress)(({ theme, active }) => ({
  height: 10,
  borderRadius: 5,
  willChange: 'transform',
  [`&.${linearProgressClasses.colorPrimary}`]: {
    backgroundColor: theme.palette.mode === 'dark'
      ? 'rgba(255, 255, 255, 0.1)'
      : 'rgba(0, 0, 0, 0.1)',
    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.1)',
  },
  [`& .${linearProgressClasses.bar}`]: {
    borderRadius: 5,
    background: `linear-gradient(90deg, 
      ${theme.palette.error.light}${theme.palette.mode === 'dark' ? '90' : '60'} 0%, 
      ${theme.palette.error.main} 100%)`,
    transition: 'transform 0.2s linear',
    boxShadow: active ? `0 0 8px ${theme.palette.error.main}40` : 'none',
  },
}));

// Small progress bar for sensor deviation
const DeviationBar = styled(LinearProgress)(({ theme, warningLevel }) => {
  const getBarColor = () => {
    if (warningLevel === 'high') return theme.palette.error.main;
    if (warningLevel === 'medium') return theme.palette.warning.main;
    return theme.palette.info.main;
  };

  return {
    height: 4,
    borderRadius: 2,
    width: '100%',
    willChange: 'transform',
    [`&.${linearProgressClasses.colorPrimary}`]: {
      backgroundColor: theme.palette.mode === 'dark'
        ? 'rgba(255, 255, 255, 0.1)'
        : 'rgba(0, 0, 0, 0.1)',
    },
    [`& .${linearProgressClasses.bar}`]: {
      backgroundColor: getBarColor(),
    }
  };
});

// Sensor indicator bar
const SensorIndicator = memo(({ value, rawValue, label, color, discrepancy = false, discrepancyValue = 0 }) => {
  const theme = useTheme();

  // Determine warning level for discrepancy
  const warningLevel = useMemo(() => {
    if (discrepancy) {
      if (discrepancyValue > 8) return 'high';
      if (discrepancyValue > 3) return 'medium';
    }
    return 'none';
  }, [discrepancy, discrepancyValue]);

  return (
    <Box sx={{ mb: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, alignItems: 'center' }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 'medium' }}>
          {label}
        </Typography>
        <Tooltip
          title={discrepancy ? `Deviation: ${discrepancyValue.toFixed(2)}%` : `Raw: ${rawValue.toFixed(6)}V`}
          arrow
          placement="top"
        >
          <Typography
            variant="caption"
            sx={{
              color: warningLevel === 'high'
                ? 'error.main'
                : warningLevel === 'medium'
                  ? 'warning.main'
                  : 'text.secondary',
              fontWeight: warningLevel !== 'none' ? 'bold' : 'medium',
              display: 'flex',
              alignItems: 'center',
              gap: 0.5
            }}
          >
            {value.toFixed(1)}%
            {warningLevel === 'high' && <AlertCircle size={12} />}
          </Typography>
        </Tooltip>
      </Box>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          height: 5,
          borderRadius: 2.5,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          boxShadow: 'inset 0 0 4px rgba(0,0,0,0.1)',
          '& .MuiLinearProgress-bar': {
            backgroundColor: color,
            transition: 'transform 0.2s linear',
            willChange: 'transform',
          }
        }}
      />
    </Box>
  );
});

// Custom SVG Radial Gauge (replaces ApexCharts)
const RadialGauge = memo(({ value, color, idleColor }) => {
  // Calculate coordinates for the gauge arc
  const calculateArc = useCallback((percentage, radius) => {
    // Convert percentage to radians (0-100% maps to 0-180 degrees)
    const angleInDegrees = (percentage / 100) * 180;
    const angleInRadians = (angleInDegrees - 90) * (Math.PI / 180);
    
    // Calculate the point on the circle
    const x = 50 + radius * Math.cos(angleInRadians);
    const y = 50 + radius * Math.sin(angleInRadians);
    
    // Determine if we need to use the large arc flag (if angle > 180 degrees)
    const largeArcFlag = angleInDegrees > 180 ? 1 : 0;
    
    // Create the arc path
    return `M 50 50 L 50 10 A 40 40 0 ${largeArcFlag} 1 ${x} ${y} Z`;
  }, []);

  const arcPath = useMemo(() => calculateArc(value, 40), [calculateArc, value]);
  const displayValue = value.toFixed(1);

  return (
    <svg viewBox="0 0 100 100" width="60" height="60">
      {/* Background circle */}
      <circle cx="50" cy="50" r="45" fill="transparent" />
      
      {/* Background track */}
      <path 
        d="M 50 50 L 50 10 A 40 40 0 1 1 50 90 Z" 
        fill={idleColor} 
        opacity="0.2" 
      />
      
      {/* Value arc */}
      <path 
        d={arcPath} 
        fill={color} 
        opacity="0.85" 
      />
      
      {/* Center circle */}
      <circle cx="50" cy="50" r="20" fill="white" opacity="0.9" />
      
      {/* Text value */}
      <text 
        x="50" 
        y="55" 
        textAnchor="middle" 
        fontSize="12" 
        fontWeight="bold" 
        fill={color}
      >
        {displayValue}%
      </text>
    </svg>
  );
});

// A visual pedal indicator component with radial gauge
const PedalIndicator = memo(({ type, value, active }) => {
  const theme = useTheme();
  const colors = usePedalColors();
  const isAccelerator = type === 'accelerator';
  const color = isAccelerator ? colors.APPS : colors.BSE;

  return (
    <Box 
      sx={{
        position: 'relative',
        width: '100%',
        borderRadius: 1,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
        mb: 1,
        px: 1.25,
        py: 0.75,
        display: 'flex',
        alignItems: 'center',
        boxShadow: active
          ? `0 0 6px ${isAccelerator ? theme.palette.info.main : theme.palette.error.main}30`
          : 'none',
        transition: 'box-shadow 0.3s ease',
        border: `1px solid ${active
          ? isAccelerator
            ? theme.palette.info.main + '40'
            : theme.palette.error.main + '40'
          : theme.palette.divider}`,
        willChange: active ? 'box-shadow' : 'auto',
        transform: 'translateZ(0)'
      }}
      role="meter"
      aria-label={`${isAccelerator ? 'Accelerator' : 'Brake'} pedal at ${value.toFixed(1)}%`}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(value)}
    >
      {/* Left side - icon and label */}
      <Box sx={{ textAlign: 'center', mr: 1, width: 35, flexShrink: 0 }}>
        <Typography
          variant="caption"
          sx={{
            color: active ? color : theme.palette.text.secondary,
            fontWeight: active ? 'bold' : 'medium',
            fontSize: '0.65rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'block',
            mb: 0.3
          }}
        >
          {isAccelerator ? 'Accel' : 'Brake'}
        </Typography>
        <Box
          sx={{
            color: active ? color : theme.palette.text.secondary,
            opacity: active ? 1 : 0.6
          }}
        >
          <Footprints size={18} />
        </Box>
      </Box>

      {/* Middle - progress bar */}
      <Box sx={{ flex: 1, mx: 1 }}>
        {isAccelerator ? (
          <AcceleratorBar
            variant="determinate"
            value={value}
            active={active}
          />
        ) : (
          <BrakeBar
            variant="determinate"
            value={value}
            active={active}
          />
        )}
      </Box>

      {/* Right side - gauge visualization */}
      <Box sx={{ width: 60, flexShrink: 0 }}>
        <RadialGauge 
          value={value} 
          color={color} 
          idleColor={theme.palette.text.secondary} 
        />
      </Box>
    </Box>
  );
});

// Skeleton for pedal indicator during loading
const PedalIndicatorSkeleton = memo(() => {
  const theme = useTheme();
  
  return (
    <Box 
      sx={{
        position: 'relative',
        width: '100%',
        borderRadius: 1,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
        mb: 1,
        px: 1.25,
        py: 0.75,
        display: 'flex',
        alignItems: 'center',
        border: `1px solid ${theme.palette.divider}`
      }}
    >
      {/* Left side skeleton */}
      <Box sx={{ textAlign: 'center', mr: 1, width: 35, flexShrink: 0 }}>
        <Skeleton variant="text" width={30} height={14} />
        <Skeleton variant="circular" width={18} height={18} sx={{ mx: 'auto' }} />
      </Box>

      {/* Middle - progress bar skeleton */}
      <Box sx={{ flex: 1, mx: 1 }}>
        <Skeleton variant="rounded" height={10} width="100%" />
      </Box>

      {/* Right side - gauge skeleton */}
      <Box sx={{ width: 60, flexShrink: 0 }}>
        <Skeleton variant="circular" width={50} height={50} sx={{ mx: 'auto' }} />
      </Box>
    </Box>
  );
});

// Analytics value component
const AnalyticsValue = memo(({ label, value, unit = '', color }) => {
  return (
    <Box sx={{ mb: 0.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.25, gap: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
          {label}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: color || 'text.primary',
          fontWeight: 'medium',
          fontSize: '0.85rem',
          display: 'flex',
          alignItems: 'baseline',
          gap: 0.5
        }}
      >
        {value}
        {unit && (
          <Typography
            component="span"
            sx={{
              color: 'text.secondary',
              fontSize: '0.65rem',
              fontWeight: 'normal'
            }}
          >
            {unit}
          </Typography>
        )}
      </Typography>
    </Box>
  );
});

// Skeleton for analytics value during loading
const AnalyticsValueSkeleton = memo(() => {
  return (
    <Box sx={{ mb: 0.5 }}>
      <Skeleton variant="text" width={60} height={16} sx={{ mb: 0.25 }} />
      <Skeleton variant="text" width={40} height={20} />
    </Box>
  );
});

// Status indicator component
const StatusIndicator = memo(({ status, desc, color }) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 0.75,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
        borderRadius: 1,
        px: 1,
        py: 0.4,
        border: `1px solid ${color}20`
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 4px ${color}`,
          opacity: status !== 'idle' ? 1 : 0.6
        }}
      />
      <Typography
        variant="body2"
        color="text.primary"
        sx={{ fontSize: '0.7rem' }}
      >
        {desc}
      </Typography>
    </Box>
  );
});

// Lightweight SVG semi-circle for consistency gauge
const ConsistencyGauge = memo(({ value, isLoading }) => {
  const theme = useTheme();
  const colors = usePedalColors();

  // Determine color based on value
  const getColor = useCallback(() => {
    if (value > 95) return colors.SUCCESS;
    if (value > 90) return colors.APPS;
    if (value > 80) return colors.WARNING;
    return theme.palette.error.main;
  }, [value, colors, theme.palette.error.main]);

  const color = getColor();

  if (isLoading) {
    return <Skeleton variant="circular" width={80} height={60} sx={{ mx: 'auto' }} />;
  }

  // Calculate path for semi-circle based on value
  const calculateArc = () => {
    // Start at top center of semi-circle (0 degrees)
    // End based on percentage (0-100% maps to 0-180 degrees)
    const angle = value / 100 * 180;
    
    // Calculate endpoint of arc
    const endX = 50 + 40 * Math.sin(angle * Math.PI / 180);
    const endY = 50 - 40 * Math.cos(angle * Math.PI / 180);
    
    // Create path
    return `M 50 10 A 40 40 0 ${angle > 90 ? 1 : 0} 1 ${endX} ${endY}`;
  };

  return (
    <Box sx={{ textAlign: 'center' }}>
      <svg viewBox="0 0 100 60" width="80" height="60">
        {/* Background track */}
        <path 
          d="M 50 10 A 40 40 0 1 1 50 10" 
          stroke={theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}
          strokeWidth="4"
          fill="none"
        />
        
        {/* Value arc */}
        <path 
          d={calculateArc()} 
          stroke={color}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Text value */}
        <text 
          x="50" 
          y="45" 
          textAnchor="middle" 
          fontSize="14" 
          fontWeight="bold" 
          fill={color}
        >
          {value.toFixed(1)}%
        </text>
        
        {/* Label */}
        <text 
          x="50" 
          y="58" 
          textAnchor="middle" 
          fontSize="8" 
          fill={theme.palette.text.secondary}
        >
          Consistency
        </text>
      </svg>
    </Box>
  );
});

// Simple ring buffer implementation for sensor history
class SensorRingBuffer {
  constructor(size = 120) { // 2 seconds at 60fps
    this.buffer = new Float32Array(size);
    this.index = 0;
    this.size = size;
    this.isFull = false;
  }
  
  add(value) {
    this.buffer[this.index] = value;
    this.index = (this.index + 1) % this.size;
    if (this.index === 0) this.isFull = true;
  }
  
  getAverage() {
    const count = this.isFull ? this.size : this.index;
    if (count === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += this.buffer[i];
    }
    return sum / count;
  }
}

// Main component
const PedalsGauge = () => {
  const theme = useTheme();
  const colors = usePedalColors();
  const { ref, width = 300 } = useResizeObserver();
  const [debouncedWidth] = useDebounce(width, 250);

  // State for raw pedal positions
  const [rawApps1, setRawApps1] = useState(SENSOR_BASELINES.APPS1_IDLE);
  const [rawApps2, setRawApps2] = useState(SENSOR_BASELINES.APPS2_IDLE);
  const [rawBse, setRawBse] = useState(SENSOR_BASELINES.BSE_IDLE);

  // State for converted pedal positions (0-100%)
  const [apps1, setApps1] = useState(0);
  const [apps2, setApps2] = useState(0);
  const [bse, setBse] = useState(0);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataStale, setDataStale] = useState(false);

  // Use the custom hook for stats tracking
  const stats = usePedalStats(apps1, apps2, bse);

  // References
  const lastTimestampRef = useRef(null);
  const staleTimerRef = useRef(null);
  const lastUpdateTimeRef = useRef(Date.now());
  const sensorHistoryRef = useRef({
    apps1: new SensorRingBuffer(),
    apps2: new SensorRingBuffer(),
    bse: new SensorRingBuffer()
  });

  // Frame limiting to reduce CPU usage
  const shouldUpdateFrame = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdateTimeRef.current >= FRAME_RATE_LIMIT) {
      lastUpdateTimeRef.current = now;
      return true;
    }
    return false;
  }, []);

  // Subscribe to TCU data with optimized processing
  useRealTimeData('tcu', (msg) => {
    try {
      const fields = msg.payload?.fields;
      if (!fields) return;

      // Basic validation of message
      const newTimestamp = fields.timestamp?.numberValue || Date.now();
      if (lastTimestampRef.current !== null && newTimestamp <= lastTimestampRef.current) {
        return;
      }

      lastTimestampRef.current = newTimestamp;
      setDataStale(false);

      // Clear any previous errors
      if (error) setError(null);

      // Clear existing stale timer and create new one
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
      staleTimerRef.current = setTimeout(() => {
        setDataStale(true);
      }, DATA_STALE_TIMEOUT);

      // Frame limiting for UI updates
      if (!shouldUpdateFrame() && !isLoading) {
        // Still update ring buffer but skip state updates
        if (fields.apps1?.numberValue !== undefined) {
          sensorHistoryRef.current.apps1.add(fields.apps1.numberValue);
        }
        if (fields.apps2?.numberValue !== undefined) {
          sensorHistoryRef.current.apps2.add(fields.apps2.numberValue);
        }
        if (fields.bse?.numberValue !== undefined) {
          sensorHistoryRef.current.bse.add(fields.bse.numberValue);
        }
        return;
      }

      // Apply updates in one animation frame to reduce reflows
      requestAnimationFrame(() => {
        // Update raw pedal positions
        const newRawApps1 = fields.apps1?.numberValue !== undefined ? Number(fields.apps1.numberValue) : rawApps1;
        const newRawApps2 = fields.apps2?.numberValue !== undefined ? Number(fields.apps2.numberValue) : rawApps2;
        const newRawBse = fields.bse?.numberValue !== undefined ? Number(fields.bse.numberValue) : rawBse;

        // Update ring buffers
        sensorHistoryRef.current.apps1.add(newRawApps1);
        sensorHistoryRef.current.apps2.add(newRawApps2);
        sensorHistoryRef.current.bse.add(newRawBse);

        setRawApps1(newRawApps1);
        setRawApps2(newRawApps2);
        setRawBse(newRawBse);

        // Convert to percentage values (0-100 scale)
        const newApps1 = convertAppsToPercentage(newRawApps1);
        const newApps2 = convertAppsToPercentage(newRawApps2);
        const newBse = convertBseToPercentage(newRawBse);

        setApps1(newApps1);
        setApps2(newApps2);
        setBse(newBse);
        
        // Update loading state if needed
        if (isLoading) {
          setIsLoading(false);
        }
      });
    } catch (error) {
      console.error('Error processing TCU data:', error);
      setError('Failed to process pedal input data');
    }
  });

  // Clean up stale timer on unmount
  useEffect(() => {
    return () => {
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
    };
  }, []);

  // Get the appropriate status color
  const getStatusColor = useCallback(() => {
    switch (stats.status.status) {
      case 'accelerating': return colors.APPS;
      case 'braking': return colors.BSE;
      case 'warning': return colors.WARNING;
      default: return colors.IDLE;
    }
  }, [stats.status.status, colors]);

  // Calculate consistency score warning level
  const getConsistencyWarningLevel = useCallback(() => {
    if (stats.appsConsistency < 80) return 'high';
    if (stats.appsConsistency < 90) return 'medium';
    return 'low';
  }, [stats.appsConsistency]);

  const consistencyWarningLevel = getConsistencyWarningLevel();

  // Hardware acceleration optimizations
  const hardwareAcceleratedStyles = useMemo(() => ({
    willChange: 'transform',
    transform: 'translateZ(0)',
    backfaceVisibility: 'hidden'
  }), []);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        borderRadius: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.BACKGROUND,
        boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
        border: `1px solid ${colors.BORDER}`,
        position: 'relative',
        ...hardwareAcceleratedStyles
      }}
      role="region"
      aria-label="Pedal inputs monitor"
      ref={ref}
    >
      {/* Header */}
      <Box sx={{
        px: 1.5,
        py: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`,
        background: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Gauge size={16} color={isLoading ? theme.palette.text.secondary : getStatusColor()} />
          <Typography
            variant="h6"
            color="text.primary"
            sx={{
              fontWeight: 'medium',
              fontSize: '0.9rem'
            }}
          >
            Pedal Inputs
          </Typography>
        </Box>
        
        {isLoading ? (
          <Skeleton variant="rounded" width={100} height={24} />
        ) : (
          <StatusIndicator 
            status={stats.status.status}
            desc={stats.status.desc}
            color={getStatusColor()}
          />
        )}
      </Box>

      {/* Error message if any */}
      {error && (
        <Alert
          severity="error"
          sx={{
            m: 1,
            py: 0.5,
            '& .MuiAlert-message': { fontSize: '0.8rem' }
          }}
        >
          {error}
        </Alert>
      )}

      {/* Main content */}
      <Box
        sx={{
          p: 1.5,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        {/* Visual pedal indicators */}
        <Box sx={{ mb: 0.75 }}>
          {isLoading ? (
            <>
              <PedalIndicatorSkeleton />
              <PedalIndicatorSkeleton />
            </>
          ) : (
            <>
              <PedalIndicator
                type="accelerator"
                value={stats.avgApps}
                active={stats.status.status === 'accelerating' || stats.status.status === 'warning'}
              />
              <PedalIndicator
                type="brake"
                value={bse}
                active={stats.status.status === 'braking' || stats.status.status === 'warning'}
              />
            </>
          )}
        </Box>

        <Grid container spacing={1.5} sx={{ mt: 0, height: 'calc(100% - 110px)' }}>
          {/* Analytics Panel */}
          <Grid item xs={12} sm={4} sx={{ height: '100%' }}>
            <Box sx={{
              p: 1.5,
              backgroundColor: colors.PANEL_BG,
              borderRadius: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
              border: `1px solid ${colors.BORDER}`
            }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'text.primary',
                  mb: 1,
                  fontSize: '0.8rem'
                }}
              >
                Pedal Analytics
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  {isLoading ? (
                    <AnalyticsValueSkeleton />
                  ) : (
                    <AnalyticsValue
                      label="Max Acceleration"
                      value={stats.maxAcceleration.toFixed(1)}
                      unit="%"
                      color={colors.APPS}
                    />
                  )}
                </Box>

                <Box sx={{ flex: 1 }}>
                  {isLoading ? (
                    <AnalyticsValueSkeleton />
                  ) : (
                    <AnalyticsValue
                      label="Max Brake Force"
                      value={stats.maxBrake.toFixed(1)}
                      unit="%"
                      color={colors.BSE}
                    />
                  )}
                </Box>
              </Box>

              {!isLoading && stats.status.status === 'warning' && (
                <Alert
                  severity="warning"
                  sx={{
                    mt: 'auto',
                    py: 0.5,
                    '& .MuiAlert-message': { fontSize: '0.7rem' }
                  }}
                  icon={<AlertCircle size={16} />}
                >
                  Both pedals active. Potential safety hazard.
                </Alert>
              )}

              {!isLoading && consistencyWarningLevel === 'high' && stats.status.status !== 'warning' && (
                <Alert
                  severity="error"
                  sx={{
                    mt: 'auto',
                    py: 0.5,
                    '& .MuiAlert-message': { fontSize: '0.7rem' }
                  }}
                  icon={<AlertCircle size={16} />}
                >
                  High APPS sensor deviation detected.
                </Alert>
              )}
            </Box>
          </Grid>

          {/* Sensor Readings */}
          <Grid item xs={12} sm={8} sx={{ height: '100%', overflow: 'hidden' }}>
            <Box sx={{
              p: 1.5,
              backgroundColor: colors.PANEL_BG,
              borderRadius: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
              border: `1px solid ${colors.BORDER}`,
              overflow: 'hidden'
            }}>
              <Typography
                variant="subtitle2"
                sx={{
                  color: 'text.primary',
                  mb: 1,
                  fontSize: '0.8rem'
                }}
              >
                Sensor Readings
              </Typography>

              <Grid container spacing={1.5} sx={{ height: 'calc(100% - 28px)' }}>
                <Grid item xs={12} sm={7} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: colors.APPS,
                      mb: 0.5,
                      display: 'block',
                      fontWeight: 'medium',
                      textTransform: 'uppercase',
                      fontSize: '0.65rem',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Accelerator Pedal Sensors
                  </Typography>

                  {isLoading ? (
                    <>
                      <Skeleton variant="rounded" height={25} sx={{ mb: 1 }} />
                      <Skeleton variant="rounded" height={25} sx={{ mb: 1 }} />
                    </>
                  ) : (
                    <>
                      <SensorIndicator
                        value={apps1}
                        rawValue={rawApps1}
                        label="APPS1"
                        color={colors.APPS}
                      />
                      <SensorIndicator
                        value={apps2}
                        rawValue={rawApps2}
                        label="APPS2"
                        color={colors.APPS}
                        discrepancy={true}
                        discrepancyValue={Math.abs(apps1 - apps2)}
                      />
                    </>
                  )}

                  {/* Show deviation */}
                  <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="caption"
                      sx={{
                        color: 'text.secondary',
                        whiteSpace: 'nowrap',
                        fontSize: '0.65rem'
                      }}
                    >
                      Sensor Deviation:
                    </Typography>
                    <Box sx={{ flexGrow: 1 }}>
                      {isLoading ? (
                        <Skeleton variant="rounded" height={4} />
                      ) : (
                        <DeviationBar
                          variant="determinate"
                          value={Math.min(100, stats.sensorDeviation * 10)}
                          warningLevel={stats.sensorDeviation > 8
                            ? 'high'
                            : stats.sensorDeviation > 3
                              ? 'medium'
                              : 'low'
                          }
                        />
                      )}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: stats.sensorDeviation > 8
                          ? 'error.main'
                          : stats.sensorDeviation > 3
                            ? 'warning.main'
                            : 'text.secondary',
                        whiteSpace: 'nowrap',
                        fontWeight: stats.sensorDeviation > 3 ? 'bold' : 'normal',
                        fontSize: '0.65rem'
                      }}
                    >
                      {isLoading ? '-' : stats.sensorDeviation.toFixed(1) + '%'}
                    </Typography>
                  </Box>
                </Grid>

                <Grid item xs={12} sm={5} sx={{ height: '100%' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <Box>
                      <Typography
                        variant="caption"
                        sx={{
                          color: colors.BSE,
                          mb: 0.5,
                          display: 'block',
                          fontWeight: 'medium',
                          textTransform: 'uppercase',
                          fontSize: '0.65rem',
                          letterSpacing: '0.5px'
                        }}
                      >
                        Brake System
                      </Typography>

                      {isLoading ? (
                        <Skeleton variant="rounded" height={25} sx={{ mb: 1 }} />
                      ) : (
                        <SensorIndicator
                          value={bse}
                          rawValue={rawBse}
                          label="BSE"
                          color={colors.BSE}
                        />
                      )}
                    </Box>

                    <Box sx={{ mt: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
                      <ConsistencyGauge 
                        value={stats.appsConsistency} 
                        isLoading={isLoading}
                      />
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default memo(PedalsGauge);