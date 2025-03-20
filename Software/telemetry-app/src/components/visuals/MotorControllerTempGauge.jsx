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

// Temperature thresholds used for color coding and gauge scaling
const TEMP_THRESHOLDS = {
  NORMAL: 60,
  WARNING: 80,
  CRITICAL: 120,
  MAX_SCALE: 150
};

// Pre-calculated lookup table for efficient sensor-to-temperature conversion.
// Uses caching to avoid repeated heavy calculations.
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

  // Exact lookup table mapping sensor values to temperatures.
  const table = new Map();
  lookupData.forEach(entry => table.set(entry.value, entry.temp));

  // Cache for interpolation results.
  const cache = new Map();

  return {
    exactLookup: (sensorValue) => table.get(sensorValue),
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

const TEMP_LOOKUP = createTempLookup();

// Format a timestamp into a locale-specific time string.
const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'N/A';
  return new Date(timestamp).toLocaleTimeString();
};

// Determine the color based on temperature thresholds using the theme palette.
const getTempColor = (temp, theme) => {
  if (temp >= TEMP_THRESHOLDS.CRITICAL) return theme.palette.error.main;
  if (temp >= TEMP_THRESHOLDS.WARNING) return theme.palette.warning.main;
  return theme.palette.success.main;
};

// Get a status message based on the current temperature.
const getStatusMessage = (temp) => {
  if (temp >= TEMP_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (temp >= TEMP_THRESHOLDS.WARNING) return 'WARNING';
  return 'NORMAL';
};

// StatusIcon component visually represents the current status.
// Uses memoization to avoid unnecessary re-renders.
const StatusIcon = memo(({ temp, size = 16 }) => {
  const theme = useTheme();
  const color = getTempColor(temp, theme);
  // Use CheckCircle for all statuses to simplify
  return <CheckCircle size={size} color={color} aria-hidden="true" />;
});

StatusIcon.propTypes = {
  temp: PropTypes.number.isRequired,
  size: PropTypes.number
};

// TempCard component displays the temperature reading along with min and max values.
const TempCard = memo(
  ({ label, temp, icon: Icon, minTemp, minTimestamp, maxTemp, maxTimestamp }) => {
    const theme = useTheme();
    const { settings } = useContext(ChartSettingsContext);

    // Check if settings exist and use showTempInF if available, otherwise default to false
    const showTempInF = settings?.dashboard?.showTempInF || false;
    const animationsEnabled = settings?.global?.enableTransitions !== false;

    // Convert temperature to Fahrenheit if required.
    const displayTemp = showTempInF ? (temp * 9) / 5 + 32 : temp;
    const tempUnit = showTempInF ? '°F' : '°C';

    const color = getTempColor(temp, theme);
    const status = getStatusMessage(temp);

    // Format min and max temperatures for display.
    const displayMinTemp =
      minTemp !== null && minTemp !== undefined
        ? showTempInF
          ? ((minTemp * 9) / 5 + 32).toFixed(1)
          : minTemp.toFixed(1)
        : 'N/A';
    const displayMaxTemp =
      maxTemp !== null && maxTemp !== undefined
        ? showTempInF
          ? ((maxTemp * 9) / 5 + 32).toFixed(1)
          : maxTemp.toFixed(1)
        : 'N/A';

    return (
      <Box
        elevation={0}
        // Use theme-based spacing and colors for consistency.
        sx={{
          p: theme.spacing(2),
          borderRadius: theme.shape.borderRadius,
          backgroundColor: theme.palette.mode === 'dark'
            ? alpha(theme.palette.background.paper, 0.2)
            : alpha(theme.palette.background.default, 0.8),
          border: `${theme.custom?.borderWidth?.thin || 1}px solid ${theme.palette.divider}`,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: theme.custom?.shadows?.sm,
          transition: animationsEnabled ? 
            theme.transitions.create(['box-shadow', 'background-color'], {
              duration: theme.transitions.duration.short
            }) : 'none',
          '&:hover': animationsEnabled ? {
            boxShadow: theme.custom?.shadows?.md,
            backgroundColor: theme.palette.mode === 'dark'
              ? alpha(theme.palette.background.paper, 0.3)
              : alpha(theme.palette.background.default, 0.9),
          } : {}
        }}
        role="region"
        aria-label={`${label} temperature reading`}
      >
        {/* Top colored bar indicates current status */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: theme.spacing(0.5),
            backgroundColor: color,
            transition: animationsEnabled ? 
              theme.transitions.create('background-color', {
                duration: theme.transitions.duration.short
              }) : 'none'
          }}
          aria-hidden="true"
        />

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
          {Icon && <Icon size={20} color={color} aria-hidden="true" />}
          <Typography
            variant="h3"
            component="div"
            sx={{ 
              color, 
              fontWeight: theme.typography.fontWeightBold,
              transition: animationsEnabled ? 
                theme.transitions.create('color', {
                  duration: theme.transitions.duration.short
                }) : 'none'
            }}
          >
            {displayTemp.toFixed(1)}
          </Typography>
          <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
            {tempUnit}
          </Typography>
        </Box>

        {/* Display the recorded minimum and maximum temperatures */}
        <Box
          sx={{
            mt: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing(0.5),
            backgroundColor: alpha(color, 0.12),
            py: theme.spacing(0.5),
            borderRadius: theme.shape.borderRadius * 0.5,
            transition: animationsEnabled ? 
              theme.transitions.create('background-color', {
                duration: theme.transitions.duration.short
              }) : 'none'
          }}
        >
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Min: {displayMinTemp}
            {tempUnit}
          </Typography>
          <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
            Max: {displayMaxTemp}
            {tempUnit}
          </Typography>
        </Box>

        {/* Status icon and corresponding message */}
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
          <Typography 
            variant="caption" 
            sx={{ 
              color,
              transition: animationsEnabled ? 
                theme.transitions.create('color', {
                  duration: theme.transitions.duration.short
                }) : 'none'
            }}
          >
            {status}
          </Typography>
        </Box>
      </Box>
    );
  }
);

