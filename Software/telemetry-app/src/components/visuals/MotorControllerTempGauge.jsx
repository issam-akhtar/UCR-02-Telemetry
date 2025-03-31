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
  alpha,
  Card,
  useTheme,
  CardHeader,
  CardContent,
  Divider
} from '@mui/material';
import {
  Thermometer,
  CheckCircle
} from 'lucide-react';
import useRealTimeData from '../../hooks/useRealTimeData';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';
import { useInView } from 'react-intersection-observer';

// Constants defined outside component to prevent recreation
const TEMP_THRESHOLDS = {
  NORMAL: 60,
  WARNING: 80,
  CRITICAL: 120,
  MAX_SCALE: 150
};

// Motor temperature calculation function using the provided formula
const calculateMotorTemp = (x) => {
  return (2.33e-21 * Math.pow(x, 6)) - 
         (1.619e-16 * Math.pow(x, 5)) + 
         (4.627e-12 * Math.pow(x, 4)) - 
         (6.953e-08 * Math.pow(x, 3)) + 
         (0.000579 * Math.pow(x, 2)) - 
         (2.515 * x) + 
         4379;
};

// Pre-calculated temperature lookup table (still used for controller temp)
const createTempLookup = () => {
  const lookupData = [
    { temp: -60, value: 10000 },
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

  // Cache for interpolation results
  const cache = new Map();

  return {
    lookup: (sensorValue) => {
      if (!sensorValue) return 0;
      if (cache.has(sensorValue)) return cache.get(sensorValue);

      let lowerValue = null,
        upperValue = null,
        lowerTemp = null,
        upperTemp = null;

      for (let i = 0; i < lookupData.length; i++) {
        if (lookupData[i].value <= sensorValue) {
          lowerValue = lookupData[i].value;
          lowerTemp = lookupData[i].temp;
        } else {
          upperValue = lookupData[i].value;
          upperTemp = lookupData[i].temp;
          break;
        }
      }

      let result;
      if (lowerValue === null) result = lookupData[0].temp;
      else if (upperValue === null) result = lookupData[lookupData.length - 1].temp;
      else
        result =
          lowerTemp +
          ((sensorValue - lowerValue) * (upperTemp - lowerTemp)) /
          (upperValue - lowerValue);

      cache.set(sensorValue, result);
      return result;
    }
  };
};

// Create the lookup table once
const TEMP_LOOKUP = createTempLookup();

// Utility functions (outside component to prevent recreation)
const getTempColor = (temp, theme) => {
  if (temp >= TEMP_THRESHOLDS.CRITICAL) return theme.palette.error.main;
  if (temp >= TEMP_THRESHOLDS.WARNING) return theme.palette.warning.main;
  return theme.palette.success.main;
};

const getStatusMessage = (temp) => {
  if (temp >= TEMP_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (temp >= TEMP_THRESHOLDS.WARNING) return 'WARNING';
  return 'NORMAL';
};

const convertTemp = (temp, showInF) => {
  if (showInF) return (temp * 9) / 5 + 32;
  return temp;
};

// Status icon component
const StatusIcon = memo(({ temp, size = 16 }) => {
  const theme = useTheme();
  const color = getTempColor(temp, theme);
  return <CheckCircle size={size} color={color} aria-hidden="true" />;
});

StatusIcon.propTypes = {
  temp: PropTypes.number.isRequired,
  size: PropTypes.number
};

// Temperature card component
const TempCard = memo(({ label, temp, minTemp, maxTemp }) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const showTempInF = settings?.dashboard?.showTempInF || false;
  const animationsEnabled = settings?.global?.enableTransitions !== false;

  // Convert temperatures for display
  const displayTemp = convertTemp(temp, showTempInF);
  const tempUnit = showTempInF ? '°F' : '°C';
  const displayMinTemp = minTemp !== null && minTemp !== undefined
    ? convertTemp(minTemp, showTempInF).toFixed(1)
    : 'N/A';
  const displayMaxTemp = maxTemp !== null && maxTemp !== undefined
    ? convertTemp(maxTemp, showTempInF).toFixed(1)
    : 'N/A';

  const color = getTempColor(temp, theme);
  const status = getStatusMessage(temp);

  return (
    <Box
      sx={{
        p: theme.spacing(2),
        borderRadius: theme.shape.borderRadius,
        backgroundColor: alpha(theme.palette.background.paper, 0.2),
        border: `1px solid ${theme.palette.divider}`,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: theme.custom?.shadows?.sm
      }}
      role="region"
      aria-label={`${label} temperature reading`}
    >
      {/* Status indicator bar */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: theme.spacing(0.5),
          backgroundColor: color,
          transition: animationsEnabled ? 'background-color 0.3s' : 'none'
        }}
        aria-hidden="true"
      />

      {/* Temperature label */}
      <Typography
        variant="subtitle2"
        sx={{
          color: theme.palette.text.secondary,
          mb: theme.spacing(1),
          fontWeight: theme.typography.fontWeightMedium
        }}
      >
        {label}
      </Typography>

      {/* Current temperature display */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing(1),
          mb: theme.spacing(1),
        }}
        aria-live="polite"
      >
        <Thermometer size={20} color={color} aria-hidden="true" />
        <Typography
          variant="h3"
          component="div"
          sx={{ 
            color, 
            fontWeight: theme.typography.fontWeightBold
          }}
        >
          {displayTemp.toFixed(1)}
        </Typography>
        <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
          {tempUnit}
        </Typography>
      </Box>

      {/* Min/Max temperature section */}
      <Box
        sx={{
          mt: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing(0.5),
          backgroundColor: alpha(color, 0.12),
          py: theme.spacing(0.5),
          borderRadius: theme.shape.borderRadius * 0.5
        }}
      >
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          Min: {displayMinTemp}{tempUnit}
        </Typography>
        <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
          Max: {displayMaxTemp}{tempUnit}
        </Typography>
      </Box>

      {/* Status indicator */}
      <Box
        sx={{
          mt: theme.spacing(1),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing(0.5),
        }}
      >
        <StatusIcon temp={temp} size={14} />
        <Typography variant="caption" sx={{ color }}>
          {status}
        </Typography>
      </Box>
    </Box>
  );
});

