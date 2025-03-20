// CompactVehicleDynamicsPanel.jsx
import React, { useState, useEffect, useCallback, useMemo, memo, useContext } from 'react';
import { Box, Typography, Paper, alpha, useTheme, Grid } from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';
import useResizeObserver from 'use-resize-observer';
import { ChartSettingsContext } from '../../contexts/ChartSettingsContext';

/**
 * CompactVehicleDynamicsPanel Component
 * 
 * A responsive panel displaying vehicle dynamic data including roll, pitch,
 * vertical velocity, direction and speed in a compact format.
 */
const CompactVehicleDynamicsPanel = ({ 
  tireSize = 18.1, 
  handleOpenInfo,
  statusColor 
}) => {
  const theme = useTheme();
  const { settings } = useContext(ChartSettingsContext);
  const { ref: containerRef, width: containerWidth } = useResizeObserver();
  
  // Dynamic text scaling based on container width
  const fontSizes = useMemo(() => {
    if (!containerWidth) return { 
      label: '0.65rem', 
      value: '0.75rem', 
      speed: '1.3rem' 
    };
    
    const baseScale = Math.max(0.8, Math.min(1.2, containerWidth / 800));
    
    return {
      label: `${0.65 * baseScale}rem`,
      value: `${0.75 * baseScale}rem`,
      speed: `${1.3 * baseScale}rem`
    };
  }, [containerWidth]);
  
  // Determine if animations should be enabled based on settings
  const animationsEnabled = useMemo(() => 
    settings.global.animationDuration > 0 && settings.global.enableTransitions,
  [settings.global.animationDuration, settings.global.enableTransitions]);

  // Animation duration based on settings
  const animationDuration = useMemo(() => 
    `${settings.global.animationDuration}ms`,
  [settings.global.animationDuration]);

  // Convert units based on settings
  const shouldUseImperialUnits = useMemo(() => 
    settings.dashboard.useImperialUnits,
  [settings.dashboard.useImperialUnits]);
  
  // State for vehicle dynamics data
  const [rollAngle, setRollAngle] = useState(0);
  const [pitchAngle, setPitchAngle] = useState(0);
  const [verticalVelocity, setVerticalVelocity] = useState(0);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  
  // Process IMU data
  const handleImuData = useCallback((msg) => {
    try {
      const fields = msg.payload?.fields || msg.fields || msg || {};
      
      if (fields.roll !== undefined) {
        setRollAngle(fields.roll?.numberValue || 0);
      }
      if (fields.pitch !== undefined) {
        setPitchAngle(fields.pitch?.numberValue || 0);
      }
      if (fields.down_vel !== undefined) {
        setVerticalVelocity(fields.down_vel?.numberValue || 0);
      }
      if (fields.north_vel !== undefined && fields.east_vel !== undefined) {
        const northVel = fields.north_vel?.numberValue || 0;
        const eastVel = fields.east_vel?.numberValue || 0;
        
        // Calculate ground speed and heading
        const groundSpeedMs = Math.sqrt(northVel ** 2 + eastVel ** 2);
        const groundSpeedKmh = groundSpeedMs * 3.6;
        setSpeed(groundSpeedKmh);
        
        const headingRad = Math.atan2(eastVel, northVel);
        const headingDeg = (headingRad * (180 / Math.PI) + 360) % 360;
        setHeading(headingDeg);
      }
    } catch (error) {
      console.error("Error processing IMU data:", error);
    }
  }, []);
  
  // Subscribe to IMU data
  const { ref: dynamicsPanelRef } = useRealTimeData('ins_imu', handleImuData);
  
  // Combine refs
  const combinedRef = useCallback((node) => {
    // Handle containerRef
    if (containerRef) {
      if (typeof containerRef === 'function') {
        containerRef(node);
      } else {
        containerRef.current = node;
      }
    }
    // Handle dynamicsPanelRef
    if (dynamicsPanelRef) {
      if (typeof dynamicsPanelRef === 'function') {
        dynamicsPanelRef(node);
      } else {
        dynamicsPanelRef.current = node;
      }
    }
  }, [containerRef, dynamicsPanelRef]);
  
  
  // Thresholds for dynamics data
  const ROLL_THRESHOLDS = { MODERATE: 15, HIGH: 30 };
  const PITCH_THRESHOLDS = { MODERATE: 15, HIGH: 30 };
  const VERTICAL_VELOCITY_THRESHOLDS = { MODERATE: 1, HIGH: 3 };
  const SPEED_THRESHOLDS = { MODERATE: 50, HIGH: 100 };
  
  // Display speed in correct units
  const formattedSpeed = useMemo(() => {
    if (shouldUseImperialUnits) {
      // Convert km/h to mph
      return (speed * 0.621371).toFixed(1);
    }
    return speed.toFixed(1);
  }, [speed, shouldUseImperialUnits]);
  
  // Speed unit label
  const speedUnit = useMemo(() => 
    shouldUseImperialUnits ? 'mph' : 'km/h',
  [shouldUseImperialUnits]);
  
  // Roll angle gauge with visual indicator
  const RollGauge = memo(() => {
    const maxAngle = 45;
    const clampedRoll = Math.max(-maxAngle, Math.min(maxAngle, rollAngle));
    const gaugePercent = ((clampedRoll + maxAngle) / (2 * maxAngle)) * 100;
    
    // Color based on roll severity
    let rollColor = theme.palette.success.main;
    if (Math.abs(rollAngle) > ROLL_THRESHOLDS.HIGH) {
      rollColor = theme.palette.error.main;
    } else if (Math.abs(rollAngle) > ROLL_THRESHOLDS.MODERATE) {
      rollColor = theme.palette.warning.main;
    }
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: alpha(theme.palette.common.white, 0.15),
            borderRadius: theme.shape.borderRadius / 4,
            transform: 'translateY(-50%)',
          }}
        />
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: `${gaugePercent}%`,
            width: 8,
            height: 8,
            backgroundColor: rollColor,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 4px ${rollColor}`,
            transition: animationsEnabled ? `all ${animationDuration} ease-out` : 'none',
            willChange: settings.global.enableHardwareAcceleration ? 'left, box-shadow' : 'auto',
          }}
        />
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 2,
            height: 8,
            backgroundColor: alpha(theme.palette.common.white, 0.4),
            transform: 'translate(-50%, -50%)',
          }}
        />
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            left: 0, 
            color: alpha(theme.palette.common.white, 0.5), 
            fontSize: fontSizes.label
          }}
        >
          -{maxAngle}°
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            right: 0, 
            color: alpha(theme.palette.common.white, 0.5), 
            fontSize: fontSizes.label
          }}
        >
          +{maxAngle}°
        </Typography>
      </Box>
    );
  });
  
  // Pitch angle gauge with visual indicator
  const PitchGauge = memo(() => {
    const maxAngle = 45;
    const clampedPitch = Math.max(-maxAngle, Math.min(maxAngle, pitchAngle));
    const gaugePercent = ((clampedPitch + maxAngle) / (2 * maxAngle)) * 100;
    
    // Color based on pitch severity
    let pitchColor = theme.palette.success.main;
    if (Math.abs(pitchAngle) > PITCH_THRESHOLDS.HIGH) {
      pitchColor = theme.palette.error.main;
    } else if (Math.abs(pitchAngle) > PITCH_THRESHOLDS.MODERATE) {
      pitchColor = theme.palette.warning.main;
    }
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: alpha(theme.palette.common.white, 0.15),
            borderRadius: theme.shape.borderRadius / 4,
            transform: 'translateY(-50%)',
          }}
        />
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: `${gaugePercent}%`,
            width: 8,
            height: 8,
            backgroundColor: pitchColor,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 4px ${pitchColor}`,
            transition: animationsEnabled ? `all ${animationDuration} ease-out` : 'none',
            willChange: settings.global.enableHardwareAcceleration ? 'left, box-shadow' : 'auto',
          }}
        />
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 2,
            height: 8,
            backgroundColor: alpha(theme.palette.common.white, 0.4),
            transform: 'translate(-50%, -50%)',
          }}
        />
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            left: 0, 
            color: alpha(theme.palette.common.white, 0.5), 
            fontSize: fontSizes.label 
          }}
        >
          -{maxAngle}°
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            right: 0, 
            color: alpha(theme.palette.common.white, 0.5), 
            fontSize: fontSizes.label
          }}
        >
          +{maxAngle}°
        </Typography>
      </Box>
    );
  });
  
  // Vertical velocity gauge with visual indicator
  const VelocityGauge = memo(() => {
    const maxVelocity = 5;
    const clampedVel = Math.max(-maxVelocity, Math.min(maxVelocity, verticalVelocity));
    const gaugePercent = ((clampedVel + maxVelocity) / (2 * maxVelocity)) * 100;
    
    // Color based on velocity magnitude
    let velColor = theme.palette.success.main;
    if (Math.abs(verticalVelocity) > VERTICAL_VELOCITY_THRESHOLDS.HIGH) {
      velColor = theme.palette.error.main;
    } else if (Math.abs(verticalVelocity) > VERTICAL_VELOCITY_THRESHOLDS.MODERATE) {
      velColor = theme.palette.warning.main;
    }
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 3,
            backgroundColor: alpha(theme.palette.common.white, 0.15),
            borderRadius: theme.shape.borderRadius / 4,
            transform: 'translateY(-50%)',
          }}
        />
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: `${gaugePercent}%`,
            width: 8,
            height: 8,
            backgroundColor: velColor,
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: `0 0 4px ${velColor}`,
            transition: animationsEnabled ? `all ${animationDuration} ease-out` : 'none',
            willChange: settings.global.enableHardwareAcceleration ? 'left, box-shadow' : 'auto',
          }}
        />
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 2,
            height: 8,
            backgroundColor: alpha(theme.palette.common.white, 0.4),
            transform: 'translate(-50%, -50%)',
          }}
        />
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            left: 0, 
            color: alpha(theme.palette.common.white, 0.5),
            fontSize: fontSizes.label
          }}
        >
          -{maxVelocity}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            right: 0, 
            color: alpha(theme.palette.common.white, 0.5),
            fontSize: fontSizes.label
          }}
        >
          +{maxVelocity}
        </Typography>
      </Box>
    );
  });
  
  // Compass heading indicator
  const CompassHeading = memo(() => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    const compassDir = directions[index];
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%', textAlign: 'center' }}>
        <Box 
          sx={{ 
            width: { xs: 30, sm: 36 },
            height: { xs: 30, sm: 36 },
            margin: '0 auto',
            borderRadius: '50%',
            border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Box 
            sx={{ 
              position: 'absolute',
              width: 2,
              height: 14,
              backgroundColor: theme.palette.warning.main,
              transform: `rotate(${heading}deg)`,
              transformOrigin: 'center bottom',
              bottom: '50%',
              transition: animationsEnabled ? `transform ${animationDuration} ease-out` : 'none',
              willChange: settings.global.enableHardwareAcceleration ? 'transform' : 'auto',
            }}
          />
          <Box 
            sx={{ 
              width: 4,
              height: 4,
              borderRadius: '50%',
              backgroundColor: theme.palette.warning.main,
            }}
          />
          
          {/* Cardinal direction markers */}
          {['N', 'E', 'S', 'W'].map((dir, index) => {
            const angleRad = (index * Math.PI / 2);
            const radius = 16;
            return (
              <Typography 
                key={dir}
                variant="caption" 
                sx={{ 
                  position: 'absolute',
                  top: dir === 'S' ? 'auto' : dir === 'N' ? -12 : '50%',
                  bottom: dir === 'S' ? -12 : 'auto',
                  left: dir === 'W' ? -12 : dir === 'E' ? 'auto' : '50%',
                  right: dir === 'E' ? -12 : 'auto',
                  transform: (dir === 'E' || dir === 'W') ? 'translateY(-50%)' : 'translateX(-50%)',
                  color: alpha(theme.palette.common.white, 0.7),
                  fontSize: fontSizes.label,
                }}
              >
                {dir}
              </Typography>
            );
          })}
        </Box>
        <Typography variant="caption" sx={{ marginTop: 1, display: 'block', fontSize: fontSizes.label }}>
          {compassDir} • {heading.toFixed(0)}°
        </Typography>
      </Box>
    );
  });
  
  // Speed display with color coding
  const SpeedDisplay = memo(() => {
    // Color based on speed
    const speedColor = useMemo(() => {
      if (speed > SPEED_THRESHOLDS.HIGH) return theme.palette.error.main;
      if (speed > SPEED_THRESHOLDS.MODERATE) return theme.palette.warning.main;
      return theme.palette.success.main;
    }, [speed]);
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%', textAlign: 'center' }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: fontSizes.speed,
            fontWeight: 'bold',
            color: speedColor,
            lineHeight: 1.1,
          }}
        >
          {formattedSpeed}
        </Typography>
        <Typography variant="caption" sx={{ color: alpha(theme.palette.common.white, 0.7), fontSize: fontSizes.label }}>
          {speedUnit}
        </Typography>
      </Box>
    );
  });
  
  // Calculate update interval for real-time components
  const updateInterval = useMemo(() => 
    settings.dashboard.updateInterval,
  [settings.dashboard.updateInterval]);
  
  // Apply update interval to component data
  useEffect(() => {
    let timer;
    if (updateInterval > 0) {
      timer = setInterval(() => {
        // This would trigger component updates at the specified interval
        // In a real implementation, you might fetch or process data here
      }, updateInterval);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [updateInterval]);
  
  return (
    <Paper 
      ref={combinedRef}
      sx={{ 
        backgroundColor: alpha(theme.palette.background.paper, 0.15),
        backdropFilter: 'blur(10px)',
        borderRadius: theme.shape.borderRadius,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        padding: { xs: 1, sm: 1.5 },
        paddingTop: 1,
        width: '100%',
        overflow: 'hidden',
        boxShadow: theme.shadows[4],
      }}
    >
      <Typography 
        variant="subtitle2" 
        sx={{ 
          color: theme.palette.primary.main,
          fontWeight: 'bold',
          mb: 1,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontSize: fontSizes.label,
          textAlign: 'center',
        }}
      >
        Vehicle Dynamics
      </Typography>
      
      <Grid container spacing={{ xs: 1, sm: 2 }} alignItems="center">
        <Grid item xs={4} sm={2.4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.common.white,
                opacity: 0.8,
                fontSize: fontSizes.label,
                mb: 0.5,
                display: 'block'
              }}
            >
              ROLL
            </Typography>
            <Box sx={{ height: 20, mb: 0.5 }}>
              <RollGauge />
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.common.white,
                fontSize: fontSizes.value,
              }}
            >
              {rollAngle.toFixed(1)}°
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={4} sm={2.4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.common.white,
                opacity: 0.8,
                fontSize: fontSizes.label,
                mb: 0.5,
                display: 'block'
              }}
            >
              PITCH
            </Typography>
            <Box sx={{ height: 20, mb: 0.5 }}>
              <PitchGauge />
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.common.white,
                fontSize: fontSizes.value,
              }}
            >
              {pitchAngle.toFixed(1)}°
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={4} sm={2.4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.common.white,
                opacity: 0.8,
                fontSize: fontSizes.label,
                mb: 0.5,
                display: 'block'
              }}
            >
              V-VEL
            </Typography>
            <Box sx={{ height: 20, mb: 0.5 }}>
              <VelocityGauge />
            </Box>
            <Typography 
              variant="body2" 
              sx={{ 
                color: theme.palette.common.white,
                fontSize: fontSizes.value,
              }}
            >
              {verticalVelocity.toFixed(1)} m/s
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={6} sm={2.4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.common.white,
                opacity: 0.8,
                fontSize: fontSizes.label,
                mb: 0.5,
                display: 'block'
              }}
            >
              DIRECTION
            </Typography>
            <CompassHeading />
          </Box>
        </Grid>
        
        <Grid item xs={6} sm={2.4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.common.white,
                opacity: 0.8,
                fontSize: fontSizes.label,
                mb: 0.5,
                display: 'block'
              }}
            >
              SPEED
            </Typography>
            <SpeedDisplay />
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default memo(CompactVehicleDynamicsPanel);