import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  useTheme,
  Alert,
  Tooltip,
  Skeleton
} from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';
import { useDebounce } from 'use-debounce';
import { Thermometer, Cpu, AlertTriangle } from 'lucide-react';

// Constants - moved outside component for better memory management
const TEMP_THRESHOLDS = {
  NORMAL: 60,
  WARNING: 80,
  CRITICAL: 120,
  MAX_SCALE: 150
};

// Temperature lookup table - expanded to include lower values
const TEMP_LOOKUP_TABLE = [
  { temp: -60, value: 10000 },  // Added lower temperature values
  { temp: -55, value: 10500 },
  { temp: -50, value: 11000 },
  { temp: -45, value: 11500 },
  { temp: -40, value: 12000 },
  { temp: -35, value: 13000 },
  { temp: -30, value: 16308 },
  { temp: -25, value: 16387 },
  { temp: -20, value: 16487 },
  { temp: -15, value: 16609 },
  { temp: -10, value: 16757 },
  { temp: -5, value: 16938 },
  { temp: 0, value: 17151 },
  { temp: 5, value: 17400 },
  { temp: 10, value: 17688 },
  { temp: 15, value: 18017 },
  { temp: 20, value: 18387 },
  { temp: 25, value: 18797 },
  { temp: 30, value: 19247 },
  { temp: 35, value: 19733 },
  { temp: 40, value: 20250 },
  { temp: 45, value: 20793 },
  { temp: 50, value: 21357 },
  { temp: 55, value: 21933 },
  { temp: 60, value: 22515 },
  { temp: 65, value: 23097 },
  { temp: 70, value: 23671 },
  { temp: 75, value: 24232 },
  { temp: 80, value: 24775 },
  { temp: 85, value: 25296 },
  { temp: 90, value: 25792 },
  { temp: 95, value: 26261 },
  { temp: 100, value: 26702 },
  { temp: 105, value: 27114 },
  { temp: 110, value: 27497 },
  { temp: 115, value: 27851 },
  { temp: 120, value: 28179 },
  { temp: 125, value: 28480 }
];

// Utility functions - moved outside component for better performance
const convertSensorToTemp = (sensorValue) => {
  // Early returns for edge cases
  if (!sensorValue) return 0;
  if (sensorValue <= TEMP_LOOKUP_TABLE[0].value) return TEMP_LOOKUP_TABLE[0].temp;
  if (sensorValue >= TEMP_LOOKUP_TABLE[TEMP_LOOKUP_TABLE.length - 1].value) return TEMP_LOOKUP_TABLE[TEMP_LOOKUP_TABLE.length - 1].temp;
  
  // Binary search for faster lookup with large tables
  let low = 0;
  let high = TEMP_LOOKUP_TABLE.length - 1;
  
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (TEMP_LOOKUP_TABLE[mid].value < sensorValue) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  
  // If we found exact match
  if (TEMP_LOOKUP_TABLE[low].value === sensorValue) {
    return TEMP_LOOKUP_TABLE[low].temp;
  }
  
  // Otherwise, interpolate between the two closest values
  const upperIndex = low;
  const lowerIndex = Math.max(0, low - 1);
  
  const lowerValue = TEMP_LOOKUP_TABLE[lowerIndex].value;
  const upperValue = TEMP_LOOKUP_TABLE[upperIndex].value;
  const lowerTemp = TEMP_LOOKUP_TABLE[lowerIndex].temp;
  const upperTemp = TEMP_LOOKUP_TABLE[upperIndex].temp;
  
  // Linear interpolation
  return lowerTemp + (sensorValue - lowerValue) * (upperTemp - lowerTemp) / (upperValue - lowerValue);
};

const getTempColor = (temp, colors) => {
  if (temp >= TEMP_THRESHOLDS.CRITICAL) return colors.CRITICAL;
  if (temp >= TEMP_THRESHOLDS.WARNING) return colors.WARNING;
  return colors.SAFE;
};

