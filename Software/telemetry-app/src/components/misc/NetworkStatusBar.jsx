import React, { useContext, memo, useState, useEffect } from 'react';
import { NetworkStatusContext } from '../../contexts/NetworkStatusContext';
import { Box, Typography, IconButton, Tooltip, CircularProgress } from '@mui/material';
import WifiOffIcon from '@mui/icons-material/WifiOff';
import StorageIcon from '@mui/icons-material/Storage';
import RefreshIcon from '@mui/icons-material/Refresh';
import { wsService } from '../../services/websocket';
import { axiosInstance } from '../../services/api';

/**
 * Performance-optimized network status bar component
 * Only renders when there's an issue with connectivity
 */
const NetworkStatusBar = memo(() => {
  const { isWebSocketConnected, isApiConnected } = useContext(NetworkStatusContext);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [lastWebSocketActivity, setLastWebSocketActivity] = useState(null);
  const [lastApiActivity, setLastApiActivity] = useState(null);

  // Check WebSocket status on mount
  useEffect(() => {
    if (wsService.lastMessageTime) {
      setLastWebSocketActivity(wsService.lastMessageTime);
    }
  }, [isWebSocketConnected]);

  // Manual connection check handler
  const checkConnections = async () => {
    setIsCheckingConnection(true);
    
    // Try to reconnect WebSocket
    try {
      wsService.forceConnect();
    } catch (err) {
      console.error("Error forcing WebSocket connection:", err);
    }
    
    // Try to check API connectivity
    try {
      const resp = await axiosInstance.get('/tcuData?limit=1');
      if (resp.status === 200) {
        setLastApiActivity(Date.now());
      }
    } catch (err) {
      console.error("Error checking API connection:", err);
    }
    
    setTimeout(() => {
      setIsCheckingConnection(false);
    }, 1500);
  };

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
          onClick={checkConnections}
          disabled={isCheckingConnection}
        >
          {isCheckingConnection ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <RefreshIcon fontSize="small" />
          )}
        </IconButton>
      </Box>
    </Tooltip>
  );
});

export default NetworkStatusBar;