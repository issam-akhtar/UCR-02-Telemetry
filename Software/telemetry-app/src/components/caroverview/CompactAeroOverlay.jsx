import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, useTheme, alpha, Tooltip } from '@mui/material';
import { GiWindmill } from 'react-icons/gi';
import { WiThermometer } from 'react-icons/wi';
import useRealTimeData from '../../hooks/useRealTimeData';
import PropTypes from 'prop-types';

/**
 * CompactAeroOverlay Component
 * 
 * Enhanced aerodynamic data display for wheel cards.
 * Shows pressure and temperature with clear visual indicators and tooltips.
 */
export default function CompactAeroOverlay({ 
  wheelFilter = null, 
  aeroValues = null,
  transformForCard = false,
  sx = {}
}) {
  const theme = useTheme();
  const isFirstRender = useRef(true);
  
  // Initialize with meaningful defaults instead of zeros
  const [frontAeroData, setFrontAeroData] = useState({
    pressure1: aeroValues?.FL?.pressure ?? 20,
    pressure2: 20, // Default values that won't cause visual jumps
    pressure3: aeroValues?.FR?.pressure ?? 20,
    temperature1: aeroValues?.FL?.temperature ?? 50,
    temperature2: 50,
    temperature3: aeroValues?.FR?.temperature ?? 50,
  });
  
  const [rearAeroData, setRearAeroData] = useState({
    pressure1: aeroValues?.RL?.pressure ?? 20,
    pressure2: 20,
    pressure3: aeroValues?.RR?.pressure ?? 20,
    temperature1: aeroValues?.RL?.temperature ?? 50,
    temperature2: 50,
    temperature3: aeroValues?.RR?.temperature ?? 50,
  });

  // Handle front_aero real-time data - updated to prevent flicker
  const handleFrontAeroData = useCallback((msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields;
      if (!fields) return;
      
      // Create a new state object with previous values as defaults
      const newData = {...frontAeroData};
      
      // Only update fields with real data
      if (fields.pressure1?.numberValue !== undefined) newData.pressure1 = fields.pressure1.numberValue;
      if (fields.pressure2?.numberValue !== undefined) newData.pressure2 = fields.pressure2.numberValue;
      if (fields.pressure3?.numberValue !== undefined) newData.pressure3 = fields.pressure3.numberValue;
      if (fields.temperature1?.numberValue !== undefined) newData.temperature1 = fields.temperature1.numberValue;
      if (fields.temperature2?.numberValue !== undefined) newData.temperature2 = fields.temperature2.numberValue;
      if (fields.temperature3?.numberValue !== undefined) newData.temperature3 = fields.temperature3.numberValue;
      
      setFrontAeroData(newData);
    } catch (error) {
      console.error("Error processing front aero data:", error);
    }
  }, [frontAeroData]);

  // Handle rear_aero real-time data - updated to prevent flicker
  const handleRearAeroData = useCallback((msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields;
      if (!fields) return;
      
      // Create a new state object with previous values as defaults
      const newData = {...rearAeroData};
      
      // Only update fields with real data
      if (fields.pressure1?.numberValue !== undefined) newData.pressure1 = fields.pressure1.numberValue;
      if (fields.pressure2?.numberValue !== undefined) newData.pressure2 = fields.pressure2.numberValue;
      if (fields.pressure3?.numberValue !== undefined) newData.pressure3 = fields.pressure3.numberValue;
      if (fields.temperature1?.numberValue !== undefined) newData.temperature1 = fields.temperature1.numberValue;
      if (fields.temperature2?.numberValue !== undefined) newData.temperature2 = fields.temperature2.numberValue;
      if (fields.temperature3?.numberValue !== undefined) newData.temperature3 = fields.temperature3.numberValue;
      
      setRearAeroData(newData);
    } catch (error) {
      console.error("Error processing rear aero data:", error);
    }
  }, [rearAeroData]);

  // Subscribe to real-time data if aeroValues is not provided
  useRealTimeData(aeroValues ? null : 'front_aero', handleFrontAeroData);
  useRealTimeData(aeroValues ? null : 'rear_aero', handleRearAeroData);

  // Update state when aeroValues prop changes - only update when we have real values
  useEffect(() => {
    // Skip first render to prevent unnecessary reset
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    
    if (aeroValues) {
      // Create temporary state objects to build the updates
      let newFrontData = {...frontAeroData};
      let newRearData = {...rearAeroData};
      
      // Update front data if values are defined
      if (aeroValues.FL) {
        if (aeroValues.FL.pressure !== undefined) {
          newFrontData.pressure1 = aeroValues.FL.pressure;
        }
        if (aeroValues.FL.temperature !== undefined) {
          newFrontData.temperature1 = aeroValues.FL.temperature;
        }
      }
      
      if (aeroValues.FR) {
        if (aeroValues.FR.pressure !== undefined) {
          newFrontData.pressure3 = aeroValues.FR.pressure;
        }
        if (aeroValues.FR.temperature !== undefined) {
          newFrontData.temperature3 = aeroValues.FR.temperature;
        }
      }
      
      // Update rear data if values are defined
      if (aeroValues.RL) {
        if (aeroValues.RL.pressure !== undefined) {
          newRearData.pressure1 = aeroValues.RL.pressure;
        }
        if (aeroValues.RL.temperature !== undefined) {
          newRearData.temperature1 = aeroValues.RL.temperature;
        }
      }
      
      if (aeroValues.RR) {
        if (aeroValues.RR.pressure !== undefined) {
          newRearData.pressure3 = aeroValues.RR.pressure;
        }
        if (aeroValues.RR.temperature !== undefined) {
          newRearData.temperature3 = aeroValues.RR.temperature;
        }
      }
      
      // Only update state if changes were made
      if (JSON.stringify(newFrontData) !== JSON.stringify(frontAeroData)) {
        setFrontAeroData(newFrontData);
      }
      
      if (JSON.stringify(newRearData) !== JSON.stringify(rearAeroData)) {
        setRearAeroData(newRearData);
      }
    }
  }, [aeroValues, frontAeroData, rearAeroData]);

  // Determine which values to display based on wheelFilter
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
      pressure = 20; // Meaningful default
      temperature = 50; // Meaningful default
      positionName = 'Unknown';
      break;
  }

  // Thresholds for pressure and temperature
  const PRESSURE_THRESHOLDS = {
    LOW: 10,
    HIGH: 30
  };
  
  const TEMPERATURE_THRESHOLDS = {
    MEDIUM: 60,
    HIGH: 80
  };

  // Get color based on pressure
  const getPressureColor = (psi) => {
    if (psi < PRESSURE_THRESHOLDS.LOW) return theme.palette.error.main; // Low pressure
    if (psi > PRESSURE_THRESHOLDS.HIGH) return theme.palette.warning.main; // High pressure
    return theme.palette.success.main; // Optimal range
  };
  
  // Get color based on temperature
  const getTemperatureColor = (temp) => {
    if (temp > TEMPERATURE_THRESHOLDS.HIGH) return theme.palette.error.main; // High temp
    if (temp > TEMPERATURE_THRESHOLDS.MEDIUM) return theme.palette.warning.main; // Medium temp
    return theme.palette.success.main; // Optimal range
  };
  
  // Get status text based on pressure
  const getPressureStatus = (psi) => {
    if (psi < PRESSURE_THRESHOLDS.LOW) return "Low";
    if (psi > PRESSURE_THRESHOLDS.HIGH) return "High";
    return "Normal";
  };
  
  // Get status text based on temperature
  const getTemperatureStatus = (temp) => {
    if (temp > TEMPERATURE_THRESHOLDS.HIGH) return "High";
    if (temp > TEMPERATURE_THRESHOLDS.MEDIUM) return "Warm";
    return "Normal";
  };
  
  const pressureColor = getPressureColor(pressure);
  const tempColor = getTemperatureColor(temperature);
  const pressureStatus = getPressureStatus(pressure);
  const tempStatus = getTemperatureStatus(temperature);

  return (
    <Tooltip 
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="subtitle2">{positionName} Aerodynamics</Typography>
          <Typography variant="body2">Pressure: {pressure.toFixed(1)} PSI ({pressureStatus})</Typography>
          <Typography variant="body2">Temperature: {temperature.toFixed(1)}°C ({tempStatus})</Typography>
          <Typography variant="body2" sx={{ fontSize: '0.7rem', mt: 0.5, opacity: 0.8 }}>
            Measures air pressure and temperature at wheel location
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
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          ...sx
        }}
      >
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            justifyContent: 'space-around',
            width: '100%',
            mb: 0.5,
            background: alpha(theme.palette.common.black, 0.2),
            borderRadius: 1,
            py: 0.3
          }}
        >
          {/* Pressure indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <GiWindmill 
              size="0.7rem" 
              color={pressureColor} 
              aria-hidden="true"
            />
            <Typography
              variant="caption"
              sx={{
                color: pressureColor,
                fontWeight: 'bold',
                fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
              }}
            >
              {pressure.toFixed(0)}
            </Typography>
          </Box>
          
          {/* Temperature indicator */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <WiThermometer 
              size="0.9rem" 
              color={tempColor} 
              aria-hidden="true"
            />
            <Typography
              variant="caption"
              sx={{
                color: tempColor,
                fontWeight: 'bold',
                fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
              }}
            >
              {temperature.toFixed(0)}
            </Typography>
          </Box>
        </Box>
        
        {/* Status indicators */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-around', 
          width: '100%',
        }}>
          <Typography
            variant="caption"
            sx={{
              color: pressureColor,
              fontSize: { xs: '0.45rem', sm: '0.5rem', md: '0.55rem' },
              opacity: 0.9,
              px: 0.5,
              borderRadius: 0.5,
              background: alpha(pressureColor, 0.1),
            }}
          >
            PSI {pressureStatus}
          </Typography>
          
          <Typography
            variant="caption"
            sx={{
              color: tempColor,
              fontSize: { xs: '0.45rem', sm: '0.5rem', md: '0.55rem' },
              opacity: 0.9,
              px: 0.5,
              borderRadius: 0.5,
              background: alpha(tempColor, 0.1),
            }}
          >
            °C {tempStatus}
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
  sx: PropTypes.object
};