const getStatusMessage = (temp) => {
  if (temp >= TEMP_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (temp >= TEMP_THRESHOLDS.WARNING) return 'WARNING';
  return 'NORMAL';
};

// Web worker setup for temperature processing
const createTempWorker = () => {
  const workerCode = `
    const TEMP_LOOKUP_TABLE = ${JSON.stringify(TEMP_LOOKUP_TABLE)};
    
    function convertSensorToTemp(sensorValue) {
      if (!sensorValue) return 0;
      if (sensorValue <= TEMP_LOOKUP_TABLE[0].value) return TEMP_LOOKUP_TABLE[0].temp;
      if (sensorValue >= TEMP_LOOKUP_TABLE[TEMP_LOOKUP_TABLE.length - 1].value) {
        return TEMP_LOOKUP_TABLE[TEMP_LOOKUP_TABLE.length - 1].temp;
      }
      
      let low = 0;
      let high = TEMP_LOOKUP_TABLE.length - 1;
      
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (TEMP_LOOKUP_TABLE[mid].value < sensorValue) {
          low = mid + 1;
        } else {
          high = mid;
        }
      }
      
      if (TEMP_LOOKUP_TABLE[low].value === sensorValue) {
        return TEMP_LOOKUP_TABLE[low].temp;
      }
      
      const upperIndex = low;
      const lowerIndex = Math.max(0, low - 1);
      
      const lowerValue = TEMP_LOOKUP_TABLE[lowerIndex].value;
      const upperValue = TEMP_LOOKUP_TABLE[upperIndex].value;
      const lowerTemp = TEMP_LOOKUP_TABLE[lowerIndex].temp;
      const upperTemp = TEMP_LOOKUP_TABLE[upperIndex].temp;
      
      return lowerTemp + (sensorValue - lowerValue) * (upperTemp - lowerTemp) / (upperValue - lowerValue);
    }
    
    self.onmessage = function(e) {
      const { rawMotor, rawController } = e.data;
      
      // Convert raw values to temperatures
      const motorTemp = convertSensorToTemp(rawMotor);
      const controllerTemp = convertSensorToTemp(rawController);
      
      // Calculate stats
      const motorStats = {
        current: motorTemp,
        status: motorTemp >= 120 ? 'CRITICAL' : motorTemp >= 80 ? 'WARNING' : 'NORMAL'
      };
      
      const controllerStats = {
        current: controllerTemp,
        status: controllerTemp >= 120 ? 'CRITICAL' : controllerTemp >= 80 ? 'WARNING' : 'NORMAL'
      };
      
      self.postMessage({
        motorTemp,
        controllerTemp,
        motorStats,
        controllerStats
      });
    };
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

// Custom hook for temperature colors
const useTempColors = () => {
  const theme = useTheme();
  
  return {
    SAFE: theme.palette.success.main,
    WARNING: theme.palette.warning.main,
    CRITICAL: theme.palette.error.main,
    MOTOR: theme.palette.secondary.main,
    CONTROLLER: theme.palette.primary.main,
    TEXT: theme.palette.text.primary,
    TEXT_SECONDARY: theme.palette.text.secondary,
    BACKGROUND: theme.palette.mode === 'dark' 
      ? 'rgba(30, 30, 30, 0.9)' 
      : 'rgba(245, 245, 245, 0.9)',
    PANEL_BG: theme.palette.mode === 'dark' 
      ? 'rgba(0, 0, 0, 0.5)' 
      : 'rgba(240, 240, 240, 0.8)'
  };
};

// Modern Temperature Visualization
const TemperatureBar = memo(({ 
  temp, 
  label, 
  maxTemp = TEMP_THRESHOLDS.MAX_SCALE, 
  icon: Icon,
  color,
  statusColor
}) => {
  const theme = useTheme();
  
  // Calculate percentage for visual fill
  const percentage = useMemo(() => {
    // Calculate with respect to potential negative values
    const adjustedTemp = Math.max(-20, Math.min(maxTemp, temp));
    const range = maxTemp + 20; // Add 20 for the negative range
    return ((adjustedTemp + 20) / range) * 100;
  }, [temp, maxTemp]);
  
  return (
    <Box sx={{ 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1
    }}>
      {/* Label */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.75, 
        width: '100%', 
        justifyContent: 'center',
        mb: 0.5
      }}>
        <Icon size={18} color={color} />
        <Typography variant="subtitle2" sx={{ fontSize: '0.9rem', fontWeight: 'medium' }}>
          {label}
        </Typography>
      </Box>
      
      {/* Temperature value */}
      <Box sx={{ 
        position: 'relative',
        width: '100%',
        textAlign: 'center'
      }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontSize: { xs: '1.6rem', sm: '2rem' },
            fontWeight: 'bold',
            color: statusColor,
            lineHeight: 1.1,
            mb: 0.5
          }}
        >
          {temp.toFixed(1)}°C
        </Typography>
        <Typography
          variant="caption"
          sx={{
            color: statusColor,
            fontWeight: 'medium',
            fontSize: '0.7rem',
            backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.5)',
            px: 1,
            py: 0.25,
            borderRadius: 1
          }}
        >
          {getStatusMessage(temp)}
        </Typography>
      </Box>
      
      {/* Temperature bar visualization */}
      <Box sx={{
        position: 'relative',
        width: '100%',
        height: 12,
        borderRadius: 2,
        backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.1)',
        overflow: 'hidden',
        mt: 1
      }}>
        {/* Temperature fill */}
        <Box 
          sx={{
            position: 'absolute',
            left: 0,
            bottom: 0,
            width: `${percentage}%`,
            height: '100%',
            background: `linear-gradient(90deg, 
              ${theme.palette.success.main} 0%, 
              ${theme.palette.success.main} ${(TEMP_THRESHOLDS.NORMAL / maxTemp) * 100}%, 
              ${theme.palette.warning.main} ${(TEMP_THRESHOLDS.NORMAL / maxTemp) * 100}%, 
              ${theme.palette.warning.main} ${(TEMP_THRESHOLDS.CRITICAL / maxTemp) * 100}%, 
              ${theme.palette.error.main} ${(TEMP_THRESHOLDS.CRITICAL / maxTemp) * 100}%, 
              ${theme.palette.error.main} 100%)`,
            transition: 'width 0.3s ease'
          }}
        />
        
        {/* Threshold markers */}
        <Box 
          sx={{
            position: 'absolute',
            left: `${(TEMP_THRESHOLDS.NORMAL / maxTemp) * 100}%`,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: theme.palette.warning.main,
            opacity: 0.5
          }}
        />
        <Box 
          sx={{
            position: 'absolute',
            left: `${(TEMP_THRESHOLDS.CRITICAL / maxTemp) * 100}%`,
            top: 0,
            bottom: 0,
            width: 2,
            backgroundColor: theme.palette.error.main,
            opacity: 0.5
          }}
        />
      </Box>
      
      {/* Temperature scale legend */}
      <Box sx={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'space-between',
        mt: 0.25
      }}>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
          -20°C
        </Typography>
        <Typography variant="caption" sx={{ fontSize: '0.65rem', color: 'text.secondary' }}>
          {TEMP_THRESHOLDS.MAX_SCALE}°C
        </Typography>
      </Box>
    </Box>
  );
});

// Skeleton for temperature bar
const TemperatureBarSkeleton = memo(() => {
  const theme = useTheme();
  
  return (
    <Box sx={{ 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      alignItems: 'center',
      gap: 1
    }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.75, 
        width: '100%', 
        justifyContent: 'center',
        mb: 0.5
      }}>
        <Skeleton variant="circular" width={18} height={18} />
        <Skeleton variant="text" width={80} height={24} />
      </Box>
      
      <Box sx={{ textAlign: 'center', width: '100%' }}>
        <Skeleton variant="text" width="80%" height={50} sx={{ mx: 'auto' }} />
        <Skeleton variant="rounded" width={70} height={24} sx={{ mx: 'auto' }} />
      </Box>
      
      <Skeleton variant="rounded" width="100%" height={12} sx={{ borderRadius: 2 }} />
      
      <Box sx={{ 
        width: '100%', 
        display: 'flex', 
        justifyContent: 'space-between',
        mt: 0.25
      }}>
        <Skeleton variant="text" width={30} height={16} />
        <Skeleton variant="text" width={30} height={16} />
      </Box>
    </Box>
  );
});

// Additional temperature details card
const TemperatureDetails = memo(({ title, temp, rawValue, color, icon: Icon }) => {
  const theme = useTheme();
  const statusColor = useMemo(() => getTempColor(temp, useTempColors()), [temp]);
  
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
        <Icon size={16} color={color} />
        <Typography 
          variant="subtitle2" 
          sx={{ 
            fontSize: '0.8rem',
            fontWeight: 'medium'
          }}
        >
          {title}
        </Typography>
      </Box>
      
      <Grid container spacing={1}>
        <Grid item xs={6}>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              fontSize: '0.65rem',
              fontWeight: 'medium',
              display: 'block',
              mb: 0.5
            }}
          >
            Temperature
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontSize: '1.1rem',
                fontWeight: 'bold',
                color: statusColor,
                lineHeight: 1
              }}
            >
              {temp.toFixed(1)}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                color: 'text.secondary',
                fontSize: '0.7rem'
              }}
            >
              °C
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={6}>
          <Typography 
            variant="caption" 
            color="text.secondary" 
            sx={{ 
              fontSize: '0.65rem',
              fontWeight: 'medium',
              display: 'block',
              mb: 0.5
            }}
          >
            Raw Value
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontSize: '0.8rem' }}
          >
            {rawValue.toFixed(0)}
          </Typography>
        </Grid>
        
        <Grid item xs={12} sx={{ mt: 0.5 }}>
          <Box 
            sx={{ 
              px: 1, 
              py: 0.5, 
              borderRadius: 1, 
              backgroundColor: statusColor,
              opacity: 0.1,
              border: `1px solid ${statusColor}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography 
              variant="caption" 
              sx={{ 
                color: statusColor,
                fontSize: '0.7rem',
                fontWeight: 'medium'
              }}
            >
              {getStatusMessage(temp)}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
});

