import React, { useReducer, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  useMediaQuery, 
  useTheme,
  Alert,
  Tooltip,
  Skeleton
} from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';
import useResizeObserver from 'use-resize-observer';
import { Battery, BatteryCharging, Zap, AlertTriangle, BarChart3, Clock } from 'lucide-react';
import { throttle } from 'lodash'; 

// Constants
const VOLTAGE_THRESHOLDS = {
  CRITICAL: 50,
  LOW: 60,
  NORMAL: 75,
  HIGH: 95
};

const CURRENT_THRESHOLDS = {
  CHARGING: -5,
  NEUTRAL: 5,
  HIGH_DRAW: 50,
  MAX_DRAW: 100
};

const DATA_STALE_TIMEOUT = 5000; // Time in ms to consider data stale
const THROTTLE_TIME = 500; // Throttle time for data updates in ms
const MAX_HISTORY_POINTS = 100; // Limit history data points to reduce memory usage

// Initial state for the reducer
const initialState = {
  voltage: 0,
  current: 0,
  power: 0,
  isLoading: true,
  dataStale: false,
  error: null,
  lastUpdated: null,
  voltageRange: [0, 100],
  currentRange: [-150, 150],
  stats: {
    initialized: false,
    voltage: { min: 0, max: 0 },
    current: { min: 0, max: 0 },
    power: { min: 0, max: 0 }
  }
};

// Reducer function for state management
function packReducer(state, action) {
  switch (action.type) {
    case 'VOLTAGE_UPDATE':
      const newVoltage = action.payload;
      // Calculate new voltage range if needed
      const upperVoltage = newVoltage > 0 
        ? Math.ceil(newVoltage * 1.2 / 10) * 10 
        : state.voltageRange[1];
      
      // Calculate new power
      const newPower = newVoltage * state.current;
      
      return {
        ...state,
        voltage: newVoltage,
        power: newPower,
        isLoading: newVoltage > 0 ? false : state.isLoading,
        dataStale: false,
        lastUpdated: new Date(),
        error: null,
        voltageRange: [0, Math.max(100, upperVoltage)],
        stats: updateStats(state.stats, {
          voltage: newVoltage,
          current: state.current,
          power: newPower
        })
      };
      
    case 'CURRENT_UPDATE':
      const newCurrent = action.payload;
      // Calculate new current range if needed
      const absMaxCurrent = Math.max(Math.abs(newCurrent) * 1.5, 50);
      const roundedMax = Math.ceil(absMaxCurrent / 50) * 50; // Round to nearest 50
      
      // Calculate new power
      const updatedPower = state.voltage * newCurrent;
      
      return {
        ...state,
        current: newCurrent,
        power: updatedPower,
        dataStale: false,
        lastUpdated: new Date(),
        error: null,
        currentRange: [-roundedMax, roundedMax],
        stats: updateStats(state.stats, {
          voltage: state.voltage,
          current: newCurrent,
          power: updatedPower
        })
      };
      
    case 'DATA_STALE':
      return {
        ...state,
        dataStale: true
      };
      
    case 'ERROR':
      return {
        ...state,
        error: action.payload
      };
      
    default:
      return state;
  }
}

// Function to update stats efficiently
function updateStats(prevStats, { voltage, current, power }) {
  if (voltage === 0 && current === 0 && power === 0) {
    return prevStats;
  }
  
  if (!prevStats.initialized) {
    return {
      initialized: true,
      voltage: { min: voltage, max: voltage },
      current: { min: current, max: current },
      power: { min: power, max: power }
    };
  }
  
  return {
    ...prevStats,
    voltage: {
      min: Math.min(prevStats.voltage.min, voltage),
      max: Math.max(prevStats.voltage.max, voltage)
    },
    current: {
      min: Math.min(prevStats.current.min, current),
      max: Math.max(prevStats.current.max, current)
    },
    power: {
      min: Math.min(prevStats.power.min, power),
      max: Math.max(prevStats.power.max, power)
    }
  };
}

