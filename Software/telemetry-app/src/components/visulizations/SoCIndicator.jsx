import React from 'react';
import { Box, Typography } from '@mui/material';

const SoCIndicator = ({ soc }) => {
  // Clamp SoC between 0 and 100
  const clampedSoC = Math.max(0, Math.min(100, soc));

  // Determine color based on SoC
  const getColor = (socValue) => {
    if (socValue < 15) return '#d9534f'; // Red
    if (socValue < 30) return '#f0ad4e'; // Orange
    if (socValue < 50) return '#ffc107'; // Amber
    if (socValue < 75) return '#5bc0de'; // Light blue
    return '#5cb85c'; // Green
  };

  const terminalHeight = 15;

  return (
    <Box
      sx={{
        position: 'relative',
        width: 100,
        height: 220,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      {/* Battery terminal */}
      <Box
        sx={{
          width: '40%',
          height: terminalHeight,
          backgroundColor: '#ccc',
          borderTopLeftRadius: 4,
          borderTopRightRadius: 4,
          boxShadow: '0 0 5px rgba(255,255,255,0.3)'
        }}
      />
      {/* Battery container */}
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: 180,
          border: '3px solid #ccc',
          borderRadius: 2,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5), 0 0 10px rgba(255, 255, 255, 0.1)'
        }}
      >
        {/* SoC fill */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            width: '100%',
            height: `${clampedSoC}%`,
            backgroundColor: getColor(clampedSoC),
            transition: 'height 0.5s ease-in-out, background-color 0.5s ease',
            boxShadow: 'inset 0 0 20px rgba(255, 255, 255, 0.3)',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.2) 1px, transparent 1px)',
            backgroundSize: '100% 20%'
          }}
        />
        {/* Battery level markings */}
        {[0, 25, 50, 75, 100].map((level) => (
          <Box
            key={level}
            sx={{
              position: 'absolute',
              left: 0,
              bottom: `${level}%`,
              width: '100%',
              height: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              zIndex: 1,
              '&::after': {
                content: `"${level}%"`,
                position: 'absolute',
                right: -35,
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.7)'
              }
            }}
          />
        ))}
      </Box>
      {/* Status indicator */}
      <Box
        sx={{
          mt: 2,
          px: 2,
          py: 0.5,
          borderRadius: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          border: `1px solid ${getColor(clampedSoC)}`,
          color: '#fff',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: 1
        }}
      >
        {/* Blinking dot */}
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: getColor(clampedSoC),
            animation: 'pulse 1.5s infinite ease-in-out',
            '@keyframes pulse': {
              '0%': { opacity: 0.4 },
              '50%': { opacity: 1 },
              '100%': { opacity: 0.4 }
            }
          }}
        />
        <Typography variant="body2">
          {clampedSoC < 15
            ? 'LOW CHARGE'
            : clampedSoC < 30
            ? 'CHARGING NEEDED'
            : clampedSoC < 80
            ? 'NORMAL'
            : 'FULLY CHARGED'}
        </Typography>
      </Box>
    </Box>
  );
};

export default SoCIndicator;
