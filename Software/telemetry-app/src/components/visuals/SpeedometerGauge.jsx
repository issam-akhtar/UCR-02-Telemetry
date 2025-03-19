

import React, { useState, useEffect, useRef, memo, useMemo, useCallback, useContext } from 'react';
import { Box, Typography, Grid, Switch, FormControlLabel, useTheme, Skeleton, Alert, Tooltip } from '@mui/material';
import GaugeComponent from 'react-gauge-component';
import useRealTimeData from '../../hooks/useRealTimeData';
import useResizeObserver from 'use-resize-observer';
import { useDebounce } from 'use-debounce';
import { Gauge, Clock, TrendingUp, TrendingDown, Minus, ArrowUp, ArrowDown } from 'lucide-react';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Constants for speed thresholds and settings
const SPEED_THRESHOLDS = {
  LOW: 40,      // km/h
  MEDIUM: 80,   // km/h
  HIGH: 120,    // km/h
  MAX: 240      // km/h - Maximum display value
};

// Config constants
const DATA_STALE_TIMEOUT = 5000; // Time in ms to consider data stale
const ACCELERATION_FILTER_FACTOR = 0.7; // Filter factor for acceleration smoothing

// Create a worker for speedometer calculations
const createSpeedWorker = () => {
  const workerCode = `
    // Calculate speed and acceleration
    function processSpeedData(northVel, eastVel, lastSpeed, lastTime, currTime, currAcceleration) {
      // Calculate ground speed (m/s)
      const groundSpeedMs = Math.sqrt(northVel * northVel + eastVel * eastVel);
      
      // Convert to km/h
      const groundSpeedKmh = groundSpeedMs * 3.6;
      
      // Calculate acceleration
      let newAcceleration = currAcceleration;
      const timeDiff = (currTime - lastTime) / 1000; // seconds
      
      if (timeDiff > 0) {
        const speedDiff = groundSpeedKmh - lastSpeed; // km/h
        const rawAccel = speedDiff / timeDiff; // km/h/s
        
        // Apply a low-pass filter to smooth acceleration values
        newAcceleration = 0.7 * currAcceleration + 0.3 * rawAccel;
      }
      
      // Get acceleration indicator
      let indicator = "—";
      
      if (newAcceleration > 1) {
        indicator = "FAST_UP";
      } else if (newAcceleration > 0.5) {
        indicator = "UP";
      } else if (newAcceleration < -1) {
        indicator = "FAST_DOWN";
      } else if (newAcceleration < -0.5) {
        indicator = "DOWN";
      }
      
      return {
        speed: groundSpeedKmh,
        acceleration: newAcceleration,
        indicator
      };
    }
    
    self.onmessage = function(e) {
      const { 
        northVel, 
        eastVel, 
        lastSpeed, 
        lastTime, 
        currTime, 
        currAcceleration
      } = e.data;
      
      const result = processSpeedData(
        northVel, 
        eastVel, 
        lastSpeed, 
        lastTime, 
        currTime, 
        currAcceleration
      );
      
      self.postMessage(result);
    };
  `;
  
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
};

// Theme-based colors
const useSpeedometerColors = () => {
  const theme = useTheme();
  
  return {
    LOW: theme.palette.success.main,
    MEDIUM: theme.palette.warning.main,
    HIGH: theme.palette.error.main,
    NEEDLE: theme.palette.secondary.main,
    TEXT: theme.palette.text.primary,
    TEXT_SECONDARY: theme.palette.text.secondary,
    BACKGROUND: theme.palette.mode === 'dark' 
      ? 'rgba(22, 22, 22, 0.95)' 
      : 'rgba(245, 245, 245, 0.95)',
    PANEL_BG: theme.palette.mode === 'dark' 
      ? 'rgba(15, 15, 15, 0.8)' 
      : 'rgba(240, 240, 240, 0.8)',
    CHART_BG: theme.palette.mode === 'dark'
      ? 'rgba(30, 30, 30, 0.95)'
      : 'rgba(250, 250, 250, 0.95)',
    GAUGE_TRACK: theme.palette.mode === 'dark'
      ? 'rgba(60, 60, 60, 0.2)'
      : 'rgba(200, 200, 200, 0.3)'
  };
};

// Get color based on speed
const getSpeedColor = (speed, colors) => {
  if (speed >= SPEED_THRESHOLDS.HIGH) return colors.HIGH;
  if (speed >= SPEED_THRESHOLDS.MEDIUM) return colors.MEDIUM;
  return colors.LOW;
};

// Format speed with 1 decimal place
const formatSpeed = (speed, useImperial = false) => {
  const value = useImperial ? speed * 0.621371 : speed;
  return value.toFixed(1);
};