TempCard.propTypes = {
  label: PropTypes.string.isRequired,
  temp: PropTypes.number.isRequired,
  icon: PropTypes.elementType,
  minTemp: PropTypes.number,
  minTimestamp: PropTypes.number,
  maxTemp: PropTypes.number,
  maxTimestamp: PropTypes.number,
};

// Main component that subscribes to real-time temperature data and displays both motor and controller gauges.
const MotorControllerTempGauge = () => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);

  // Use InView for visibility detection
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: false
  });

  // State for current temperatures as well as historical min and max values.
  const [motorTemp, setMotorTemp] = useState(0);
  const [controllerTemp, setControllerTemp] = useState(0);
  const [maxMotorTemp, setMaxMotorTemp] = useState(null);
  const [maxControllerTemp, setMaxControllerTemp] = useState(null);
  const [minMotorTemp, setMinMotorTemp] = useState(null);
  const [minControllerTemp, setMinControllerTemp] = useState(null);
  const [maxMotorTimestamp, setMaxMotorTimestamp] = useState(null);
  const [maxControllerTimestamp, setMaxControllerTimestamp] = useState(null);
  const [minMotorTimestamp, setMinMotorTimestamp] = useState(null);
  const [minControllerTimestamp, setMinControllerTimestamp] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Refs to store last known temperature values.
  const lastMotorTempRef = useRef(motorTemp);
  const lastControllerTempRef = useRef(controllerTemp);

  // Update interval from dashboard settings.
  const updateInterval = useMemo(
    () => settings?.dashboard?.updateInterval,
    [settings?.dashboard?.updateInterval]
  );

  // Check for hardware acceleration setting
  const hardwareAcceleration = settings?.global?.enableHardwareAcceleration !== false;

  // Check for animations setting
  const animationsEnabled = settings?.global?.enableTransitions !== false;

  // Extract change threshold from settings
  const changeThreshold = useMemo(
    () => settings?.dashboard?.significantChangeThreshold || 0.5,
    [settings?.dashboard?.significantChangeThreshold]
  );

  // Subscribe to real-time temperature data when the component is visible.
  const { ref: dataRef } = useRealTimeData(
    'bamo_car_re_transmit',
    (msg) => {
      // Skip updates if component is not in view
      if (!inView) return;
      
      try {
        const fields = msg.fields;
        if (!fields) return;

        const rawMotor = fields.motor_temp?.numberValue;
        const rawController = fields.controller_temp?.numberValue;
        if (rawMotor === undefined || rawController === undefined) return;

        const now = Date.now();
        const newMotorTemp = TEMP_LOOKUP.lookup(Number(rawMotor));
        const newControllerTemp = TEMP_LOOKUP.lookup(Number(rawController));

        // Update motor temperature if the new reading differs significantly.
        if (Math.abs(newMotorTemp - lastMotorTempRef.current) > changeThreshold) {
          setMotorTemp(newMotorTemp);
          lastMotorTempRef.current = newMotorTemp;
          // Update min and max values (initialize if currently null)
          setMinMotorTemp((prev) =>
            prev === null || newMotorTemp < prev ? newMotorTemp : prev
          );
          setMaxMotorTemp((prev) =>
            prev === null || newMotorTemp > prev ? newMotorTemp : prev
          );
          if (minMotorTemp === null || newMotorTemp < minMotorTemp) {
            setMinMotorTimestamp(now);
          }
          if (maxMotorTemp === null || newMotorTemp > maxMotorTemp) {
            setMaxMotorTimestamp(now);
          }
        }

        // Update controller temperature if the new reading differs significantly.
        if (Math.abs(newControllerTemp - lastControllerTempRef.current) > changeThreshold) {
          setControllerTemp(newControllerTemp);
          lastControllerTempRef.current = newControllerTemp;
          setMinControllerTemp((prev) =>
            prev === null || newControllerTemp < prev ? newControllerTemp : prev
          );
          setMaxControllerTemp((prev) =>
            prev === null || newControllerTemp > prev ? newControllerTemp : prev
          );
          if (minControllerTemp === null || newControllerTemp < minControllerTemp) {
            setMinControllerTimestamp(now);
          }
          if (maxControllerTemp === null || newControllerTemp > maxControllerTemp) {
            setMaxControllerTimestamp(now);
          }
        }

        if (isLoading && (newMotorTemp !== 0 || newControllerTemp !== 0)) {
          setIsLoading(false);
        }

        if (error) setError(null);
      } catch (err) {
        console.error('Error processing temperature data:', err);
        setError('Failed to process temperature data');
      }
    },
    { customInterval: updateInterval, threshold: 0.1 } // Subscribe when the component is in view
  );

  // Combine refs
  const setRefs = useCallback((node) => {
    inViewRef(node);
    if (dataRef) dataRef(node);
  }, [inViewRef, dataRef]);

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
        boxShadow: theme.custom?.shadows?.md,
        transform: hardwareAcceleration ? 'translateZ(0)' : 'none',
        transition: animationsEnabled ? 
          theme.transitions.create(['box-shadow', 'transform'], {
            duration: theme.transitions.duration.short
          }) : 'none'
      }}
      role="region"
      aria-label="Motor and Controller Temperature Monitor"
    >
      {/* Header with title */}
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: theme.spacing(1) }}>
            <Thermometer size={20} color={theme.palette.primary.main} aria-hidden="true" />
            <Typography
              variant="h6"
              color="text.primary"
              sx={{ fontWeight: theme.typography.fontWeightMedium,
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
            m: 0,
            alignSelf: 'center'
          }
        }}
      />
      <Divider />

      {/* Main content area rendering the temperature cards */}
      <CardContent
        sx={{
          p: theme.spacing(1.5),
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing(3),
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
              Temperature monitoring paused
            </Typography>
          </Box>
        ) : isLoading ? (
          <Box
            sx={{ 
              flex: 1,
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center'
            }}
            aria-label="Loading temperature data"
          >
            <Typography variant="body1">Loading...</Typography>
          </Box>
        ) : (
          <>
            <TempCard
              label="MOTOR TEMPERATURE"
              temp={motorTemp}
              icon={Thermometer}
              minTemp={minMotorTemp}
              minTimestamp={minMotorTimestamp}
              maxTemp={maxMotorTemp}
              maxTimestamp={maxMotorTimestamp}
            />
            <TempCard
              label="CONTROLLER TEMPERATURE"
              temp={controllerTemp}
              icon={Thermometer}
              minTemp={minControllerTemp}
              minTimestamp={minControllerTimestamp}
              maxTemp={maxControllerTemp}
              maxTimestamp={maxControllerTimestamp}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default memo(MotorControllerTempGauge);