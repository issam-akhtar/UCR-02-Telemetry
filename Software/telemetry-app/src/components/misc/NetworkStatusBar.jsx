import React, { useContext, memo } from 'react';
import { NetworkStatusContext } from '../../contexts/NetworkStatusContext';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';

/**
 * Performance-optimized network status bar component
 * Only renders when there's an issue with connectivity
 */
const NetworkStatusBar = memo(() => {
  const { 
    isWebSocketConnected, 
    isApiConnected, 
    lastWebSocketActivity, 
    lastApiActivity,
    checkApiConnection 
  } = useContext(NetworkStatusContext);

  // Hide if all connections are working
  if (isWebSocketConnected && isApiConnected) {
    return null;
  }

  // Determine message and icon based on connection state
  let message = '';
  let icon = null;
  let severity = 'error';

  if (!isWebSocketConnected && !isApiConnected) {
    message = 'No connection to server. Check your network connection.';
    icon = <WifiOffIcon fontSize="small" />;
  } else if (!isWebSocketConnected) {
    message = 'Vehicle Offline: WebSocket connection unavailable. Real-time data may be delayed.';
    severity = 'warning';
    icon = <WifiOffIcon fontSize="small" />;
  } else if (!isApiConnected) {
    message = 'Database connection unavailable. Historical data may be inaccessible.';
    severity = 'warning';
    icon = <StorageIcon fontSize="small" />;
  }

  // Format last activity timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleTimeString();
  };

  // Create tooltip message
  const tooltipMessage = `
    WebSocket: ${isWebSocketConnected ? 'Connected' : 'Disconnected'} (Last Activity: ${formatTimestamp(lastWebSocketActivity)})
    API/DB: ${isApiConnected ? 'Connected' : 'Disconnected'} (Last Activity: ${formatTimestamp(lastApiActivity)})
  `;

  return (
    <Tooltip title={tooltipMessage} arrow>
      <Box
        sx={{
          bgcolor: severity === 'error' ? 'error.main' : 'warning.main',
          color: severity === 'error' ? 'error.contrastText' : 'warning.contrastText',
          px: 2,
          py: 0.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        {icon}
        <Typography variant="body2" component="div" sx={{ fontWeight: 500 }}>
          {message}
        </Typography>
        <IconButton 
          size="small" 
          sx={{ 
            ml: 1, 
            color: 'inherit',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
          }} 
          onClick={checkApiConnection}
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </Box>
    </Tooltip>
  );
});

export default NetworkStatusBar;