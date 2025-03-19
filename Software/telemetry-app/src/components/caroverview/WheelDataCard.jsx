import React from 'react';
import { Box, Typography, alpha, useTheme, Grid, Tooltip } from '@mui/material';
import OverlayWrapper from './OverlayWrapper';
import PropTypes from 'prop-types';

/**
 * WheelDataCard Component
 * 
 * A compact square card with a 2x2 grid layout for displaying wheel telemetry:
 * - Suspension (Sus)
 * - Frequency (Freq)
 * - Strain
 * - Aero
 * 
 * Each section contains minimal but essential information.
 */
const WheelDataCard = ({ 
  position, 
  positionStyle, 
  suspensionOverlay,
  wheelSpeedOverlay,
  strainOverlay,
  aeroOverlay
}) => {
  const theme = useTheme();
  
  // Map position codes to readable names
  const positionNames = {
    FL: 'Front Left',
    FR: 'Front Right',
    RL: 'Rear Left',
    RR: 'Rear Right'
  };
  
  const readablePosition = positionNames[position] || position;
  
  // Section labels with tooltips to help reduce flickering
  const SectionLabel = ({ label, description }) => (
    <Tooltip 
      title={description} 
      arrow 
      placement="top"
      enterDelay={300}
      leaveDelay={100}
      sx={{
        // Fix for tooltip z-index issues
        zIndex: theme.zIndex.tooltip,
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: theme.palette.grey[300],
          fontSize: { xs: '0.55rem', sm: '0.6rem', md: '0.65rem' },
          textAlign: 'center',
          mb: 0.5,
          fontWeight: 'medium',
          userSelect: 'none', // Prevent text selection
        }}
      >
        {label}
      </Typography>
    </Tooltip>
  );
  
  return (
    <Box
      sx={{
        position: 'absolute',
        ...positionStyle,
        zIndex: 10,
        // Important for tooltips
        pointerEvents: 'auto',
      }}
      role="region"
      aria-label={`${readablePosition} Wheel Data Card`}
    >
      <Box
        sx={{
          backgroundColor: alpha(theme.palette.common.black, 0.8),
          backdropFilter: 'blur(8px)',
          borderRadius: theme.shape.borderRadius,
          overflow: 'visible', // Important: Allow tooltips to display
          width: { xs: '120px', sm: '140px', md: '160px' },
          height: { xs: '120px', sm: '140px', md: '160px' },
          boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.4)}`,
          border: `1px solid ${alpha(theme.palette.grey[700], 0.5)}`,
          // Fix for tooltip z-index issues
          isolation: 'isolate', 
        }}
      >
        {/* Position label at top */}
        <Box 
          sx={{ 
            position: 'absolute', 
            top: 2, 
            left: 2,
            zIndex: 20,
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.primary.main,
              fontWeight: 'bold',
              fontSize: { xs: '0.65rem', sm: '0.7rem', md: '0.75rem' },
              backgroundColor: alpha(theme.palette.common.black, 0.7),
              px: 0.5,
              borderRadius: 0.5,
              userSelect: 'none', // Prevent text selection
            }}
          >
            {position}
          </Typography>
        </Box>
        
        <Grid container sx={{ height: '100%' }}>
          {/* Suspension - Top Left */}
          <Grid item xs={6} sx={{ 
            borderRight: `1px solid ${alpha(theme.palette.grey[700], 0.5)}`,
            borderBottom: `1px solid ${alpha(theme.palette.grey[700], 0.5)}`,
            height: '50%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Box 
              sx={{ 
                p: 0.5, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                // Critical for tooltips
                pointerEvents: 'auto',
              }}
            >
              <SectionLabel 
                label="Sus" 
                description="Suspension travel measurement" 
              />
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <OverlayWrapper compact={true} name="Suspension">
                  {suspensionOverlay}
                </OverlayWrapper>
              </Box>
            </Box>
          </Grid>
          
          {/* Frequency - Top Right */}
          <Grid item xs={6} sx={{ 
            borderBottom: `1px solid ${alpha(theme.palette.grey[700], 0.5)}`,
            height: '50%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Box 
              sx={{ 
                p: 0.5, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                // Critical for tooltips
                pointerEvents: 'auto',
              }}
            >
              <SectionLabel 
                label="Freq" 
                description="Wheel rotation frequency (Hz)" 
              />
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <OverlayWrapper compact={true} name="Wheel Speed">
                  {wheelSpeedOverlay}
                </OverlayWrapper>
              </Box>
            </Box>
          </Grid>
          
          {/* Strain - Bottom Left */}
          <Grid item xs={6} sx={{ 
            borderRight: `1px solid ${alpha(theme.palette.grey[700], 0.5)}`,
            height: '50%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Box 
              sx={{ 
                p: 0.5, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                // Critical for tooltips
                pointerEvents: 'auto',
              }}
            >
              <SectionLabel 
                label="Strain" 
                description="Chassis strain at wheel mount" 
              />
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <OverlayWrapper compact={true} name="Chassis Strain">
                  {strainOverlay}
                </OverlayWrapper>
              </Box>
            </Box>
          </Grid>
          
          {/* Aero - Bottom Right */}
          <Grid item xs={6} sx={{ 
            height: '50%',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Box 
              sx={{ 
                p: 0.5, 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                // Critical for tooltips
                pointerEvents: 'auto',
              }}
            >
              <SectionLabel 
                label="Aero" 
                description="Aerodynamic pressure & temperature" 
              />
              <Box sx={{ flex: 1, minHeight: 0 }}>
                <OverlayWrapper compact={true} name="Aerodynamics">
                  {aeroOverlay}
                </OverlayWrapper>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

WheelDataCard.propTypes = {
  position: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']).isRequired,
  positionStyle: PropTypes.object.isRequired,
  suspensionOverlay: PropTypes.node.isRequired,
  wheelSpeedOverlay: PropTypes.node.isRequired,
  strainOverlay: PropTypes.node.isRequired,
  aeroOverlay: PropTypes.node.isRequired
};

export default React.memo(WheelDataCard);