import React from 'react';
import { Box, Typography } from '@mui/material';

const SoCIndicator = ({ soc }) => {
  // Clamp SoC between 0 and 100
  const clampedSoC = Math.max(0, Math.min(100, soc));

  return (
    <Box sx={{ position: 'relative', width: 60, height: 150, mx: 'auto' }}>
      {/* Outer battery container */}
      <Box
        sx={{
          position: 'absolute',
          top: '30px',
          width: '100%',
          height: '100%',
          border: '3px solid #ccc',
          borderRadius: 2,
          backgroundColor: '#333',
        }}
      />
      {/* Fill based on SoC */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          top: '30px',
          height: `${clampedSoC}%`,
          backgroundColor:
            clampedSoC < 20 ? 'red'
            : clampedSoC < 50 ? 'orange'
            : 'limegreen',
          transition: 'height 0.3s ease-in-out',
          borderRadius: 1,
        }}
      />
      {/* Percentage label below */}
      <Typography
        variant="h6"
        sx={{
          position: 'absolute',
          bottom: -65,
          left: '52%',
          transform: 'translateX(-50%)',
          fontWeight: 'bold',
          color: '#fff',
          fontSize: '1.2rem'
        }}
      >
        {clampedSoC.toFixed(1)}%
      </Typography>
    </Box>
  );
};

export default SoCIndicator;