TempCard.propTypes = {
  label: PropTypes.string.isRequired,
  temp: PropTypes.number.isRequired,
  minTemp: PropTypes.number,
  maxTemp: PropTypes.number
};

// Main component
const MotorControllerTempGauge = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  // State with individual hooks for better performance
  const [motorTemp, setMotorTemp] = useState(0);
  const [controllerTemp, setControllerTemp] = useState(0);
  const [minMotorTemp, setMinMotorTemp] = useState(null);
  const [maxMotorTemp, setMaxMotorTemp] = useState(null);
  const [minControllerTemp, setMinControllerTemp] = useState(null);
  const [maxControllerTemp, setMaxControllerTemp] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs for optimization
  const isComponentMounted = useRef(true);
  const lastMotorTempRef = useRef(0);
  const lastControllerTempRef = useRef(0);

  // Settings
  const updateInterval = settings?.dashboard?.updateInterval || 300;
  const changeThreshold = settings?.dashboard?.significantChangeThreshold || 0.5;
  const animationsEnabled = settings?.global?.enableTransitions !== false;
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;

  // Set up and clean up
  useEffect(() => {
    isComponentMounted.current = true;
    return () => { isComponentMounted.current = false; };
  }, []);

  // Update motor temperature and track min/max
  const updateMotorTemp = useCallback((temp, timestamp) => {
    if (!isComponentMounted.current) return;
    
    setMotorTemp(temp);
    lastMotorTempRef.current = temp;
    
    // Update min
    setMinMotorTemp(prev => {
      if (prev === null || temp < prev) return temp;
      return prev;
    });
    
    // Update max
    setMaxMotorTemp(prev => {
      if (prev === null || temp > prev) return temp;
      return prev;
    });
    
    // Clear loading state if both values are non-zero
    if (temp !== 0 || lastControllerTempRef.current !== 0) {
      setIsLoading(false);
    }
  }, []);

  // Update controller temperature and track min/max
  const updateControllerTemp = useCallback((temp, timestamp) => {
    if (!isComponentMounted.current) return;
    
    setControllerTemp(temp);
    lastControllerTempRef.current = temp;
    
    // Update min
    setMinControllerTemp(prev => {
      if (prev === null || temp < prev) return temp;
      return prev;
    });
    
    // Update max
    setMaxControllerTemp(prev => {
      if (prev === null || temp > prev) return temp;
      return prev;
    });
    
    // Clear loading state if both values are non-zero
    if (lastMotorTempRef.current !== 0 || temp !== 0) {
      setIsLoading(false);
    }
  }, []);

  // Handle incoming temperature data
  const handleTemperatureData = useCallback((msg) => {
    if (!inView || !isComponentMounted.current) return;
    
    try {
      const fields = msg?.fields;
      if (!fields) return;

      const rawMotor = fields.motor_temp?.numberValue;
      const rawController = fields.controller_temp?.numberValue;
      
      if (rawMotor === undefined || rawController === undefined) return;

      const now = Date.now();
      
      // Use the new formula for motor temperature
      const newMotorTemp = calculateMotorTemp(Number(rawMotor));
      
      // Continue using the lookup table for controller temperature
      const newControllerTemp = TEMP_LOOKUP.lookup(Number(rawController));

      // Update motor temperature if significant change
      if (Math.abs(newMotorTemp - lastMotorTempRef.current) > changeThreshold) {
        updateMotorTemp(newMotorTemp, now);
      }

      // Update controller temperature if significant change
      if (Math.abs(newControllerTemp - lastControllerTempRef.current) > changeThreshold) {
        updateControllerTemp(newControllerTemp, now);
      }

      // Clear any error
      if (error) setError(null);
    } catch (err) {
      console.error('Error processing temperature data:', err);
      if (isComponentMounted.current) {
        setError('Failed to process temperature data');
      }
    }
  }, [inView, changeThreshold, error, updateMotorTemp, updateControllerTemp]);

  // Subscribe to real-time data
  const { ref: dataRef } = useRealTimeData(
    'bamo_car_re_transmit',
    handleTemperatureData,
    { customInterval: updateInterval }
  );

  // Combine refs
  const setRefs = useCallback(node => {
    if (node) {
      inViewRef(node);
      if (dataRef && typeof dataRef === 'function') dataRef(node);
    }
  }, [inViewRef, dataRef]);

  // Render content based on state
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
            Temperature monitoring paused
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
            alignItems: 'center'
          }}
        >
          <Typography variant="body1">Loading...</Typography>
        </Box>
      );
    }
    
    return (
      <>
        <TempCard
          label="MOTOR TEMPERATURE"
          temp={motorTemp}
          minTemp={minMotorTemp}
          maxTemp={maxMotorTemp}
        />
        <TempCard
          label="CONTROLLER TEMPERATURE"
          temp={controllerTemp}
          minTemp={minControllerTemp}
          maxTemp={maxControllerTemp}
        />
      </>
    );
  }, [
    inView, isLoading, theme.palette.text.secondary,
    motorTemp, controllerTemp,
    minMotorTemp, maxMotorTemp,
    minControllerTemp, maxControllerTemp
  ]);

  return (
    <Card
      ref={setRefs}
      sx={{
        width: '100%',
        height: '100%',
        backgroundColor: theme.palette.background.paper,
        borderRadius: theme.shape.borderRadius,
        overflow: 'hidden',
        border: `1px solid ${theme.palette.divider}`,
        display: 'flex',
        flexDirection: 'column',
        transform: hardwareAcceleration ? 'translateZ(0)' : 'none'
      }}
      role="region"
      aria-label="Motor and Controller Temperature Monitor"
    >
      {/* Header */}
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
            <Thermometer size={20} color={theme.palette.primary.main} aria-hidden="true" />
            <Typography
              variant="h6"
              sx={{
                fontWeight: theme.typography.fontWeightMedium,
                lineHeight: 1.2,
                m: 0.5
              }}
            >
              Temperature Monitor
            </Typography>
          </Box>
        }
        sx={{
          p: theme.spacing(0.5),
          '& .MuiCardHeader-action': {
            m: 0
          }
        }}
      />
      <Divider />

      {/* Content */}
      <CardContent
        sx={{
          p: theme.spacing(1.5),
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing(3)
        }}
      >
        {renderContent()}
      </CardContent>
    </Card>
  );
};

export default memo(MotorControllerTempGauge);