import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * WheelCard Component
 * 
 * A container card that wraps multiple overlay components for a specific wheel position.
 * This allows positioning and styling the overlays as a single unit.
 * 
 * @param {string} position - The wheel position (FL, FR, RL, RR)
 * @param {React.ReactNode} children - The overlay components to be rendered inside the card
 * @param {object} positionStyle - CSS positioning object for the card
 * @param {number} scale - Scale factor for responsive sizing
 * @param {function} onClick - Function to call when card is clicked
 */
const WheelCard = ({ position, children, positionStyle, scale = 1, onClick }) => {
  const theme = useTheme();
  
  // Map position codes to readable names
  const positionNames = {
    FL: 'Front Left',
    FR: 'Front Right',
    RL: 'Rear Left',
    RR: 'Rear Right'
  };
  
  const readablePosition = positionNames[position] || position;
  
  return (
    <Box
      sx={{
        position: 'absolute',
        ...positionStyle,
        zIndex: 10,
        // Allow pointer events for tooltips to work
        pointerEvents: 'auto', 
        // REMOVED: transform transition that caused hover movement
      }}
      role="region"
      aria-label={`${readablePosition} Wheel Data`}
    >
      <Box
        sx={{
          backgroundColor: alpha(theme.palette.common.black, 0.85),
          backdropFilter: 'blur(8px)',
          borderRadius: theme.shape.borderRadius * 1.5,
          padding: 1.5 * scale,
          boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, 0.4)}`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          width: {
            xs: 200 * scale,
            sm: 225 * scale,
            md: 250 * scale
          },
          minHeight: {
            xs: 160 * scale,
            sm: 180 * scale,
            md: 200 * scale
          },
          overflow: 'visible', // Important: Allow tooltips to overflow
          display: 'flex',
          flexDirection: 'column',
          // Fix for tooltip z-index issues
          isolation: 'isolate',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'box-shadow 0.2s ease, border-color 0.2s ease',
          '&:hover': {
            boxShadow: `0 8px 16px ${alpha(theme.palette.common.black, 0.5)}`,
            borderColor: alpha(theme.palette.primary.main, 0.5),
            // REMOVED: transform property that caused movement
          },
        }}
        onClick={onClick}
      >
        {/* Header with position label */}
        <Typography
          variant="subtitle1"
          sx={{
            color: theme.palette.primary.main,
            fontWeight: 'bold',
            textAlign: 'center',
            mb: 1 * scale,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            pb: 0.5 * scale,
            fontSize: {
              xs: 0.9 * scale,
              sm: 1 * scale,
              md: 1.2 * scale,
            },
            lineHeight: 1.2,
          }}
        >
          {position} Wheel
        </Typography>
        
        {/* Content area for the children components (overlays) */}
        <Box 
          sx={{ 
            position: 'relative', 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1 * scale,
            // Important: Allow tooltip functioning
            pointerEvents: 'auto', 
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

WheelCard.propTypes = {
  position: PropTypes.oneOf(['FL', 'FR', 'RL', 'RR']).isRequired,
  children: PropTypes.node.isRequired,
  positionStyle: PropTypes.object.isRequired,
  scale: PropTypes.number,
  onClick: PropTypes.func
};

export default React.memo(WheelCard);