// Custom hook for battery pack colors
const usePackColors = () => {
  const theme = useTheme();
  
  return useMemo(() => ({
    PRIMARY: theme.palette.primary.main,
    SECONDARY: theme.palette.secondary.main,
    SUCCESS: theme.palette.success.main,
    WARNING: theme.palette.warning.main,
    DANGER: theme.palette.error.main,
    INFO: theme.palette.info.main,
    CHARGING: theme.palette.success.light,
    TEXT: theme.palette.text.primary,
    TEXT_SECONDARY: theme.palette.text.secondary,
    BACKGROUND: theme.palette.mode === 'dark' 
      ? 'rgba(30, 30, 30, 0.9)' 
      : 'rgba(245, 245, 245, 0.9)',
    PANEL_BG: theme.palette.mode === 'dark' 
      ? 'rgba(0, 0, 0, 0.5)' 
      : 'rgba(240, 240, 240, 0.8)',
  }), [theme.palette]);
};

// Utility functions - Memoize these to prevent unnecessary recalculations
const formatPower = (power) => {
  const absValue = Math.abs(power);
  if (absValue >= 1000) {
    return `${(power / 1000).toFixed(2)} kW`;
  }
  return `${power.toFixed(0)} W`;
};

const getVoltageColor = (voltage, colors) => {
  if (voltage >= VOLTAGE_THRESHOLDS.HIGH) return colors.DANGER;
  if (voltage >= VOLTAGE_THRESHOLDS.NORMAL) return colors.SUCCESS;
  if (voltage >= VOLTAGE_THRESHOLDS.LOW) return colors.WARNING;
  return colors.DANGER;
};

const getCurrentColor = (current, colors) => {
  if (current <= CURRENT_THRESHOLDS.CHARGING) return colors.CHARGING;
  if (current <= CURRENT_THRESHOLDS.NEUTRAL) return colors.INFO;
  if (current <= CURRENT_THRESHOLDS.HIGH_DRAW) return colors.SUCCESS;
  if (current <= CURRENT_THRESHOLDS.MAX_DRAW) return colors.WARNING;
  return colors.DANGER;
};

// Get voltage status description
const getVoltageStatus = (voltage) => {
  if (voltage >= VOLTAGE_THRESHOLDS.HIGH) return "HIGH VOLTAGE";
  if (voltage >= VOLTAGE_THRESHOLDS.NORMAL) return "NORMAL";
  if (voltage >= VOLTAGE_THRESHOLDS.LOW) return "LOW VOLTAGE";
  return "CRITICAL";
};

// Get current status description
const getCurrentStatus = (current) => {
  if (current <= CURRENT_THRESHOLDS.CHARGING) return "CHARGING";
  if (current <= CURRENT_THRESHOLDS.NEUTRAL) return "IDLE";
  if (current <= CURRENT_THRESHOLDS.HIGH_DRAW) return "NORMAL DRAW";
  if (current <= CURRENT_THRESHOLDS.MAX_DRAW) return "HIGH DRAW";
  return "OVERLOAD";
};

// Get current indicators
const getCurrentStatusSecondary = (current) => {
  if (current <= CURRENT_THRESHOLDS.CHARGING) return "Regenerating";
  return "Consuming";
};

