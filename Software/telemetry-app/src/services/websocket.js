import { loadTelemetryProto, decodeTelemetryMessage } from '../utils/protobuf';

// Default configuration values
const DEFAULT_CONFIG = {
  RECONNECT_INTERVAL: 5000,
  MAX_QUEUE_SIZE: 125,
  MAX_RETRIES: 5,
  RETRY_DELAY: 2000,
  MAX_BATCH_SIZE: 10,  // Reduced for real-time dashboard
  INACTIVE_THRESHOLD: 30000,
  THROTTLE_TIME_NORMAL: 8,  // ~120fps for smooth dashboard
  THROTTLE_TIME_LOW_POWER: 33, // 20fps for low-power devices
  PING_INTERVAL: 25000,
  HEALTH_CHECK_INTERVAL: 30000,
  LOW_POWER_HEALTH_CHECK_INTERVAL: 60000,
  ERROR_THRESHOLD: 5,
  ENABLE_COMPRESSION: false, // Disabled by default, enable if needed
};

// Connection state enum
const CONNECTION_STATES = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  ERROR: 'ERROR'
};

/**
 * Enhanced WebSocketService with performance optimizations and resilience
 * - Message batching with configurable size limits
 * - Queue size limiting
 * - Efficient reconnection with exponential backoff
 * - Memory-efficient message handling
 * - Throttled message delivery
 * - Connection state machine
 * - Security enhancements
 */
export class WebSocketService {
  constructor(url, options = {}) {
    this.url = url;
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.socket = null;
    this.reconnectInterval = this.options.RECONNECT_INTERVAL;
    this.subscribers = new Map();
    this.protoRoot = null;
    this.messageQueue = [];
    this.isConnecting = false;
    this.connectionAttempts = 0;
    this.lastMessageTime = 0;
    this.pendingMessages = new Map(); // For message batching
    this.batchProcessTimeout = null;
    this.lastProcessTime = 0;
    this.isProtoLoaded = false;
    this.onConnectionChangeCallbacks = new Set();
    this.connectionState = CONNECTION_STATES.DISCONNECTED;
    this.errorStats = {};
    
    // Detect device capabilities
    this.detectDeviceCapabilities();
    
    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Detect device capabilities for better performance adjustments
   */
  detectDeviceCapabilities() {
    // Get memory and CPU information if available
    const memory = navigator.deviceMemory || 4; // Default to 4GB if not available
    const cores = navigator.hardwareConcurrency || 2;
    
    // Check for Raspberry Pi or other low-power devices
    this.lowPowerDevice = memory <= 2 || cores <= 2 || 
                        /Raspberry Pi/i.test(navigator.userAgent) || 
                        /Linux arm/i.test(navigator.userAgent) ||
                        localStorage.getItem('forceRaspberryPiMode');
    
    // Adjust settings based on device capabilities
    this.throttleTime = this.lowPowerDevice 
      ? this.options.THROTTLE_TIME_LOW_POWER 
      : this.options.THROTTLE_TIME_NORMAL;
    
    this.maxBatchSize = this.lowPowerDevice 
      ? Math.floor(this.options.MAX_BATCH_SIZE / 2) 
      : this.options.MAX_BATCH_SIZE;
    
    if (this.lowPowerDevice) {
      console.log('WebSocket: Optimizing for low-power device');
      console.log(`WebSocket: Using throttle time ${this.throttleTime}ms and batch size ${this.maxBatchSize}`);
    }
  }

  /**
   * Start interval to clean up stale subscriptions
   */
  startCleanupInterval() {
    // Clean up every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanupSubscriptions(), 300000);
  }

  /**
   * Clean up stale subscriptions to prevent memory leaks
   */
  cleanupSubscriptions() {
    let removedCount = 0;
    
    this.subscribers.forEach((handlers, type) => {
      // Filter out undefined or null handlers that might have been
      // created by garbage-collected components
      const validHandlers = handlers.filter(h => typeof h === 'function');
      
      removedCount += handlers.length - validHandlers.length;
      
      if (validHandlers.length === 0) {
        this.subscribers.delete(type);
      } else {
        this.subscribers.set(type, validHandlers);
      }
    });
    
    if (removedCount > 0) {
      console.log(`Cleaned up ${removedCount} stale subscriptions`);
    }
  }

  /**
   * Track errors with categorization
   */
  trackError(category, error) {
    if (!this.errorStats[category]) {
      this.errorStats[category] = { count: 0, lastError: null, firstSeen: Date.now() };
    }
    
    this.errorStats[category].count++;
    this.errorStats[category].lastError = error;
    this.errorStats[category].lastSeen = Date.now();
    
    // Log error with category
    console.error(`WebSocket error (${category}):`, error);
    
    // Report errors if they exceed thresholds
    if (this.errorStats[category].count >= this.options.ERROR_THRESHOLD) {
      this.reportErrors(category);
    }
  }

  /**
   * Report accumulated errors
   */
  reportErrors(category) {
    const stats = category ? { [category]: this.errorStats[category] } : this.errorStats;
    console.warn('WebSocket error report:', stats);
    
    // Could send to monitoring service
    // if (typeof window.errorReporter === 'function') {
    //   window.errorReporter('websocket', stats);
    // }
  }

  /**
   * Set connection state and trigger notifications
   */
  setConnectionState(newState) {
    const prevState = this.connectionState;
    this.connectionState = newState;
    
    if (prevState !== newState) {
      console.log(`WebSocket state changed: ${prevState} -> ${newState}`);
      this.notifyConnectionChange(newState === CONNECTION_STATES.CONNECTED);
      
      // Handle state transitions
      if (newState === CONNECTION_STATES.DISCONNECTED && 
          prevState === CONNECTION_STATES.CONNECTED) {
        // Just disconnected - attempt reconnect
        this.handleDisconnection();
      }
    }
  }

  /**
   * Handle disconnection event
   */
  handleDisconnection() {
    // Set up reconnection with backoff
    const backoff = Math.min(
      30000, 
      this.reconnectInterval * Math.pow(1.5, this.connectionAttempts)
    );
    
    console.log(`Will attempt reconnect in ${Math.round(backoff / 1000)} seconds`);
    
    setTimeout(() => {
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.setConnectionState(CONNECTION_STATES.RECONNECTING);
        this.connect();
      }
    }, backoff);
  }

