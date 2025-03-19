import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Box, Typography, LinearProgress, alpha, useTheme, Tooltip } from '@mui/material';
import { GiSpring } from 'react-icons/gi';
import useRealTimeData from '../../hooks/useRealTimeData';
import PropTypes from 'prop-types';

/**
 * CompactSuspensionOverlay Component
 * 
 * Enhanced suspension data display for wheel cards.
 * Shows suspension values with color-coded indicators and tooltips.
 */
export default function CompactSuspensionOverlay({ 
  wheelFilter = null, 
  suspensionValues = null,
  transformForCard = false,
  compact = false, 
  sx = {}
}) {
  const theme = useTheme();
  const isFirstRender = useRef(true);
  
  // Initialize with non-zero defaults only on first render
  const [frontLeft, setFrontLeft] = useState(suspensionValues?.FL ?? 50);
  const [frontRight, setFrontRight] = useState(suspensionValues?.FR ?? 50);
  const [rearLeft, setRearLeft] = useState(suspensionValues?.RL ?? 50);
  const [rearRight, setRearRight] = useState(suspensionValues?.RR ?? 50);

  // Constants for suspension value thresholds
  const SUSPENSION_THRESHOLDS = {
    CRITICAL: 25,
    LOW: 40,
    MEDIUM: 70
  };

  // Handler for front_analog data
  const handleFrontAnalogData = useCallback((msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields;
      if (!fields) return;

      // Only update if we have actual values, prevent default resets
      const fl = fields.front_left_pot?.numberValue;
      const fr = fields.front_right_pot?.numberValue;
      const rl = fields.rear_left_pot?.numberValue;
      const rr = fields.rear_right_pot?.numberValue;
      
      // Update only if the value is defined and not null
      if (fl !== undefined && fl !== null) setFrontLeft(fl);
      if (fr !== undefined && fr !== null) setFrontRight(fr);
      if (rl !== undefined && rl !== null) setRearLeft(rl);
      if (rr !== undefined && rr !== null) setRearRight(rr);
    } catch (error) {
      console.error("Error processing suspension data:", error);
    }
  }, []);

  // Subscribe to real-time data if suspensionValues is not provided
  useRealTimeData(suspensionValues ? null : 'front_analog', handleFrontAnalogData);

  // Update state when suspensionValues prop changes, but only update defined values
  useEffect(() => {
    // Skip the first render to prevent resetting to props default
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (suspensionValues) {
      // Only update if the value is defined and not null
      if (suspensionValues.FL !== undefined && suspensionValues.FL !== null) 
        setFrontLeft(suspensionValues.FL);
      if (suspensionValues.FR !== undefined && suspensionValues.FR !== null) 
        setFrontRight(suspensionValues.FR);
      if (suspensionValues.RL !== undefined && suspensionValues.RL !== null) 
        setRearLeft(suspensionValues.RL);
      if (suspensionValues.RR !== undefined && suspensionValues.RR !== null) 
        setRearRight(suspensionValues.RR);
    }
  }, [suspensionValues]);

  // Get color based on value
  const getColor = (val) => {
    const value = Math.max(0, Math.min(val, 100));
    if (value < SUSPENSION_THRESHOLDS.CRITICAL) return theme.palette.error.main;
    if (value < SUSPENSION_THRESHOLDS.LOW) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  // Get status text based on value
  const getStatusText = (val) => {
    const value = Math.max(0, Math.min(val, 100));
    if (value < SUSPENSION_THRESHOLDS.CRITICAL) return "Critical";
    if (value < SUSPENSION_THRESHOLDS.LOW) return "Low";
    if (value < SUSPENSION_THRESHOLDS.MEDIUM) return "Medium";
    return "Optimal";
  };

  // Calculate compression percentage
  const getCompressionPct = (val) => {
    return Math.max(0, Math.min(100 - val, 60));
  };

  // Determine which value to display based on wheelFilter
  let displayValue = 0;
  let position = '';
  
  switch (wheelFilter) {
    case 'FL':
      displayValue = frontLeft;
      position = 'Front Left';
      break;
    case 'FR':
      displayValue = frontRight;
      position = 'Front Right';
      break;
    case 'RL':
      displayValue = rearLeft;
      position = 'Rear Left';
      break;
    case 'RR':
      displayValue = rearRight;
      position = 'Rear Right';
      break;
    default:
      // If no wheelFilter is specified, give a meaningful default
      displayValue = 50;
      position = 'Unknown';
      break;
  }

  const color = getColor(displayValue);
  const status = getStatusText(displayValue);
  const compressionPct = getCompressionPct(displayValue);

  // Compact display optimized for card cells with tooltip
  return (
    <Tooltip 
      title={
        <Box sx={{ p: 0.5 }}>
          <Typography variant="subtitle2">{position} Suspension</Typography>
          <Typography variant="body2">Value: {displayValue.toFixed(1)} mm</Typography>
          <Typography variant="body2">Compression: {compressionPct.toFixed(0)}%</Typography>
          <Typography variant="body2">Status: {status}</Typography>
          <Typography variant="body2" sx={{ fontSize: '0.7rem', mt: 0.5, opacity: 0.8 }}>
            Measures suspension travel and compression
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
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          height: '100%',
          ...sx
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          mb: 0.25
        }}>
          <GiSpring 
            size="0.8rem" 
            color={color} 
            aria-hidden="true"
          />
          <Typography
            variant="body2"
            sx={{
              color: color,
              fontWeight: 'bold',
              fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
              ml: 0.25
            }}
          >
            {displayValue.toFixed(0)}
          </Typography>
        </Box>
        
        <Box 
          sx={{ 
            width: '100%',
            height: 4,
            position: 'relative',
            background: alpha(theme.palette.background.paper, 0.1),
            borderRadius: 2,
            overflow: 'hidden'
          }}
          role="progressbar"
          aria-valuenow={Math.max(0, Math.min(displayValue, 100))}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(displayValue, 100))}
            sx={{
              height: '100%',
              borderRadius: 2,
              backgroundColor: alpha(theme.palette.common.black, 0.15),
              '& .MuiLinearProgress-bar': {
                backgroundColor: color,
                borderRadius: 2,
                transition: 'transform 0.3s ease'
              }
            }}
          />
        </Box>
        
        {/* Status label for clarity */}
        <Typography
          variant="caption"
          sx={{
            color: alpha(color, 0.9),
            fontSize: { xs: '0.45rem', sm: '0.5rem', md: '0.55rem' },
            mt: 0.25,
            opacity: 0.9,
            px: 0.5,
            borderRadius: 0.5,
            background: alpha(color, 0.1),
          }}
        >
          {status}
        </Typography>
      </Box>
    </Tooltip>
  );
}

CompactSuspensionOverlay.propTypes = {
  wheelFilter: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']),
  suspensionValues: PropTypes.shape({
    FL: PropTypes.number,
    FR: PropTypes.number,
    RL: PropTypes.number,
    RR: PropTypes.number
  }),
  transformForCard: PropTypes.bool,
  compact: PropTypes.bool,
  sx: PropTypes.object
};