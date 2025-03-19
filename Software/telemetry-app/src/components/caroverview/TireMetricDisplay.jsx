import React from 'react';
import { Box, Typography, alpha, useTheme, Stack } from '@mui/material';
import PropTypes from 'prop-types';

/**
 * TireMetricDisplay Component
 * 
 * A compact and visually appealing display for individual tire metrics.
 * Supports various metric types and provides appropriate visual indicators.
 * 
 * @param {string} label - Label for the metric
 * @param {number} value - Current value of the metric
 * @param {string} unit - Unit of measurement (e.g., 'Hz', 'mm', '°C')
 * @param {function} getStatusColor - Function that returns color based on value
 * @param {string} icon - React icon component to display
 * @param {string} [secondaryValue] - Optional secondary value to display
 * @param {string} [secondaryUnit] - Unit for secondary value
 */
const TireMetricDisplay = ({
  label,
  value,
  unit,
  getStatusColor,
  icon: Icon,
  secondaryValue,
  secondaryUnit,
  compact = false
}) => {
  const theme = useTheme();
  
  // Get color based on status
  const statusColor = getStatusColor(value);
  
  // Determine opacity based on value (higher values = more opaque)
  // Clamped between 0.6 and 1.0 for visibility
  const opacity = Math.min(Math.max(0.6, value / 100), 1);
  
  return (
    <Box
      sx={{
        p: compact ? 0.5 : 1,
        borderRadius: 1.5,
        background: alpha(statusColor, 0.1),
        border: `1px solid ${alpha(statusColor, 0.2)}`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          background: alpha(statusColor, 0.15),
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 8px ${alpha(statusColor, 0.2)}`
        }
      }}
    >
      {/* Label row */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        sx={{ mb: compact ? 0.5 : 1 }}
      >
        {Icon && (
          <Box 
            sx={{ 
              color: statusColor,
              display: 'flex',
              alignItems: 'center',
              opacity: 0.9,
              fontSize: compact ? '1rem' : '1.2rem'
            }}
          >
            <Icon size={compact ? 14 : 18} />
          </Box>
        )}
        
        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontWeight: 'medium',
            fontSize: compact ? '0.65rem' : '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}
        >
          {label}
        </Typography>
      </Stack>
      
      {/* Value displays */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Primary value */}
        <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 'bold',
              color: statusColor,
              fontSize: compact ? '1.2rem' : '1.5rem',
              lineHeight: 1,
              mr: 0.5,
              opacity
            }}
          >
            {typeof value === 'number' ? value.toFixed(1) : value}
          </Typography>
          
          <Typography
            variant="caption"
            sx={{
              color: alpha(statusColor, 0.8),
              fontSize: compact ? '0.6rem' : '0.7rem'
            }}
          >
            {unit}
          </Typography>
        </Box>
        
        {/* Secondary value if provided */}
        {secondaryValue !== undefined && (
          <Box sx={{ display: 'flex', alignItems: 'baseline', mt: 0.5 }}>
            <Typography
              variant="body2"
              component="div"
              sx={{
                fontWeight: 'medium',
                color: theme.palette.text.secondary,
                fontSize: compact ? '0.7rem' : '0.8rem',
                lineHeight: 1,
                mr: 0.5
              }}
            >
              {typeof secondaryValue === 'number' ? secondaryValue.toFixed(1) : secondaryValue}
            </Typography>
            
            <Typography
              variant="caption"
              sx={{
                color: alpha(theme.palette.text.secondary, 0.8),
                fontSize: compact ? '0.55rem' : '0.65rem'
              }}
            >
              {secondaryUnit}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

TireMetricDisplay.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  unit: PropTypes.string.isRequired,
  getStatusColor: PropTypes.func.isRequired,
  icon: PropTypes.elementType,
  secondaryValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  secondaryUnit: PropTypes.string,
  compact: PropTypes.bool
};

export default React.memo(TireMetricDisplay);