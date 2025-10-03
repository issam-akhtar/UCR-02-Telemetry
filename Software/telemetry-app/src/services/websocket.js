// websocket.js
// Uses ports/IP from configs/config.yaml (with env + sane fallbacks)

import { loadTelemetryProto, decodeTelemetryMessage } from '../utils/protobuf';

// ---------- Runtime config loader (YAML → JS) ----------
const DEFAULTS = {
  host: (typeof window !== 'undefined' && window.location.hostname) || 'localhost',
  wsPort: 50004,   // live data WS for frontend
  apiPort: 50002,  // REST API
  wsPath: '/ws',  // WS route on your server
};

const ENV = (() => {
  // Vite-style env overrides (if present)
  const vite = (typeof import.meta !== 'undefined' && import.meta.env) || {};
  return {
    host: vite.VITE_HOST || null,
    wsPort: vite.VITE_WS_PORT ? Number(vite.VITE_WS_PORT) : null,
    apiPort: vite.VITE_API_PORT ? Number(vite.VITE_API_PORT) : null,
  };
})();

async function fetchText(path) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch {
    return null;
  }
}

async function parseYamlToJson(yamlText) {
  if (!yamlText) return null;
  try {
    const { default: yaml } = await import('js-yaml'); // expects js-yaml in deps
    return yaml.load(yamlText);
  } catch {
    // If js-yaml isn’t available, gracefully ignore and use defaults
    return null;
  }
}

/**
 * Load config.yaml if available. Supports:
 *  - /configs/config.yaml
 *  - /config.yaml
 * Returns { host, wsPort, apiPort, wsPath }
 */
async function loadRuntimeConfig() {
  const yamlText =
    (await fetchText('/configs/config.yaml')) ||
    (await fetchText('/config.yaml'));

  const cfg = await parseYamlToJson(yamlText);

  // Pull values from new unified structure with legacy fallbacks
  const hostFromYaml = cfg?.network?.host_ip || cfg?.websocket?.ip || 'localhost';
  const wsPortFromYaml =
    Number(cfg?.network?.ports?.live_data_ws) ||
    Number(cfg?.live_ws_port) ||
    Number(cfg?.websocket?.port) ||
    DEFAULTS.wsPort;

  const apiPortFromYaml =
    Number(cfg?.network?.ports?.rest_api) ||
    Number(cfg?.apiport) ||
    DEFAULTS.apiPort;

  // If YAML says "localhost"/"0.0.0.0"/"::", prefer current browser host for nicer DX
  const localish = new Set(['localhost', '0.0.0.0', '::', '127.0.0.1']);
  const resolvedHost = localish.has(String(hostFromYaml).toLowerCase())
    ? DEFAULTS.host
    : hostFromYaml;

  // Env overrides, then YAML, then defaults
  const host = ENV.host || resolvedHost || DEFAULTS.host;
  const wsPort = ENV.wsPort ?? wsPortFromYaml ?? DEFAULTS.wsPort;
  const apiPort = ENV.apiPort ?? apiPortFromYaml ?? DEFAULTS.apiPort;

  return { host, wsPort, apiPort, wsPath: DEFAULTS.wsPath };
}

// ---------- Simple configuration ----------
const CONFIG = {
  RECONNECT_INTERVAL: 3000,
  MAX_RETRIES: 3,
  PING_INTERVAL: 15000,
  PING_TIMEOUT: 5000
};

// Connection state constants
const ConnectionState = {
  DISCONNECTED: 'DISCONNECTED',
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  RECONNECTING: 'RECONNECTING',
  ERROR: 'ERROR'
};

/**
 * WebSocketService class for managing WebSocket connections.
 */
