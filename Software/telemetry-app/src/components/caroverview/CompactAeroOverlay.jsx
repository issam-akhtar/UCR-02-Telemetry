import React, { useState, useEffect, useRef, useContext } from 'react';
import { Box, Typography, useTheme, alpha, Tooltip, Divider } from '@mui/material';
import { GiWindmill } from 'react-icons/gi';
import { WiThermometer } from 'react-icons/wi';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

// Define thresholds as constants outside component
export const PRESSURE_THRESHOLDS = {
  LOW: 10,
  HIGH: 30
};

export const TEMPERATURE_THRESHOLDS = {
  MEDIUM: 60,
  HIGH: 80
};

// Position mapping
const POSITION_NAMES = {
  'FL': 'Front Left',
  'FR': 'Front Right',
  'RL': 'Rear Left',
  'RR': 'Rear Right'
};

/**
 * High-Performance CompactAeroOverlay
 * 
 * Displays aerodynamic data (pressure and temperature) with
 * optimized rendering and animation efficiency
 */
const CompactAeroOverlay = ({
  wheelFilter = null,
  aeroValues = null,
  transformForCard = false,
  sx = {},
  fontSizes = {}
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const isFirstRender = useRef(true);
  const throttleTimerRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  
  // Simplified state - combining front and rear into a single object
  const [aeroData, setAeroData] = useState({
    FL: { pressure: aeroValues?.FL?.pressure ?? 0, temperature: aeroValues?.FL?.temperature ?? 0 },
    FR: { pressure: aeroValues?.FR?.pressure ?? 0, temperature: aeroValues?.FR?.temperature ?? 0 },
    RL: { pressure: aeroValues?.RL?.pressure ?? 0, temperature: aeroValues?.RL?.temperature ?? 0 },
    RR: { pressure: aeroValues?.RR?.pressure ?? 0, temperature: aeroValues?.RR?.temperature ?? 0 }
  });
  
  // Extract settings with defaults
  const {
    dashboard: {
      updateInterval = 300,
      significantChangeThreshold = 0.5,
      showTempInF = false
    } = {},
    global: {
      enableTransitions = true,
      animationDuration = 300,
      enableHardwareAcceleration = true
    } = {},
    realTime: {
      enableSmoothing = true
    } = {}
  } = settings || {};
  
  // Animation settings
  const animationsEnabled = enableTransitions && animationDuration > 0;
  const animationEasing = enableSmoothing ? 'cubic-bezier(0.4, 0.0, 0.2, 1)' : 'ease';
  
  // Helper function to check for significant changes
  const isSignificantChange = (oldVal, newVal) => {
    if (oldVal === 0 && newVal !== 0) return true;
    if (newVal === 0 && oldVal !== 0) return true;
    
    const percentChange = Math.abs((newVal - oldVal) / Math.max(oldVal, 0.1)) * 100;
    return percentChange >= significantChangeThreshold;
  };
  
  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, []);

  // Update state when aeroValues change
  useEffect(() => {
    if (!aeroValues) return;
    
    // Skip first render to prevent unnecessary reset
    if (isFirstRender.current) {
      isFirstRender.current = false;
      setAeroData({
        FL: { pressure: aeroValues.FL?.pressure ?? 0, temperature: aeroValues.FL?.temperature ?? 0 },
        FR: { pressure: aeroValues.FR?.pressure ?? 0, temperature: aeroValues.FR?.temperature ?? 0 },
        RL: { pressure: aeroValues.RL?.pressure ?? 0, temperature: aeroValues.RL?.temperature ?? 0 },
        RR: { pressure: aeroValues.RR?.pressure ?? 0, temperature: aeroValues.RR?.temperature ?? 0 }
      });
      return;
    }
    
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    // Clear any existing timer
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
    
    // Process update function
    const processUpdate = () => {
      setAeroData(prevData => {
        const newData = { ...prevData };
        let hasChanges = false;
        
        // Check each position for significant changes
        ['FL', 'FR', 'RL', 'RR'].forEach(pos => {
          if (aeroValues[pos]) {
            if (aeroValues[pos].pressure !== undefined && 
                isSignificantChange(prevData[pos].pressure, aeroValues[pos].pressure)) {
              if (!newData[pos]) newData[pos] = { ...prevData[pos] };
              newData[pos].pressure = aeroValues[pos].pressure;
              hasChanges = true;
            }
            
            if (aeroValues[pos].temperature !== undefined && 
                isSignificantChange(prevData[pos].temperature, aeroValues[pos].temperature)) {
              if (!newData[pos]) newData[pos] = { ...prevData[pos] };
              newData[pos].temperature = aeroValues[pos].temperature;
              hasChanges = true;
            }
          }
        });
        
        return hasChanges ? newData : prevData;
      });
      
      lastUpdateTimeRef.current = Date.now();
    };
    
    // If enough time has passed, update immediately
    if (timeSinceLastUpdate >= updateInterval) {
      processUpdate();
    } else {
      // Otherwise, schedule update for later
      throttleTimerRef.current = setTimeout(
        processUpdate,
        updateInterval - timeSinceLastUpdate
      );
    }
  }, [aeroValues, updateInterval, significantChangeThreshold]);
  
  // Get current values for the selected wheel
  const currentPosition = wheelFilter || 'FL';
  const positionName = POSITION_NAMES[currentPosition] || 'Unknown';
  const currentPressure = aeroData[currentPosition]?.pressure ?? 0;
  
  // Convert temperature if needed
  const currentTemp = aeroData[currentPosition]?.temperature ?? 0;
  const displayTemperature = showTempInF ? (currentTemp * 9/5) + 32 : currentTemp;
  const temperatureUnit = showTempInF ? '°F' : '°C';
  
  // Temperature thresholds (converted if using Fahrenheit)
  const tempMediumThreshold = showTempInF ? (TEMPERATURE_THRESHOLDS.MEDIUM * 9/5) + 32 : TEMPERATURE_THRESHOLDS.MEDIUM;
  const tempHighThreshold = showTempInF ? (TEMPERATURE_THRESHOLDS.HIGH * 9/5) + 32 : TEMPERATURE_THRESHOLDS.HIGH;
  
  // Get colors based on current values
  const pressureColor = currentPressure < PRESSURE_THRESHOLDS.LOW ? theme.palette.error.main :
                        currentPressure > PRESSURE_THRESHOLDS.HIGH ? theme.palette.warning.main :
                        theme.palette.success.main;
                        
  const tempColor = displayTemperature > tempHighThreshold ? theme.palette.error.main :
                   displayTemperature > tempMediumThreshold ? theme.palette.warning.main :
                   theme.palette.success.main;
  
  // Get status text based on current values
  const pressureStatus = currentPressure < PRESSURE_THRESHOLDS.LOW ? "Low" :
                        currentPressure > PRESSURE_THRESHOLDS.HIGH ? "High" :
                        "Normal";
                        
  const tempStatus = displayTemperature > tempHighThreshold ? "High" :
                    displayTemperature > tempMediumThreshold ? "Warm" :
                    "Normal";
  
  // Font sizes with defaults
  const titleSize = '11px';
  const valueSize = '11px';
  const labelSize = '11px';
  
  // Create transition style only if animations are enabled
  const transitionStyle = animationsEnabled ? {
    transition: `all ${animationDuration}ms ${animationEasing}`,
    willChange: enableHardwareAcceleration ? 'color, filter, background-color, box-shadow' : 'auto'
  } : {};

  return (
    <Tooltip
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="subtitle2" sx={{ fontSize: titleSize, fontWeight: 600, mb: 0.25 }}>
            {positionName} Aerodynamics
          </Typography>
          <Typography variant="body2" sx={{ fontSize: labelSize, lineHeight: 1.2 }}>
            Pressure: {currentPressure.toFixed(1)} PSI ({pressureStatus})
          </Typography>
          <Typography variant="body2" sx={{ fontSize: labelSize, lineHeight: 1.2 }}>
            Temperature: {displayTemperature.toFixed(1)}{temperatureUnit} ({tempStatus})
          </Typography>
        </Box>
      }
      arrow
      placement="top"
      leaveDelay={200}
    >
      <Box 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          py: 0.25,
          ...sx
        }}
      >
        {/* Top row with values */}
        <Box 
          sx={{
            display: 'flex',
            width: '100%',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 0.5
          }}
        >
          {/* Pressure side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <GiWindmill 
              size="1rem"
              color={pressureColor} 
              style={{
                filter: `drop-shadow(0 1px 2px ${alpha(pressureColor, 0.5)})`,
                ...transitionStyle
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: pressureColor,
                fontWeight: 700,
                fontSize: valueSize,
                textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.3)}`,
                ...transitionStyle
              }}
            >
              {currentPressure.toFixed(0)}
            </Typography>
          </Box>
          
          {/* Divider */}
          <Divider 
            orientation="vertical" 
            flexItem 
            sx={{
              height: 16,
              mx: 1,
              bgcolor: alpha(theme.palette.divider, 0.4)
            }} 
          />
          
          {/* Temperature side */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <WiThermometer 
              size="1rem"
              color={tempColor} 
              style={{
                filter: `drop-shadow(0 1px 2px ${alpha(tempColor, 0.5)})`,
                ...transitionStyle
              }}
            />
            <Typography
              variant="body2"
              sx={{
                color: tempColor,
                fontWeight: 700,
                fontSize: valueSize,
                textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.3)}`,
                ...transitionStyle
              }}
            >
              {displayTemperature.toFixed(0)}
            </Typography>
          </Box>
        </Box>

        {/* Bottom row with status */}
        <Box 
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            width: '100%'
          }}
        >
          {/* Pressure status pill */}
          <Typography
            variant="caption"
            sx={{
              color: alpha(theme.palette.common.white, 1),
              fontWeight: 600,
              fontSize: '10px',
              px: 0.6,
              py: 0,
              borderRadius: theme.shape.borderRadius / 2,
              background: pressureColor,
              boxShadow: `0 1px 3px ${alpha(pressureColor, 0.7)}`,
              textShadow: '0 1px 1px rgba(0,0,0,0.3)',
              letterSpacing: '0.4px',
              lineHeight: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...transitionStyle
            }}
          >
            PSI {pressureStatus}
          </Typography>

          {/* Temperature status pill */}
          <Typography
            variant="caption"
            sx={{
              color: alpha(theme.palette.common.white, 1),
              fontWeight: 600,
              fontSize: '10px',
              px: 0.6,
              py: 0,
              borderRadius: theme.shape.borderRadius / 2,
              background: tempColor,
              boxShadow: `0 1px 3px ${alpha(tempColor, 0.7)}`,
              textShadow: '0 1px 1px rgba(0,0,0,0.3)',
              letterSpacing: '0.4px',
              lineHeight: 1.5,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              ...transitionStyle
            }}
          >
            {temperatureUnit} {tempStatus}
          </Typography>
        </Box>
      </Box>
    </Tooltip>
  );
};

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

// Memoize component to prevent unnecessary re-renders
export default React.memo(CompactAeroOverlay);