// Format time since last update
const formatTimeSince = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  const seconds = Math.floor((new Date() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ago`;
};

// Optimized SVG-based gauge component to replace ApexCharts
const OptimizedGauge = memo(({ 
  value, 
  min, 
  max, 
  title, 
  unit, 
  color, 
  size,
  secondaryText,
  valuePrecision = 1
}) => {
  const theme = useTheme();
  
  // Calculate angle based on value
  const startAngle = -135;
  const endAngle = 135;
  const angleRange = endAngle - startAngle;
  const valuePercentage = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const angle = startAngle + (angleRange * valuePercentage / 100);
  
  // Calculate coordinates for the gauge arc
  const centerX = 50;
  const centerY = 60;
  const radius = 40;
  
  // Start and end points for background arc
  const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
  const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
  const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
  const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
  
  // Calculate point for value arc
  const valueX = centerX + radius * Math.cos((angle * Math.PI) / 180);
  const valueY = centerY + radius * Math.sin((angle * Math.PI) / 180);
  
  // Create tick marks - 5 evenly spaced ticks
  const ticks = [];
  for (let i = 0; i <= 4; i++) {
    const tickAngle = startAngle + (angleRange * i / 4);
    const tickValue = min + ((max - min) * i / 4);
    const innerRadius = radius - 5;
    const outerRadius = radius + 2;
    
    const innerX = centerX + innerRadius * Math.cos((tickAngle * Math.PI) / 180);
    const innerY = centerY + innerRadius * Math.sin((tickAngle * Math.PI) / 180);
    const outerX = centerX + outerRadius * Math.cos((tickAngle * Math.PI) / 180);
    const outerY = centerY + outerRadius * Math.sin((tickAngle * Math.PI) / 180);
    
    const labelX = centerX + (outerRadius + 8) * Math.cos((tickAngle * Math.PI) / 180);
    const labelY = centerY + (outerRadius + 8) * Math.sin((tickAngle * Math.PI) / 180);
    
    ticks.push({
      line: { innerX, innerY, outerX, outerY },
      label: { x: labelX, y: labelY, value: tickValue.toFixed(0) }
    });
  }
  
  // Format the value for display
  const formattedValue = value.toFixed(valuePrecision);
  
  return (
    <Box 
      sx={{ 
        position: 'relative', 
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
      role="img"
      aria-label={`${title} gauge showing ${value.toFixed(valuePrecision)} ${unit}`}
    >
      {/* Title - positioned absolutely to ensure consistent alignment */}
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ 
          position: 'absolute',
          top: 0,
          textAlign: 'center',
          fontSize: '0.8rem',
          fontWeight: 'medium',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        {title}
      </Typography>
      
      {/* SVG Gauge */}
      <Box sx={{ 
        position: 'relative', 
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        mt: 3, // Add margin top to make room for the title
        mb: 5  // Add margin bottom to make room for the status text
      }}>
        <svg 
          viewBox="0 0 100 100" 
          width={size} 
          height={size}
          style={{ overflow: 'visible' }}
        >
          {/* Background track */}
          <path
            d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${endX} ${endY}`}
            fill="none"
            stroke={theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}
            strokeWidth="6"
            strokeLinecap="round"
          />
          
          {/* Value track */}
          <path
            d={`M ${startX} ${startY} A ${radius} ${radius} 0 0 1 ${valueX} ${valueY}`}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
          />
          
          {/* Center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={20}
            fill={theme.palette.mode === 'dark' ? '#1e1e2f' : '#f8f9fa'}
          />
          
          {/* Tick marks and labels */}
          {ticks.map((tick, index) => (
            <React.Fragment key={index}>
              <line
                x1={tick.line.innerX}
                y1={tick.line.innerY}
                x2={tick.line.outerX}
                y2={tick.line.outerY}
                stroke={theme.palette.text.secondary}
                strokeWidth="1"
              />
              <text
                x={tick.label.x}
                y={tick.label.y}
                fontSize="8"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={theme.palette.text.secondary}
              >
                {tick.label.value}
              </text>
            </React.Fragment>
          ))}
        </svg>
        
        {/* Custom value display in center */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            width: '100%',
            pointerEvents: 'none'
          }}
        >
          <Typography
            color={color}
            fontWeight="bold"
            sx={{ 
              fontSize: `${size * 0.12}px`,
              lineHeight: 1.1,
              mb: 0.5
            }}
          >
            {formattedValue}
          </Typography>
          <Typography
            color="text.secondary"
            sx={{ 
              fontSize: `${size * 0.07}px`,
              lineHeight: 1
            }}
          >
            {unit}
          </Typography>
        </Box>
      </Box>
      
      {/* Status text - positioned absolutely to ensure consistent alignment */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'auto',
          minWidth: '120px',
          zIndex: 2,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.7)',
          borderRadius: '4px',
          boxShadow: '0 0 4px rgba(0,0,0,0.1)',
          px: 2,
          py: 0.75,
          textAlign: 'center'
        }}
      >
        <Typography 
          variant="body2" 
          color={color}
          sx={{ 
            fontWeight: 'medium',
            fontSize: '0.75rem',
            whiteSpace: 'nowrap'
          }}
        >
          {secondaryText}
        </Typography>
      </Box>
    </Box>
  );
});