  /**
   * Compress message data if supported and enabled
   */
  async compressMessage(data) {
    if (!this.options.ENABLE_COMPRESSION || !window.CompressionStream) {
      return data; // Return original data if compression not available
    }
    
    try {
      const blob = new Blob([data]);
      const stream = blob.stream();
      const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
      return new Uint8Array(await new Response(compressedStream).arrayBuffer());
    } catch (error) {
      this.trackError('compression', error);
      return data; // Return original data if compression fails
    }
  }

  /**
   * Decompress message data if needed
   */
  async decompressMessage(data, isCompressed) {
    if (!isCompressed || !window.DecompressionStream) {
      return data;
    }
    
    try {
      const blob = new Blob([data]);
      const stream = blob.stream();
      const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
      return new Uint8Array(await new Response(decompressedStream).arrayBuffer());
    } catch (error) {
      this.trackError('decompression', error);
      return data;
    }
  }

  /**
   * Register a callback for connection state changes
   */
  onConnectionChange(callback) {
    this.onConnectionChangeCallbacks.add(callback);
    // Call immediately with current status to initialize
    try {
      callback(this.connectionState === CONNECTION_STATES.CONNECTED);
    } catch (error) {
      this.trackError('callback_init', error);
    }
    return () => this.onConnectionChangeCallbacks.delete(callback);
  }

  /**
   * Notify all connection change listeners
   */
  notifyConnectionChange(isConnected) {
    this.onConnectionChangeCallbacks.forEach(callback => {
      try {
        callback(isConnected);
      } catch (error) {
        this.trackError('connection_callback', error);
      }
    });
  }

  /**
   * Load protocol buffers with retry logic
   */
  async loadProto(retries = this.options.MAX_RETRIES) {
    try {
      console.log("Attempting to load protocol buffers...");
      this.protoRoot = await loadTelemetryProto();
      console.log("Protocol buffers loaded successfully");
      this.isProtoLoaded = true;
      return true;
    } catch (error) {
      this.trackError('proto_load', error);
      if (retries > 0) {
        console.log(`Retrying protocol buffer load... (${retries} attempts left)`);
        await new Promise((resolve) => setTimeout(resolve, this.options.RETRY_DELAY));
        return this.loadProto(retries - 1);
      }
      console.error("Failed to load proto after multiple attempts");
      return false;
    }
  }

