import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { wsService } from '../../services/websocket';
import {
  Box,
  Typography,
  TextField,
  Pagination,
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

// Message types for filtering
const MESSAGE_TYPES = [
  'All Types',
  'tcu',
  'pack_current',
  'pack_voltage',
  'cell',
  'bamo_car_re_transmit',
  'ins_gps'
];

// Memoized message item component for virtualized list
const MessageItem = memo(({ data, index, style }) => {
  const message = data[index];
  
  return (
    <Box style={style}>
      <Paper
        elevation={1}
        sx={{
          p: 1.5,
          mb: 1,
          backgroundColor: 'background.paper',
          borderLeft: '3px solid',
          borderLeftColor: 'primary.main',
          width: 'calc(100% - 16px)',
          mx: 'auto',
          '&:hover': {
            backgroundColor: 'background.paper',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }
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
          <Typography variant="caption" color="text.secondary">
            {new Date(message.time).toLocaleTimeString()}
          </Typography>
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
          {JSON.stringify(message.payload?.fields || message.payload, null, 2)}
        </Box>
      </Paper>
    </Box>
  );
});

const WebSocketDataDisplay = () => {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState('');
  const [messageType, setMessageType] = useState('All Types');
  const [page, setPage] = useState(1);
  const itemsPerPage = 10;
  const { ref, height = 400 } = useResizeObserver();
  
  // Use a ref to track the last processed message timestamp
  const lastMessageTimeRef = useRef(0);
  
  // Subscribe to WebSocket for data
  useEffect(() => {
    const messageHandler = (message) => {
      // Prevent duplicate message processing
      if (message.time <= lastMessageTimeRef.current) return;
      
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const isDuplicate = prev.some(m => 
          m.time === message.time && 
          JSON.stringify(m.payload) === JSON.stringify(message.payload)
        );
        
        if (isDuplicate) return prev;
        
        // Update last processed message timestamp
        lastMessageTimeRef.current = message.time;
        
        // Add new message to the top of the list
        const newMessages = [message, ...prev];
        
        // Keep memory usage in check - limit to 1000 messages
        return newMessages.length > 1000 
          ? newMessages.slice(0, 1000) 
          : newMessages;
      });
    };
    
    // Subscribe to all messages
    const unsubscribe = wsService.subscribe('bamo_car_re_transmit', messageHandler);
    
    return () => unsubscribe();
  }, []);
  
  // Memoized filter function to reduce unnecessary re-renders
  const filteredMessages = useMemo(() => {
    return messages.filter(msg => {
      // First filter by type if selected
      if (messageType !== 'All Types' && msg.type !== messageType) {
        return false;
      }
      
      // Then filter by text search if provided
      if (filter) {
        const messageText = JSON.stringify(msg).toLowerCase();
        return messageText.includes(filter.toLowerCase());
      }
      
      return true;
    });
  }, [messages, filter, messageType]);
  
  // Memoized page calculations to prevent unnecessary re-renders
  const pageData = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredMessages.length / itemsPerPage));
    const startIndex = (page - 1) * itemsPerPage;
    const currentPageMessages = filteredMessages.slice(startIndex, startIndex + itemsPerPage);
    
    return { totalPages, currentPageMessages };
  }, [filteredMessages, page, itemsPerPage]);
  
  // Callback handlers with useCallback to prevent unnecessary re-renders
  const handleClearFilter = useCallback(() => {
    setFilter('');
    setPage(1);
  }, []);
  
  const handlePageChange = useCallback((event, value) => {
    setPage(value);
  }, []);
  
  const handleTypeChange = useCallback((event) => {
    setMessageType(event.target.value);
    setPage(1);
  }, []);
  
  return (
    <Paper 
      sx={{ 
        p: 2, 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column'
      }} 
      elevation={0}
    >
      <Typography variant="h6" component="h1" gutterBottom>
        WebSocket Data Monitor
      </Typography>
      
      <Typography variant="body2" color="text.secondary" paragraph>
        Monitor and inspect WebSocket messages in real-time. Use filters to find specific data.
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={7}>
            <TextField
              fullWidth
              placeholder="Filter messages..."
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setPage(1);
              }}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
                endAdornment: filter && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={handleClearFilter}
                      edge="end"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
          </Grid>
          <Grid item xs={12} sm={5}>
            <FormControl fullWidth size="small">
              <InputLabel id="message-type-label">Message Type</InputLabel>
              <Select
                labelId="message-type-label"
                value={messageType}
                onChange={handleTypeChange}
                label="Message Type"
              >
                {MESSAGE_TYPES.map(type => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      <Box 
        ref={ref} 
        sx={{ flexGrow: 1, overflow: 'hidden', mb: 2 }}
      >
        {pageData.currentPageMessages.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: 'text.secondary' 
          }}>
            <Typography variant="body1">
              {messages.length === 0 
                ? "Waiting for WebSocket messages..." 
                : "No messages match your filters"}
            </Typography>
          </Box>
        ) : (
          <List
            height={height - 50}
            itemCount={pageData.currentPageMessages.length}
            itemSize={200}
            width="100%"
            itemData={pageData.currentPageMessages}
          >
            {MessageItem}
          </List>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Showing {pageData.currentPageMessages.length} of {filteredMessages.length} messages
        </Typography>
        <Pagination 
          count={pageData.totalPages} 
          page={page} 
          onChange={handlePageChange} 
          size="small"
          color="primary"
        />
      </Box>
    </Paper>
  );
};

export default memo(WebSocketDataDisplay);