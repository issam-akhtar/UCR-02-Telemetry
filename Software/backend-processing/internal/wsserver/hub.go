// internal/wsserver/hub.go
package wsserver

import (
	"log"

	"github.com/gorilla/websocket"
)

// Hub represents the WebSocket hub for broadcasting messages to connected clients.
type Hub struct {
	// All connected clients
	clients map[*websocket.Conn]bool

	// Inbound messages to broadcast
	Broadcast chan []byte

	// New client register
	Register chan *websocket.Conn

	// Client unregister
	Unregister chan *websocket.Conn
}

// WsHub is the single global instance of our Hub.
var WsHub = NewHub()

// NewHub initializes and returns a Hub instance.
func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*websocket.Conn]bool),
		Broadcast:  make(chan []byte),
		Register:   make(chan *websocket.Conn),
		Unregister: make(chan *websocket.Conn),
	}
}

// Run handles all register/unregister/broadcast events for the Hub.
func (h *Hub) Run() {
	for {
		select {
		case conn := <-h.Register:
			h.clients[conn] = true
			log.Printf("New WebSocket client connected. Total clients: %d\n", len(h.clients))

		case conn := <-h.Unregister:
			if _, ok := h.clients[conn]; ok {
				delete(h.clients, conn)
				conn.Close()
				log.Printf("WebSocket client disconnected. Total clients: %d\n", len(h.clients))
			}

		case message := <-h.Broadcast:
			// Send message to all connected clients
			for conn := range h.clients {
				if err := conn.WriteMessage(websocket.TextMessage, message); err != nil {
					log.Printf("Error broadcasting to client: %v", err)
					conn.Close()
					delete(h.clients, conn)
				}
			}
		}
	}
}