  /**
   * Initialize WebSocket connection
   */
  async initialize() {
    if (this.isConnecting) return;
    
    this.isConnecting = true;
    this.setConnectionState(CONNECTION_STATES.CONNECTING);
    
    try {
      // Load proto first
      const success = await this.loadProto();
      if (success) {
        this.connect();
        
        // Process any queued messages
        if (this.messageQueue.length > 0) {
          console.log(`Processing ${this.messageQueue.length} queued messages`);
          this.processQueue();
        }
      } else {
        console.error("Protocol buffer loading failed - attempting to continue anyway");
        // Try to connect even if proto loading failed
        this.connect();
      }
    } catch (error) {
      this.trackError('initialization', error);
      this.setConnectionState(CONNECTION_STATES.ERROR);
      setTimeout(() => {
        this.isConnecting = false;
        this.initialize();
      }, 5000);
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Process the message queue
   */
  processQueue() {
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > this.options.MAX_QUEUE_SIZE) {
      this.messageQueue = this.messageQueue.slice(-this.options.MAX_QUEUE_SIZE);
    }

    // Process messages in batches for better performance
    const batchSize = Math.min(this.messageQueue.length, this.maxBatchSize);
    const batch = this.messageQueue.splice(0, batchSize);
    
    if (batch.length > 0) {
      console.log(`Processing batch of ${batch.length} messages`);
    }
    
    for (const { buffer, rawMessage } of batch) {
      try {
        if (buffer && this.protoRoot) {
          // Try to decode with protobuf
          const message = decodeTelemetryMessage(this.protoRoot, buffer);
          this.scheduleMessageDelivery(message);
        } else if (rawMessage) {
          // Use raw message if protobuf not available
          this.scheduleMessageDelivery(rawMessage);
        }
      } catch (error) {
        this.trackError('queue_processing', error);
      }
    }
    
    // Continue processing if there are more messages
    if (this.messageQueue.length > 0) {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => this.processQueue());
    }
  }

  /**
   * Schedule message delivery with batching and throttling
   */
  scheduleMessageDelivery(message) {
    if (!message || !message.type) {
      this.trackError('invalid_message', new Error('Invalid message format'));
      return;
    }
    
    const { type } = message;
    
    // Debug logging for subscribers
    if (!this.subscribers.has(type)) {
      // Only log once per type to avoid console spam
      if (!this._loggedMissingSubscribers?.has(type)) {
        if (!this._loggedMissingSubscribers) this._loggedMissingSubscribers = new Set();
        this._loggedMissingSubscribers.add(type);
      }
      return;
    }
    
    // Sanitize message object - ensure payload and fields exist to prevent errors
    const sanitizedMessage = this.sanitizeMessage(message);
    
    // Add message to pending batch
    if (!this.pendingMessages.has(type)) {
      this.pendingMessages.set(type, []);
    }
    
    const messages = this.pendingMessages.get(type);
    messages.push(sanitizedMessage);
    
    // Limit batch size to prevent memory issues
    if (messages.length > this.maxBatchSize) {
      // Remove oldest messages and keep newest ones
      const toKeep = messages.slice(-this.maxBatchSize);
      this.pendingMessages.set(type, toKeep);
    }
    
    // Clear any existing batch processing timeout
    if (this.batchProcessTimeout) {
      clearTimeout(this.batchProcessTimeout);
    }
    
    // Throttle updates based on device capabilities
    const now = performance.now();
    const timeSinceLastProcess = now - this.lastProcessTime;
    const delay = Math.max(0, this.throttleTime - timeSinceLastProcess);
    
    // Process batched messages with throttling
    this.batchProcessTimeout = setTimeout(() => {
      this.deliverPendingMessages();
      this.lastProcessTime = performance.now();
    }, delay);
  }
  
