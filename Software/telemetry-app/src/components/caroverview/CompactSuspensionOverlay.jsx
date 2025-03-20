import React, { useState, useEffect, useRef, useContext, useMemo } from 'react';
import { Box, Typography, useTheme, alpha, LinearProgress, Tooltip } from '@mui/material';
import { GiSpring } from 'react-icons/gi';
import PropTypes from 'prop-types';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

/**
 * CompactSuspensionOverlay
 * Show suspension data with a more granular color scale (green -> red).
 */
export default function CompactSuspensionOverlay({
  wheelFilter = null,
  suspensionValues = null,
  transformForCard = false,
  compact = false,
  sx = {},
  fontSizes = {}
}) {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const isFirstRender = useRef(true);

  // Animation settings
  const animationsEnabled = useMemo(
    () => settings.global.animationDuration > 0 && settings.global.enableTransitions,
    [settings.global.animationDuration, settings.global.enableTransitions]
  );
  const animationDuration = useMemo(
    () => `${settings.global.animationDuration}ms`,
    [settings.global.animationDuration]
  );

  // Track suspension values
  const [frontLeft, setFrontLeft] = useState(suspensionValues?.FL ?? 0);
  const [frontRight, setFrontRight] = useState(suspensionValues?.FR ?? 0);
  const [rearLeft, setRearLeft] = useState(suspensionValues?.RL ?? 0);
  const [rearRight, setRearRight] = useState(suspensionValues?.RR ?? 0);

  // On mount/updates, handle significant changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const isSignificantChange = (oldVal, newVal) => {
      if (oldVal === 0 && newVal !== 0) return true;
      if (oldVal !== 0 && newVal === 0) return true;
      const percentChange = Math.abs((newVal - oldVal) / (oldVal || 1)) * 100;
      return percentChange >= settings.dashboard.significantChangeThreshold;
    };

    if (suspensionValues) {
      if (
        suspensionValues.FL !== undefined &&
        suspensionValues.FL !== null &&
        isSignificantChange(frontLeft, suspensionValues.FL)
      ) {
        setFrontLeft(suspensionValues.FL);
      }
      if (
        suspensionValues.FR !== undefined &&
        suspensionValues.FR !== null &&
        isSignificantChange(frontRight, suspensionValues.FR)
      ) {
        setFrontRight(suspensionValues.FR);
      }
      if (
        suspensionValues.RL !== undefined &&
        suspensionValues.RL !== null &&
        isSignificantChange(rearLeft, suspensionValues.RL)
      ) {
        setRearLeft(suspensionValues.RL);
      }
      if (
        suspensionValues.RR !== undefined &&
        suspensionValues.RR !== null &&
        isSignificantChange(rearRight, suspensionValues.RR)
      ) {
        setRearRight(suspensionValues.RR);
      }
    }
  }, [
    suspensionValues,
    wheelFilter,
    settings.dashboard.significantChangeThreshold,
    frontLeft,
    frontRight,
    rearLeft,
    rearRight
  ]);

  // Throttling with updateInterval if needed
  useEffect(() => {
    if (settings.dashboard.updateInterval > 0) {
      const timer = setInterval(() => {
        // Could be used for periodic data refresh if desired
      }, settings.dashboard.updateInterval);
      return () => clearInterval(timer);
    }
  }, [settings.dashboard.updateInterval]);

  // Determine which wheel's value to display
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
      displayValue = 0;
      position = 'Unknown';
      break;
  }

  // A more granular color scale from green (0) to red (100).
  const getColor = (val) => {
    const value = Math.max(0, Math.min(val, 100));
    if (value < 10) return '#00ff00';      // Green
    if (value < 20) return '#7fff00';      
    if (value < 30) return '#bfff00';
    if (value < 40) return '#ffff00';      // Yellow
    if (value < 50) return '#ffdf00';      
    if (value < 60) return '#ffbf00';
    if (value < 70) return '#ff9f00';
    if (value < 80) return '#ff7f00';
    if (value < 90) return '#ff5f00';
    return '#ff0000';                      // Red
  };

  // Provide more granular status labels.
  const getStatusText = (val) => {
    const value = Math.max(0, Math.min(val, 100));
    if (value < 10) return 'Min';
    if (value < 20) return 'Low-';
    if (value < 30) return 'Low';
    if (value < 40) return 'Med-';
    if (value < 50) return 'Med';
    if (value < 60) return 'Med+';
    if (value < 70) return 'High-';
    if (value < 80) return 'High';
    if (value < 90) return 'High+';
    return 'Max';
  };

  // Calculate compression % for display
  const getCompressionPct = (val) => Math.max(0, Math.min(100 - val, 60));

  const color = getColor(displayValue);
  const status = getStatusText(displayValue);
  const compressionPct = getCompressionPct(displayValue);

  // Font sizes
  const titleSize = '12px';
  const labelSize = '12px';

  // Tooltip content
  const tooltipContent = (
    <Box sx={{ p: 0.5 }}>
      <Typography variant="subtitle2" sx={{ fontSize: titleSize, fontWeight: 600, mb: 0.25 }}>
        {position} Suspension
      </Typography>
      <Typography variant="body2" sx={{ fontSize: labelSize, lineHeight: 1.2 }}>
        Value: {displayValue.toFixed(1)} mm
      </Typography>
      <Typography variant="body2" sx={{ fontSize: labelSize, lineHeight: 1.2 }}>
        Compression: {compressionPct.toFixed(0)}%
      </Typography>
    </Box>
  );

  return (
    <Tooltip title={tooltipContent} arrow placement="top" leaveDelay={200}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: theme.shape.borderRadius / 4,
          py: 0.25,
          width: '100%',
          ...sx,
        }}
      >
        {/* Icon + numeric value */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            gap: 0.5,
            mb: 0.25,
          }}
        >
          <GiSpring
            size="1.5rem"
            color={color}
            style={{
              filter: `drop-shadow(0 1px 2px ${alpha(color, 0.5)})`,
              transition: animationsEnabled
                ? `color ${animationDuration} ease, filter ${animationDuration} ease`
                : 'none',
              willChange: settings.global.enableHardwareAcceleration ? 'filter, color' : 'auto',
            }}
            aria-hidden="true"
          />
          <Typography
            variant="body2"
            sx={{
              color,
              fontWeight: 700,
              fontSize: '12px',
              lineHeight: 1,
              textShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.3)}`,
              transition: animationsEnabled ? `color ${animationDuration} ease` : 'none',
              willChange: settings.global.enableHardwareAcceleration ? 'color' : 'auto',
            }}
          >
            {displayValue.toFixed(0)}
          </Typography>
        </Box>

        {/* Progress bar */}
        <Box
          sx={{
            width: '100%',
            height: 3,
            position: 'relative',
            background: alpha(theme.palette.background.paper, 0.15),
            borderRadius: theme.shape.borderRadius,
            overflow: 'hidden',
            mb: 0.25,
            boxShadow: `0 1px 2px ${alpha(theme.palette.common.black, 0.2)}`,
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
              borderRadius: theme.shape.borderRadius,
              backgroundColor: alpha(theme.palette.common.black, 0.05),
              '& .MuiLinearProgress-bar': {
                backgroundColor: color,
                borderRadius: theme.shape.borderRadius,
                transition: animationsEnabled
                  ? `transform ${animationDuration} ease, background-color ${animationDuration} ease`
                  : 'none',
                backgroundImage: `linear-gradient(90deg, ${alpha(color, 0.7)} 0%, ${color} 50%, ${alpha(color, 0.7)} 100%)`,
                boxShadow: `0 0 4px ${color}`,
                willChange: settings.global.enableHardwareAcceleration
                  ? 'transform, background-color, box-shadow'
                  : 'auto',
              },
            }}
          />
        </Box>

        {/* Status pill */}
        <Typography
          variant="caption"
          sx={{
            color: alpha(theme.palette.common.white, 1),
            fontSize: '12px',
            fontWeight: 600,
            px: 0.75,
            py: 0,
            borderRadius: theme.shape.borderRadius / 2,
            background: color,
            boxShadow: `0 1px 3px ${alpha(color, 0.7)}`,
            textShadow: '0 1px 1px rgba(0,0,0,0.2)',
            letterSpacing: '0.5px',
            lineHeight: 1.5,
            transition: animationsEnabled ? `background ${animationDuration} ease, box-shadow ${animationDuration} ease` : 'none',
            willChange: settings.global.enableHardwareAcceleration ? 'background, box-shadow' : 'auto',
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
    RR: PropTypes.number,
  }),
  transformForCard: PropTypes.bool,
  compact: PropTypes.bool,
  sx: PropTypes.object,
  fontSizes: PropTypes.object,
};

export const MemoizedCompactSuspensionOverlay = React.memo(CompactSuspensionOverlay);
