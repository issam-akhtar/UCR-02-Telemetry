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
  Paper,
  useTheme,
  LinearProgress,
  alpha,
  Card,
  CardHeader,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryPlus,
  BatteryWarning,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import useRealTimeData from '../../hooks/useRealTimeData';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';
import useResizeObserver from 'use-resize-observer';

// --- Constants & Thresholds ---
const VOLTAGE_THRESHOLDS = {
  CRITICAL: 70,  // V
  LOW: 72,       // V
  NOMINAL: 76,   // V
  HIGH: 82,      // V
  MAX: 85        // V
};

const CURRENT_THRESHOLDS = {
  LOW: 10,       // A
  MEDIUM: 50,    // A
  HIGH: 100,     // A
  MAX: 150       // A
};

const SOC_THRESHOLDS = {
  CRITICAL: 10,
  LOW: 20,
  CAUTION: 35,
  NORMAL: 65,
  GOOD: 80,
  EXCELLENT: 95
};

// --- Theming Helpers ---
const getVoltageColor = (voltage, theme) => {
  if (voltage <= VOLTAGE_THRESHOLDS.CRITICAL) return theme.palette.error.main;
  if (voltage <= VOLTAGE_THRESHOLDS.LOW) return theme.palette.warning.main;
  if (voltage >= VOLTAGE_THRESHOLDS.HIGH) return theme.palette.info.main;
  return theme.palette.success.main;
};

const getCurrentColor = (current, theme) => {
  const absCurrent = Math.abs(current);
  if (absCurrent >= CURRENT_THRESHOLDS.HIGH) return theme.palette.error.main;
  if (absCurrent >= CURRENT_THRESHOLDS.MEDIUM) return theme.palette.warning.main;
  if (absCurrent >= CURRENT_THRESHOLDS.LOW) return theme.palette.info.main;
  return theme.palette.text.secondary;
};

const getFlowIndicator = (current) => {
  if (current < -5) return 'CHARGING';
  if (current > 5) return 'DISCHARGING';
  return 'IDLE';
};

// Custom hook for SoC colors
const useSoCColors = () => {
  const theme = useTheme();
  return useMemo(() => ({
    CRITICAL: theme.palette.error.main,
    LOW: theme.palette.warning.main,
    CAUTION: theme.palette.warning.light,
    NORMAL: theme.palette.info.main,
    GOOD: theme.palette.success.main,
    EXCELLENT: theme.palette.success.light,
    BACKGROUND: theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.6)
      : alpha(theme.palette.background.paper, 0.9)
  }), [theme.palette]);
};

const getSoCColor = (soc, colors) => {
  if (soc <= SOC_THRESHOLDS.CRITICAL) return colors.CRITICAL;
  if (soc <= SOC_THRESHOLDS.LOW) return colors.LOW;
  if (soc <= SOC_THRESHOLDS.CAUTION) return colors.CAUTION;
  if (soc <= SOC_THRESHOLDS.NORMAL) return colors.NORMAL;
  if (soc <= SOC_THRESHOLDS.GOOD) return colors.GOOD;
  return colors.EXCELLENT;
};

// --- Small Components ---
const StatBox = memo(({ label, value, unit, color, icon: Icon, className }) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const animationsEnabled = settings?.global?.enableTransitions !== false;

  return (
    <Paper
      elevation={0}
      sx={{
        p: theme.spacing(1),
        borderRadius: theme.shape.borderRadius,
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transform: settings?.global?.enableHardwareAcceleration !== false ? 'translateZ(0)' : 'none',
        backgroundColor: alpha(theme.palette.background.paper, 0.7),
        transition: animationsEnabled
          ? theme.transitions.create(['background-color', 'transform'], {
            duration: theme.transitions.duration.short
          })
          : 'none',
        '&:hover': animationsEnabled ? {
          transform: settings?.global?.enableHardwareAcceleration !== false ? 'translateZ(0) scale(1.01)' : 'scale(1.01)',
          backgroundColor: alpha(theme.palette.background.paper, 0.9),
        } : {}
      }}
      className={className}
      role="region"
      aria-label={`${label}: ${value} ${unit || ''}`}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: theme.spacing(0.25) }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={theme.typography.fontWeightMedium}
          sx={{ fontSize: '0.65rem' }}
        >
          {label}
        </Typography>
        {Icon && <Icon size={14} color={theme.palette.text.secondary} aria-hidden="true" />}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
        <Typography
          variant="h6"
          component="div"
          sx={{
            color: color || theme.palette.text.primary,
            fontWeight: theme.typography.fontWeightBold,
            lineHeight: 1.1,
            fontSize: '1.25rem'
          }}
        >
          {value}
        </Typography>
        {unit && (
          <Typography
            variant="body2"
            component="span"
            sx={{
              ml: theme.spacing(0.25),
              color: theme.palette.text.secondary,
              fontWeight: theme.typography.fontWeightMedium,
              fontSize: '0.7rem'
            }}
          >
            {unit}
          </Typography>
        )}
      </Box>
    </Paper>
  );
});

