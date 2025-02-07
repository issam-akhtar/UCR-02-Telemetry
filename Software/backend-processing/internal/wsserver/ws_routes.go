// internal/wsserver/ws_routes.go
package wsserver

import (
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

// ServeWS handles the HTTP request /ws by upgrading it to a WebSocket connection.
func ServeWS(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool {
			// In production, you probably want more secure checks
			return true
		},
	}

	wsConn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Register the client with the hub
	WsHub.Register <- wsConn

	// Listen for messages from client (normally none if only broadcasting)
	go func(conn *websocket.Conn) {
		defer func() {
			WsHub.Unregister <- conn
		}()
		for {
			_, _, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
					log.Printf("WebSocket unexpected close error: %v", err)
				}
				break
			}
			// We do not handle client messages in this scenario
		}
	}(wsConn)
}
