import React, { useState, useEffect, useRef, memo, useContext, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Grid,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
  Card,
  CardHeader,
  CardContent,
  Divider
} from '@mui/material';
import {
  Gauge as GaugeIcon,
  ArrowUpRight,
  Flag,
  RefreshCw,
  History,
  ArrowLeftRight
} from 'lucide-react';
import Gauge from 'react-gauge-component';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import useRealTimeData from '../../hooks/useRealTimeData';
import { useInView } from 'react-intersection-observer';

// Constants (moved outside component to prevent recreation)
const CONSTANTS = {
  MILLISECONDS_TO_SECONDS: 0.001,
  M_PER_S_TO_KM_PER_H: 3.6,
  KM_TO_MILES: 0.621371,
  SPEED_THRESHOLDS: {
    LOW: 40,
    MEDIUM: 80,
    HIGH: 120,
    MAX: 240
  }
};

/**
 * Helper functions (defined outside component to avoid recreation)
 */
const formatSpeed = (speed, useImperial = false, decimalPlaces = 1) => {
  if (typeof speed !== 'number') return '0.0';
  const converted = useImperial ? speed * CONSTANTS.KM_TO_MILES : speed;
  return converted.toFixed(decimalPlaces);
};

const getSpeedUnit = (useImperial = false) => (useImperial ? 'mph' : 'km/h');

/**
 * Stat display component for showing speed or acceleration values
 */