// Optimized Power indicator component
const PowerIndicator = memo(({ power, size }) => {
  const theme = useTheme();
  const colors = usePackColors();
  
  // Determine if the power is charging (negative) or discharging (positive)
  const isCharging = power < 0;
  const powerColor = isCharging ? colors.CHARGING : colors.PRIMARY;
  
  // Format the power value
  const powerFormatted = formatPower(power);
  
  // Extract just the number part for the circle
  const powerValueOnly = powerFormatted.split(' ')[0];
  const powerUnitOnly = powerFormatted.split(' ')[1];
  
  // Display state (charging/discharging)
  const stateText = isCharging ? 'CHARGING' : 'DISCHARGING';
  
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
      role="status"
      aria-label={`Power: ${powerFormatted}, state: ${stateText}`}
    >
      {/* Title outside the circle */}
      <Typography 
        variant="caption" 
        color="text.secondary"
        sx={{ 
          position: 'absolute',
          top: 0,
          fontSize: '0.8rem',
          fontWeight: 'medium',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}
      >
        Power
      </Typography>
      
      {/* Circle with power value */}
      <Box
        sx={{
          width: Math.min(size * 0.85, 120), // Keep size reasonable and consistent
          height: Math.min(size * 0.85, 120),
          borderRadius: '50%',
          border: `3px solid ${powerColor}`,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: theme.palette.mode === 'dark' ? '#1e1e2f' : '#f8f9fa',
          boxShadow: `0 0 10px ${powerColor}40`,
          position: 'relative',
          aspectRatio: '1/1',
          overflow: 'visible',
          p: 0,
          mt: 3, // Add margin top to make room for the title
          mb: 5  // Add margin bottom for status text
        }}
      >
        {/* Icon for charging/discharging */}
        <Box
          sx={{
            position: 'absolute',
            top: '-12px',
            right: '-12px',
            width: '28px',
            height: '28px',
            color: powerColor,
            backgroundColor: theme.palette.background.paper,
            borderRadius: '50%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            border: `2px solid ${powerColor}`,
            boxShadow: `0 0 8px ${powerColor}40`,
            zIndex: 2
          }}
        >
          {isCharging ? <BatteryCharging size={16} /> : <Zap size={16} />}
        </Box>
        
        {/* Center content in the circle */}
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          height: '100%',
          width: '100%',
          p: 1
        }}>
          <Typography
            color={powerColor}
            fontWeight="bold"
            sx={{ 
              fontSize: `${size * 0.16}px`, // Responsive but slightly smaller
              lineHeight: 1.1,
              textAlign: 'center',
              mb: 0.5
            }}
          >
            {powerValueOnly}
          </Typography>
          
          <Typography
            color={powerColor}
            sx={{ 
              fontSize: `${size * 0.08}px`,
              fontWeight: 'medium',
              lineHeight: 1,
              mb: 0
            }}
          >
            {powerUnitOnly}
          </Typography>
        </Box>
      </Box>
      
      {/* Status text */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 5,
          minWidth: '120px',
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)',
          borderRadius: '4px',
          boxShadow: '0 0 4px rgba(0,0,0,0.1)',
          px: 2,
          py: 0.75,
          textAlign: 'center'
        }}
      >
        <Typography
          variant="caption"
          color={powerColor}
          sx={{ 
            fontSize: '0.75rem',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap',
            display: 'block'
          }}
        >
          {stateText}
        </Typography>
      </Box>
    </Box>
  );
});

// Loading version of power indicator for skeleton state
const PowerIndicatorSkeleton = memo(({ size }) => {
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
      }}
    >
      <Skeleton variant="text" width={60} height={20} sx={{ position: 'absolute', top: 0 }} />
      <Skeleton variant="circular" width={Math.min(size * 0.85, 120)} height={Math.min(size * 0.85, 120)} sx={{ mt: 3, mb: 5 }} />
      <Skeleton variant="rounded" width={120} height={24} sx={{ position: 'absolute', bottom: 0 }} />
    </Box>
  );
});

// Indicator card component with enhanced design - optimized
const IndicatorCard = memo(({ title, value, unit, status, color, icon: Icon }) => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s ease'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, gap: 0.5 }}>
        <Tooltip title={`${title} indicator`} arrow placement="top">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {Icon && <Icon size={16} color={color} />}
            
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontWeight: 'medium',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: theme.palette.text.primary
              }}
            >
              {title}
            </Typography>
          </Box>
        </Tooltip>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 0.5 }}>
        <Typography 
          variant="h6" 
          color={color} 
          fontWeight="bold"
          sx={{ 
            fontSize: '1.1rem',
            lineHeight: 1.2
          }}
        >
          {value}
        </Typography>
        
        {unit && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              ml: 0.5, 
              fontSize: '0.75rem',
              lineHeight: 1.2
            }}
          >
            {unit}
          </Typography>
        )}
      </Box>
      
      <Typography 
        variant="caption" 
        color={color}
        sx={{ 
          fontSize: '0.7rem',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          mt: 'auto'
        }}
      >
        {status}
      </Typography>
    </Box>
  );
});

