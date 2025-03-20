import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { Box, Typography, useTheme, alpha, Tooltip, Divider } from '@mui/material';
import { GiWindmill } from 'react-icons/gi';
import { WiThermometer } from 'react-icons/wi';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Define and export aero thresholds
export const PRESSURE_THRESHOLDS = {
  LOW: 10,
  HIGH: 30
};

export const TEMPERATURE_THRESHOLDS = {
  MEDIUM: 60,
  HIGH: 80
};

/**
 * Enhanced Aero Overlay - More compact with better readability
 */
export default function CompactAeroOverlay({
  wheelFilter = null,
  aeroValues = null,
  transformForCard = false,
  sx = {},
  fontSizes = {}
}) {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const isFirstRender = useRef(true);
  const previousValues = useRef({});

  // Animation settings based on context
  const animationsEnabled = useMemo(() => 
    settings.global.animationDuration > 0 && settings.global.enableTransitions,
  [settings.global.animationDuration, settings.global.enableTransitions]);

  const animationDuration = useMemo(() => 
    `${settings.global.animationDuration}ms`,
  [settings.global.animationDuration]);

  // Initialize state with default values of 0
  const [frontAeroData, setFrontAeroData] = useState({
    pressure1: aeroValues?.FL?.pressure ?? 0,
    pressure3: aeroValues?.FR?.pressure ?? 0,
    temperature1: aeroValues?.FL?.temperature ?? 0,
    temperature3: aeroValues?.FR?.temperature ?? 0,
  });

  const [rearAeroData, setRearAeroData] = useState({
    pressure1: aeroValues?.RL?.pressure ?? 0,
    pressure3: aeroValues?.RR?.pressure ?? 0,
    temperature1: aeroValues?.RL?.temperature ?? 0,
    temperature3: aeroValues?.RR?.temperature ?? 0,
  });

  // Update state when aeroValues prop changes, applying threshold for significant changes
  useEffect(() => {
    // Skip first render to prevent unnecessary state reset
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (aeroValues) {
      // Determine if changes are significant enough to update
      const hasSignificantChange = (oldValue, newValue) => {
        if (oldValue === 0 && newValue !== 0) return true;
        if (newValue === 0 && oldValue !== 0) return true;
        
        // Calculate percentage change
        const percentChange = Math.abs((newValue - oldValue) / oldValue) * 100;
        return percentChange >= settings.dashboard.significantChangeThreshold;
      };

      // Update front data using functional state updates
      setFrontAeroData((prevData) => {
        const newData = { ...prevData };
        let hasChanges = false;
        
        if (aeroValues.FL) {
          if (aeroValues.FL.pressure !== undefined && 
              hasSignificantChange(prevData.pressure1, aeroValues.FL.pressure)) {
            newData.pressure1 = aeroValues.FL.pressure;
            hasChanges = true;
          }
          if (aeroValues.FL.temperature !== undefined && 
              hasSignificantChange(prevData.temperature1, aeroValues.FL.temperature)) {
            newData.temperature1 = aeroValues.FL.temperature;
            hasChanges = true;
          }
        }
        
        if (aeroValues.FR) {
          if (aeroValues.FR.pressure !== undefined && 
              hasSignificantChange(prevData.pressure3, aeroValues.FR.pressure)) {
            newData.pressure3 = aeroValues.FR.pressure;
            hasChanges = true;
          }
          if (aeroValues.FR.temperature !== undefined && 
              hasSignificantChange(prevData.temperature3, aeroValues.FR.temperature)) {
            newData.temperature3 = aeroValues.FR.temperature;
            hasChanges = true;
          }
        }
        
        return hasChanges ? newData : prevData;
      });

      // Update rear data similarly
      setRearAeroData((prevData) => {
        const newData = { ...prevData };
        let hasChanges = false;
        
        if (aeroValues.RL) {
          if (aeroValues.RL.pressure !== undefined && 
              hasSignificantChange(prevData.pressure1, aeroValues.RL.pressure)) {
            newData.pressure1 = aeroValues.RL.pressure;
            hasChanges = true;
          }
          if (aeroValues.RL.temperature !== undefined && 
              hasSignificantChange(prevData.temperature1, aeroValues.RL.temperature)) {
            newData.temperature1 = aeroValues.RL.temperature;
            hasChanges = true;
          }
        }
        
        if (aeroValues.RR) {
          if (aeroValues.RR.pressure !== undefined && 
              hasSignificantChange(prevData.pressure3, aeroValues.RR.pressure)) {
            newData.pressure3 = aeroValues.RR.pressure;
            hasChanges = true;
          }
          if (aeroValues.RR.temperature !== undefined && 
              hasSignificantChange(prevData.temperature3, aeroValues.RR.temperature)) {
            newData.temperature3 = aeroValues.RR.temperature;
            hasChanges = true;
          }
        }
        
        return hasChanges ? newData : prevData;
      });
    }
  }, [aeroValues, wheelFilter, settings.dashboard.significantChangeThreshold]);

  // Throttle updates based on the dashboard update interval
  useEffect(() => {
    if (settings.dashboard.updateInterval > 0) {
      const timer = setInterval(() => {
        // This is where we would refresh data if needed
        // In this case, the data is pushed via props, so we may not need explicit refreshing
      }, settings.dashboard.updateInterval);
      
      return () => clearInterval(timer);
    }
  }, [settings.dashboard.updateInterval]);

  // Determine displayed values based on wheelFilter
  let pressure = 0;
  let temperature = 0;
  let positionName = '';

  switch (wheelFilter) {
    case 'FL':
      pressure = frontAeroData.pressure1;
      temperature = frontAeroData.temperature1;
      positionName = 'Front Left';
      break;
    case 'FR':
      pressure = frontAeroData.pressure3;
      temperature = frontAeroData.temperature3;
      positionName = 'Front Right';
      break;
    case 'RL':
      pressure = rearAeroData.pressure1;
      temperature = rearAeroData.temperature1;
      positionName = 'Rear Left';
      break;
    case 'RR':
      pressure = rearAeroData.pressure3;
      temperature = rearAeroData.temperature3;
      positionName = 'Rear Right';
      break;
    default:
      // Default to 0 values for unknown wheels
      pressure = 0;
      temperature = 0;
      positionName = 'Unknown';
      break;
  }

  // Convert temperature if needed
  const displayTemperature = useMemo(() => {
    if (settings.dashboard.showTempInF) {
      // Convert Celsius to Fahrenheit
      return (temperature * 9/5) + 32;
    }
    return temperature;
  }, [temperature, settings.dashboard.showTempInF]);

  // Temperature unit
  const temperatureUnit = useMemo(() => 
    settings.dashboard.showTempInF ? '°F' : '°C',
  [settings.dashboard.showTempInF]);

  // Determine the color based on pressure
  const getPressureColor = (psi) => {
    if (psi < PRESSURE_THRESHOLDS.LOW) return theme.palette.error.main;
    if (psi > PRESSURE_THRESHOLDS.HIGH) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  // Determine the color based on temperature (considering unit)
  const getTemperatureColor = (temp) => {
    // If in Fahrenheit, adjust thresholds (converted from Celsius)
    const thresholdMedium = settings.dashboard.showTempInF ? 
      (TEMPERATURE_THRESHOLDS.MEDIUM * 9/5) + 32 : TEMPERATURE_THRESHOLDS.MEDIUM;
    
    const thresholdHigh = settings.dashboard.showTempInF ? 
      (TEMPERATURE_THRESHOLDS.HIGH * 9/5) + 32 : TEMPERATURE_THRESHOLDS.HIGH;
    
    if (temp > thresholdHigh) return theme.palette.error.main;
    if (temp > thresholdMedium) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  // Return status text for pressure
  const getPressureStatus = (psi) => {
    if (psi < PRESSURE_THRESHOLDS.LOW) return "Low";
    if (psi > PRESSURE_THRESHOLDS.HIGH) return "High";
    return "Normal";
  };

  // Return status text for temperature
  const getTemperatureStatus = (temp) => {
    // If in Fahrenheit, adjust thresholds
    const thresholdMedium = settings.dashboard.showTempInF ? 
      (TEMPERATURE_THRESHOLDS.MEDIUM * 9/5) + 32 : TEMPERATURE_THRESHOLDS.MEDIUM;
    
    const thresholdHigh = settings.dashboard.showTempInF ? 
      (TEMPERATURE_THRESHOLDS.HIGH * 9/5) + 32 : TEMPERATURE_THRESHOLDS.HIGH;
    
    if (temp > thresholdHigh) return "High";
    if (temp > thresholdMedium) return "Warm";
    return "Normal";
  };

  const pressureColor = getPressureColor(pressure);
  const tempColor = getTemperatureColor(displayTemperature);
  const pressureStatus = getPressureStatus(pressure);
  const tempStatus = getTemperatureStatus(displayTemperature);
  
  // Custom font sizes - slightly larger for better readability
  const titleSize = '12px';
  const valueSize = '12px';
  const labelSize = '12px';

  // Enhanced tooltip
  const tooltipContent = (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="subtitle2" sx={{ fontSize: titleSize, fontWeight: 600, mb: 0.25 }}>
        {positionName} Aerodynamics
      </Typography>
      <Typography variant="body2" sx={{ fontSize: labelSize, lineHeight: 1.2 }}>
        Pressure: {pressure.toFixed(1)} PSI ({pressureStatus})
      </Typography>
      <Typography variant="body2" sx={{ fontSize: labelSize, lineHeight: 1.2 }}>
        Temperature: {displayTemperature.toFixed(1)}{temperatureUnit} ({tempStatus})
      </Typography>
    </Box>
  );

  return (
    <Tooltip
      title={tooltipContent}
      arrow
      placement="top"
      leaveDelay={200}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          py: 0.25, // Minimal padding
          ...sx
        }}
      >
        {/* Simplified horizontal layout for better compactness */}
        <Box sx={{
          display: 'flex',
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 0.5, // Small margin bottom
        }}>
          {/* Pressure side */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 0.5,
          }}>
            <GiWindmill 
              size="1rem"
              color={pressureColor} 
              style={{
                filter: `drop-shadow(0 1px 2px ${alpha(pressureColor, 0.5)})`, // Enhanced shadow
                transition: animationsEnabled ? `color ${animationDuration} ease` : 'none',
                willChange: settings.global.enableHardwareAcceleration ? 'filter' : 'auto',
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: pressureColor,
                fontWeight: 700, // Bolder for better readability
                fontSize: '12px',
                textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.3)}`, // Text shadow
                transition: animationsEnabled ? `color ${animationDuration} ease` : 'none',
                willChange: settings.global.enableHardwareAcceleration ? 'color' : 'auto',
              }}
            >
              {pressure.toFixed(0)}
            </Typography>
          </Box>
          
          {/* Divider */}
          <Divider orientation="vertical" flexItem sx={{ 
            height: 16,
            mx: 1,
            bgcolor: alpha(theme.palette.divider, 0.4),
          }} />
          
          {/* Temperature side */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center',
            gap: 0.5,
          }}>
            <WiThermometer 
              size="1rem"
              color={tempColor} 
              style={{
                filter: `drop-shadow(0 1px 2px ${alpha(tempColor, 0.5)})`, // Enhanced shadow
                transition: animationsEnabled ? `color ${animationDuration} ease` : 'none',
                willChange: settings.global.enableHardwareAcceleration ? 'filter' : 'auto',
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: tempColor,
                fontWeight: 700, // Bolder for better readability
                fontSize: '12px',
                textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.3)}`, // Text shadow
                transition: animationsEnabled ? `color ${animationDuration} ease` : 'none',
                willChange: settings.global.enableHardwareAcceleration ? 'color' : 'auto',
              }}
            >
              {displayTemperature.toFixed(0)}
            </Typography>
          </Box>
        </Box>

        {/* Enhanced status pills with better visibility */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%',
          }}
        >
          {/* Pressure status pill */}
          <Typography
            variant="caption"
            sx={{
              color: alpha(theme.palette.common.white, 1),
              fontWeight: 600, // Bolder
              fontSize: '10px',
              px: 0.6,
              py: 0,
              borderRadius: theme.shape.borderRadius / 2,
              background: pressureColor,
              boxShadow: `0 1px 3px ${alpha(pressureColor, 0.7)}`, // Enhanced shadow
              textShadow: '0 1px 1px rgba(0,0,0,0.3)',
              letterSpacing: '0.4px',
              lineHeight: 1.5, // Better line height
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: animationsEnabled ? 
                `background ${animationDuration} ease, box-shadow ${animationDuration} ease` : 
                'none',
              willChange: settings.global.enableHardwareAcceleration ? 
                'background, box-shadow' : 'auto',
            }}
          >
            PSI {pressureStatus}
          </Typography>

          {/* Temperature status pill */}
          <Typography
            variant="caption"
            sx={{
              color: alpha(theme.palette.common.white, 1),
              fontWeight: 600, // Bolder
              fontSize: '10px',
              px: 0.6,
              py: 0,
              borderRadius: theme.shape.borderRadius / 2,
              background: tempColor,
              boxShadow: `0 1px 3px ${alpha(tempColor, 0.7)}`, // Enhanced shadow
              textShadow: '0 1px 1px rgba(0,0,0,0.3)',
              letterSpacing: '0.4px',
              lineHeight: 1.5, // Better line height
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: animationsEnabled ? 
                `background ${animationDuration} ease, box-shadow ${animationDuration} ease` : 
                'none',
              willChange: settings.global.enableHardwareAcceleration ? 
                'background, box-shadow' : 'auto',
            }}
          >
            {temperatureUnit} {tempStatus}
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );
}

CompactAeroOverlay.propTypes = {
  wheelFilter: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']),
  aeroValues: PropTypes.shape({
    FL: PropTypes.shape({
      pressure: PropTypes.number,
      temperature: PropTypes.number
    }),
    FR: PropTypes.shape({
      pressure: PropTypes.number,
      temperature: PropTypes.number
    }),
    RL: PropTypes.shape({
      pressure: PropTypes.number,
      temperature: PropTypes.number
    }),
    RR: PropTypes.shape({
      pressure: PropTypes.number,
      temperature: PropTypes.number
    })
  }),
  transformForCard: PropTypes.bool,
  sx: PropTypes.object,
  fontSizes: PropTypes.object
};