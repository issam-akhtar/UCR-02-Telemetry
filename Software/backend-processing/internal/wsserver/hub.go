// wsserver.go
// ----------------------------------------------------------------------
// WebSocket server for real‑time telemetry messaging.
// This file implements the WebSocket hub and connection handling.
// ----------------------------------------------------------------------

package wsserver

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// Hub manages active WebSocket connections and broadcasting.
type Hub struct {
	clients    map[*websocket.Conn]bool // Active client connections.
	Broadcast  chan []byte              // Channel for outbound messages.
	Register   chan *websocket.Conn     // Channel for new connections.
	Unregister chan *websocket.Conn     // Channel for closed connections.
}

// WsHub is the global hub instance.
var WsHub = NewHub()

// NewHub creates and initializes a new Hub.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*websocket.Conn]bool),
		Broadcast:  make(chan []byte),
		Register:   make(chan *websocket.Conn),
		Unregister: make(chan *websocket.Conn),
	}
}

// Run continuously processes registration, unregistration and broadcasting.
func (h *Hub) Run() {
	for {
		select {
		case conn := <-h.Register:
			h.clients[conn] = true
			// Log new connection; adjust log level in production.
			log.Printf("WS client connected; total: %d", len(h.clients))
		case conn := <-h.Unregister:
			if _, ok := h.clients[conn]; ok {
				delete(h.clients, conn)
				conn.Close()
				log.Printf("WS client disconnected; total: %d", len(h.clients))
			}
		case message := <-h.Broadcast:
			for conn := range h.clients {
				// Send as a binary message (protobuf-encoded) rather than text.
				if err := conn.WriteMessage(websocket.BinaryMessage, message); err != nil {
					conn.Close()
					delete(h.clients, conn)
				}
			}
		}
	}
}

// ServeWS upgrades an HTTP request to a WebSocket connection and registers the client.
func ServeWS(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		// In production, restrict origins appropriately.
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	wsConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WS upgrade error: %v", err)
		return
	}

	WsHub.Register <- wsConn

	// Listen for client messages (if any) in a background goroutine.
	go func(conn *websocket.Conn) {
		defer func() { WsHub.Unregister <- conn }()
		for {
			if _, _, err := conn.ReadMessage(); err != nil {
				break
			}
		}
	}(wsConn)
}
