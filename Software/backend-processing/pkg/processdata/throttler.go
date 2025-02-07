// pkg/processdata/throttler.go
package processdata

import (
	"encoding/json"
	"sync"
	"time"

	"telem-system/internal/wsserver"
)

// backendMessageBuffer holds the latest message per type.
var (
	backendMessageBuffer = make(map[string][]byte)
	backendBufferMux     sync.Mutex
	// throttlingInterval is the fixed interval to flush messages.
	//throttlingInterval = 100 * time.Millisecond
	throttlingInterval = 50 * time.Millisecond
)

// ThrottledBroadcast buffers the incoming message by its "type" field.
// If unmarshaling fails or no type is found, the message is broadcast immediately.
// If throttlingInterval is zero, broadcast immediately.
func ThrottledBroadcast(msg []byte) {
	if throttlingInterval == 0 {
		wsserver.WsHub.Broadcast <- msg
		return
	}

	var m map[string]interface{}
	if err := json.Unmarshal(msg, &m); err != nil {
		// Fallback: broadcast immediately if parsing fails.
		wsserver.WsHub.Broadcast <- msg
		return
	}
	t, ok := m["type"].(string)
	if !ok {
		wsserver.WsHub.Broadcast <- msg
		return
	}

	backendBufferMux.Lock()
	backendMessageBuffer[t] = msg // save latest message for this type
	backendBufferMux.Unlock()
}

// StartBackendThrottler starts a goroutine that flushes the latest message
// for each type every throttlingInterval.
func StartBackendThrottler() {
	if throttlingInterval <= 0 {
		return
	}
	go func() {
		ticker := time.NewTicker(throttlingInterval)
		defer ticker.Stop()
		for range ticker.C {
			backendBufferMux.Lock()
			localBuffer := make(map[string][]byte)
			for k, v := range backendMessageBuffer {
				localBuffer[k] = v
			}
			backendMessageBuffer = make(map[string][]byte)
			backendBufferMux.Unlock()

			for _, msg := range localBuffer {
				wsserver.WsHub.Broadcast <- msg
			}
		}
	}()
}
