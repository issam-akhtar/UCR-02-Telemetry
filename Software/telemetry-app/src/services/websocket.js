import { loadTelemetryProto, decodeTelemetryMessage } from '../utils/protobuf';

// Constants for better performance
const RECONNECT_INTERVAL = 3000;
const MAX_QUEUE_SIZE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const MAX_BATCH_SIZE = 50; // Maximum size of batches to prevent memory issues
const INACTIVE_THRESHOLD = 30000; // 30 seconds without messages

/**
 * Enhanced WebSocketService with performance optimizations for Raspberry Pi
 * - Message batching with size limits
 * - Queue size limiting
 * - More efficient reconnection with exponential backoff
 * - Memory-efficient message handling
 * - Throttled message delivery
 */
export class WebSocketService {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.reconnectInterval = RECONNECT_INTERVAL;
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
    
    // Detect Raspberry Pi mode
    this.isRaspberryPi = /Raspberry Pi/i.test(navigator.userAgent) || 
                         /Linux arm/i.test(navigator.userAgent) ||
                         localStorage.getItem('forceRaspberryPiMode');
    
    // Adjust settings for Raspberry Pi
    if (this.isRaspberryPi) {
      console.log('WebSocket: Optimizing for Raspberry Pi');
    }
  }

  /**
   * Register a callback for connection state changes
   */
  onConnectionChange(callback) {
    this.onConnectionChangeCallbacks.add(callback);
    // Call immediately with current status to initialize
    try {
      callback(this.isConnected());
    } catch (error) {
      console.error("Error in connection callback initialization:", error);
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
        console.error("Error in connection change callback:", error);
      }
    });
  }

  /**
   * Load protocol buffers with retry logic
   */
  async loadProto(retries = MAX_RETRIES) {
    try {
      console.log("Attempting to load protocol buffers...");
      this.protoRoot = await loadTelemetryProto();
      console.log("Protocol buffers loaded successfully");
      this.isProtoLoaded = true;
      return true;
    } catch (error) {
      console.error("Failed to load protocol buffers:", error);
      if (retries > 0) {
        console.log(`Retrying protocol buffer load... (${retries} attempts left)`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
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
      console.error("WebSocket initialization failed:", error);
      setTimeout(() => {
        this.isConnecting = false;
        this.initialize();
      }, 5000);
    } finally {
      this.isConnecting = false;
    }
  }

  /**
   * Process queued messages
   */
  processQueue() {
    // Limit queue size to prevent memory issues
    if (this.messageQueue.length > MAX_QUEUE_SIZE) {
      this.messageQueue = this.messageQueue.slice(-MAX_QUEUE_SIZE);
    }

    // Process messages in batches for better performance
    const batchSize = Math.min(this.messageQueue.length, this.isRaspberryPi ? 10 : 20);
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
        console.error("Error processing queued message:", error);
      }
    }
    
    // Continue processing if there are more messages
    if (this.messageQueue.length > 0) {
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => this.processQueue());
    }
  }

  /**
   * Schedule message delivery with batching and throttling for better performance
   */
  scheduleMessageDelivery(message) {
    
    
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
    if (messages.length > MAX_BATCH_SIZE) {
      messages.splice(0, messages.length - MAX_BATCH_SIZE);
    }
    
    // Clear any existing batch processing timeout
    if (this.batchProcessTimeout) {
      clearTimeout(this.batchProcessTimeout);
    }
    
    // Throttle updates based on device capabilities
    const now = performance.now();
    const timeSinceLastProcess = now - this.lastProcessTime;
    const throttleTime = this.isRaspberryPi ? 100 : 16; // ~60fps or ~10fps
    
    const delay = Math.max(0, throttleTime - timeSinceLastProcess);
    
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
              console.error(`Error in message handler for type ${type}:`, errMsg);
            }
          });
        } catch (err) {
          console.error(`Error preparing message batch for type ${type}:`, err);
        }
      });
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
        this.reconnectInterval = RECONNECT_INTERVAL;
        this.connectionAttempts = 0;
        this.lastMessageTime = Date.now();
        this.notifyConnectionChange(true);
      };

      this.socket.onmessage = (event) => {
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
          if (this.messageQueue.length < MAX_QUEUE_SIZE) {
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
          const message = decodeTelemetryMessage(this.protoRoot, buffer);
          
          // Occasionally log message types for debugging (reduce frequency on Pi)
          const logFrequency = this.isRaspberryPi ? 0.001 : 0.01; // 0.1% or 1%
          
          this.scheduleMessageDelivery(message);
        } catch (error) {
          console.error("Error decoding message:", error);
          // Try to parse as JSON as fallback
          try {
            const text = new TextDecoder().decode(event.data);
            const jsonMessage = JSON.parse(text);
            this.scheduleMessageDelivery(jsonMessage);
          } catch (e) {
            console.error("Failed to parse message as JSON:", e);
          }
        }
      };

      this.socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.notifyConnectionChange(false);
      };

      this.socket.onclose = (event) => {
        console.log(`WebSocket closed (code: ${event.code}, reason: ${event.reason})`);
        this.notifyConnectionChange(false);
        
        // Exponential backoff for reconnection attempts
        const backoff = Math.min(30000, this.reconnectInterval * Math.pow(1.5, this.connectionAttempts));
        console.log(`Will attempt reconnect in ${Math.round(backoff / 1000)} seconds`);
        
        setTimeout(() => {
          if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
            this.connect();
          }
        }, backoff);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      this.notifyConnectionChange(false);
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
    return this.socket && this.socket.readyState === WebSocket.OPEN;
  }
  
  /**
   * Check connection health and reconnect if needed
   */
  checkConnection() {
    const now = Date.now();
    const inactiveTime = now - this.lastMessageTime;
    
    // If no messages for over INACTIVE_THRESHOLD ms and we're supposed to be connected, reconnect
    if (this.lastMessageTime > 0 && 
        inactiveTime > INACTIVE_THRESHOLD && 
        this.socket && 
        this.socket.readyState === WebSocket.OPEN) {
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
        console.error("Error sending ping:", error);
      }
    }
  }
}

// Create WebSocket service instance connecting to port 9094
const hostname = window.location.hostname === 'localhost' ? 'localhost' : window.location.hostname;
export const wsService = new WebSocketService(`ws://${hostname}:9094/ws`);

// Initialize connection and set up periodic connection health checks
console.log("Initializing WebSocket service");
wsService.initialize();

// Check connection health less frequently on Raspberry Pi
const healthCheckInterval = (/Raspberry Pi/i.test(navigator.userAgent) || 
                            /Linux arm/i.test(navigator.userAgent) || 
                            localStorage.getItem('forceRaspberryPiMode')) ? 60000 : 30000;

setInterval(() => wsService.checkConnection(), healthCheckInterval);

// Send periodic pings to keep the connection alive
setInterval(() => wsService.sendPing(), 25000);

export default wsService;