  /**
   * Sanitize message to ensure required fields exist
   * This prevents errors in subscribers when accessing undefined properties
   */
  sanitizeMessage(message) {
    if (!message) return { type: 'unknown', payload: {}, time: Date.now() };
    
    // Create a shallow copy to avoid modifying the original
    const sanitized = { ...message };
    
    // Ensure payload exists
    if (!sanitized.payload) {
      sanitized.payload = {};
    }
    
    // Ensure fields exists within payload
    if (!sanitized.payload.fields) {
      sanitized.payload.fields = {};
    }
    
    // Ensure time exists
    if (!sanitized.time) {
      sanitized.time = Date.now();
    }
    
    return sanitized;
  }
  
  /**
   * Deliver all pending messages to their subscribers
   */
  deliverPendingMessages() {
    this.pendingMessages.forEach((messages, type) => {
      const handlers = this.subscribers.get(type) || [];
      
      if (handlers.length > 0) {
        handlers.forEach(handler => {
          try {
            // For single message, send it directly, otherwise send the batch
            const batch = messages.length === 1 ? messages[0] : [...messages];
            
            // Use requestAnimationFrame to align with browser rendering
            requestAnimationFrame(() => {
              try {
                handler(batch);
              } catch (err) {
                // Truncate error message for console readability
                const errMsg = err.toString().substring(0, 100);
                this.trackError('message_handler', new Error(`Handler error for type ${type}: ${errMsg}`));
              }
            });
          } catch (err) {
            this.trackError('message_prep', err);
          }
        });
      }
    });
    
    // Clear pending messages
    this.pendingMessages.clear();
    this.batchProcessTimeout = null;
  }