// Skeleton for temperature details
const TemperatureDetailsSkeleton = memo(() => {
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
        <Skeleton variant="circular" width={16} height={16} />
        <Skeleton variant="text" width={120} height={20} />
      </Box>
      
      <Grid container spacing={1}>
        <Grid item xs={6}>
          <Skeleton variant="text" width={60} height={16} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width={50} height={28} />
        </Grid>
        
        <Grid item xs={6}>
          <Skeleton variant="text" width={60} height={16} sx={{ mb: 0.5 }} />
          <Skeleton variant="text" width={40} height={20} />
        </Grid>
        
        <Grid item xs={12} sx={{ mt: 0.5 }}>
          <Skeleton variant="rounded" width="100%" height={28} sx={{ borderRadius: 1 }} />
        </Grid>
      </Grid>
    </Box>
  );
});

// Loading overlay component
const LoadingOverlay = memo(({ visible }) => {
  const theme = useTheme();
  
  if (!visible) return null;
  
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(0,0,0,0.8)' 
          : 'rgba(255,255,255,0.8)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
        gap: 2,
        borderRadius: 1
      }}
    >
      <Thermometer size={30} />
      <Typography variant="h6">
        Waiting for temperature data...
      </Typography>
    </Box>
  );
});

// Main component
const MotorControllerTempGauge = () => {
  const theme = useTheme();
  const colors = useTempColors();
  
  // State
  const [motorTemp, setMotorTemp] = useState(0);
  const [controllerTemp, setControllerTemp] = useState(0);
  const [rawMotorTemp, setRawMotorTemp] = useState(0);
  const [rawControllerTemp, setRawControllerTemp] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Debounced temps for smoother display
  const [debouncedMotorTemp] = useDebounce(motorTemp, 250);
  const [debouncedControllerTemp] = useDebounce(controllerTemp, 250);
  
  // References
  const tempWorkerRef = useRef(null);
  
  // Memoized temperature status colors
  const motorStatusColor = useMemo(() => getTempColor(debouncedMotorTemp, colors), [debouncedMotorTemp, colors]);
  const controllerStatusColor = useMemo(() => getTempColor(debouncedControllerTemp, colors), [debouncedControllerTemp, colors]);
  
  // Initialize web worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        tempWorkerRef.current = createTempWorker();
        
        tempWorkerRef.current.onmessage = (e) => {
          const { motorTemp, controllerTemp } = e.data;
          
          setMotorTemp(motorTemp);
          setControllerTemp(controllerTemp);
          
          // Update loading state if we've received data
          if (isLoading && (motorTemp !== 0 || controllerTemp !== 0)) {
            setIsLoading(false);
          }
        };
      } catch (err) {
        console.error('Failed to create web worker:', err);
        // Fallback to main thread calculation if worker fails
      }
    }
    
    return () => {
      if (tempWorkerRef.current) {
        tempWorkerRef.current.terminate();
      }
    };
  }, [isLoading]);
  
  // Subscribe to real-time temperature data
  useRealTimeData('bamo_car_re_transmit', (msg) => {
    try {
      const fields = msg.payload?.fields;
      if (!fields) return;
      
      // Clear any previous errors
      if (error) setError(null);
      
      // Get raw sensor values
      const newRawMotorTemp = fields.motor_temp?.numberValue !== undefined 
        ? fields.motor_temp.numberValue 
        : rawMotorTemp;
        
      const newRawControllerTemp = fields.controller_temp?.numberValue !== undefined 
        ? fields.controller_temp.numberValue 
        : rawControllerTemp;
      
      // Store raw values
      setRawMotorTemp(newRawMotorTemp);
      setRawControllerTemp(newRawControllerTemp);
      
      // Use web worker for temperature conversion
      if (tempWorkerRef.current) {
        tempWorkerRef.current.postMessage({
          rawMotor: newRawMotorTemp,
          rawController: newRawControllerTemp
        });
      } else {
        // Fallback to main thread calculation
        const newMotorTemp = convertSensorToTemp(newRawMotorTemp);
        const newControllerTemp = convertSensorToTemp(newRawControllerTemp);
        
        setMotorTemp(newMotorTemp);
        setControllerTemp(newControllerTemp);
        
        // Update loading state
        if (isLoading && (newMotorTemp !== 0 || newControllerTemp !== 0)) {
          setIsLoading(false);
        }
      }
      
    } catch (error) {
      console.error('Error processing temperature data:', error);
      setError('Failed to process temperature data');
    }
  });
  
  // Determine if any temperature is in warning or critical zone
  const hasWarning = debouncedMotorTemp >= TEMP_THRESHOLDS.WARNING || debouncedControllerTemp >= TEMP_THRESHOLDS.WARNING;
  const hasCritical = debouncedMotorTemp >= TEMP_THRESHOLDS.CRITICAL || debouncedControllerTemp >= TEMP_THRESHOLDS.CRITICAL;

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
          <Thermometer 
            size={18} 
            color={hasCritical 
              ? colors.CRITICAL 
              : hasWarning 
                ? colors.WARNING 
                : colors.SAFE
            } 
          />
          <Typography 
            variant="h6" 
            color="text.primary"
            sx={{ 
              fontWeight: 'medium',
              fontSize: '1rem'
            }}
          >
            Temperature Monitor
          </Typography>
        </Box>
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
      
      {/* Critical temperature warning */}
      {hasCritical && (
        <Alert 
          severity="error" 
          sx={{ 
            m: 1, 
            py: 0.5,
            '& .MuiAlert-message': { fontSize: '0.8rem' }
          }}
          icon={<AlertTriangle size={16} />}
        >
          Critical temperature detected! Engine damage possible.
        </Alert>
      )}
      
      {/* Warning temperature alert */}
      {!hasCritical && hasWarning && (
        <Alert 
          severity="warning" 
          sx={{ 
            m: 1, 
            py: 0.5,
            '& .MuiAlert-message': { fontSize: '0.8rem' }
          }}
          icon={<AlertTriangle size={16} />}
        >
          High temperature warning! Reduce load if possible.
        </Alert>
      )}
      
      {/* Main content */}
      <Box sx={{ p: 1.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Grid container spacing={2}>
          {/* Main temperature visualizations */}
          <Grid item xs={12}>
            <Box 
              sx={{ 
                p: 2,
                backgroundColor: colors.PANEL_BG,
                borderRadius: 1,
                boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
                border: `1px solid ${theme.palette.divider}`
              }}
            >
              <Grid container spacing={3} alignItems="stretch">
                {/* Motor Temperature */}
                <Grid item xs={12} sm={6}>
                  {isLoading ? (
                    <TemperatureBarSkeleton />
                  ) : (
                    <TemperatureBar
                      temp={debouncedMotorTemp}
                      label="Motor Temperature"
                      icon={Thermometer}
                      color={colors.MOTOR}
                      statusColor={motorStatusColor}
                    />
                  )}
                </Grid>
                
                {/* Controller Temperature */}
                <Grid item xs={12} sm={6}>
                  {isLoading ? (
                    <TemperatureBarSkeleton />
                  ) : (
                    <TemperatureBar
                      temp={debouncedControllerTemp}
                      label="Controller Temperature"
                      icon={Cpu}
                      color={colors.CONTROLLER}
                      statusColor={controllerStatusColor}
                    />
                  )}
                </Grid>
              </Grid>
            </Box>
          </Grid>
          
          {/* Additional Details */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {/* Motor Details */}
              <Grid item xs={12} sm={6}>
                {isLoading ? (
                  <TemperatureDetailsSkeleton />
                ) : (
                  <TemperatureDetails
                    title="Motor Details"
                    temp={debouncedMotorTemp}
                    rawValue={rawMotorTemp}
                    color={colors.MOTOR}
                    icon={Thermometer}
                  />
                )}
              </Grid>
              
              {/* Controller Details */}
              <Grid item xs={12} sm={6}>
                {isLoading ? (
                  <TemperatureDetailsSkeleton />
                ) : (
                  <TemperatureDetails
                    title="Controller Details"
                    temp={debouncedControllerTemp}
                    rawValue={rawControllerTemp}
                    color={colors.CONTROLLER}
                    icon={Cpu}
                  />
                )}
              </Grid>
            </Grid>
          </Grid>
        </Grid>
        
        {/* Temperature thresholds footer */}
        <Box sx={{ 
          mt: 'auto', 
          pt: 1, 
          textAlign: 'center',
          opacity: 0.7
        }}>
          <Tooltip 
            title="Temperature thresholds for system operation"
            arrow
            placement="top"
          >
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                fontSize: '0.65rem'
              }}
            >
              Normal ≤ {TEMP_THRESHOLDS.NORMAL}°C • Warning ≥ {TEMP_THRESHOLDS.WARNING}°C • Critical ≥ {TEMP_THRESHOLDS.CRITICAL}°C
            </Typography>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Loading overlay */}
      <LoadingOverlay visible={isLoading} />
    </Box>
  );
};

export default memo(MotorControllerTempGauge);