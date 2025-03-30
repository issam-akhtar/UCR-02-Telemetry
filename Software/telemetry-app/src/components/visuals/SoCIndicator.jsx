import React, { useState, useEffect, useRef, memo, useContext, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
  Box,
  Typography,
  Paper,
  useTheme,
  LinearProgress,
  alpha,
  Card,
  CardHeader,
  CardContent,
  Divider,
  Grid,
} from '@mui/material';
import {
  Battery,
  BatteryCharging,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import useRealTimeData from '../../hooks/useRealTimeData';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';

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

// --- Utility Functions ---
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

const getSoCColor = (soc, theme) => {
  if (soc <= SOC_THRESHOLDS.CRITICAL) return theme.palette.error.main;
  if (soc <= SOC_THRESHOLDS.LOW) return theme.palette.warning.main;
  if (soc <= SOC_THRESHOLDS.CAUTION) return theme.palette.warning.light;
  if (soc <= SOC_THRESHOLDS.NORMAL) return theme.palette.info.main;
  if (soc <= SOC_THRESHOLDS.GOOD) return theme.palette.success.main;
  return theme.palette.success.light;
};

// --- Memoized Sub-Components ---
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
        <Battery size={size} color={color} aria-hidden="true" />
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

// Stat Box Component - Optimized for compact display
const StatBox = memo(({ label, value, unit, color, icon: Icon }) => {
  const theme = useTheme();

  return (
    <Paper
      elevation={0}
      sx={{
        p: theme.spacing(0.75),
        borderRadius: theme.shape.borderRadius,
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: alpha(theme.palette.background.paper, 0.7),
      }}
      role="region"
      aria-label={`${label}: ${value} ${unit || ''}`}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography
          variant="caption"
          color="text.secondary"
          fontWeight={theme.typography.fontWeightMedium}
          sx={{ fontSize: '0.6rem' }}
        >
          {label}
        </Typography>
        {Icon && <Icon size={12} color={theme.palette.text.secondary} aria-hidden="true" />}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
        <Typography
          variant="h6"
          component="div"
          sx={{
            color: color || theme.palette.text.primary,
            fontWeight: theme.typography.fontWeightBold,
            lineHeight: 1,
            fontSize: '1.1rem'
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
              fontSize: '0.65rem'
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
};

// --- Main Component ---
const SoCIndicator = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });
  
  const updateInterval = settings?.dashboard?.updateInterval || 300;
  const changeThreshold = settings?.dashboard?.significantChangeThreshold || 1.0;
  const animationsEnabled = settings?.global?.enableTransitions !== false;
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;
  
  // State for battery data
  const [voltage, setVoltage] = useState(0);
  const [current, setCurrent] = useState(0);
  const [soc, setSoC] = useState(0);
  const [minVoltage, setMinVoltage] = useState(null);
  const [maxVoltage, setMaxVoltage] = useState(null);
  const [maxCurrent, setMaxCurrent] = useState(null);
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [isCharging, setIsCharging] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const lastValuesRef = useRef({ voltage, current, soc, timestamp: 0 });
  const isComponentMounted = useRef(true);
  
  useEffect(() => {
    isComponentMounted.current = true;
    return () => {
      isComponentMounted.current = false;
    };
  }, []);
  
  const updateStatusMessage = useCallback((socValue, charging) => {
    if (socValue <= SOC_THRESHOLDS.CRITICAL) {
      setStatusMessage(charging ? 'Charging' : 'Critically low');
    } else if (socValue <= SOC_THRESHOLDS.LOW) {
      setStatusMessage(charging ? 'Charging' : 'Charge soon');
    } else if (socValue <= SOC_THRESHOLDS.CAUTION) {
      setStatusMessage(charging ? 'Charging' : 'Decreasing');
    } else if (socValue <= SOC_THRESHOLDS.NORMAL) {
      setStatusMessage(charging ? 'Charging' : 'Normal');
    } else if (socValue <= SOC_THRESHOLDS.GOOD) {
      setStatusMessage(charging ? 'Charging' : 'Optimal');
    } else {
      setStatusMessage(charging ? 'Charging' : 'Fully charged');
    }
  }, []);
  
  const handleVoltageData = useCallback((msg) => {
    if (!inView || !isComponentMounted.current) return;

    try {
      const fields = msg?.fields;
      if (fields && fields.voltage?.numberValue !== undefined) {
        const newVoltage = Number(fields.voltage.numberValue);

        if (Math.abs(newVoltage - lastValuesRef.current.voltage) > changeThreshold) {
          setVoltage(newVoltage);
          lastValuesRef.current.voltage = newVoltage;
          
          if (newVoltage > 0) {
            if (minVoltage === null || newVoltage < minVoltage) {
              setMinVoltage(newVoltage);
            }
            if (maxVoltage === null || newVoltage > maxVoltage) {
              setMaxVoltage(newVoltage);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error processing voltage data:', err);
    }
  }, [inView, changeThreshold, minVoltage, maxVoltage]);

  const handleCurrentData = useCallback((msg) => {
    if (!inView || !isComponentMounted.current) return;

    try {
      const fields = msg?.fields;
      if (fields && fields.current?.numberValue !== undefined) {
        const newCurrent = Number(fields.current.numberValue);

        if (Math.abs(newCurrent - lastValuesRef.current.current) > changeThreshold) {
          setCurrent(newCurrent);
          lastValuesRef.current.current = newCurrent;
          
          const isChargingNow = newCurrent < 0;
          setIsCharging(isChargingNow);
          
          updateStatusMessage(lastValuesRef.current.soc, isChargingNow);
          
          const absCurrent = Math.abs(newCurrent);
          if (absCurrent > 0 && (maxCurrent === null || absCurrent > maxCurrent)) {
            setMaxCurrent(absCurrent);
          }
        }
      }
    } catch (err) {
      console.error('Error processing current data:', err);
    }
  }, [inView, changeThreshold, maxCurrent, updateStatusMessage]);

  const handleSocData = useCallback((msg) => {
    if (!inView || !isComponentMounted.current) return;

    try {
      const fields = msg?.fields;
      if (!fields) return;

      const newTimestamp = fields.timestamp?.numberValue || Date.now();
      if (lastValuesRef.current.timestamp && newTimestamp <= lastValuesRef.current.timestamp) return;
      lastValuesRef.current.timestamp = newTimestamp;

      const newSoC = fields.state_of_charge?.numberValue !== undefined
        ? Number(fields.state_of_charge.numberValue)
        : lastValuesRef.current.soc;

      if (Math.abs(newSoC - lastValuesRef.current.soc) > changeThreshold) {
        setSoC(newSoC);
        lastValuesRef.current.soc = newSoC;
        
        updateStatusMessage(newSoC, isCharging);
        
        if (newSoC > 0 && isLoading) {
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('Error processing SoC data:', err);
    }
  }, [inView, changeThreshold, isLoading, isCharging, updateStatusMessage]);

  const { ref: voltageDataRef } = useRealTimeData(
    'pack_voltage', 
    handleVoltageData, 
    { customInterval: updateInterval }
  );

  const { ref: currentDataRef } = useRealTimeData(
    'pack_current', 
    handleCurrentData, 
    { customInterval: updateInterval }
  );

  const { ref: socDataRef } = useRealTimeData(
    'aculv_fd_1', 
    handleSocData, 
    { customInterval: updateInterval }
  );
  
  const setRefs = useCallback(
    (node) => {
      if (node) {
        inViewRef(node);
        if (voltageDataRef && typeof voltageDataRef === 'function') voltageDataRef(node);
        if (currentDataRef && typeof currentDataRef === 'function') currentDataRef(node);
        if (socDataRef && typeof socDataRef === 'function') socDataRef(node);
      }
    },
    [inViewRef, voltageDataRef, currentDataRef, socDataRef]
  );
  
  const power = useMemo(() => (voltage * current).toFixed(0), [voltage, current]);
  const flowStatus = useMemo(() => getFlowIndicator(current), [current]);
  const voltageColor = useMemo(() => getVoltageColor(voltage, theme), [voltage, theme]);
  const currentColor = useMemo(() => getCurrentColor(current, theme), [current, theme]);
  const socColor = useMemo(() => getSoCColor(soc, theme), [soc, theme]);
  
  return (
    <Card
      ref={setRefs}
      elevation={0}
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius,
        overflow: 'hidden',
        border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        transform: hardwareAcceleration ? 'translateZ(0)' : 'none',
      }}
      role="region"
      aria-label="Battery Pack Status"
    >
      {/* Compact Header */}
      <CardHeader
        title={
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing(0.5),
            }}
          >
            <Zap size={16} color={theme.palette.primary.main} aria-hidden="true" />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: theme.typography.fontWeightMedium,
                lineHeight: 1,
                m: 0
              }}
            >
              Battery Pack Status
            </Typography>
          </Box>
        }
        sx={{
          p: theme.spacing(0.5),
          height: 'auto',
          minHeight: 'unset',
          '& .MuiCardHeader-action': {
            m: 0,
          },
        }}
      />

      <Divider />

      {/* Compact Content */}
      <CardContent
        sx={{
          p: theme.spacing(0.75),
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible', // Prevent scrollbar
          '&:last-child': {
            pb: theme.spacing(0.75),
          }
        }}
      >
        {!inView ? (
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
        ) : isLoading ? (
          <Box
            sx={{
              flex: 1,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
            }}
            aria-label="Loading battery data"
          >
            <Typography variant="body1">Loading...</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: theme.spacing(0.75) }}>
            {/* Pack Gauge Display - More Compact */}
            <Paper
              elevation={0}
              sx={{
                p: theme.spacing(1),
                borderRadius: theme.shape.borderRadius,
                border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
                backgroundColor: alpha(theme.palette.background.default, 0.5),
              }}
              role="region"
              aria-label="Battery Pack Measurements"
            >
              <Grid container spacing={1} alignItems="center">
                {/* Voltage */}
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Voltage
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      color: voltageColor,
                      fontWeight: theme.typography.fontWeightBold,
                      lineHeight: 1,
                      fontSize: '1.2rem',
                      my: 0.25
                    }}
                    aria-label={`Voltage: ${voltage.toFixed(1)} Volts`}
                  >
                    {voltage.toFixed(1)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Volts
                  </Typography>
                </Grid>

                {/* Current */}
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Current
                  </Typography>
                  <Box
                    sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', my: 0.25 }}
                    aria-label={`Current: ${Math.abs(current).toFixed(1)} Amps, ${flowStatus.toLowerCase()}`}
                  >
                    <Typography
                      variant="h5"
                      sx={{
                        color: currentColor,
                        fontWeight: theme.typography.fontWeightBold,
                        lineHeight: 1,
                        fontSize: '1.2rem'
                      }}
                    >
                      {Math.abs(current).toFixed(1)}
                    </Typography>
                    <FlowIndicator flow={flowStatus} size={16} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Amps
                  </Typography>
                </Grid>

                {/* Power */}
                <Grid item xs={4} sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Power
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: theme.typography.fontWeightBold,
                      lineHeight: 1,
                      fontSize: '1.2rem',
                      my: 0.25
                    }}
                    aria-label={`Power: ${power} Watts`}
                  >
                    {power}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                    Watts
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* Stat Boxes - Tighter layout */}
            <Grid container spacing={0.75}>
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

            {/* SoC Indicator - More Compact */}
            <Paper
              elevation={0}
              sx={{
                p: theme.spacing(0.75),
                borderRadius: theme.shape.borderRadius,
                border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing(1),
                backgroundColor: alpha(theme.palette.background.default, 0.5),
              }}
              role="region"
              aria-label={`Battery state of charge: ${Math.round(soc)}%`}
            >
              <BatteryIconDisplay
                soc={soc}
                isCharging={isCharging}
                size={24}
                color={socColor}
              />
              <Box sx={{ flex: 1 }}>
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: theme.spacing(0.25)
                }}>
                  <Typography
                    variant="h6"
                    component="div"
                    sx={{
                      color: socColor,
                      fontWeight: theme.typography.fontWeightBold,
                      lineHeight: 1,
                      fontSize: '1.1rem'
                    }}
                  >
                    {Math.round(soc)}%
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.getContrastText(alpha(socColor, 0.2)),
                      backgroundColor: alpha(socColor, 0.2),
                      px: theme.spacing(0.75),
                      py: theme.spacing(0.125),
                      fontSize: '0.65rem',
                      borderRadius: theme.shape.borderRadius / 2,
                      border: `${theme.custom?.borderWidth?.thin || 1}px solid ${alpha(socColor, 0.3)}`
                    }}
                    aria-live="polite"
                  >
                    {statusMessage}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(soc, 100)}
                  sx={{
                    height: theme.spacing(0.5),
                    borderRadius: theme.shape.borderRadius / 2,
                    backgroundColor: alpha(theme.palette.background.paper, 0.2),
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: socColor,
                      transition: animationsEnabled ? 'transform 0.4s ease' : 'none'
                    }
                  }}
                  aria-hidden="true"
                />
              </Box>
            </Paper>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(SoCIndicator);