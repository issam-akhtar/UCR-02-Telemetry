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
import useResizeObserver from 'use-resize-observer';

// Speed thresholds in km/h
const SPEED_THRESHOLDS = {
  LOW: 40,
  MEDIUM: 80,
  HIGH: 120,
  MAX: 240
};

/**
 * Format speed to one decimal place with unit conversion
 */
const formatSpeed = (speed, useImperial = false) => {
  const converted = useImperial ? speed * 0.621371 : speed;
  return converted.toFixed(1);
};

/**
 * Get appropriate speed unit based on settings
 */
const getSpeedUnit = (useImperial = false) => (useImperial ? 'mph' : 'km/h');

/**
 * Determine gauge color based on current speed
 */
const getSpeedColor = (speed, theme) => {
  if (speed >= SPEED_THRESHOLDS.HIGH) return theme.palette.error.main;
  if (speed >= SPEED_THRESHOLDS.MEDIUM) return theme.palette.warning.main;
  return theme.palette.success.main;
};

/**
 * Stat display component for showing speed or acceleration values
 */
const StatDisplay = memo(({ label, value, unit, icon: Icon, color }) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const animationsEnabled = settings?.global?.enableTransitions !== false;

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
          color="text.secondary"
          sx={{ textTransform: 'uppercase', fontSize: '0.75rem', lineHeight: 1 }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        variant="h6"
        sx={{
          color,
          fontWeight: theme.typography.fontWeightBold,
          lineHeight: 1.2,
          transition: animationsEnabled ?
            theme.transitions.create('color', {
              duration: theme.transitions.duration.short
            }) : 'none'
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
 * Main SpeedometerGauge component
 */
const SpeedometerGauge = () => {
  const theme = useTheme();
  const { settings, updateSettings } = useContext(ChartSettingsContext);

  // Use InView for visibility detection
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  // Use ResizeObserver to make component responsive
  const { ref: resizeRef, width = 300, height = 400 } = useResizeObserver({
    box: 'border-box'
  });

  // Dashboard settings from context
  const useImperial = settings?.dashboard?.useImperialUnits || false;
  const updateInterval = settings?.dashboard?.updateInterval;
  const changeThreshold = settings?.dashboard?.significantChangeThreshold || 0.5;

  // Animation settings from global context
  const animationsEnabled = settings?.global?.enableTransitions !== false;
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;

  // Component state
  const [speed, setSpeed] = useState(0);
  const [maxSpeed, setMaxSpeed] = useState(0);
  const [acceleration, setAcceleration] = useState(0);

  // Refs to store previous speed and timestamp
  const lastSpeedRef = useRef(0);
  const lastTimestampRef = useRef(Date.now());
  const animationFrameRef = useRef(null);

  // Memoized values
  const displaySpeed = useMemo(
    () => (useImperial ? speed * 0.621371 : speed),
    [speed, useImperial]
  );

  const maxDisplaySpeed = useMemo(
    () => Math.round(useImperial ? SPEED_THRESHOLDS.MAX * 0.621371 : SPEED_THRESHOLDS.MAX),
    [useImperial]
  );

  const speedColor = useMemo(
    () => getSpeedColor(speed, theme),
    [speed, theme]
  );

  const speedUnit = useMemo(
    () => getSpeedUnit(useImperial),
    [useImperial]
  );

  /**
   * Dynamically compute gauge size based on container dimensions.
   */
  const gaugeSize = useMemo(() => {
    if (!width || !height) return 150; // Fallback

    // Use smaller dimension (with ratio)
    const minDimension = Math.min(width, height * 1.8);
    return Math.max(minDimension - 60, 100); // Minimum of 100px
  }, [width, height]);


  // Toggle unit conversion (km/h ↔ mph)
  const handleUnitToggle = useCallback(() => {
    updateSettings('dashboard', 'useImperialUnits', !useImperial);
  }, [updateSettings, useImperial]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  // Subscribe to real-time data
  const { ref: dataRef } = useRealTimeData(
    'ins_imu',
    (msg) => {
      if (!inView) return;

      try {
        const fields = msg.fields;
        if (!fields) return;

        // Extract nested numeric values safely
        const northVel = fields.north_vel && fields.north_vel.numberValue !== undefined
          ? Number(fields.north_vel.numberValue)
          : 0;
        const eastVel = fields.east_vel && fields.east_vel.numberValue !== undefined
          ? Number(fields.east_vel.numberValue)
          : 0;
        const newTimestamp = fields.timestamp && fields.timestamp.numberValue !== undefined
          ? Number(fields.timestamp.numberValue)
          : Date.now();

        // Convert from m/s to km/h
        const computedSpeed = Math.sqrt(northVel ** 2 + eastVel ** 2) * 3.6;

        if (Math.abs(computedSpeed - lastSpeedRef.current) >= changeThreshold) {
          const dt = (newTimestamp - lastTimestampRef.current) / 1000;
          let accel = 0;
          if (dt > 0) {
            accel = (computedSpeed - lastSpeedRef.current) / dt;
          }

          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
          }
          animationFrameRef.current = requestAnimationFrame(() => {
            setSpeed(computedSpeed);
            setAcceleration(accel);
            if (computedSpeed > maxSpeed) {
              setMaxSpeed(computedSpeed);
            }
          });
          lastSpeedRef.current = computedSpeed;
        }
        lastTimestampRef.current = newTimestamp;
      } catch (err) {
        console.error('Speedometer error:', err);
      }
    },
    { customInterval: updateInterval, threshold: 0.1 }
  );


  // Combine refs
  const setRefs = useCallback(node => {
    resizeRef(node);
    inViewRef(node);
    if (dataRef) dataRef(node);
  }, [resizeRef, inViewRef, dataRef]);

  // Gauge configuration
  const gaugeOptions = useMemo(() => ({
    value: displaySpeed,
    minValue: 0,
    maxValue: maxDisplaySpeed,
    size: gaugeSize,
    arcWidth: Math.max(gaugeSize * 0.06, 10),
    needleColor: speedColor,
    animate: animationsEnabled, // Use global animation setting
    customSegmentStops: [
      0,
      maxDisplaySpeed * 0.4,
      maxDisplaySpeed * 0.7,
      maxDisplaySpeed
    ],
    segmentColors: [
      theme.palette.success.main,
      theme.palette.warning.main,
      theme.palette.error.main
    ],
    valueFormat: (value) => Number(value).toFixed(1),
    needleTransition: 'easeQuadIn',
    needleTransitionDuration: animationsEnabled ? 1000 : 0, // Only animate if enabled
    needleBaseSize: Math.max(gaugeSize * 0.1, 15),
    marginInPercent: 0.05,
    currentValueText: `${displaySpeed.toFixed(1)} ${speedUnit}`,
    currentValueTextFontSize: `${Math.max(gaugeSize * 0.07, 16)}px`,
    currentValueTextFontWeight: theme.typography.fontWeightBold,
    arcsLength: [0.4, 0.3, 0.3],
    ticksWidth: Math.max(gaugeSize * 0.01, 2),
    ticksTextFontSize: `${Math.max(gaugeSize * 0.05, 10)}px`
  }), [
    displaySpeed,
    maxDisplaySpeed,
    gaugeSize,
    speedColor,
    animationsEnabled,
    theme,
    speedUnit
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
        boxShadow: theme.custom?.shadows?.md,
        transition: animationsEnabled ?
          theme.transitions.create(['box-shadow', 'border-color'], {
            duration: theme.transitions.duration.short
          }) : 'none',
        transform: hardwareAcceleration ? 'translateZ(0)' : 'none' // Hardware acceleration
      }}
      role="region"
      aria-label="Vehicle Speed Gauge"
    >
      {/* Header */}
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
            <GaugeIcon size={20} color={theme.palette.primary.main} aria-hidden="true" />
            <Typography
              variant="h6"
              color="text.primary"
              sx={{
                fontWeight: theme.typography.fontWeightMedium,
                lineHeight: 1.2,
                m: 0.5
              }}
            >
              Vehicle Speed
            </Typography>
          </Box>
        }
        action={
          <Tooltip
            title={useImperial ? 'Switch to kilometers per hour' : 'Switch to miles per hour'}
            arrow
            enterDelay={200}
            leaveDelay={0}
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
              Loading...
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
                backgroundColor:
                  theme.palette.mode === 'dark'
                    ? alpha(theme.palette.common.black, 0.1)
                    : alpha(theme.palette.common.black, 0.02),
                border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
              }}
            >
              <Grid container spacing={2} alignItems="center" sx={{ textAlign: 'center' }}>
                {/* CURRENT SPEED */}
                <Grid item xs={4}>
                  <StatDisplay
                    label="Current"
                    value={formatSpeed(displaySpeed, useImperial)}
                    unit={speedUnit}
                    icon={GaugeIcon}
                    color={speedColor}
                  />
                </Grid>

                {/* MAX SPEED */}
                <Grid item xs={4}>
                  <Box sx={{ position: 'relative' }}>
                    <StatDisplay
                      label="Max"
                      value={formatSpeed(maxSpeed, useImperial)}
                      unit={speedUnit}
                      icon={Flag}
                      color={getSpeedColor(maxSpeed, theme)}
                    />
                  </Box>
                </Grid>

                {/* ACCELERATION */}
                <Grid item xs={4}>
                  <StatDisplay
                    label="Accel"
                    value={Math.abs(acceleration).toFixed(1)}
                    unit={`${speedUnit}/s ${acceleration < 0 ? '↓' : '↑'}`}
                    icon={acceleration >= 0 ? ArrowUpRight : History}
                    color={acceleration >= 0 ? speedColor : theme.palette.warning.main}
                  />
                </Grid>
              </Grid>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(SpeedometerGauge);