StatBox.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  unit: PropTypes.string,
  color: PropTypes.string,
  icon: PropTypes.elementType,
  className: PropTypes.string,
};

const FlowIndicator = memo(({ flow, size = 20 }) => {
  const theme = useTheme();
  const label = flow === 'CHARGING' ? 'Charging' :
    flow === 'DISCHARGING' ? 'Discharging' : 'Idle';

  return (
    <Box component="span" aria-label={label}>
      {flow === 'CHARGING' ? (
        <TrendingDown size={size} color={theme.palette.success.main} aria-hidden="true" />
      ) : flow === 'DISCHARGING' ? (
        <TrendingUp size={size} color={theme.palette.error.main} aria-hidden="true" />
      ) : (
        <Minus size={size} color={theme.palette.text.secondary} aria-hidden="true" />
      )}
    </Box>
  );
});

FlowIndicator.propTypes = {
  flow: PropTypes.oneOf(['CHARGING', 'DISCHARGING', 'IDLE']).isRequired,
  size: PropTypes.number,
};

const BatteryIconDisplay = memo(({ soc, isCharging, size = 24, color }) => {
  const label = isCharging ? 'Battery Charging' :
    soc > 100 ? 'Battery Overcharged' :
      soc >= 81 ? 'Battery Full' :
        soc >= 30 ? 'Battery Medium' :
          soc >= 1 ? 'Battery Low' : 'Battery Warning';

  return (
    <Box component="span" aria-label={label}>
      {isCharging ? (
        <BatteryCharging size={size} color={color} aria-hidden="true" />
      ) : soc > 100 ? (
        <BatteryPlus size={size} color={color} aria-hidden="true" />
      ) : soc >= 81 && soc <= 100 ? (
        <BatteryFull size={size} color={color} aria-hidden="true" />
      ) : soc >= 30 && soc <= 80 ? (
        <BatteryMedium size={size} color={color} aria-hidden="true" />
      ) : soc >= 1 && soc <= 29 ? (
        <BatteryLow size={size} color={color} aria-hidden="true" />
      ) : (
        <BatteryWarning size={size} color={color} aria-hidden="true" />
      )}
    </Box>
  );
});

BatteryIconDisplay.propTypes = {
  soc: PropTypes.number.isRequired,
  isCharging: PropTypes.bool.isRequired,
  size: PropTypes.number,
  color: PropTypes.string.isRequired,
};

