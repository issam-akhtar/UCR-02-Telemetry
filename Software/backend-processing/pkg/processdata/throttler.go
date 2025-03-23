// throttler.go
//
// Package processdata provides functionality to throttle (rate-limit)
// the broadcast of CAN telemetry messages to a WebSocket hub. This ensures
// that messages are sent at a controlled rate in production environments.
package processdata

import (
	"log"
	"telem-system/internal/wsserver"

	"go.uber.org/ratelimit"
)

// limiter is a package-level rate limiter.
var limiter ratelimit.Limiter

// InitThrottler initializes the global rate limiter based on the provided
// interval in milliseconds. A non‑positive interval disables rate limiting.
// For example, if intervalMs is 100, the limiter allows 10 messages per second.
func InitThrottler(intervalMs int) {
	if intervalMs <= 0 {
		limiter = nil
		log.Println("Rate limiting disabled")
		return
	}

	// Calculate the allowed number of messages per second.
	rate := 1000 / intervalMs
	if rate < 1 {
		rate = 1
	}
	limiter = ratelimit.New(rate)
	log.Printf("Rate limiting enabled: %d messages per second", rate)
}

// ThrottledBroadcast sends the given message to the WebSocket hub while enforcing
// the rate limit if one is configured. (Ensure that the WsHub’s write loop uses
// websocket.BinaryMessage when calling WriteMessage.)
func ThrottledBroadcast(msg []byte) {
	if limiter != nil {
		// Block until the next allowed time slot.
		limiter.Take()
	}
	wsserver.WsHub.Broadcast <- msg
}
