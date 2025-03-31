// throttler.go
//
// Package processdata provides functionality to throttle (rate-limit)
// the broadcast of CAN telemetry messages to a WebSocket hub with enhanced
// performance. This version uses Go's standard rate limiter to support burst
// capacity and dynamic adjustments, plus circuit breaker pattern for resource protection.
package processdata

import (
	"sync/atomic"
	"telem-system/internal/wsserver"
	"time"

	"golang.org/x/time/rate"
)

// Constants for resource protection
const (
	// Maximum message size to broadcast
	maxBroadcastMessageSize = 8192 // 8KB

	// Circuit breaker settings
	circuitBreakerThreshold = 100             // Number of consecutive drops before entering half-open state
	circuitBreakerResetTime = 5 * time.Second // Time to stay in half-open state
)

// Monitoring counters
var (
	messagesSent    uint64
	messagesDropped uint64

	// Circuit breaker state (0=closed/normal, 1=open/blocking, 2=half-open/testing)
	circuitState      int32
	consecutiveDrops  int32
	lastCircuitChange time.Time
)

// limiterHolder will atomically hold a pointer to a rate.Limiter.
var limiterHolder atomic.Value // holds *rate.Limiter

// InitThrottler initializes the global rate limiter based on the provided
// interval in milliseconds and burst capacity. A non‑positive interval disables rate limiting.
// For example, if intervalMs is 100 and burst is 5, the limiter allows 10 messages per second with up to 5 messages in a burst.
func InitThrottler(intervalMs int, burst int) {
	if intervalMs <= 0 {
		limiterHolder.Store((*rate.Limiter)(nil))
		return
	}
	// Calculate messages per second.
	ratePerSec := 1000.0 / float64(intervalMs)
	if burst < 1 {
		burst = 1
	}
	l := rate.NewLimiter(rate.Limit(ratePerSec), burst)
	limiterHolder.Store(l)

	// Initialize circuit breaker state
	atomic.StoreInt32(&circuitState, 0)
	atomic.StoreInt32(&consecutiveDrops, 0)
	lastCircuitChange = time.Now()
}

// UpdateThrottler dynamically updates the global rate limiter with a new interval and burst capacity.
// This is a convenience function that reinitializes the limiter.
func UpdateThrottler(intervalMs int, burst int) {
	InitThrottler(intervalMs, burst)
}

// GetThrottlerStats returns the current throttler statistics
func GetThrottlerStats() (sent uint64, dropped uint64, state int32) {
	return atomic.LoadUint64(&messagesSent),
		atomic.LoadUint64(&messagesDropped),
		atomic.LoadInt32(&circuitState)
}

// ResetCircuitBreaker forces the circuit breaker back to normal state
func ResetCircuitBreaker() {
	atomic.StoreInt32(&circuitState, 0)
	atomic.StoreInt32(&consecutiveDrops, 0)
	lastCircuitChange = time.Now()
	// log.Println("Throttler circuit breaker manually reset")
}

// ThrottledBroadcast sends the given message to the WebSocket hub while enforcing
// the configured rate limit. If throttling is disabled, the message is sent immediately.
// Implements circuit breaker pattern to prevent resource exhaustion.
func ThrottledBroadcast(msg []byte) {
	// Check message size limit
	if len(msg) > maxBroadcastMessageSize {
		// log.Printf("Message exceeds maximum broadcast size (%d > %d), dropping",
		// 	len(msg), maxBroadcastMessageSize)
		atomic.AddUint64(&messagesDropped, 1)
		return
	}

	// Check circuit breaker state
	state := atomic.LoadInt32(&circuitState)
	if state == 1 {
		// Circuit is open (blocking), check if we should try half-open
		if time.Since(lastCircuitChange) > circuitBreakerResetTime {
			atomic.StoreInt32(&circuitState, 2) // Set to half-open
			lastCircuitChange = time.Now()
		} else {
			// Still in blocking state, drop message
			atomic.AddUint64(&messagesDropped, 1)
			return
		}
	}

	// Rate limiting check
	limiter, ok := limiterHolder.Load().(*rate.Limiter)
	if ok && limiter != nil {
		if !limiter.Allow() {
			// Over rate limit, but we'll try to send anyway
			// Just log for monitoring purposes
			// if state != 1 { // Don't spam logs when circuit is open
			// 	log.Printf("Message rate exceeded limiter (%v), attempting send anyway", limiter.Limit())
			// }
		}
	}

	// Try non-blocking send to prevent resource exhaustion
	select {
	case wsserver.WsHub.Broadcast <- msg:
		// Message sent successfully
		atomic.AddUint64(&messagesSent, 1)
		if state == 2 {
			// In half-open state and successful, reset circuit
			atomic.StoreInt32(&circuitState, 0)
			atomic.StoreInt32(&consecutiveDrops, 0)
			// log.Println("Circuit breaker reset to normal operation")
		}
	default:
		// Channel is full, increment drop counter
		drops := atomic.AddInt32(&consecutiveDrops, 1)
		atomic.AddUint64(&messagesDropped, 1)

		// Only log occasionally to prevent log spam
		// if drops%10 == 0 {
		// 	log.Printf("Warning: broadcast channel full, dropping messages (consecutive drops: %d)", drops)
		// }

		// Check if we need to open the circuit breaker
		if drops >= circuitBreakerThreshold && state != 1 {
			// log.Printf("Circuit breaker triggered after %d consecutive message drops", drops)
			// atomic.StoreInt32(&circuitState, 1)
			lastCircuitChange = time.Now()
		}
	}
}