// --- Combined Component ---
const SoCIndicator = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);

  // Use InView for visibility detection
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  // Use ResizeObserver to detect container size
  const { ref: resizeRef, width = 0, height = 0 } = useResizeObserver();

  // Pack gauge state
  const [voltage, setVoltage] = useState(0);
  const [current, setCurrent] = useState(0);
  const [minVoltage, setMinVoltage] = useState(null);
  const [maxVoltage, setMaxVoltage] = useState(null);
  const [maxCurrent, setMaxCurrent] = useState(null);

  // SoC state
  const [soc, setSoC] = useState(0);
  const [stats, setStats] = useState({
    minSoC: 0,
    maxSoC: 0,
    isCharging: false,
    status: 'NORMAL',
    message: 'Initializing...'
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs
  const lastTimestampRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Get update interval from settings
  const updateInterval = useMemo(() => (
    settings?.dashboard?.updateInterval
  ), [settings?.dashboard?.updateInterval]);

  // Get change threshold from settings
  const changeThreshold = useMemo(() => (
    settings?.dashboard?.significantChangeThreshold || 0.5
  ), [settings?.dashboard?.significantChangeThreshold]);

  // Check animation settings
  const animationsEnabled = settings?.global?.enableTransitions !== false;
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;

  // Clean up animation frames on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Update min/max for pack gauge
  useEffect(() => {
    if (!inView) return; // Skip updates when not visible

    if (voltage > 0) {
      if (minVoltage === null || voltage < minVoltage) setMinVoltage(voltage);
      if (maxVoltage === null || voltage > maxVoltage) setMaxVoltage(voltage);
    }

    const absCurrent = Math.abs(current);
    if (absCurrent > 0 && (maxCurrent === null || absCurrent > maxCurrent)) {
      setMaxCurrent(absCurrent);
    }
  }, [voltage, current, minVoltage, maxVoltage, maxCurrent, inView]);

  // Subscribe to pack voltage data
  const { ref: voltageRef } = useRealTimeData('pack_voltage', (msg) => {
    if (!inView) return; // Skip updates when not visible

    try {
      const fields = msg.fields;
      if (fields && fields.voltage?.numberValue !== undefined) {
        const newVoltage = Number(fields.voltage.numberValue);

        // Only update if change exceeds threshold
        if (Math.abs(newVoltage - voltage) > changeThreshold) {
          setVoltage(newVoltage);
        }

        if (newVoltage > 0 && isLoading) {
          setIsLoading(false);
        }

        // Clear any previous errors
        if (error) setError(null);
      }
    } catch (err) {
      console.error('Error processing voltage data:', err);
      setError('Failed to process voltage data');
    }
  }, { customInterval: updateInterval });

  // Subscribe to pack current data
  const { ref: currentRef } = useRealTimeData('pack_current', (msg) => {
    if (!inView) return; // Skip updates when not visible

    try {
      const fields = msg.fields;
      if (fields && fields.current?.numberValue !== undefined) {
        const newCurrent = Number(fields.current.numberValue);

        // Only update if change exceeds threshold
        if (Math.abs(newCurrent - current) > changeThreshold) {
          setCurrent(newCurrent);
        }

        // Clear any previous errors
        if (error) setError(null);
      }
    } catch (err) {
      console.error('Error processing current data:', err);
      setError('Failed to process current data');
    }
  }, { customInterval: updateInterval });

  // Update SoC stats (without displaying current or time remaining)
  const updateStats = useCallback((newSoC, newCurrent) => {
    if (!inView) return; // Skip updates when not visible

    const clampedSoC = Math.min(100, Math.max(0, newSoC));
    const isCharging = newCurrent < 0;
    let status, message;

    if (clampedSoC <= SOC_THRESHOLDS.CRITICAL) {
      status = 'CRITICAL';
      message = isCharging ? 'Charging' : 'Critically low';
    } else if (clampedSoC <= SOC_THRESHOLDS.LOW) {
      status = 'LOW';
      message = isCharging ? 'Charging' : 'Charge soon';
    } else if (clampedSoC <= SOC_THRESHOLDS.CAUTION) {
      status = 'CAUTION';
      message = isCharging ? 'Charging' : 'Decreasing';
    } else if (clampedSoC <= SOC_THRESHOLDS.NORMAL) {
      status = 'NORMAL';
      message = isCharging ? 'Charging' : 'Normal';
    } else if (clampedSoC <= SOC_THRESHOLDS.GOOD) {
      status = 'GOOD';
      message = isCharging ? 'Charging' : 'Optimal';
    } else {
      status = 'EXCELLENT';
      message = isCharging ? 'Charging' : 'Fully charged';
    }

    setStats(prev => ({
      minSoC: prev.minSoC ? Math.min(prev.minSoC, clampedSoC) : clampedSoC,
      maxSoC: Math.max(prev.maxSoC || 0, clampedSoC),
      isCharging,
      status,
      message
    }));

    if (isLoading && clampedSoC > 0) {
      setIsLoading(false);
    }
  }, [isLoading, inView]);

  // Subscribe to SoC data
  const { ref: socRef } = useRealTimeData('aculv_fd_1', (msg) => {
    if (!inView) return; // Skip updates when not visible

    try {
      const fields = msg.fields;
      if (!fields) return;

      const newTimestamp = fields.timestamp?.numberValue || Date.now();
      if (lastTimestampRef.current && newTimestamp <= lastTimestampRef.current) return;
      lastTimestampRef.current = newTimestamp;

      if (error) setError(null);

      const newSoC = fields.state_of_charge?.numberValue !== undefined
        ? Number(fields.state_of_charge.numberValue)
        : soc;

      // Only update if significant change
      if (Math.abs(newSoC - soc) > changeThreshold) {
        // Use animation frame for smoother updates
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }

        animationFrameRef.current = requestAnimationFrame(() => {
          setSoC(newSoC);
          // Use current from pack data for charging status
          updateStats(newSoC, current);
        });
      }
    } catch (err) {
      console.error('Error processing SoC data:', err);
      setError('Failed to process SoC data');
    }
  }, { customInterval: updateInterval });

  // Computed values for pack gauge
  const power = useMemo(() => (voltage * current).toFixed(0), [voltage, current]);
  const flowStatus = useMemo(() => getFlowIndicator(current), [current]);
  const voltageColor = useMemo(() => getVoltageColor(voltage, theme), [voltage, theme]);
  const currentColor = useMemo(() => getCurrentColor(current, theme), [current, theme]);

  // Colors for SoC indicator
  const socColors = useSoCColors();
  const statusColor = useMemo(() => getSoCColor(soc, socColors), [soc, socColors]);

  // Combine refs
  const setRefs = useCallback(
    (node) => {
      // Add all refs that need to be attached to the same element
      resizeRef(node);
      inViewRef(node);
      if (voltageRef) voltageRef(node);
      if (currentRef) currentRef(node);
      if (socRef) socRef(node);
    },
    [resizeRef, inViewRef, voltageRef, currentRef, socRef]
  );

  // Dynamic content based on container size
  const renderContent = () => {
    if (isLoading) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100%' 
        }} aria-label="Loading battery data">
          <Typography variant="body1">Loading...</Typography>
        </Box>
      );
    }

    // Super compact view for very small containers (height < 200px)
    if (height < 200) {
      return (
        <Box sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing(1)
        }}>
          {/* Combined readings in super compact format */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <BatteryIconDisplay
                soc={soc}
                isCharging={stats.isCharging}
                size={18}
                color={statusColor}
              />
              <Typography
                variant="subtitle1"
                sx={{
                  ml: theme.spacing(0.5),
                  fontWeight: theme.typography.fontWeightBold,
                  color: statusColor,
                  fontSize: '0.9rem'
                }}
              >
                {Math.round(soc)}%
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontSize: '0.7rem' }}>
                {voltage.toFixed(1)}V / {Math.abs(current).toFixed(1)}A
              </Typography>
            </Box>
          </Box>

          {/* Compact stats box */}
          <Box sx={{
            display: 'flex',
            justifyContent: 'space-between',
            px: theme.spacing(0.5),
            py: theme.spacing(0.25),
            bgcolor: alpha(theme.palette.background.paper, 0.1),
            borderRadius: theme.shape.borderRadius,
            border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(theme.palette.divider, 0.5)}`
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: theme.palette.text.secondary, mr: theme.spacing(0.5) }}>
                MIN
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: theme.typography.fontWeightMedium }}>
                {minVoltage ? minVoltage.toFixed(1) : '-'}V
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: theme.palette.text.secondary, mr: theme.spacing(0.5) }}>
                MAX
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: theme.typography.fontWeightMedium }}>
                {maxVoltage ? maxVoltage.toFixed(1) : '-'}V
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontSize: '0.6rem', color: theme.palette.text.secondary, mr: theme.spacing(0.5) }}>
                PEAK
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.75rem', fontWeight: theme.typography.fontWeightMedium }}>
                {maxCurrent ? maxCurrent.toFixed(1) : '-'}A
              </Typography>
            </Box>
          </Box>

          {/* SoC bar */}
          <LinearProgress
            variant="determinate"
            value={Math.min(soc, 100)} // Cap at 100% for the visual bar
            sx={{
              height: theme.spacing(0.5),
              borderRadius: theme.shape.borderRadius / 2,
              backgroundColor: alpha(theme.palette.background.paper, 0.2),
              '& .MuiLinearProgress-bar': {
                backgroundColor: statusColor,
                transition: animationsEnabled ? 'transform 0.4s ease' : 'none'
              }
            }}
            aria-hidden="true"
          />
        </Box>
      );
    }

    // Standard view with all components
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing(1.5)
      }}>
        {/* Pack Gauge Display */}
        <Paper
          elevation={0}
          sx={{
            p: theme.spacing(1.5),
            borderRadius: theme.shape.borderRadius,
            border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
            backgroundColor: alpha(theme.palette.background.default, 0.5),
            transition: animationsEnabled ? theme.transitions.create(['background-color', 'box-shadow']) : 'none',
            '&:hover': animationsEnabled ? {
              backgroundColor: alpha(theme.palette.background.paper, 0.7),
              boxShadow: theme.shadows[2]
            } : {}
          }}
          role="region"
          aria-label="Battery Pack Measurements"
        >
          <Grid container spacing={theme.spacing(1.5)} alignItems="center">
            <Grid item xs={4} sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Voltage
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  color: voltageColor,
                  fontWeight: theme.typography.fontWeightBold,
                  lineHeight: 1.1,
                  fontSize: '1.25rem'
                }}
                aria-label={`Voltage: ${voltage.toFixed(1)} Volts`}
              >
                {voltage.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Volts
              </Typography>
            </Grid>

            <Grid item xs={4} sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Current
              </Typography>
              <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                aria-label={`Current: ${Math.abs(current).toFixed(1)} Amps, ${flowStatus.toLowerCase()}`}
              >
                <Typography
                  variant="h5"
                  sx={{
                    color: currentColor,
                    fontWeight: theme.typography.fontWeightBold,
                    lineHeight: 1.1,
                    fontSize: '1.25rem'
                  }}
                >
                  {Math.abs(current).toFixed(1)}
                </Typography>
                <FlowIndicator flow={flowStatus} size={20} />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Amps
              </Typography>
            </Grid>

            <Grid item xs={4} sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Power
              </Typography>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: theme.typography.fontWeightBold,
                  lineHeight: 1.1,
                  fontSize: '1.25rem'
                }}
                aria-label={`Power: ${power} Watts`}
              >
                {power}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                Watts
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* Stat Boxes - Always shown */}
        <Grid container spacing={theme.spacing(1.5)}>
          <Grid item xs={4}>
            <StatBox
              label="MIN VOLTAGE"
              value={minVoltage ? minVoltage.toFixed(1) : '-'}
              unit="V"
              color={minVoltage ? getVoltageColor(minVoltage, theme) : undefined}
              icon={Battery}
            />
          </Grid>
          <Grid item xs={4}>
            <StatBox
              label="MAX VOLTAGE"
              value={maxVoltage ? maxVoltage.toFixed(1) : '-'}
              unit="V"
              color={maxVoltage ? getVoltageColor(maxVoltage, theme) : undefined}
              icon={Battery}
            />
          </Grid>
          <Grid item xs={4}>
            <StatBox
              label="PEAK CURRENT"
              value={maxCurrent ? maxCurrent.toFixed(1) : '-'}
              unit="A"
              color={maxCurrent ? getCurrentColor(maxCurrent, theme) : undefined}
              icon={Zap}
            />
          </Grid>
        </Grid>

        {/* SoC Indicator - Only if enough space */}
        {height >= 350 && (
          <Paper
            elevation={0}
            sx={{
              p: theme.spacing(1.5),
              borderRadius: theme.shape.borderRadius,
              border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing(1.5),
              backgroundColor: alpha(theme.palette.background.default, 0.5),
              transition: animationsEnabled ? theme.transitions.create(['background-color', 'box-shadow']) : 'none',
              '&:hover': animationsEnabled ? {
                backgroundColor: alpha(theme.palette.background.paper, 0.7),
                boxShadow: theme.shadows[2]
              } : {}
            }}
            role="region"
            aria-label={`Battery state of charge: ${Math.round(soc)}%`}
          >
            <BatteryIconDisplay
              soc={soc}
              isCharging={stats.isCharging}
              size={32}
              color={statusColor}
            />
            <Box sx={{ flex: 1 }}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: theme.spacing(0.5)
              }}>
                <Typography
                  variant="h5"
                  component="div"
                  sx={{
                    color: statusColor,
                    fontWeight: theme.typography.fontWeightBold,
                    lineHeight: 1.1,
                    fontSize: '1.25rem'
                  }}
                >
                  {Math.round(soc)}%
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: theme.palette.getContrastText(alpha(statusColor, 0.2)),
                    backgroundColor: alpha(statusColor, 0.2),
                    px: theme.spacing(1),
                    py: theme.spacing(0.25),
                    fontSize: '0.75rem',
                    borderRadius: theme.shape.borderRadius / 2,
                    border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(statusColor, 0.3)}`
                  }}
                  aria-live="polite"
                >
                  {stats.message}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(soc, 100)} // Cap at 100% for the visual bar
                sx={{
                  height: theme.spacing(1),
                  borderRadius: theme.shape.borderRadius / 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.2),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: statusColor,
                    transition: animationsEnabled ? 'transform 0.4s ease' : 'none'
                  }
                }}
                aria-hidden="true"
              />
            </Box>
          </Paper>
        )}

        {/* If SoC indicator doesn't fit, still show the battery percentage in a compact way */}
        {height < 350 && (
          <Box sx={{
            display: 'flex',
            alignItems: 'center',
            px: theme.spacing(1),
            py: theme.spacing(0.5)
          }}>
            <BatteryIconDisplay
              soc={soc}
              isCharging={stats.isCharging}
              size={20}
              color={statusColor}
            />
            <Typography
              variant="subtitle1"
              sx={{
                ml: theme.spacing(0.5),
                color: statusColor,
                fontWeight: theme.typography.fontWeightBold,
                fontSize: '0.9rem'
              }}
            >
              {Math.round(soc)}%
            </Typography>
            <Box sx={{ flex: 1, ml: theme.spacing(1) }}>
              <LinearProgress
                variant="determinate"
                value={Math.min(soc, 100)} // Cap at 100% for the visual bar
                sx={{
                  height: theme.spacing(0.5),
                  borderRadius: theme.shape.borderRadius / 2,
                  backgroundColor: alpha(theme.palette.background.paper, 0.2),
                  '& .MuiLinearProgress-bar': {
                    backgroundColor: statusColor,
                    transition: animationsEnabled ? 'transform 0.4s ease' : 'none'
                  }
                }}
                aria-hidden="true"
              />
            </Box>
            <Typography
              variant="caption"
              sx={{
                ml: theme.spacing(1),
                color: theme.palette.getContrastText(alpha(statusColor, 0.2)),
                backgroundColor: alpha(statusColor, 0.2),
                px: theme.spacing(0.75),
                py: theme.spacing(0.1),
                fontSize: '0.65rem',
                borderRadius: theme.shape.borderRadius / 2,
                border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(statusColor, 0.3)}`
              }}
            >
              {stats.message}
            </Typography>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Card
      ref={setRefs}
      elevation={0}
      sx={{
        width: '100%',
        height: '100%', // Fill the grid cell
        backgroundColor: theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius,
        overflow: 'hidden',
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        transform: hardwareAcceleration ? 'translateZ(0)' : 'none',
        '&:hover': animationsEnabled ? {
          boxShadow: theme.custom?.shadows?.md || theme.shadows[4]
        } : {},
        transition: animationsEnabled ? theme.transitions.create(['box-shadow']) : 'none',
      }}
      role="region"
      aria-label="Battery Pack Status"
    >
      {/* Header */}
      <CardHeader
        title={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing(1),
            }}
          >
            <Zap size={20} color={theme.palette.primary.main} aria-hidden="true" />
            <Typography
              variant="h6"
              sx={{
                fontWeight: theme.typography.fontWeightMedium,
                lineHeight: 1.2,
                m: 0.5
              }}
            >
              Battery Pack Status
            </Typography>
          </Box>
        }
        sx={{
          p: theme.spacing(0.5),
          display: 'flex',
          alignItems: 'center',
          '& .MuiCardHeader-action': {
            m: 0,
          },
        }}
      />

      <Divider />

      {/* Content - Made scrollable but hidden scrollbar when not needed */}
      <CardContent
        sx={{
          p: theme.spacing(1.5),
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0, // Important for proper flex behavior
          maxHeight: '100%', // Ensure it doesn't overflow
          overflow: 'auto', // Allow scrolling if needed
          scrollbarWidth: 'thin', // Firefox
          '&::-webkit-scrollbar': {
            width: '4px',
            height: '4px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'transparent',
          },
          '&::-webkit-scrollbar-thumb': {
            background: alpha(theme.palette.divider, 0.5),
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: theme.palette.divider,
          },
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
              Battery monitoring paused
            </Typography>
          </Box>
        ) : (
          renderContent()
        )}
      </CardContent>
    </Card>
  );
};

export default memo(SoCIndicator);