export class WebSocketService {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.reconnectInterval = CONFIG.RECONNECT_INTERVAL;
    this.subscribers = new Map();
    this.connectionState = ConnectionState.DISCONNECTED;
    this.onConnectionChangeCallbacks = new Set();
    this.onResumeCallbacks = new Set();
    this.reconnectTimerId = null;
    this.protoRoot = null;
    this.isProtoLoaded = false;
    this.connectionAttempts = 0;
    this.lastMessageTime = 0;
    this.pingTimerId = null;
    this._subscriptionsPaused = false;
    this._pingId = 0;
  }

  /**
   * Update the WS URL at runtime (used after loading YAML).
   * Will reconnect if the URL changed.
   */
  async updateUrl(newUrl) {
    if (!newUrl || newUrl === this.url) return;
    this.url = newUrl;
    try {
      // cleanly reconnect to new endpoint
      if (this.socket) {
        try { this.socket.close(); } catch {}
      }
      await this.connect();
    } catch {
      // will backoff via handleDisconnection
    }
  }

  /**
   * Set connection state and trigger notifications.
   * @param {string} newState
   */
  setConnectionState(newState) {
    if (!newState || !ConnectionState[newState]) return;

    const prevState = this.connectionState;
    if (prevState === newState) return;

    this.connectionState = newState;

    // Notify subscribers of connection state change
    this.notifyConnectionChange(newState === ConnectionState.CONNECTED);

    if (newState === ConnectionState.CONNECTED) {
      this.connectionAttempts = 0;
      this.startPingPongCycle();

      if (prevState === ConnectionState.RECONNECTING && !this._subscriptionsPaused) {
        this._notifyResumeListeners();
      }
    }

    if (newState === ConnectionState.DISCONNECTED && prevState === ConnectionState.CONNECTED) {
      this.handleDisconnection();
    }
  }

  /**
   * Register a callback for connection state changes.
   * @param {(isConnected: boolean) => void} callback
   * @returns {Function} unsubscribe function
   */
  onConnectionChange(callback) {
    if (typeof callback !== 'function') return () => {};

    this.onConnectionChangeCallbacks.add(callback);

    // Call immediately with current state
    const isConnected = this.socket?.readyState === WebSocket.OPEN ||
                        this.connectionState === ConnectionState.CONNECTED;

    queueMicrotask(() => {
      try {
        callback(Boolean(isConnected));
      } catch (error) {
        this.onConnectionChangeCallbacks.delete(callback);
      }
    });

    return () => this.onConnectionChangeCallbacks.delete(callback);
  }

  /**
   * Register a callback for resume events
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onResume(callback) {
    if (typeof callback !== 'function') return () => {};

    this.onResumeCallbacks.add(callback);
    return () => this.onResumeCallbacks.delete(callback);
  }

  /**
   * Notify resume listeners when WebSocket is resumed
   * @private
   */
  _notifyResumeListeners() {
    for (const callback of this.onResumeCallbacks) {
      try {
        callback();
      } catch (error) {
        this.onResumeCallbacks.delete(callback);
      }
    }
  }

  /**
   * Notify all registered connection change listeners.
   * @param {boolean} isConnected
   */
  notifyConnectionChange(isConnected) {
    const connectedState = Boolean(isConnected);

    for (const callback of this.onConnectionChangeCallbacks) {
      try {
        callback(connectedState);
      } catch (error) {
        this.onConnectionChangeCallbacks.delete(callback);
      }
    }
  }

  /**
   * Load protocol buffers.
   * @returns {Promise<boolean>}
   */
  async loadProto(retries = CONFIG.MAX_RETRIES) {
    if (this.isProtoLoaded && this.protoRoot) return true;

    try {
      this.protoRoot = await loadTelemetryProto();
      this.isProtoLoaded = Boolean(this.protoRoot);
      return this.isProtoLoaded;
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.loadProto(retries - 1);
      }
      return false;
    }
  }

  /**
   * Initialize the WebSocket connection.
   */
  async initialize() {
    this.setConnectionState(ConnectionState.CONNECTING);

    try {
      await this.loadProto();
      await this.connect();
      this.setupTimers();
    } catch (error) {
      this.setConnectionState(ConnectionState.ERROR);

      // Retry with backoff
      const retryDelay = Math.min(30000, 5000 * (this.connectionAttempts + 1));
      setTimeout(() => this.initialize(), retryDelay);
    }
  }

  /**
   * Setup ping timer
   */
  setupTimers() {
    if (this.pingTimerId) {
      clearInterval(this.pingTimerId);
    }

    if (!this._subscriptionsPaused) {
      this.pingTimerId = setInterval(() => this.sendPing(), CONFIG.PING_INTERVAL);
    }
  }

  /**
   * Handle JSON messages
   * @param {string} data
   * @returns {Object|null}
   */
  parseJSONMessage(data) {
    if (!data || typeof data !== 'string') return null;

    try {
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  }

  /**
   * Parse binary message using protobuf
   * @param {ArrayBuffer} data
   * @returns {Object|null}
   */
  parseBinaryMessage(data) {
    if (!this.protoRoot || !this.isProtoLoaded || !data) return null;

    try {
      const buffer = new Uint8Array(data);
      return decodeTelemetryMessage(this.protoRoot, buffer);
    } catch (error) {
      return null;
    }
  }

  /**
   * Normalize message format
   * @param {Object} message
   * @param {string|null} messageType
   * @returns {Object}
   */
  normalizeMessage(message, messageType) {
    if (!message) {
      return { type: messageType || 'unknown', payload: { fields: {} }, time: Date.now() };
    }

    const { type = messageType || 'unknown', time, timestamp, payload, ...rest } = message;

    const normalized = {
      type,
      time: time || timestamp || Date.now(),
    };

    if (!payload || typeof payload !== 'object') {
      normalized.payload = { fields: { ...rest } };
    } else if (!payload.fields) {
      normalized.payload = {
        ...payload,
        fields: { ...payload }
      };
    } else {
      normalized.payload = payload;
    }

    return normalized;
  }

  /**
   * Deliver message to subscribers
   * @param {Object} message
   */
  deliverMessage(message) {
    if (!message || this._subscriptionsPaused) return;

    // Check for pong
    if (message.type === 'pong' || (message.payload && message.payload.type === 'pong')) {
      return;
    }

    let messageType = message.type || (message.payload && message.payload.type);
    if (!messageType) return;

    const normalizedMessage = this.normalizeMessage(message, messageType);

    // Deliver to specific subscribers
    const subscribers = this.subscribers.get(messageType);
    if (subscribers && subscribers.size > 0) {
      for (const handler of subscribers) {
        try {
          handler(normalizedMessage);
        } catch (err) {
          subscribers.delete(handler);
        }
      }
      return;
    }

    // Deliver to wildcard subscribers
    const wildcardSubscribers = this.subscribers.get('*');
    if (wildcardSubscribers && wildcardSubscribers.size > 0) {
      for (const handler of wildcardSubscribers) {
        try {
          handler(normalizedMessage);
        } catch (err) {
          wildcardSubscribers.delete(handler);
        }
      }
    }
  }

  /**
   * Connect to the WebSocket
   * @returns {Promise<boolean>} True if connected successfully
   */
  async connect() {
    if (this.socket) {
      // Clean up existing socket if closed
      if ([WebSocket.CLOSING, WebSocket.CLOSED].includes(this.socket.readyState)) {
        this.socket.onopen = null;
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.onmessage = null;
        this.socket = null;
      } else if (this.socket.readyState === WebSocket.OPEN) {
        this.setConnectionState(ConnectionState.CONNECTED);
        return true; // Already connected
      } else if (this.socket.readyState === WebSocket.CONNECTING) {
        // Wait for connection to complete
        try {
          await new Promise((resolve, reject) => {
            const onOpen = () => {
              this.socket.removeEventListener('open', onOpen);
              this.socket.removeEventListener('error', onError);
              resolve();
            };

            const onError = () => {
              this.socket.removeEventListener('open', onOpen);
              this.socket.removeEventListener('error', onError);
              reject(new Error('WebSocket connection failed'));
            };

            this.socket.addEventListener('open', onOpen);
            this.socket.addEventListener('error', onError);

            setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
          });

          this.setConnectionState(ConnectionState.CONNECTED);
          return true;
        } catch (err) {
          this.socket.onopen = null;
          this.socket.onclose = null;
          this.socket.onerror = null;
          this.socket.onmessage = null;
          this.socket = null;
        }
      }
    }

    // Don't create new connections while paused
    if (this._subscriptionsPaused) return false;

    try {
      this.socket = new WebSocket(this.url);
      this.socket.binaryType = 'arraybuffer';

      this.setConnectionState(ConnectionState.CONNECTING);

      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('WebSocket connection timeout'));
        }, 5000);

        this.socket.onopen = () => {
          clearTimeout(timeoutId);
          this.handleOpen();
          resolve();
        };

        this.socket.onerror = () => {
          clearTimeout(timeoutId);
          this.setConnectionState(ConnectionState.ERROR);
          this.handleDisconnection();
          reject(new Error('WebSocket connection error'));
        };
      });

      return true;
    } catch (error) {
      this.setConnectionState(ConnectionState.ERROR);

      if (this.socket) {
        this.socket.onopen = null;
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.onmessage = null;
        this.socket = null;
      }

      throw error;
    }
  }

  /**
   * Handle WebSocket open event
   */
  handleOpen() {
    this.reconnectInterval = CONFIG.RECONNECT_INTERVAL;
    this.lastMessageTime = Date.now();
    this.setConnectionState(ConnectionState.CONNECTED);

    this.socket.onmessage = this.handleMessage.bind(this);
    this.socket.onclose = this.handleClose.bind(this);
    this.socket.onerror = this.handleError.bind(this);

    this.startPingPongCycle();
  }

  /**
   * Start the ping/pong cycle
   */
  startPingPongCycle() {
    if (this.pingTimerId || this.connectionState !== ConnectionState.CONNECTED) return;

    // Send initial ping
    this.sendPing();

    // Set up regular pings
    this.pingTimerId = setInterval(() => this.sendPing(), CONFIG.PING_INTERVAL);
  }

  /**
   * Send a ping message
   */
  sendPing() {
    if (this._subscriptionsPaused || !this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    try {
      this._pingId = (this._pingId + 1) % 1000000;

      this.socket.send(JSON.stringify({
        type: "ping",
        pingId: this._pingId,
        timestamp: Date.now()
      }));
    } catch (error) {
      // Connection might be broken
      if (this.connectionState === ConnectionState.CONNECTED) {
        this.checkConnection();
      }
    }
  }

  /**
   * Handle WebSocket message event
   * @param {MessageEvent} event
   */
  handleMessage(event) {
    this.lastMessageTime = Date.now();

    if (this._subscriptionsPaused) return;

    let message = null;

    if (typeof event.data === 'string') {
      message = this.parseJSONMessage(event.data);
      if (message) {
        this.deliverMessage(message);
        return;
      }
    } else if (event.data instanceof ArrayBuffer) {
      message = this.parseBinaryMessage(event.data);
      if (message) {
        this.deliverMessage(message);
        return;
      }

      // Fallback to JSON decoding
      try {
        const text = new TextDecoder().decode(event.data);
        message = this.parseJSONMessage(text);
        if (message) {
          this.deliverMessage(message);
        }
      } catch (e) {
        // Unable to parse message
      }
    }
  }

  /**
   * Handle WebSocket error event
   */
  handleError() {
    this.setConnectionState(ConnectionState.ERROR);

    if (!this._subscriptionsPaused) {
      this.handleDisconnection();
    }
  }

  /**
   * Handle WebSocket close event
   */
  handleClose() {
    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.onmessage = null;
    }

    this.setConnectionState(ConnectionState.DISCONNECTED);

    if (!this._subscriptionsPaused) {
      this.handleDisconnection();
    }
  }

  /**
   * Handle disconnection with backoff strategy
   */
  handleDisconnection() {
    if (this._subscriptionsPaused) return;

    if (this.reconnectTimerId !== null) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }

    this.connectionAttempts++;
    const baseDelay = this.reconnectInterval;
    // Cap backoff at 10 seconds
    const backoff = Math.min(10000, baseDelay * Math.pow(2, Math.min(this.connectionAttempts, 10)));

    this.reconnectTimerId = setTimeout(() => {
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.setConnectionState(ConnectionState.RECONNECTING);
        this.connect().catch(() => {});
      }
      this.reconnectTimerId = null;
    }, backoff);
  }

  /**
   * Check connection status
   */
  checkConnection() {
    if (this._subscriptionsPaused) return;

    const now = Date.now();
    const inactiveTime = now - this.lastMessageTime;

    if (this.lastMessageTime > 0 &&
      inactiveTime > 10000 &&
      this.connectionState === ConnectionState.CONNECTED) {

      if (this.socket) {
        try {
          this.socket.close();
        } catch (err) {
          // Error closing socket
        }
      }

      this.connect().catch(() => {});
    }
  }

  /**
   * Subscribe to a message type
   * @param {string} messageType
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(messageType, callback) {
    if (!messageType || typeof callback !== 'function') {
      return () => {};
    }

    if (!this.subscribers.has(messageType)) {
      this.subscribers.set(messageType, new Set());
    }

    this.subscribers.get(messageType).add(callback);

    return () => {
      const handlers = this.subscribers.get(messageType);
      if (handlers) {
        handlers.delete(callback);
        if (handlers.size === 0) {
          this.subscribers.delete(messageType);
        }
      }
    };
  }

  /**
   * Check if WebSocket is connected
   * @returns {boolean}
   */
  isConnected() {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  /**
   * Pause all WebSocket subscriptions
   * @returns {Promise<boolean>}
   */
  pauseSubscriptions() {
    return new Promise((resolve) => {
      if (this._subscriptionsPaused) {
        resolve(true);
        return;
      }

      this._subscriptionsPaused = true;

      if (this.pingTimerId) {
        clearInterval(this.pingTimerId);
        this.pingTimerId = null;
      }

      resolve(true);
    });
  }

  /**
   * Resume all WebSocket subscriptions
   * @returns {Promise<boolean>}
   */
  resumeSubscriptions() {
    return new Promise(async (resolve) => {
      if (!this._subscriptionsPaused) {
        resolve(true);
        return;
      }

      this._subscriptionsPaused = false;

      try {
        if (!this.isConnected()) {
          await this.connect();
        }

        this.setupTimers();

        if (this.isConnected()) {
          this.startPingPongCycle();
        }

        this._notifyResumeListeners();

        resolve(true);
      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Force a connection attempt
   * @returns {Promise<boolean>}
   */
  async forceConnect() {
    if (this._subscriptionsPaused) {
      return Promise.resolve(false);
    }

    try {
      if (!this.isConnected()) {
        return await this.connect();
      } else {
        this.sendPing();
        return true;
      }
    } catch (err) {
      return false;
    }
  }

  /**
   * Destroy the WebSocket service
   */
  destroy() {
    if (this.pingTimerId) {
      clearInterval(this.pingTimerId);
      this.pingTimerId = null;
    }

    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }

    if (this.socket) {
      try {
        this.socket.onopen = null;
        this.socket.onclose = null;
        this.socket.onerror = null;
        this.socket.onmessage = null;
        this.socket.close();
      } catch (e) {
        // Error closing socket
      }
      this.socket = null;
    }

    this.subscribers.clear();
    this.onConnectionChangeCallbacks.clear();
    this.onResumeCallbacks.clear();
  }
}

// ---------- Instance bootstrap using config.yaml ----------
const protocol = (typeof window !== 'undefined' && window.location.protocol === 'https:') ? 'wss:' : 'ws:';

// Start with safe defaults so imports don’t explode, then patch once YAML loads
const initialUrl = `${protocol}//${DEFAULTS.host}:${DEFAULTS.wsPort}${DEFAULTS.wsPath}`;
export const wsService = new WebSocketService(initialUrl);

// Load YAML and update URL (and reconnect) if needed
(async () => {
  const runtime = await loadRuntimeConfig();
  const url = `${protocol}//${runtime.host}:${runtime.wsPort}${runtime.wsPath}`;
  await wsService.updateUrl(url);
  // Kick off if not already initialized
  wsService.initialize().catch(() => {});
})().catch(() => {
  // Fall back to defaults
  wsService.initialize().catch(() => {});
});

// Create a simple animation context to support app animations
export const animationContext = (() => {
  // Default state
  let state = {
    enabled: true,
    duration: 300
  };
  return {
    pause: () => {
      state.enabled = false;
    },
    resume: () => {
      state.enabled = true;
    },
    isEnabled: () => state.enabled,
    getDuration: () => state.duration,
    setConfig: (config) => {
      if (!config || typeof config !== 'object') return;
      if (typeof config.enabled === 'boolean') {
        state.enabled = config.enabled;
      }
      if (typeof config.duration === 'number' && config.duration >= 0) {
        state.duration = config.duration;
      }
    },
    getState: () => ({ ...state })
  };
})();

export default wsService;