const StatDisplay = memo(({ label, value, unit, icon: Icon, color }) => {
  const theme = useTheme();

  return (
    <Box
      role="group"
      aria-label={`${label}: ${value} ${unit}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      <Box
        sx={{
          mb: theme.spacing(0.75),
          width: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: theme.spacing(0.5)
        }}
      >
        <Icon
          size={16}
          color={theme.palette.text.secondary}
          aria-hidden="true"
        />
        <Typography
          variant="caption"
          sx={{ 
            textTransform: 'uppercase', 
            fontSize: '0.75rem', 
            lineHeight: 1,
            color: theme.palette.text.secondary
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        variant="h6"
        sx={{
          color,
          fontWeight: theme.typography.fontWeightBold,
          fontSize: '1rem',
          lineHeight: 1.2
        }}
      >
        {value}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontSize: '0.7rem', lineHeight: 1 }}
      >
        {unit}
      </Typography>
    </Box>
  );
});

StatDisplay.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  unit: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  color: PropTypes.string
};

/**
 * Optimized SpeedometerGauge component
 */
const SpeedometerGauge = () => {
  const theme = useTheme();
  const { settings, updateSettings } = useContext(ChartSettingsContext);

  // Extract dashboard settings with defaults
  const dashboardSettings = settings?.dashboard || {};
  const componentSettings = settings?.components?.speedometer || {};
  
  // Use InView for visibility detection and performance optimization
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  // Use refs for container dimensions instead of useResizeObserver for better performance
  const containerRef = useRef(null);
  const dimensionsRef = useRef({ width: 300, height: 400 });
  
  // Extract settings with defaults
  const useImperial = dashboardSettings.useImperialUnits || false;
  const updateInterval = componentSettings.updateInterval || dashboardSettings.updateInterval || 300;
  const changeThreshold = componentSettings.changeThreshold || dashboardSettings.significantChangeThreshold || 0.5;
  const decimalPlaces = componentSettings.decimalPlaces || 1;
  const dataSource = componentSettings.dataSource || 'ins_imu'; // Changed from 'front_frequency'
  const northVelField = componentSettings.northVelField || 'north_vel'; // New field
  const eastVelField = componentSettings.eastVelField || 'east_vel'; // New field
  const timestampField = componentSettings.timestampField || 'timestamp';
  const showAcceleration = componentSettings.showAcceleration !== false;
  const showMaxSpeed = componentSettings.showMaxSpeed !== false;
  const speedThresholds = componentSettings.speedThresholds || CONSTANTS.SPEED_THRESHOLDS;
  const animationsEnabled = settings?.global?.enableTransitions !== false && 
    componentSettings.animationsEnabled !== false;
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;

  // Theme colors with defaults
  const lowSpeedColor = componentSettings.lowSpeedColor || theme.palette.success.main;
  const mediumSpeedColor = componentSettings.mediumSpeedColor || theme.palette.warning.main;
  const highSpeedColor = componentSettings.highSpeedColor || theme.palette.error.main;

  // Component state
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [acceleration, setAcceleration] = useState(0);
  const [gaugeSize, setGaugeSize] = useState(150);

  // Refs for speed calculation and animation
  const speedHistoryRef = useRef({ lastSpeed: 0, lastTimestamp: Date.now() });
  const requestAnimationRef = useRef(null);
  const isComponentMounted = useRef(true);

  // Get appropriate color for a speed value
  const getSpeedColor = useCallback((speedValue) => {
    if (speedValue >= speedThresholds.HIGH) return highSpeedColor;
    if (speedValue >= speedThresholds.MEDIUM) return mediumSpeedColor;
    return lowSpeedColor;
  }, [speedThresholds, lowSpeedColor, mediumSpeedColor, highSpeedColor]);

  // Memoized values
  const displaySpeed = useMemo(
    () => (useImperial ? speed * CONSTANTS.KM_TO_MILES : speed),
    [speed, useImperial]
  );

  const maxDisplaySpeed = useMemo(
    () => Math.round(useImperial ? speedThresholds.MAX * CONSTANTS.KM_TO_MILES : speedThresholds.MAX),
    [useImperial, speedThresholds.MAX]
  );

  const speedColor = useMemo(
    () => getSpeedColor(speed),
    [speed, getSpeedColor]
  );

  const speedUnit = useMemo(
    () => getSpeedUnit(useImperial),
    [useImperial]
  );

  // Component lifecycle management
  useEffect(() => {
    isComponentMounted.current = true;
    
    // Reset max speed on mount if configured
    if (componentSettings.resetMaxOnMount) {
      setMaxSpeed(0);
    }
    
    return () => {
      isComponentMounted.current = false;
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
      }
    };
  }, [componentSettings.resetMaxOnMount]);

  // Measure container size when visible
  useEffect(() => {
    if (!inView || !containerRef.current) return;
    
    const updateSize = () => {
      if (!containerRef.current || !isComponentMounted.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width !== dimensionsRef.current.width || 
          rect.height !== dimensionsRef.current.height) {
        
        dimensionsRef.current = { width: rect.width, height: rect.height };
        
        // Calculate gauge size based on container dimensions
        const sizeRatio = componentSettings.gaugeSizeRatio || 1.8;
        const minDimension = Math.min(rect.width, rect.height * sizeRatio);
        const minSize = componentSettings.minGaugeSize || 100;
        const padding = componentSettings.gaugePadding || 60;
        
        const newSize = Math.max(minDimension - padding, minSize);
        setGaugeSize(componentSettings.gaugeSize || newSize);
      }
    };
    
    // Update size initially and on resize
    updateSize();
    
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    
    return () => {
      if (resizeObserver && containerRef.current) {
        resizeObserver.disconnect();
      }
    };
  }, [inView, componentSettings]);

  /**
   * Calculate speed from IMU velocity components
   */
  const calculateSpeedFromVelocity = useCallback((northVel, eastVel) => {
    if (typeof northVel !== 'number' || typeof eastVel !== 'number' || 
        isNaN(northVel) || isNaN(eastVel)) return 0;
    
    // Calculate horizontal speed using Pythagorean theorem
    const horizontalVelocity = Math.sqrt(northVel * northVel + eastVel * eastVel);
    
    // Convert to km/h (assuming velocities are in m/s)
    return horizontalVelocity * CONSTANTS.M_PER_S_TO_KM_PER_H;
  }, []);

  // Toggle unit conversion (km/h ↔ mph)
  const handleUnitToggle = useCallback(() => {
    updateSettings('dashboard', 'useImperialUnits', !useImperial);
  }, [updateSettings, useImperial]);

  // Update speed state (using requestAnimationFrame for smoother updates)
  const updateSpeedState = useCallback((newSpeed, timestamp) => {
    if (requestAnimationRef.current) {
      cancelAnimationFrame(requestAnimationRef.current);
    }

    requestAnimationRef.current = requestAnimationFrame(() => {
      if (!isComponentMounted.current) return;
      
      const { lastSpeed, lastTimestamp } = speedHistoryRef.current;
      
      // Calculate acceleration (km/h per second)
      const dt = (timestamp - lastTimestamp) * CONSTANTS.MILLISECONDS_TO_SECONDS;
      let accel = 0;
      
      if (dt > 0) {
        accel = (newSpeed - lastSpeed) / dt;
        
        // Apply acceleration smoothing if configured
        if (componentSettings.accelerationSmoothing) {
          const smoothingFactor = componentSettings.accelerationSmoothingFactor || 0.3;
          accel = accel * smoothingFactor + acceleration * (1 - smoothingFactor);
        }
      }
      
      // Update state
      setSpeed(newSpeed);
      setAcceleration(accel);
      
      // Update max speed if needed
      if (newSpeed > maxSpeed) {
        setMaxSpeed(newSpeed);
      }
      
      // Update ref for next calculation
      speedHistoryRef.current = {
        lastSpeed: newSpeed,
        lastTimestamp: timestamp
      };
    });
  }, [maxSpeed, acceleration, componentSettings]);

  // Handle the incoming data message
  const handleDataMessage = useCallback((msg) => {
    // Skip processing if not in view to save resources
    if (!inView || !isComponentMounted.current) return;

    try {
      const fields = msg?.fields;
      if (!fields) return;

      // Extract north and east velocity components
      const northVel = fields[northVelField]?.numberValue;
      const eastVel = fields[eastVelField]?.numberValue;
      
      // Extract timestamp
      const timestamp = fields[timestampField]?.numberValue ?? Date.now();
      
      if (northVel === undefined || eastVel === undefined) return;
      
      // Calculate speed from velocity components
      const newSpeed = calculateSpeedFromVelocity(northVel, eastVel);
      
      // Only update if change exceeds threshold or first reading
      if (Math.abs(newSpeed - speedHistoryRef.current.lastSpeed) >= changeThreshold || 
          speedHistoryRef.current.lastSpeed === 0) {
        updateSpeedState(newSpeed, timestamp);
      }
    } catch (error) {
      console.error('Speedometer error:', error);
    }
  }, [inView, northVelField, eastVelField, timestampField, calculateSpeedFromVelocity, changeThreshold, updateSpeedState]);

  // Subscribe to real-time data
  const { ref: dataRef } = useRealTimeData(
    dataSource,
    handleDataMessage,
    { customInterval: updateInterval }
  );

  // Reset max speed
  const handleResetMaxSpeed = useCallback(() => {
    setMaxSpeed(0);
  }, []);

  // Combine refs
  const setRefs = useCallback(node => {
    containerRef.current = node;
    inViewRef(node);
    if (dataRef && typeof dataRef === 'function') dataRef(node);
  }, [inViewRef, dataRef]);

  // Gauge configuration
  const gaugeOptions = useMemo(() => {
    // Calculate segment stops based on thresholds
    const maxValue = maxDisplaySpeed;
    const segmentStops = [
      0,
      maxValue * (speedThresholds.LOW / speedThresholds.MAX),
      maxValue * (speedThresholds.MEDIUM / speedThresholds.MAX),
      maxValue
    ];

    // Calculate arc width and other dimensions based on gauge size
    const arcWidth = componentSettings.gaugeArcWidth || Math.max(gaugeSize * 0.06, 10);
    const needleBaseSize = componentSettings.gaugeNeedleBaseSize || Math.max(gaugeSize * 0.1, 15);
    const valueFontSize = `${Math.max(gaugeSize * 0.07, 16)}px`;
    const ticksFontSize = `${Math.max(gaugeSize * 0.05, 10)}px`;
    
    return {
      value: displaySpeed,
      minValue: 0,
      maxValue: maxValue,
      size: gaugeSize,
      arcWidth: arcWidth,
      needleColor: componentSettings.gaugeNeedleColor || speedColor,
      animate: animationsEnabled,
      customSegmentStops: segmentStops,
      segmentColors: [
        lowSpeedColor,
        mediumSpeedColor,
        highSpeedColor
      ],
      valueFormat: (value) => Number(value).toFixed(decimalPlaces),
      needleTransition: componentSettings.gaugeAnimationEasing || 'easeQuadIn',
      needleTransitionDuration: animationsEnabled ? 
        (componentSettings.gaugeAnimationDuration || 1000) : 0,
      needleBaseSize: needleBaseSize,
      marginInPercent: 0.05,
      currentValueText: `${displaySpeed.toFixed(decimalPlaces)} ${speedUnit}`,
      currentValueTextFontSize: valueFontSize,
      currentValueTextFontWeight: theme.typography.fontWeightBold,
      arcsLength: [0.4, 0.3, 0.3],
      ticksWidth: Math.max(gaugeSize * 0.01, 2),
      ticksTextFontSize: ticksFontSize,
      hideText: componentSettings.hideText,
      hideMinMax: componentSettings.hideMinMax,
      hideValue: componentSettings.hideValue
    };
  }, [
    displaySpeed,
    maxDisplaySpeed,
    gaugeSize,
    speedColor,
    animationsEnabled,
    theme,
    speedUnit,
    speedThresholds,
    lowSpeedColor,
    mediumSpeedColor,
    highSpeedColor,
    decimalPlaces,
    componentSettings
  ]);

  return (
    <Card
      ref={setRefs}
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: theme.shape.borderRadius,
        overflow: 'hidden',
        backgroundColor: theme.palette.background.paper,
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
        transform: hardwareAcceleration ? 'translateZ(0)' : 'none'
      }}
      role="region"
      aria-label="Vehicle Speed Gauge"
    >
      {/* Header */}
      <CardHeader
        title={
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: theme.spacing(1) 
          }}>
            <GaugeIcon 
              size={20} 
              color={theme.palette.primary.main} 
              aria-hidden="true" 
            />
            <Typography
              variant="h6"
              sx={{
                fontWeight: theme.typography.fontWeightMedium,
                lineHeight: 1.2,
                m: 0.5
              }}
            >
              {componentSettings.title || "Vehicle Speed"}
            </Typography>
          </Box>
        }
        action={
          <Box sx={{ display: 'flex' }}>
            {showMaxSpeed && (
              <Tooltip
                title="Reset maximum speed"
                arrow
                enterDelay={200}
              >
                <IconButton
                  onClick={handleResetMaxSpeed}
                  size="small"
                  color="secondary"
                  aria-label="Reset maximum speed"
                  sx={{ mr: 0.5 }}
                >
                  <RefreshCw size={16} />
                </IconButton>
              </Tooltip>
            )}
            <Tooltip
              title={useImperial ? 'Switch to kilometers per hour' : 'Switch to miles per hour'}
              arrow
              enterDelay={200}
            >
              <IconButton
                onClick={handleUnitToggle}
                size="small"
                color="secondary"
                aria-label={useImperial ? 'Switch to kilometers per hour' : 'Switch to miles per hour'}
              >
                <ArrowLeftRight size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        }
        sx={{
          p: theme.spacing(0.5),
          '& .MuiCardHeader-action': {
            m: 0,
            alignSelf: 'center'
          }
        }}
      />
      
      <Divider />

      {/* Main content */}
      <CardContent
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: theme.spacing(1.5),
          '&:last-child': {
            pb: theme.spacing(1.5),
          }
        }}
      >
        {!inView ? (
          // Simple loading message when not in view
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
              {componentSettings.loadingText || "Loading..."}
            </Typography>
          </Box>
        ) : (
          <>
            {/* Gauge area */}
            <Box
              sx={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 0,
                mb: theme.spacing(1)
              }}
              aria-hidden="true"
            >
              <Gauge {...gaugeOptions} />
            </Box>

            {/* Stats bar */}
            <Box
              sx={{
                p: theme.spacing(1),
                borderRadius: theme.shape.borderRadius,
                backgroundColor: theme.palette.mode === 'dark'
                  ? alpha(theme.palette.common.black, 0.1)
                  : alpha(theme.palette.common.black, 0.02),
                border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`
              }}
            >
              <Grid 
                container 
                spacing={2}
                alignItems="center" 
                sx={{ textAlign: 'center' }}
              >
                {/* CURRENT SPEED */}
                <Grid item xs={showMaxSpeed && showAcceleration ? 4 : (showMaxSpeed || showAcceleration ? 6 : 12)}>
                  <StatDisplay
                    label="Current"
                    value={formatSpeed(displaySpeed, useImperial, decimalPlaces)}
                    unit={speedUnit}
                    icon={GaugeIcon}
                    color={speedColor}
                  />
                </Grid>

                {/* MAX SPEED */}
                {showMaxSpeed && (
                  <Grid item xs={showAcceleration ? 4 : 6}>
                    <StatDisplay
                      label="Max"
                      value={formatSpeed(maxSpeed, useImperial, decimalPlaces)}
                      unit={speedUnit}
                      icon={Flag}
                      color={getSpeedColor(maxSpeed)}
                    />
                  </Grid>
                )}

                {/* ACCELERATION */}
                {showAcceleration && (
                  <Grid item xs={showMaxSpeed ? 4 : 6}>
                    <StatDisplay
                      label="Accel"
                      value={Math.abs(acceleration).toFixed(decimalPlaces)}
                      unit={`${speedUnit}/s ${acceleration < 0 ? '↓' : '↑'}`}
                      icon={acceleration >= 0 ? ArrowUpRight : History}
                      color={acceleration >= 0 ? speedColor : theme.palette.warning.main}
                    />
                  </Grid>
                )}
              </Grid>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(SpeedometerGauge);