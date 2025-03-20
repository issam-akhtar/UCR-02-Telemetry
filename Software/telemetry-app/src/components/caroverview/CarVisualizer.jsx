// CarVisualizer.jsx
import React, { useMemo, useCallback, useContext } from 'react';
import { Box, Tooltip, alpha, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import useResizeObserver from 'use-resize-observer';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

/**
 * CarVisualizer Component
 *
 * Renders a responsive car outline with interactive tire elements that
 * reflect real-time suspension status with a more granular color scale
 * and animations.
 */
const CarVisualizer = ({
  suspensionData,
  activeTooltip,
  setActiveTooltip
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref, width, height } = useResizeObserver();

  // Calculate tire size based on container
  const tireSize = useMemo(() => {
    const minDimension = Math.min(width, height);
    const baseSize = minDimension / 28;
    return {
      width: baseSize * 1.5,
      height: baseSize * 3.0
    };
  }, [width, height]);

  // Define a more granular color scale (0..100)
  const getSuspensionColor = useCallback((val) => {
    const value = Math.max(0, Math.min(val, 100));
    if (value < 10) return '#00ff00';   // Green
    if (value < 20) return '#7fff00';
    if (value < 30) return '#bfff00';
    if (value < 40) return '#ffff00';   // Yellow
    if (value < 50) return '#ffdf00';
    if (value < 60) return '#ffbf00';
    if (value < 70) return '#ff9f00';
    if (value < 80) return '#ff7f00';
    if (value < 90) return '#ff5f00';
    return '#ff0000';                  // Red
  }, []);

  // Text status for tooltip
  const getStatusText = useCallback((val) => {
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
  }, []);

  // Determine glow strength (larger for lower values)
  const getGlowStrength = useCallback((val) => {
    const value = Math.max(0, Math.min(val, 100));
    if (value < 10) return 15;
    if (value < 20) return 14;
    if (value < 30) return 13;
    if (value < 40) return 12;
    if (value < 50) return 11;
    if (value < 60) return 10;
    if (value < 70) return 9;
    if (value < 80) return 8;
    if (value < 90) return 7;
    return 6;
  }, []);

  // Calculate compression (capped between 0% and 60%)
  const getCompressionPct = useCallback((val) => {
    return Math.max(0, Math.min(100 - val, 60));
  }, []);

  // Determine if animations should be enabled
  const animationsEnabled = useMemo(
    () => settings.global.animationDuration > 0 && settings.global.enableTransitions,
    [settings.global.animationDuration, settings.global.enableTransitions]
  );

  // Animation duration
  const animationDuration = useMemo(
    () => `${settings.global.animationDuration}ms`,
    [settings.global.animationDuration]
  );

  // Create the tire elements
  const tires = useMemo(() => {
    const positions = [
      { code: 'FL', label: 'Front Left', x: 39.45, y: 35.5 },
      { code: 'FR', label: 'Front Right', x: 60.5, y: 35.5 },
      { code: 'RL', label: 'Rear Left', x: 39.45, y: 76.5 },
      { code: 'RR', label: 'Rear Right', x: 60.5, y: 76.5 }
    ];

    return positions.map(({ code, label, x, y }) => {
      const suspensionValue = suspensionData[code] || 0;
      const color = getSuspensionColor(suspensionValue);
      const statusText = getStatusText(suspensionValue);
      const glowStrength = getGlowStrength(suspensionValue);
      const compressionPct = getCompressionPct(suspensionValue);

      // Opacity from 0.7..1
      const opacity = Math.min(0.7 + (suspensionValue / 100) * 0.3, 1);

      return (
        <Tooltip
          key={`tire-${code}`}
          title={
            <Box sx={{ p: 0.5 }}>
              <Box sx={{ fontWeight: 'bold', mb: 0.5 }}>{label} Suspension</Box>
              <Box>Value: {suspensionValue.toFixed(1)}</Box>
              <Box>Compression: {compressionPct.toFixed(0)}%</Box>
              <Box>Status: {statusText}</Box>
            </Box>
          }
          placement="top"
          arrow
          enterDelay={0}
          leaveDelay={0}
          open={activeTooltip === `tire-${code}`}
          onClose={() => setActiveTooltip(null)}
        >
          <Box
            sx={{
              position: 'absolute',
              width: tireSize.width,
              height: tireSize.height,
              borderRadius: theme.shape.borderRadius / 4,
              backgroundColor: color,
              opacity,
              border: `1px solid ${alpha(theme.palette.common.black, 0.15)}`,
              boxShadow: `0 0 ${glowStrength}px ${color}`,
              transition: animationsEnabled ? `all ${animationDuration} ease` : 'none',
              top: `${y}%`,
              left: `${x}%`,
              transform: 'translate(-50%, -50%)',
              cursor: 'pointer',
              overflow: 'hidden',
              // Example: pulse if near the min range
              animation:
                animationsEnabled && suspensionValue < 10
                  ? `pulse 1.5s infinite`
                  : 'none',
              '@keyframes pulse': {
                '0%': { opacity: opacity * 0.6 },
                '50%': { opacity },
                '100%': { opacity: opacity * 0.6 }
              },
              willChange: settings.global.enableHardwareAcceleration ? 'transform, opacity' : 'auto'
            }}
            onClick={() => setActiveTooltip(`tire-${code}`)}
            onMouseEnter={() => setActiveTooltip(`tire-${code}`)}
            onMouseLeave={() => setActiveTooltip(null)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveTooltip(`tire-${code}`);
              }
            }}
            role="button"
            tabIndex={0}
            aria-label={`${label} tire with suspension value ${suspensionValue.toFixed(1)}`}
          >
            {/* Dark overlay showing "compression" */}
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: `${compressionPct}%`,
                backgroundColor: alpha(theme.palette.common.black, 0.2),
                transition: animationsEnabled ? `height ${animationDuration} ease` : 'none',
                zIndex: 2,
                willChange: settings.global.enableHardwareAcceleration ? 'height' : 'auto'
              }}
            />
          </Box>
        </Tooltip>
      );
    });
  }, [
    suspensionData,
    theme,
    activeTooltip,
    setActiveTooltip,
    tireSize,
    getSuspensionColor,
    getStatusText,
    getGlowStrength,
    getCompressionPct,
    animationsEnabled,
    animationDuration,
    settings.global.enableHardwareAcceleration
  ]);

  return (
    <Box
      ref={ref}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: {
          xs: '250px',
          sm: '300px',
          md: '350px'
        },
        backgroundColor: 'transparent',
        borderRadius: theme.shape.borderRadius,
        overflow: 'hidden',
        boxShadow: 'none'
      }}
    >
      {/* Subtle background gradient */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at center, ${alpha(
            theme.palette.primary.main,
            0.04
          )}, transparent 70%)`,
          pointerEvents: 'none'
        }}
      />

      {/* Tire elements */}
      {tires}

      {/* Car outline */}
      <Box
        sx={{
          position: 'absolute',
          inset: '0%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: 'none'
        }}
      >
        <Box
          component="img"
          src="/SVG/UCR-01-Drawing-Top.svg"
          alt="Car Top View"
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(90deg)',
            maxHeight: { xs: '80%', sm: '85%' },
            maxWidth: { xs: '70%', sm: '75%' },
            width: 'auto',
            height: 'auto',
            pointerEvents: 'none',
            zIndex: 1,
            filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.15))',
            willChange: settings.global.enableHardwareAcceleration ? 'transform' : 'auto'
          }}
          loading="lazy"
        />
      </Box>
    </Box>
  );
};

CarVisualizer.propTypes = {
  suspensionData: PropTypes.shape({
    FL: PropTypes.number,
    FR: PropTypes.number,
    RL: PropTypes.number,
    RR: PropTypes.number
  }).isRequired,
  activeTooltip: PropTypes.string,
  setActiveTooltip: PropTypes.func.isRequired
};

export default React.memo(CarVisualizer);
