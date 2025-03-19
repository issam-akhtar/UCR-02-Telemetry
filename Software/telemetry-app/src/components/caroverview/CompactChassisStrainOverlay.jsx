import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, useTheme, alpha, Tooltip } from '@mui/material';
import { MdOutlineCompress } from 'react-icons/md';
import useRealTimeData from '../../hooks/useRealTimeData';
import PropTypes from 'prop-types';

/**
 * CompactChassisStrainOverlay Component
 * 
 * Enhanced chassis strain visualization for wheel cards.
 * Displays strain measurements with tooltips and animated indicators.
 */
export default function CompactChassisStrainOverlay({ 
  wheelFilter = null, 
  strainValues = null,
  transformForCard = false,
  sx = {}
}) {
  const theme = useTheme();
  const isFirstRender = useRef(true);
  
  // Initialize with meaningful defaults to prevent visual flickering
  const [frontLeftStrain, setFrontLeftStrain] = useState(strainValues?.FL ?? 40);
  const [frontRightStrain, setFrontRightStrain] = useState(strainValues?.FR ?? 40);
  const [rearLeftStrain, setRearLeftStrain] = useState(strainValues?.RL ?? 40);
  const [rearRightStrain, setRearRightStrain] = useState(strainValues?.RR ?? 40);
  const [isActive, setIsActive] = useState(false);
  const [prevStrain, setPrevStrain] = useState(0);
  const [pulseCount, setPulseCount] = useState(0);

  // Constants for strain thresholds
  const STRAIN_THRESHOLDS = {
    MODERATE: 40,
    HIGH: 80
  };

  // Helper to calculate average strain from multiple gauges
  const calculateAverage = useCallback((fields) => {
    try {
      // If we have no data, return previous value to prevent flickering
      if (!fields || Object.keys(fields).length === 0) return null;
      
      const gauges = ['gauge1', 'gauge2', 'gauge3', 'gauge4', 'gauge5', 'gauge6']
        .map(key => fields[key]?.numberValue || 0);
      
      // If all gauges are 0, we might have default data - check if values exist
      const hasRealData = gauges.some(value => value !== 0);
      if (!hasRealData) return null;
      
      return gauges.reduce((sum, value) => sum + value, 0) / gauges.length;
    } catch (error) {
      console.error("Error calculating average strain:", error);
      return null;
    }
  }, []);

  // Handlers for the different strain gauge data streams - optimized to prevent unnecessary updates
  const handleFrontStrainGauges1 = useCallback((msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields;
      if (!fields) return;
      
      const avgStrain = calculateAverage(fields);
      if (avgStrain !== null) {
        setFrontLeftStrain(avgStrain);
      }
    } catch (error) {
      console.error("Error processing front strain gauges 1:", error);
    }
  }, [calculateAverage]);

  const handleFrontStrainGauges2 = useCallback((msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields;
      if (!fields) return;
      
      const avgStrain = calculateAverage(fields);
      if (avgStrain !== null) {
        setFrontRightStrain(avgStrain);
      }
    } catch (error) {
      console.error("Error processing front strain gauges 2:", error);
    }
  }, [calculateAverage]);

  const handleRearStrainGauges1 = useCallback((msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields;
      if (!fields) return;
      
      const avgStrain = calculateAverage(fields);
      if (avgStrain !== null) {
        setRearLeftStrain(avgStrain);
      }
    } catch (error) {
      console.error("Error processing rear strain gauges 1:", error);
    }
  }, [calculateAverage]);

  const handleRearStrainGauges2 = useCallback((msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields;
      if (!fields) return;
      
      const avgStrain = calculateAverage(fields);
      if (avgStrain !== null) {
        setRearRightStrain(avgStrain);
      }
    } catch (error) {
      console.error("Error processing rear strain gauges 2:", error);
    }
  }, [calculateAverage]);

  // Subscribe to real-time data if strainValues is not provided
  useRealTimeData(strainValues ? null : 'front_strain_gauges_1', handleFrontStrainGauges1);
  useRealTimeData(strainValues ? null : 'front_strain_gauges_2', handleFrontStrainGauges2);
  useRealTimeData(strainValues ? null : 'rear_strain_gauges1', handleRearStrainGauges1);
  useRealTimeData(strainValues ? null : 'rear_strain_gauges2', handleRearStrainGauges2);

  // Update state when strainValues prop changes - only update defined values
  useEffect(() => {
    // Skip first render to prevent resetting to default
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (strainValues) {
      if (strainValues.FL !== undefined && strainValues.FL !== null) 
        setFrontLeftStrain(strainValues.FL);
      if (strainValues.FR !== undefined && strainValues.FR !== null) 
        setFrontRightStrain(strainValues.FR);
      if (strainValues.RL !== undefined && strainValues.RL !== null) 
        setRearLeftStrain(strainValues.RL);
      if (strainValues.RR !== undefined && strainValues.RR !== null) 
        setRearRightStrain(strainValues.RR);
    }
  }, [strainValues]);

  // Determine which value to display based on wheelFilter
  let strain = 0;
  let positionName = '';
  
  switch (wheelFilter) {
    case 'FL':
      strain = frontLeftStrain;
      positionName = 'Front Left';
      break;
    case 'FR':
      strain = frontRightStrain;
      positionName = 'Front Right';
      break;
    case 'RL':
      strain = rearLeftStrain;
      positionName = 'Rear Left';
      break;
    case 'RR':
      strain = rearRightStrain;
      positionName = 'Rear Right';
      break;
    default:
      strain = 40; // Meaningful default
      positionName = 'Unknown';
      break;
  }

  // Get color based on strain level
  const getStrainColor = (value) => {
    if (value > STRAIN_THRESHOLDS.HIGH) return theme.palette.error.main;
    if (value > STRAIN_THRESHOLDS.MODERATE) return theme.palette.warning.main;
    return theme.palette.success.main;
  };
  
  // Get status text based on strain value
  const getStrainStatus = (value) => {
    if (value > STRAIN_THRESHOLDS.HIGH) return "High Stress"; 
    if (value > STRAIN_THRESHOLDS.MODERATE) return "Moderate";
    return "Normal";
  };
  
  const strainColor = getStrainColor(strain);
  const strainStatus = getStrainStatus(strain);

  // Animation when strain changes significantly - optimization to prevent unnecessary animations
  useEffect(() => {
    // Define a significant change threshold
    const SIGNIFICANT_CHANGE = 10;

    // Only trigger animation for significant changes to reduce visual noise
    if (Math.abs(strain - prevStrain) > SIGNIFICANT_CHANGE) {
      setIsActive(true);
      setPulseCount(3); // Set to 3 pulses
      
      const timer = setTimeout(() => {
        setIsActive(false);
        setPulseCount(0);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
    
    setPrevStrain(strain);
  }, [strain, prevStrain]);

  // Pulse animation - optimized to prevent memory leaks
  useEffect(() => {
    let timer;
    if (pulseCount > 0) {
      timer = setTimeout(() => {
        setPulseCount(prev => prev - 1);
      }, 500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    }
  }, [pulseCount]);

  // Define keyframes for animations
  const rippleAnimation = {
    '@keyframes ripple': {
      '0%': { opacity: 0.5, transform: 'scale(1)' },
      '100%': { opacity: 0, transform: 'scale(1.5)' }
    },
    '@keyframes pulse': {
      '0%': { opacity: 0.7, transform: 'scale(1)' },
      '50%': { opacity: 1, transform: 'scale(1.1)' },
      '100%': { opacity: 0.7, transform: 'scale(1)' }
    }
  };

  return (
    <Tooltip 
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="subtitle2">{positionName} Chassis Strain</Typography>
          <Typography variant="body2">Value: {strain.toFixed(1)}</Typography>
          <Typography variant="body2">Status: {strainStatus}</Typography>
          <Typography variant="body2" sx={{ fontSize: '0.7rem', mt: 0.5, opacity: 0.8 }}>
            Measures stress on chassis at wheel mounting point
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
          ...rippleAnimation,
          ...sx
        }}
      >
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          mb: 0.25,
          '&::after': isActive ? {
            content: '""',
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: `1px solid ${strainColor}`,
            opacity: 0.5,
            animation: 'ripple 1.5s ease-out infinite'
          } : {}
        }}>
          <MdOutlineCompress 
            size="0.9rem" 
            color={strainColor}
            style={{ 
              animation: isActive ? 'pulse 0.5s ease infinite' : 'none'
            }}
            aria-hidden="true"
          />
        </Box>
        
        <Typography
          variant="body2"
          sx={{
            color: strainColor,
            fontWeight: 'bold',
            fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
            lineHeight: 1,
            mt: 0.25,
            animation: pulseCount > 0 ? 'pulse 0.5s ease infinite' : 'none'
          }}
          aria-live={pulseCount > 0 ? "polite" : "off"}
        >
          {strain.toFixed(1)}
        </Typography>
        
        {/* Add strain status label for better clarity */}
        <Typography
          variant="caption"
          sx={{
            color: alpha(strainColor, 0.8),
            fontSize: { xs: '0.45rem', sm: '0.5rem', md: '0.55rem' },
            lineHeight: 1,
          }}
        >
          {strainStatus}
        </Typography>
      </Box>
    </Tooltip>
  );
}

CompactChassisStrainOverlay.propTypes = {
  wheelFilter: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']),
  strainValues: PropTypes.shape({
    FL: PropTypes.number,
    FR: PropTypes.number,
    RL: PropTypes.number,
    RR: PropTypes.number
  }),
  transformForCard: PropTypes.bool,
  sx: PropTypes.object
};