  /**
   * Connect to WebSocket with exponential backoff
   */
  connect() {
    if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || 
                         this.socket.readyState === WebSocket.OPEN)) {
      return;
    }
    
    this.connectionAttempts++;
    
    try {
      console.log(`Connecting to WebSocket at ${this.url} (attempt ${this.connectionAttempts})`);
      this.socket = new WebSocket(this.url);
      this.socket.binaryType = 'arraybuffer';

      this.socket.onopen = () => {
        console.log("WebSocket connected successfully");
        this.reconnectInterval = this.options.RECONNECT_INTERVAL;
        this.connectionAttempts = 0;
        this.lastMessageTime = Date.now();
        this.setConnectionState(CONNECTION_STATES.CONNECTED);
        
        // Reset error stats on successful connection
        this.errorStats = {};
      };

      this.socket.onmessage = async (event) => {
        this.lastMessageTime = Date.now();
        
        // Try to parse as JSON first in case it's not binary
        if (typeof event.data === 'string') {
          try {
            const jsonMessage = JSON.parse(event.data);
            this.scheduleMessageDelivery(jsonMessage);
            return;
          } catch (e) {
            // Not JSON, continue with binary processing
          }
        }
        
        if (!this.protoRoot || !this.isProtoLoaded) {
          // Queue the message if proto isn't loaded yet
          if (this.messageQueue.length < this.options.MAX_QUEUE_SIZE) {
            // Try to parse as JSON first
            try {
              const text = new TextDecoder().decode(event.data);
              const jsonMessage = JSON.parse(text);
              this.messageQueue.push({ rawMessage: jsonMessage });
            } catch (e) {
              // Not valid JSON, store as binary
              this.messageQueue.push({ buffer: new Uint8Array(event.data) });
            }
          }
          return;
        }
        
        try {
          const buffer = new Uint8Array(event.data);
          
          // Check if message is compressed (could add a header to indicate this)
          const isCompressed = false; // Implement logic to detect compression
          const decompressedBuffer = isCompressed ? 
            await this.decompressMessage(buffer, true) : buffer;
          
          const message = decodeTelemetryMessage(this.protoRoot, decompressedBuffer);
          this.scheduleMessageDelivery(message);
        } catch (error) {
          this.trackError('message_decode', error);
          // Try to parse as JSON as fallback
          try {
            const text = new TextDecoder().decode(event.data);
            const jsonMessage = JSON.parse(text);
            this.scheduleMessageDelivery(jsonMessage);
          } catch (e) {
            this.trackError('json_fallback', e);
          }
        }
      };

      this.socket.onerror = (error) => {
        this.trackError('socket_error', error);
        this.setConnectionState(CONNECTION_STATES.ERROR);
      };

      this.socket.onclose = (event) => {
        console.log(`WebSocket closed (code: ${event.code}, reason: ${event.reason})`);
        this.setConnectionState(CONNECTION_STATES.DISCONNECTED);
      };
    } catch (error) {
      this.trackError('socket_creation', error);
      this.setConnectionState(CONNECTION_STATES.ERROR);
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  /**
   * Subscribe to a message type
   */
  subscribe(messageType, callback) {
    if (!messageType) {
      console.warn("Attempted to subscribe to undefined message type");
      return () => {}; // Return empty unsubscribe function
    }
    
    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, []);
      console.log(`New subscription created for message type: ${messageType}`);
    }
    
    const handlers = this.subscribers.get(messageType);
    if (!handlers.includes(callback)) {
      handlers.push(callback);
      console.log(`Added subscriber to ${messageType} (total: ${handlers.length})`);
    }
    
    return () => this.unsubscribe(messageType, callback);
  }

  /**
   * Unsubscribe from a message type
   */
  unsubscribe(messageType, callback) {
    if (!messageType || !this.subscribers.has(messageType)) return;
    
    const handlers = this.subscribers.get(messageType);
    const index = handlers.indexOf(callback);
    
    if (index !== -1) {
      handlers.splice(index, 1);
      console.log(`Removed subscriber from ${messageType} (remaining: ${handlers.length})`);
    }
    
    if (handlers.length === 0) {
      this.subscribers.delete(messageType);
      console.log(`No more subscribers for ${messageType}, removed subscription`);
    }
  }
  
  /**
   * Get connection status
   */
  isConnected() {
    return this.connectionState === CONNECTION_STATES.CONNECTED;
  }
  
  /**
   * Check connection health and reconnect if needed
   */
  checkConnection() {
    const now = Date.now();
    const inactiveTime = now - this.lastMessageTime;
    
    // If no messages for over INACTIVE_THRESHOLD ms and we're supposed to be connected, reconnect
    if (this.lastMessageTime > 0 && 
        inactiveTime > this.options.INACTIVE_THRESHOLD && 
        this.connectionState === CONNECTION_STATES.CONNECTED) {
      console.log(`No messages received for ${inactiveTime}ms, reconnecting`);
      this.socket.close();
      this.connect();
    }
  }
  
  /**
   * Send a ping to keep the connection alive
   */
  sendPing() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
      } catch (error) {
        this.trackError('ping', error);
      }
    }
  }
  
  /**
   * Destroy the WebSocket service
   */
  destroy() {
    if (this.socket) {
      this.socket.close();
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.subscribers.clear();
    this.onConnectionChangeCallbacks.clear();
    this.pendingMessages.clear();
    this.messageQueue = [];
    
    console.log("WebSocket service destroyed");
  }
}

// Create WebSocket service instance with secure connection if appropriate
const hostname = window.location.hostname === 'localhost' ? '0.0.0.0' : window.location.hostname;
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
export const wsService = new WebSocketService(`${protocol}//${hostname}:50004/ws`, {
  MAX_BATCH_SIZE: 10, // Small batch size for real-time dashboard
  THROTTLE_TIME_NORMAL: 8, // ~120fps for smooth updates
  THROTTLE_TIME_LOW_POWER: 33 // 20fps for low-power devices
});

// Initialize connection
console.log("Initializing WebSocket service");
wsService.initialize();

// Setup health check interval based on device capabilities
const healthCheckInterval = wsService.lowPowerDevice ? 
  wsService.options.LOW_POWER_HEALTH_CHECK_INTERVAL : 
  wsService.options.HEALTH_CHECK_INTERVAL;

// Health check interval
const healthCheckTimer = setInterval(() => wsService.checkConnection(), healthCheckInterval);

// Send periodic pings to keep the connection alive
const pingTimer = setInterval(() => wsService.sendPing(), wsService.options.PING_INTERVAL);

// Add proper cleanup for SPA navigation
window.addEventListener('beforeunload', () => {
  clearInterval(healthCheckTimer);
  clearInterval(pingTimer);
  wsService.destroy();
});

export default wsService;