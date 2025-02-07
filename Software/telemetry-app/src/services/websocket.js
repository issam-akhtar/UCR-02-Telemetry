export class WebSocketService {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.reconnectInterval = 3000;
    this.subscribers = new Map();
  }

  connect() {
    this.socket = new WebSocket(this.url);

    this.socket.onopen = () => {
      console.log("WebSocket connected");
      this.reconnectInterval = 3000;
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const handlers = this.subscribers.get(message.type) || [];
        handlers.forEach((handler) => handler(message));
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
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

export const wsService = new WebSocketService("ws://localhost:9000/ws");
wsService.connect();