// Get unit based on preferred system
const getSpeedUnit = (useImperial = false) => {
  return useImperial ? 'mph' : 'km/h';
};

// Format time since last update
const formatTimeSince = (timestamp) => {
  if (!timestamp) return 'N/A';
  
  const seconds = Math.floor((new Date() - timestamp) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s ago`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m ago`;
};

// Memoized statistic item component
const StatItem = memo(({ label, value, unit = '', color, large = false }) => {
  return (
    <Box sx={{ 
      width: '100%',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 1,
    }}>
      <Typography 
        variant="caption" 
        color="text.secondary" 
        sx={{ 
          fontSize: '0.75rem', 
          fontWeight: 'medium', 
          textTransform: 'uppercase',
          mb: 0.5,
          letterSpacing: '0.5px'
        }}
      >
        {label}
      </Typography>
      <Typography 
        component="div"
        sx={{ 
          color,
          fontWeight: 'bold', 
          fontSize: large ? '1.75rem' : '1.25rem',
          lineHeight: 1.2,
          mb: 0.5,
          display: 'flex',
          alignItems: 'baseline'
        }}
      >
        {value}
      </Typography>
      <Typography 
        variant="body2" 
        color="text.secondary" 
        sx={{ 
          fontSize: '0.7rem',
          opacity: 0.8
        }}
      >
        {unit}
      </Typography>
    </Box>
  );
});

// Skeleton for stat item during loading
const StatItemSkeleton = memo(({ large = false }) => {
  return (
    <Box sx={{ 
      width: '100%',
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      p: 1
    }}>
      <Skeleton variant="text" width={60} height={16} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width={large ? 70 : 50} height={large ? 36 : 28} sx={{ mb: 0.5 }} />
      <Skeleton variant="text" width={40} height={16} />
    </Box>
  );
});

// Acceleration indicator component
const AccelerationIndicator = memo(({ indicator, color }) => {
  const renderIcon = () => {
    switch (indicator) {
      case 'FAST_UP': return <ArrowUp size={24} />;
      case 'UP': return <TrendingUp size={24} />;
      case 'FAST_DOWN': return <ArrowDown size={24} />;
      case 'DOWN': return <TrendingDown size={24} />;
      default: return <Minus size={24} />;
    }
  };
  
  return (
    <Box sx={{ color, display: 'flex', justifyContent: 'center' }}>
      {renderIcon()}
    </Box>
  );
});

// Main component
const SpeedometerGauge = () => {
  // Access chart settings context
  const { settings } = useContext(ChartSettingsContext);
  
  // Theme and colors
  const theme = useTheme();
  const colors = useSpeedometerColors();
  
  // Resize observer for responsive chart
  const { ref, width = 300 } = useResizeObserver();
  const [debouncedWidth] = useDebounce(width, 200);
  
  // Core state
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [acceleration, setAcceleration] = useState(0);
  const [accelIndicator, setAccelIndicator] = useState("—");
  
  // Debounced values for smoother UI updates
  const [debouncedSpeed] = useDebounce(speed, 250);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [useImperial, setUseImperial] = useState(false);
  const [error, setError] = useState(null);
  const [dataStale, setDataStale] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // References
  const lastTimestampRef = useRef(null);
  const lastSpeedRef = useRef(0);
  const lastSpeedTimeRef = useRef(Date.now());
  const staleTimerRef = useRef(null);
  const speedWorkerRef = useRef(null);
  
  // Determine whether to enable animations based on settings
  const enableAnimations = settings?.global?.enableTransitions !== false && 
                          settings?.global?.animationDuration > 0;
  
  // Get max display speed based on unit
  const maxDisplaySpeed = useImperial ? SPEED_THRESHOLDS.MAX * 0.621371 : SPEED_THRESHOLDS.MAX;
  
  // Initialize web worker
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        speedWorkerRef.current = createSpeedWorker();
        
        speedWorkerRef.current.onmessage = (e) => {
          const { speed, acceleration, indicator } = e.data;
          
          setSpeed(speed);
          setAcceleration(acceleration);
          setAccelIndicator(indicator);
          
          // Update max speed if needed
          if (speed > maxSpeed) {
            setMaxSpeed(speed);
          }
          
          // Update loading state if needed
          if (isLoading && speed > 0) {
            setIsLoading(false);
          }
          
          // Update references for next calculation
          lastSpeedRef.current = speed;
          lastSpeedTimeRef.current = Date.now();
        };
      } catch (err) {
        console.error('Failed to create web worker:', err);
        // Fallback to main thread calculation if worker fails
      }
    }
    
    return () => {
      if (speedWorkerRef.current) {
        speedWorkerRef.current.terminate();
      }
    };
  }, [maxSpeed, isLoading]);
  
  // Subscribe to speed data (INS_IMU)
  useRealTimeData('ins_imu', (msg) => {
    try {
      const fields = msg.payload?.fields;
      if (!fields) return;
      
      // Check timestamp to avoid processing older data
      const newTimestamp = fields.timestamp?.numberValue || Date.now();
      if (lastTimestampRef.current !== null && newTimestamp <= lastTimestampRef.current) {
        return;
      }
      
      lastTimestampRef.current = newTimestamp;
      const currentTime = Date.now();
      setLastUpdate(new Date());
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
      
      // Extract velocity components
      const northVel = fields.north_vel?.numberValue || 0;
      const eastVel = fields.east_vel?.numberValue || 0;
      
      // Process speed data using web worker if available
      if (speedWorkerRef.current) {
        speedWorkerRef.current.postMessage({
          northVel,
          eastVel,
          lastSpeed: lastSpeedRef.current,
          lastTime: lastSpeedTimeRef.current,
          currTime: currentTime,
          currAcceleration: acceleration
        });
      } else {
        // Fallback to main thread calculation
        fallbackProcessSpeedData(northVel, eastVel, currentTime);
      }
      
    } catch (error) {
      console.error('Error processing speed data:', error);
      setError('Failed to process speed data');
    }
  });
  
  // Fallback speed data processing (used if worker fails)
  const fallbackProcessSpeedData = useCallback((northVel, eastVel, currentTime) => {
    // Calculate ground speed (m/s)
    const groundSpeedMs = Math.sqrt(northVel * northVel + eastVel * eastVel);
    
    // Convert to km/h
    const groundSpeedKmh = groundSpeedMs * 3.6;
    
    // Calculate acceleration
    const timeDiff = (currentTime - lastSpeedTimeRef.current) / 1000; // seconds
    
    if (timeDiff > 0) {
      const speedDiff = groundSpeedKmh - lastSpeedRef.current; // km/h
      const accel = speedDiff / timeDiff; // km/h/s
      
      // Apply a low-pass filter to smooth acceleration values
      const filteredAccel = ACCELERATION_FILTER_FACTOR * acceleration + (1 - ACCELERATION_FILTER_FACTOR) * accel;
      setAcceleration(filteredAccel);
      
      // Determine acceleration indicator
      let indicator;
      if (filteredAccel > 1) indicator = "FAST_UP";
      else if (filteredAccel > 0.5) indicator = "UP";
      else if (filteredAccel < -1) indicator = "FAST_DOWN";
      else if (filteredAccel < -0.5) indicator = "DOWN";
      else indicator = "—";
      
      setAccelIndicator(indicator);
      
      lastSpeedRef.current = groundSpeedKmh;
      lastSpeedTimeRef.current = currentTime;
    }
    
    // Update speed
    setSpeed(groundSpeedKmh);
    
    // Update max speed if needed
    if (groundSpeedKmh > maxSpeed) {
      setMaxSpeed(groundSpeedKmh);
    }
    
    // Update loading state if needed
    if (isLoading && groundSpeedKmh > 0) {
      setIsLoading(false);
    }
  }, [acceleration, maxSpeed, isLoading]);
  
  // Clean up stale timer on unmount
  useEffect(() => {
    return () => {
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
    };
  }, []);
  
  // Get acceleration color
  const accelColor = useMemo(() => {
    if (acceleration > 0) return colors.LOW;
    if (acceleration < 0) return colors.HIGH;
    return colors.TEXT_SECONDARY;
  }, [acceleration, colors]);
  
  // Get current speed color
  const speedColor = getSpeedColor(debouncedSpeed, colors);
  
  // Get speed unit
  const speedUnit = getSpeedUnit(useImperial);
  
  // Calculate display value for gauge (metric or imperial)
  const displaySpeed = useImperial ? debouncedSpeed * 0.621371 : debouncedSpeed;
  
  // Calculate percentage of max speed for stats
  const speedPercentage = Math.min(100, (displaySpeed / maxDisplaySpeed) * 100);
  
  // Config for react-gauge-component
  const gaugeConfig = useMemo(() => ({
    arcWidth: 0.3,
    needleColor: speedColor,
    needleBaseColor: theme.palette.mode === 'dark' ? '#333' : '#fff',
    arcColors: [
      colors.LOW,
      colors.MEDIUM, 
      colors.HIGH
    ],
    arcDelimiters: [
      SPEED_THRESHOLDS.LOW / maxDisplaySpeed * 100,
      SPEED_THRESHOLDS.MEDIUM / maxDisplaySpeed * 100
    ],
    colors: {
      arcColors: [
        colors.LOW,
        colors.MEDIUM, 
        colors.HIGH
      ],
      needleColor: theme.palette.secondary.main,
      tickColor: theme.palette.text.secondary
    },
    needleTransition: enableAnimations ? 'easeQuadIn' : 'none',
    needleTransitionDuration: enableAnimations ? settings?.global?.animationDuration : 0,
    marginInPercent: 0.05,
    currentValueText: '${value}',
    valueFormatter: (value) => formatSpeed(value, false) + ' ' + speedUnit,
    paddingHorizontal: 10,
    paddingVertical: 10
  }), [
    colors, 
    theme.palette.mode, 
    maxDisplaySpeed, 
    enableAnimations, 
    settings?.global?.animationDuration, 
    speedColor, 
    speedUnit
  ]);
  
  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: '100%', 
        borderRadius: 2,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.BACKGROUND,
        boxShadow: theme.palette.mode === 'dark' ? 'none' : '0 2px 8px rgba(0,0,0,0.05)',
        border: `1px solid ${theme.palette.divider}`
      }}
      role="region"
      aria-label="Vehicle speed monitor"
    >
      {/* Header with title and units toggle */}
      <Box sx={{ 
        px: 2, 
        py: 1.5, 
        display: 'flex', 
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${theme.palette.divider}`
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Gauge size={18} color={theme.palette.primary.main} />
          <Typography 
            variant="h6" 
            color="text.primary"
            sx={{ 
              fontWeight: 'medium',
              fontSize: '1rem'
            }}
          >
            Vehicle Speed
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {dataStale && !isLoading && (
            <Tooltip title={`Last update: ${formatTimeSince(lastUpdate)}`} arrow placement="left">
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
          
          <FormControlLabel
            control={
              <Switch 
                checked={useImperial}
                onChange={(e) => setUseImperial(e.target.checked)}
                size="small"
                color="secondary"
              />
            }
            label={
              <Typography 
                variant="caption" 
                color="text.secondary" 
                sx={{ 
                  fontSize: '0.75rem', 
                  fontWeight: 'medium' 
                }}
              >
                {useImperial ? 'mph' : 'km/h'}
              </Typography>
            }
            sx={{ margin: 0 }}
          />
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
      
      {/* Main content */}
      <Box sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column' }} ref={ref}>
        <Grid container spacing={2}>
          {/* Gauge Component */}
          <Grid item xs={12}>
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative',
                height: { xs: 180, sm: 200, md: 220 }
              }}
            >
              {isLoading ? (
                <Skeleton 
                  variant="circular" 
                  width={200} 
                  height={200} 
                  sx={{ 
                    borderRadius: '50%',
                    backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                  }}
                />
              ) : (
                <Box sx={{ width: '100%', position: 'relative' }}>
                  <GaugeComponent
                    id="speed-gauge"
                    type="semicircle"
                    value={displaySpeed}
                    minValue={0}
                    maxValue={maxDisplaySpeed}
                    style={{ width: '100%', maxWidth: '100%', height: 'auto' }}
                    {...gaugeConfig}
                  />
                  
                  {/* Acceleration indicator */}
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: '5%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      p: 0.5,
                      borderRadius: 1,
                      backgroundColor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.5)'
                    }}
                    aria-label={`Acceleration: ${acceleration.toFixed(1)} km/h/s`}
                  >
                    <AccelerationIndicator indicator={accelIndicator} color={accelColor} />
                  </Box>
                </Box>
              )}
            </Box>
          </Grid>
          
          {/* Stats Panel */}
          <Grid item xs={12}>
            <Box sx={{
              p: 1.5,
              backgroundColor: colors.PANEL_BG,
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: theme.palette.mode === 'dark' ? 'none' : 'inset 0 1px 3px rgba(0,0,0,0.05)'
            }}>
              <Grid container spacing={1}>
                <Grid item xs={4}>
                  {isLoading ? (
                    <StatItemSkeleton large={true} />
                  ) : (
                    <StatItem
                      label="Current"
                      value={formatSpeed(debouncedSpeed, useImperial)}
                      unit={speedUnit}
                      color={speedColor}
                      large={true}
                    />
                  )}
                </Grid>
                <Grid item xs={4}>
                  {isLoading ? (
                    <StatItemSkeleton />
                  ) : (
                    <StatItem
                      label="Max"
                      value={formatSpeed(maxSpeed, useImperial)}
                      unit={speedUnit}
                      color={getSpeedColor(maxSpeed, colors)}
                    />
                  )}
                </Grid>
                <Grid item xs={4}>
                  {isLoading ? (
                    <StatItemSkeleton />
                  ) : (
                    <StatItem
                      label="Acceleration"
                      value={acceleration.toFixed(1)}
                      unit={`${speedUnit}/s`}
                      color={accelColor}
                    />
                  )}
                </Grid>
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default memo(SpeedometerGauge);