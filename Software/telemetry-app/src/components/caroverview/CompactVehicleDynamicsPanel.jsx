import React, { useState, useEffect, useRef, memo } from 'react';
import { Box, Typography, Paper, Grid, alpha, useTheme } from '@mui/material';
import useRealTimeData from '../../hooks/useRealTimeData';

/**
 * CompactVehicleDynamicsPanel Component
 * 
 * A responsive panel that displays vehicle dynamics data including
 * roll, pitch, vertical velocity, heading, and speed.
 */
const CompactVehicleDynamicsPanel = ({ tireSize = 18.1 }) => {
  const theme = useTheme();
  
  // State for dynamics data
  const [rollAngle, setRollAngle] = useState(0);
  const [pitchAngle, setPitchAngle] = useState(0);
  const [verticalVelocity, setVerticalVelocity] = useState(0);
  const [heading, setHeading] = useState(0);
  const [speed, setSpeed] = useState(0);
  
  // Handle IMU data for vehicle dynamics
  useRealTimeData('ins_imu', (msg) => {
    try {
      const fields = msg.payload?.fields || {};
      
      // Extract and set roll and pitch angles
      if (fields.roll !== undefined) {
        setRollAngle(fields.roll?.numberValue || 0);
      }
      
      if (fields.pitch !== undefined) {
        setPitchAngle(fields.pitch?.numberValue || 0);
      }
      
      // Extract and set vertical velocity
      if (fields.down_vel !== undefined) {
        setVerticalVelocity(fields.down_vel?.numberValue || 0);
      }
      
      // Calculate speed from north and east velocity components
      if (fields.north_vel !== undefined && fields.east_vel !== undefined) {
        const northVel = fields.north_vel?.numberValue || 0;
        const eastVel = fields.east_vel?.numberValue || 0;
        
        // Calculate ground speed (m/s)
        const groundSpeedMs = Math.sqrt(northVel * northVel + eastVel * eastVel);
        
        // Convert to km/h
        const groundSpeedKmh = groundSpeedMs * 3.6;
        setSpeed(groundSpeedKmh);
        
        // Calculate heading (in degrees, 0 = North, 90 = East)
        const headingRad = Math.atan2(eastVel, northVel);
        const headingDeg = (headingRad * (180 / Math.PI) + 360) % 360;
        setHeading(headingDeg);
      }
    } catch (error) {
      console.error("Error processing IMU data:", error);
    }
  });
  
  // Memoize gauge display components
  const RollGauge = memo(() => {
    // Roll values typically range from -90 to +90 degrees
    const maxAngle = 45; // Max display angle for better visualization
    const clampedRoll = Math.max(-maxAngle, Math.min(maxAngle, rollAngle));
    const gaugePercent = ((clampedRoll + maxAngle) / (2 * maxAngle)) * 100;
    
    // Calculate color based on roll angle
    let rollColor = '#4caf50'; // Green for normal roll
    if (Math.abs(rollAngle) > 30) {
      rollColor = '#f44336'; // Red for extreme roll
    } else if (Math.abs(rollAngle) > 15) {
      rollColor = '#ff9800'; // Orange for moderate roll
    }
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Roll gauge track */}
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            transform: 'translateY(-50%)'
          }}
        />
        
        {/* Roll gauge indicator */}
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
            boxShadow: `0 0 5px ${rollColor}`,
            transition: 'all 0.2s ease-out'
          }}
        />
        
        {/* Zero indicator */}
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 2,
            height: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            transform: 'translate(-50%, -50%)'
          }}
        />
        
        {/* Min/Max labels */}
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            left: 0, 
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.6rem'
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
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.6rem'
          }}
        >
          +{maxAngle}°
        </Typography>
      </Box>
    );
  });
  
  const PitchGauge = memo(() => {
    // Pitch values typically range from -90 to +90 degrees
    const maxAngle = 45; // Max display angle for better visualization
    const clampedPitch = Math.max(-maxAngle, Math.min(maxAngle, pitchAngle));
    const gaugePercent = ((clampedPitch + maxAngle) / (2 * maxAngle)) * 100;
    
    // Calculate color based on pitch angle
    let pitchColor = '#4caf50'; // Green for normal pitch
    if (Math.abs(pitchAngle) > 30) {
      pitchColor = '#f44336'; // Red for extreme pitch
    } else if (Math.abs(pitchAngle) > 15) {
      pitchColor = '#ff9800'; // Orange for moderate pitch
    }
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Pitch gauge track */}
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            transform: 'translateY(-50%)'
          }}
        />
        
        {/* Pitch gauge indicator */}
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
            boxShadow: `0 0 5px ${pitchColor}`,
            transition: 'all 0.2s ease-out'
          }}
        />
        
        {/* Zero indicator */}
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 2,
            height: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            transform: 'translate(-50%, -50%)'
          }}
        />
        
        {/* Min/Max labels */}
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            left: 0, 
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.6rem'
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
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.6rem'
          }}
        >
          +{maxAngle}°
        </Typography>
      </Box>
    );
  });
  
  const CompassHeading = memo(() => {
    // Compass points
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(heading / 45) % 8;
    const compassDir = directions[index];
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%', textAlign: 'center' }}>
        <Box 
          sx={{ 
            width: 40,
            height: 40,
            margin: '0 auto',
            borderRadius: '50%',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          {/* Compass needle */}
          <Box 
            sx={{ 
              position: 'absolute',
              width: 2,
              height: 16,
              backgroundColor: '#ff9800',
              transform: `rotate(${heading}deg)`,
              transformOrigin: 'center bottom',
              bottom: '50%'
            }}
          />
          
          {/* Compass center point */}
          <Box 
            sx={{ 
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: '#ff9800'
            }}
          />
          
          {/* Cardinal points */}
          <Typography 
            variant="caption" 
            sx={{ 
              position: 'absolute',
              top: -18,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.6rem'
            }}
          >
            N
          </Typography>
          
          <Typography 
            variant="caption" 
            sx={{ 
              position: 'absolute',
              right: -12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.6rem'
            }}
          >
            E
          </Typography>
          
          <Typography 
            variant="caption" 
            sx={{ 
              position: 'absolute',
              bottom: -18,
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.6rem'
            }}
          >
            S
          </Typography>
          
          <Typography 
            variant="caption" 
            sx={{ 
              position: 'absolute',
              left: -12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.6rem'
            }}
          >
            W
          </Typography>
        </Box>
        
        <Typography variant="caption" sx={{ marginTop: 1, display: 'block', fontSize: '0.7rem' }}>
          {compassDir} • {heading.toFixed(0)}°
        </Typography>
      </Box>
    );
  });
  
  const VelocityGauge = memo(() => {
    // Vertical velocity gauge logic
    const maxVelocity = 5; // m/s
    const clampedVel = Math.max(-maxVelocity, Math.min(maxVelocity, verticalVelocity));
    const gaugePercent = ((clampedVel + maxVelocity) / (2 * maxVelocity)) * 100;
    
    // Calculate color based on vertical velocity
    let velColor = '#4caf50'; // Green for low vertical velocity
    if (Math.abs(verticalVelocity) > 3) {
      velColor = '#f44336'; // Red for high vertical velocity
    } else if (Math.abs(verticalVelocity) > 1) {
      velColor = '#ff9800'; // Orange for moderate vertical velocity
    }
    
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        {/* Vertical velocity gauge track */}
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: 0,
            right: 0,
            height: 4,
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            borderRadius: 2,
            transform: 'translateY(-50%)'
          }}
        />
        
        {/* Vertical velocity gauge indicator */}
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
            boxShadow: `0 0 5px ${velColor}`,
            transition: 'all 0.2s ease-out'
          }}
        />
        
        {/* Zero indicator */}
        <Box 
          sx={{ 
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 2,
            height: 10,
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            transform: 'translate(-50%, -50%)'
          }}
        />
        
        {/* Min/Max labels */}
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            left: 0, 
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.6rem'
          }}
        >
          -{maxVelocity} m/s
        </Typography>
        
        <Typography 
          variant="caption" 
          sx={{ 
            position: 'absolute', 
            bottom: -2, 
            right: 0, 
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '0.6rem'
          }}
        >
          +{maxVelocity} m/s
        </Typography>
      </Box>
    );
  });
  
  const SpeedDisplay = memo(() => {
    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%', textAlign: 'center' }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontSize: { xs: '1.2rem', sm: '1.5rem' }, 
            fontWeight: 'bold',
            color: speed > 100 ? '#f44336' : speed > 50 ? '#ff9800' : '#4caf50'
          }}
        >
          {speed.toFixed(1)}
        </Typography>
        
        <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.7rem' }}>
          km/h
        </Typography>
      </Box>
    );
  });
  
  return (
    <Paper 
      sx={{ 
        backgroundColor: alpha(theme.palette.common.black, 0.7),
        borderRadius: theme.shape.borderRadius,
        backdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
        padding: { xs: 1, sm: 1.5 },
        width: '100%',
        overflow: 'hidden',
        boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.2)}`,
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
          fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
          textAlign: 'center',
        }}
      >
        Vehicle Dynamics
      </Typography>
      
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={4} sm={2.4}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: theme.palette.common.white,
                opacity: 0.8,
                fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
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
                fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
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
                fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
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
                fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
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
                fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
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
                fontSize: { xs: '0.7rem', sm: '0.75rem', md: '0.8rem' },
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
                fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
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
                fontSize: { xs: '0.6rem', sm: '0.65rem', md: '0.7rem' },
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