// Skeleton for indicator card
const IndicatorCardSkeleton = memo(() => {
  const theme = useTheme();
  
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
        border: `1px solid ${theme.palette.divider}`
      }}
    >
      <Skeleton variant="text" width="50%" height={24} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="70%" height={28} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="60%" height={20} sx={{ mt: 'auto' }} />
    </Box>
  );
});

// Status indicator component
const StatusIndicator = memo(({ status, icon: Icon, color }) => {
  const theme = useTheme();
  
  return (
    <Tooltip title={status} arrow placement="left">
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 0.5,
          backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
          borderRadius: 1,
          px: 1.5,
          py: 0.5,
          border: `1px solid ${theme.palette.divider}`
        }}
      >
        <Icon size={16} color={color} />
        <Typography 
          variant="body2" 
          color="text.primary"
          sx={{ fontSize: '0.8rem' }}
        >
          {status}
        </Typography>
      </Box>
    </Tooltip>
  );
});

// Main component - optimized with useReducer
const PackGauge = () => {
  const theme = useTheme();
  const colors = usePackColors();
  const { ref, width } = useResizeObserver();
  
  // Responsive sizes based on media queries
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));
  
  // Calculate responsive sizes based on container width
  const gaugeSize = useMemo(() => 
    isMobile ? 150 : isTablet ? 170 : 190, 
  [isMobile, isTablet]);
  
  const powerSize = useMemo(() => 
    isMobile ? 110 : isTablet ? 120 : 140, 
  [isMobile, isTablet]);
  
  // Use reducer for state management
  const [state, dispatch] = useReducer(packReducer, initialState);
  
  // Destructure state for easier access
  const { 
    voltage, 
    current, 
    power, 
    isLoading, 
    dataStale, 
    error, 
    lastUpdated, 
    voltageRange, 
    currentRange, 
    stats 
  } = state;
  
  // References
  const staleTimerRef = useRef(null);
  
  // Create memoized throttled dispatch functions
  const throttledVoltageDispatch = useCallback(
    throttle((value) => {
      dispatch({ type: 'VOLTAGE_UPDATE', payload: value });
    }, THROTTLE_TIME),
    []
  );
  
  const throttledCurrentDispatch = useCallback(
    throttle((value) => {
      dispatch({ type: 'CURRENT_UPDATE', payload: value });
    }, THROTTLE_TIME),
    []
  );
  
  // Subscribe to voltage data - optimized
  useRealTimeData('pack_voltage', (msg) => {
    try {
      const fields = msg.payload?.fields;
      if (!fields?.voltage?.numberValue) return;
      
      const newVoltage = fields.voltage.numberValue;
      throttledVoltageDispatch(newVoltage);
      
      // Reset stale timer
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
      
      staleTimerRef.current = setTimeout(() => {
        dispatch({ type: 'DATA_STALE' });
      }, DATA_STALE_TIMEOUT);
      
    } catch (error) {
      console.error('Error processing voltage data:', error);
      dispatch({ type: 'ERROR', payload: 'Failed to process voltage data' });
    }
  });
  
  // Subscribe to current data - optimized
  useRealTimeData('pack_current', (msg) => {
    try {
      const fields = msg.payload?.fields;
      if (!fields?.current?.numberValue) return;
      
      const newCurrent = fields.current.numberValue;
      throttledCurrentDispatch(newCurrent);
      
      // Reset stale timer
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
      
      staleTimerRef.current = setTimeout(() => {
        dispatch({ type: 'DATA_STALE' });
      }, DATA_STALE_TIMEOUT);
      
    } catch (error) {
      console.error('Error processing current data:', error);
      dispatch({ type: 'ERROR', payload: 'Failed to process current data' });
    }
  });
  
  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
      // Clean up throttled functions
      throttledVoltageDispatch.cancel();
      throttledCurrentDispatch.cancel();
    };
  }, [throttledVoltageDispatch, throttledCurrentDispatch]);
  
  // Memoize derived values to prevent unnecessary calculations
  const currentStatus = useMemo(() => getCurrentStatus(current), [current]);
  
  const currentStatusIcon = useMemo(() => {
    if (current <= CURRENT_THRESHOLDS.CHARGING) return BatteryCharging;
    if (current > CURRENT_THRESHOLDS.HIGH_DRAW) return AlertTriangle;
    return Zap;
  }, [current]);
  
  const currentStatusColor = useMemo(() => {
    if (current <= CURRENT_THRESHOLDS.CHARGING) return colors.CHARGING;
    if (current > CURRENT_THRESHOLDS.HIGH_DRAW) return colors.WARNING;
    return current > 0 ? colors.PRIMARY : colors.INFO;
  }, [current, colors]);

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
        boxShadow: 1,
        position: 'relative'
      }}
      ref={ref}
    >
      {/* Header */}
      <Box sx={{ 
        px: 2, 
        py: 1.5, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Battery pack monitoring" arrow placement="right">
            <Battery size={18} color={getVoltageColor(voltage, colors)} />
          </Tooltip>
          <Typography 
            variant="h6" 
            color="text.primary"
            sx={{ 
              fontWeight: 'medium',
              fontSize: '1rem'
            }}
          >
            Battery Pack
          </Typography>
        </Box>
        
        {isLoading ? (
          <Skeleton variant="rounded" width={120} height={32} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {dataStale && (
              <Tooltip title={`Last update: ${formatTimeSince(lastUpdated)}`} arrow placement="left">
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 0.5,
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                    borderRadius: 1,
                    px: 1,
                    py: 0.5,
                    border: `1px solid ${theme.palette.divider}`
                  }}
                >
                  <Clock size={14} color={theme.palette.warning.main} />
                  <Typography 
                    variant="caption" 
                    color="warning.main"
                    sx={{ fontSize: '0.7rem' }}
                  >
                    Stale data
                  </Typography>
                </Box>
              </Tooltip>
            )}
            
            <StatusIndicator 
              status={currentStatus}
              icon={currentStatusIcon}
              color={currentStatusColor}
            />
          </Box>
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
          flexGrow: 1,
          overflowY: 'auto',
          gap: 2
        }}
      >
        {/* Top section - gauges */}
        <Box 
          sx={{ 
            p: 1,
            backgroundColor: colors.PANEL_BG,
            borderRadius: 1,
            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
            border: `1px solid ${theme.palette.divider}`
          }}
        >
          <Grid container spacing={1} justifyContent="space-around">
            {/* Voltage Gauge */}
            <Grid item xs={12} sm={4} sx={{ 
              height: gaugeSize + 48, // Fixed height for all gauges with space for title and status 
              display: 'flex',
              justifyContent: 'center', 
              mb: { xs: 1, sm: 0 },
              position: 'relative'
            }}>
              {isLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', position: 'relative' }}>
                  <Skeleton variant="text" width={80} height={20} sx={{ position: 'absolute', top: 0 }} />
                  <Skeleton variant="circular" width={gaugeSize * 0.8} height={gaugeSize * 0.8} sx={{ mt: 3, mb: 5 }} />
                  <Skeleton variant="text" width={120} height={24} sx={{ position: 'absolute', bottom: 0 }} />
                </Box>
              ) : (
                <OptimizedGauge
                  value={voltage}
                  min={0}
                  max={voltageRange[1]}
                  title="Pack Voltage"
                  unit="V"
                  color={getVoltageColor(voltage, colors)}
                  secondaryText={getVoltageStatus(voltage)}
                  size={gaugeSize}
                />
              )}
            </Grid>
            
            {/* Power Indicator */}
            <Grid item xs={12} sm={4} sx={{ 
              height: gaugeSize + 48, // Match height of other gauges
              display: 'flex', 
              justifyContent: 'center',
              alignItems: 'center',
              mb: { xs: 1, sm: 0 },
              position: 'relative'
            }}>
              {isLoading ? (
                <PowerIndicatorSkeleton size={powerSize} />
              ) : (
                <PowerIndicator power={power} size={powerSize} />
              )}
            </Grid>
            
            {/* Current Gauge */}
            <Grid item xs={12} sm={4} sx={{ 
              height: gaugeSize + 48, // Match height of other gauges
              display: 'flex',
              justifyContent: 'center',
              position: 'relative'
            }}>
              {isLoading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', position: 'relative' }}>
                  <Skeleton variant="text" width={80} height={20} sx={{ position: 'absolute', top: 0 }} />
                  <Skeleton variant="circular" width={gaugeSize * 0.8} height={gaugeSize * 0.8} sx={{ mt: 3, mb: 5 }} />
                  <Skeleton variant="text" width={120} height={24} sx={{ position: 'absolute', bottom: 0 }} />
                </Box>
              ) : (
                <OptimizedGauge
                  value={current}
                  min={currentRange[0]}
                  max={currentRange[1]}
                  title="Pack Current"
                  unit="A"
                  color={getCurrentColor(current, colors)}
                  secondaryText={getCurrentStatusSecondary(current)}
                  size={gaugeSize}
                />
              )}
            </Grid>
          </Grid>
        </Box>
        
        {/* Stats and indicators */}
        <Box>
          <Grid container spacing={1.5}>
            {/* First row */}
            <Grid item xs={12} sm={4}>
              {isLoading ? (
                <IndicatorCardSkeleton />
              ) : (
                <IndicatorCard
                  title="Peak Voltage"
                  value={stats.voltage.max.toFixed(1)}
                  unit="V"
                  status="Maximum recorded"
                  color={getVoltageColor(stats.voltage.max, colors)}
                  icon={Battery}
                />
              )}
            </Grid>
            
            <Grid item xs={12} sm={4}>
              {isLoading ? (
                <IndicatorCardSkeleton />
              ) : (
                <IndicatorCard
                  title="Peak Current"
                  value={stats.current.max.toFixed(1)}
                  unit="A"
                  status="Maximum consumption"
                  color={getCurrentColor(stats.current.max, colors)}
                  icon={Zap}
                />
              )}
            </Grid>
            
            <Grid item xs={12} sm={4}>
              {isLoading ? (
                <IndicatorCardSkeleton />
              ) : (
                <IndicatorCard
                  title="Peak Power"
                  value={formatPower(stats.power.max)}
                  unit=""
                  status="Maximum output"
                  color={colors.PRIMARY}
                  icon={BarChart3}
                />
              )}
            </Grid>
            
            {/* Second row */}
            <Grid item xs={12} sm={4}>
              {isLoading ? (
                <IndicatorCardSkeleton />
              ) : (
                <IndicatorCard
                  title="Min Voltage"
                  value={stats.voltage.min.toFixed(1)}
                  unit="V"
                  status="Minimum recorded"
                  color={getVoltageColor(stats.voltage.min, colors)}
                  icon={Battery}
                />
              )}
            </Grid>
            
            <Grid item xs={12} sm={4}>
              {isLoading ? (
                <IndicatorCardSkeleton />
              ) : (
                <IndicatorCard
                  title="Peak Regen"
                  value={Math.abs(Math.min(0, stats.current.min)).toFixed(1)}
                  unit="A"
                  status="Maximum regeneration"
                  color={colors.CHARGING}
                  icon={BatteryCharging}
                />
              )}
            </Grid>
            
            <Grid item xs={12} sm={4}>
              {isLoading ? (
                <IndicatorCardSkeleton />
              ) : (
                <IndicatorCard
                  title="Current State"
                  value={getCurrentStatus(current)}
                  unit=""
                  status={`${Math.abs(current).toFixed(1)}A ${current < 0 ? 'charging' : 'draw'}`}
                  color={getCurrentColor(current, colors)}
                  icon={current < 0 ? BatteryCharging : Zap}
                />
              )}
            </Grid>
          </Grid>
        </Box>
      </Box>
      
      {/* Full-screen loading overlay (only on initial load) */}
      {isLoading && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(0,0,0,0.7)' 
              : 'rgba(255,255,255,0.7)',
            zIndex: 10,
            gap: 2,
            backdropFilter: 'blur(2px)'
          }}
          aria-live="polite"
          aria-busy={isLoading}
        >
          <Battery size={30} color={theme.palette.primary.main} />
          <Typography variant="h6" color="text.primary">
            Connecting to battery...
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default memo(PackGauge);