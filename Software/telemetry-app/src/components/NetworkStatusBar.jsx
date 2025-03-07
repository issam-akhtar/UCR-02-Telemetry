import React, { useContext } from 'react';
import { NetworkStatusContext } from '../contexts/NetworkStatusContext';
import { Box, Typography } from '@mui/material';

const NetworkStatusBar = () => {
  const { isWebSocketConnected, isApiConnected } = useContext(NetworkStatusContext);

  if (isWebSocketConnected && isApiConnected) {
    return null;
  }

  let message = '';
  if (!isWebSocketConnected && !isApiConnected) {
    message = 'No WebSocket connection and API is unreachable';
  } else if (!isWebSocketConnected) {
    message = 'No WebSocket connection to server';
  } else if (!isApiConnected) {
    message = 'Database/API is unreachable';
  }

  return (
    <Box
      sx={{
        bgcolor: 'error.main',
        color: 'white',
        textAlign: 'center',
        py: 1,
      }}
    >
      <Typography variant="body1">{message}</Typography>
    </Box>
  );
};

export default NetworkStatusBar;
