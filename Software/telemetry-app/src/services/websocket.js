import { loadTelemetryProto, decodeTelemetryMessage } from '../utils/protobuf';

export class WebSocketService {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.reconnectInterval = 3000;
    this.subscribers = new Map();
    this.protoRoot = null;
    this.messageQueue = [];
  }

  async loadProto(retries = 3) {
    try {
      this.protoRoot = await loadTelemetryProto();
      console.log("Proto loaded successfully");
    } catch (error) {
      if (retries > 0) {
        console.log(`Retrying proto load... ${retries} attempts left`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return this.loadProto(retries - 1);
      }
      throw new Error("Failed to load proto after multiple attempts");
    }
  }

  async initialize() {
    try {
      await this.loadProto();
      this.connect();
      this.processQueue();
    } catch (error) {
      console.error("WebSocket initialization failed:", error);
      setTimeout(() => this.initialize(), 5000);
    }
  }

  processQueue() {
    while (this.messageQueue.length > 0 && this.protoRoot) {
      const { buffer } = this.messageQueue.shift();
      try {
        const message = decodeTelemetryMessage(this.protoRoot, buffer);
        const handlers = this.subscribers.get(message.type) || [];
        handlers.forEach((handler) => handler(message));
      } catch (error) {
        console.error("Error processing queued message:", error);
      }
    }
  }

  connect() {
    this.socket = new WebSocket(this.url);
    this.socket.binaryType = 'arraybuffer';

    this.socket.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectInterval = 3000;
    };

    this.socket.onmessage = (event) => {
      if (!this.protoRoot) {
        this.messageQueue.push({ buffer: new Uint8Array(event.data) });
        return;
      }
      try {
        const buffer = new Uint8Array(event.data);
        const message = decodeTelemetryMessage(this.protoRoot, buffer);
        const handlers = this.subscribers.get(message.type) || [];
        handlers.forEach((handler) => handler(message));
      } catch (error) {
        console.error("Error decoding message:", error);
      }
    };

    this.socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    this.socket.onclose = () => {
      console.log("WebSocket disconnected. Reconnecting...");
      setTimeout(() => this.connect(), this.reconnectInterval);
    };
  }

  subscribe(messageType, callback) {
    const handlers = this.subscribers.get(messageType) || [];
    this.subscribers.set(messageType, [...handlers, callback]);
    return () => this.unsubscribe(messageType, callback);
  }

  unsubscribe(messageType, callback) {
    const handlers = this.subscribers.get(messageType) || [];
    this.subscribers.set(
      messageType,
      handlers.filter((h) => h !== callback)
    );
  }
}

// Connect to the live data WebSocket on port 9094.
export const wsService = new WebSocketService(`ws://${window.location.hostname}:9094/ws`);
wsService.initialize();
