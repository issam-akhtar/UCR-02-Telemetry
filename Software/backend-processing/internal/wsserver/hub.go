// wsserver.go
// ----------------------------------------------------------------------
// WebSocket server for real‑time telemetry messaging.
// This file implements the WebSocket hub and connection handling.
// ----------------------------------------------------------------------
package wsserver

import (
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

const (
	// Maximum message size allowed from client
	maxMessageSize = 8192 // 8 KB

	// Maximum number of concurrent clients
	maxClients = 25

	// Buffer sizes for WebSocket connections
	wsReadBufferSize  = 1024
	wsWriteBufferSize = 4096

	// Broadcast channel buffer size - significantly increased for high throughput
	broadcastBufferSize = 1000 // Buffer 1 seconds of 1000 msg/sec
)

// safeConn wraps a websocket connection with a mutex for thread-safe writes
type safeConn struct {
	conn  *websocket.Conn
	mutex sync.Mutex
}

// writeMessage safely writes a message to the websocket connection
func (s *safeConn) writeMessage(messageType int, data []byte) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()
	return s.conn.WriteMessage(messageType, data)
}

// Hub manages active WebSocket connections and broadcasting.
type Hub struct {
	clients     map[*safeConn]bool // Active client connections
	clientsMu   sync.RWMutex       // Mutex for clients map
	Broadcast   chan []byte        // Channel for outbound messages
	Register    chan *safeConn     // Channel for new connections
	Unregister  chan *safeConn     // Channel for closed connections
	clientCount int32              // Current client count
}

// WsHub is the global hub instance.
var WsHub = NewHub()

// NewHub creates and initializes a new Hub.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*safeConn]bool),
		Broadcast:  make(chan []byte, broadcastBufferSize),
		Register:   make(chan *safeConn, 8),
		Unregister: make(chan *safeConn, 8),
	}
}

// Run continuously processes registration, unregistration and broadcasting.
func (h *Hub) Run() {
	for {
		select {
		case conn := <-h.Register:
			h.clientsMu.Lock()
			if h.clientCount >= maxClients {
				h.clientsMu.Unlock()
				conn.conn.Close()
				continue
			}
			h.clientCount++
			h.clients[conn] = true
			h.clientsMu.Unlock()

		case conn := <-h.Unregister:
			h.clientsMu.Lock()
			if _, ok := h.clients[conn]; ok {
				delete(h.clients, conn)
				conn.conn.Close()
				h.clientCount--
			}
			h.clientsMu.Unlock()

		case message := <-h.Broadcast:
			h.clientsMu.RLock()
			if len(h.clients) == 0 {
				h.clientsMu.RUnlock()
				continue
			}
			conns := make([]*safeConn, 0, len(h.clients))
			for conn := range h.clients {
				conns = append(conns, conn)
			}
			h.clientsMu.RUnlock()

			var failedConns []*safeConn
			for _, conn := range conns {
				if err := conn.writeMessage(websocket.BinaryMessage, message); err != nil {
					failedConns = append(failedConns, conn)
				}
			}

			if len(failedConns) > 0 {
				h.clientsMu.Lock()
				for _, conn := range failedConns {
					delete(h.clients, conn)
					conn.conn.Close()
					h.clientCount--
				}
				h.clientsMu.Unlock()
			}
		}
	}
}

// ServeWS upgrades an HTTP request to a WebSocket connection and registers the client.
func ServeWS(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		CheckOrigin:     func(r *http.Request) bool { return true },
		ReadBufferSize:  wsReadBufferSize,
		WriteBufferSize: wsWriteBufferSize,
	}
	wsConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	// Create a safe connection wrapper
	safeConn := &safeConn{conn: wsConn}

	// Set read limit
	wsConn.SetReadLimit(maxMessageSize)

	// Register the connection
	WsHub.Register <- safeConn

	// Simple reader loop - just reads until connection is closed
	go func() {
		defer func() {
			WsHub.Unregister <- safeConn
		}()
		for {
			if _, _, err := wsConn.ReadMessage(); err != nil {
				break // If error, break the loop which will trigger unregister
			}
		}
	}()
}
