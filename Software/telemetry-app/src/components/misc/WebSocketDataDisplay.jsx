import React, { useReducer, useEffect, useCallback, memo, useRef } from 'react';
import { wsService } from '../../services/websocket';
import {
  Box,
  Typography,
  TextField,
  Paper,
  InputAdornment,
  IconButton,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { FixedSizeList as List } from 'react-window';
import useResizeObserver from 'use-resize-observer';

const VIEW_MODES = ['Live', 'Predefined'];
// For live mode, include all the types from messages.txt
const LIVE_MESSAGE_TYPES = [
  'All Types',
  'rear_strain_gauges_2',
  'rear_strain_gauges_1',
  'bamocar_rx_data',
  'rear_aero',
  'rear_analog',
  'rear_frequency',
  'front_aero',
  'pdm1',
  'cell',
  'thermistor',
  'aculv2',
  'tcu',
  'aculv_fd_2',
  'aculv1',
  'aculv_fd_1',
  'pack_current',
  'pack_voltage',
  'bamocar',
  'ins_gps',
  'ins_imu',
  'front_frequency',
  'front_analog',
  'bamocar_tx_data',
  'bamo_car_re_transmit',
  'encoder',
  'pdm_current',
  'pdm_re_transmit',
  'front_strain_gauges_1',
  'front_strain_gauges_2'
];

// Predefined messages from messages.txt
const PREDEFINED_MESSAGES = [
  // ... (all message definitions remain the same)
];

// Memoized MessageDisplay component to avoid re-renders
const MessageDisplay = memo(({ message }) => {
  if (!message) return null;
  return (
    <Paper
      elevation={1}
      sx={{
        p: 1.5,
        mb: 1,
        backgroundColor: 'background.paper',
        borderLeft: '3px solid',
        borderLeftColor: 'primary.main',
        width: '100%'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
        <Chip
          label={message.type || 'Unknown'}
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontWeight: 500, fontSize: '0.7rem' }}
        />
        {message.time && (
          <Typography variant="caption" color="text.secondary">
            {new Date(message.time).toLocaleTimeString()}
          </Typography>
        )}
      </Box>
      <Box
        component="pre"
        sx={{
          p: 1,
          bgcolor: 'rgba(0,0,0,0.1)',
          borderRadius: 1,
          fontSize: '0.75rem',
          overflow: 'auto',
          maxHeight: 150,
          wordBreak: 'break-word'
        }}
      >
        {JSON.stringify(message.payload || message.fields, null, 2)}
      </Box>
    </Paper>
  );
});

// Define action types for the reducer
const ACTION_TYPES = {
  SET_VIEW_MODE: 'SET_VIEW_MODE',
  SET_MESSAGE_TYPE: 'SET_MESSAGE_TYPE',
  SET_FILTER: 'SET_FILTER',
  CLEAR_FILTER: 'CLEAR_FILTER',
  ADD_LIVE_MESSAGE: 'ADD_LIVE_MESSAGE',
  SET_PREDEFINED_FILTERED: 'SET_PREDEFINED_FILTERED'
};

// Initial state for the reducer
const initialState = {
  viewMode: 'Live',
  liveMessagesByType: {},
  filter: '',
  messageType: 'All Types',
  predefinedFiltered: PREDEFINED_MESSAGES
};

// Reducer function to handle all state updates
function wsDataReducer(state, action) {
  switch (action.type) {
    case ACTION_TYPES.SET_VIEW_MODE:
      return {
        ...state,
        viewMode: action.payload
      };
    case ACTION_TYPES.SET_MESSAGE_TYPE:
      return {
        ...state,
        messageType: action.payload,
        // Clear messages when changing type
        liveMessagesByType: {}
      };
    case ACTION_TYPES.SET_FILTER:
      return {
        ...state,
        filter: action.payload
      };
    case ACTION_TYPES.CLEAR_FILTER:
      return {
        ...state,
        filter: ''
      };
    case ACTION_TYPES.ADD_LIVE_MESSAGE:
      return {
        ...state,
        liveMessagesByType: {
          ...state.liveMessagesByType,
          [action.payload.type]: action.payload
        }
      };
    case ACTION_TYPES.SET_PREDEFINED_FILTERED:
      return {
        ...state,
        predefinedFiltered: action.payload
      };
    default:
      return state;
  }
}

const WebSocketDataDisplay = () => {
  const [state, dispatch] = useReducer(wsDataReducer, initialState);
  const { viewMode, liveMessagesByType, filter, messageType, predefinedFiltered } = state;
  
  // Component mounted ref to prevent updates after unmount
  const isMounted = useRef(true);
  
  // For messages debouncing
  const messageBufferRef = useRef({});
  const messageUpdateTimeoutRef = useRef(null);
  
  // Create a separate ref for the container
  const containerRef = useRef(null);
  
  // Use resize observer to get the container height
  const { height = 500 } = useResizeObserver({
    ref: containerRef
  });

  // Effect for component mount/unmount lifecycle
  useEffect(() => {
    isMounted.current = true;
    
    return () => {
      isMounted.current = false;
      // Clear any pending timeouts
      if (messageUpdateTimeoutRef.current) {
        clearTimeout(messageUpdateTimeoutRef.current);
        messageUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  // Filter predefined messages based on selected type and filter
  useEffect(() => {
    // Skip if not in predefined mode
    if (viewMode !== 'Predefined' || !isMounted.current) return;
    
    const filtered = PREDEFINED_MESSAGES.filter(msg => {
      if (messageType !== 'All Types' && msg.type !== messageType) return false;
      if (filter) {
        const text = JSON.stringify(msg).toLowerCase();
        return text.includes(filter.toLowerCase());
      }
      return true;
    });
    
    dispatch({ type: ACTION_TYPES.SET_PREDEFINED_FILTERED, payload: filtered });
  }, [viewMode, filter, messageType]);

  // Batch update function for WebSocket messages
  const batchMessagesUpdate = useCallback(() => {
    if (!isMounted.current) return;
    
    // Process all buffered messages
    const buffer = messageBufferRef.current;
    messageBufferRef.current = {};
    
    // Process each message in the buffer
    Object.values(buffer).forEach(message => {
      dispatch({ type: ACTION_TYPES.ADD_LIVE_MESSAGE, payload: message });
    });
    
    // Clear the timeout reference
    messageUpdateTimeoutRef.current = null;
  }, []);

  // Subscribe to the selected message type
  useEffect(() => {
    if (viewMode !== 'Live' || !isMounted.current) return;
    
    // Clear any existing subscriptions and buffers
    if (messageUpdateTimeoutRef.current) {
      clearTimeout(messageUpdateTimeoutRef.current);
      messageUpdateTimeoutRef.current = null;
    }
    messageBufferRef.current = {};

    let unsubscribe;

    // Message handler with buffering mechanism
    const messageHandler = (message) => {
      if (!isMounted.current) return;
      
      // Store message in buffer
      messageBufferRef.current[message.type] = message;
      
      // Schedule a batch update if not already scheduled
      if (!messageUpdateTimeoutRef.current) {
        messageUpdateTimeoutRef.current = setTimeout(batchMessagesUpdate, 200); // 200ms debounce
      }
    };

    if (messageType === 'All Types') {
      // Subscribe to all message types with a wildcard
      unsubscribe = wsService.subscribe('*', messageHandler);
    } else {
      // Subscribe to the specific message type
      unsubscribe = wsService.subscribe(messageType, messageHandler);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      
      // Clear timeout on cleanup
      if (messageUpdateTimeoutRef.current) {
        clearTimeout(messageUpdateTimeoutRef.current);
        messageUpdateTimeoutRef.current = null;
      }
    };
  }, [viewMode, messageType, batchMessagesUpdate]);

  // Memoized handlers for UI interactions
  const handleViewModeChange = useCallback((event) => {
    if (isMounted.current) {
      dispatch({ type: ACTION_TYPES.SET_VIEW_MODE, payload: event.target.value });
    }
  }, []);

  const handleTypeChange = useCallback((event) => {
    if (isMounted.current) {
      dispatch({ type: ACTION_TYPES.SET_MESSAGE_TYPE, payload: event.target.value });
    }
  }, []);

  const handleFilterChange = useCallback((event) => {
    if (isMounted.current) {
      dispatch({ type: ACTION_TYPES.SET_FILTER, payload: event.target.value });
    }
  }, []);

  const handleClearFilter = useCallback(() => {
    if (isMounted.current) {
      dispatch({ type: ACTION_TYPES.CLEAR_FILTER });
    }
  }, []);

  // Compute which message to display in Live mode - memoized for performance
  const displayLiveMessage = useCallback(() => {
    if (viewMode !== 'Live') return null;
    
    if (messageType === 'All Types') {
      // Find the most recent message among all types
      const messagesArray = Object.values(liveMessagesByType);
      if (messagesArray.length > 0) {
        return messagesArray.reduce((prev, curr) =>
          (prev.time || 0) > (curr.time || 0) ? prev : curr
        );
      }
    } else {
      return liveMessagesByType[messageType];
    }
    
    return null;
  }, [viewMode, messageType, liveMessagesByType]);

  // Compute the live message once per render
  const currentLiveMessage = displayLiveMessage();

  // Calculate actual list height (subtract padding and other elements from container height)
  const listHeight = Math.max(300, height - 20); // Minimum height of 300px

  // Render the appropriate content based on view mode
  const renderContent = useCallback(() => {
    if (viewMode === 'Live') {
      if (currentLiveMessage) {
        return <MessageDisplay message={currentLiveMessage} />;
      }
      return (
        <Typography variant="body1" color="text.secondary" align="center">
          No live message received for the selected type yet.
        </Typography>
      );
    } else {
      if (predefinedFiltered.length === 0) {
        return (
          <Typography variant="body1" color="text.secondary" align="center">
            No predefined messages match your filters.
          </Typography>
        );
      }
      
      // Use direct rendering for small lists, virtualized for larger ones
      if (predefinedFiltered.length <= 5) {
        return (
          <Box sx={{ width: '100%' }}>
            {predefinedFiltered.map((message, index) => (
              <MessageDisplay key={`${message.type}-${index}`} message={message} />
            ))}
          </Box>
        );
      }
      
      return (
        <List
          height={listHeight}
          itemCount={predefinedFiltered.length}
          itemSize={180} // Adjusted item size for better display
          width="100%"
          itemData={predefinedFiltered}
        >
          {({ index, style, data }) => (
            <div style={{ ...style, paddingRight: '16px' }}>
              <MessageDisplay message={data[index]} />
            </div>
          )}
        </List>
      );
    }
  }, [viewMode, currentLiveMessage, predefinedFiltered, listHeight]);

  // Status message based on current state
  const statusMessage = useCallback(() => {
    if (viewMode === 'Live') {
      return currentLiveMessage
        ? `Displaying latest live message for type "${messageType}".`
        : "No live message received yet.";
    }
    return `Displaying ${predefinedFiltered.length} predefined message(s).`;
  }, [viewMode, currentLiveMessage, messageType, predefinedFiltered.length]);

  return (
    <Paper 
      sx={{ 
        p: 2, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        minHeight: '600px' // Ensure minimum height
      }} 
      elevation={0}
    >
      <Typography variant="h6" component="h1" gutterBottom>
        Debug Page
      </Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="view-mode-label">View Mode</InputLabel>
            <Select
              labelId="view-mode-label"
              value={viewMode}
              label="View Mode"
              onChange={handleViewModeChange}
            >
              {VIEW_MODES.map(mode => (
                <MenuItem key={mode} value={mode}>
                  {mode}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} sm={4}>
          <FormControl fullWidth size="small">
            <InputLabel id="message-type-label">Message Type</InputLabel>
            <Select
              labelId="message-type-label"
              value={messageType}
              label="Message Type"
              onChange={handleTypeChange}
            >
              {LIVE_MESSAGE_TYPES.map(type => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        {viewMode === 'Predefined' && (
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              placeholder="Filter messages..."
              value={filter}
              onChange={handleFilterChange}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: filter && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearFilter}>
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
        )}
      </Grid>
      <Divider sx={{ mb: 2 }} />
      
      {/* Main content area with explicit height */}
      <Box 
        ref={containerRef}
        sx={{ 
          flexGrow: 1, 
          overflow: 'auto', 
          mb: 2,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '400px' // Ensure minimum height for the content area
        }}
      >
        {renderContent()}
      </Box>
      
      <Typography variant="body2" color="text.secondary">
        {statusMessage()}
      </Typography>
    </Paper>
  );
};

export default memo(WebSocketDataDisplay);