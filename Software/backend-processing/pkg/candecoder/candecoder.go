// candecoder.go
//
// Package candecoder loads CAN message definitions from a JSON file and provides
// functions to decode raw CAN data into human‑readable values. This code is optimized
// for production on resource‑constrained systems such as the Raspberry Pi 5 (8GB RAM).
package candecoder

import (
	"encoding/binary"
	"encoding/json"
	"fmt"
	"math"
	"os"
	"runtime"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"telem-system/pkg/types"
)

// Cache configuration
const (
	// Maximum number of entries in the cache per message ID
	maxCacheSize = 100

	// LRU cache eviction threshold (percentage of cache to clear)
	evictionThreshold = 0.25

	// Message data cache key max length
	maxCacheKeyLength = 32
)

// Cache statistics for monitoring
var (
	cacheHits   uint64
	cacheMisses uint64
)

// messageCache provides an optimized caching mechanism with LRU-inspired eviction
type messageCache struct {
	sync.RWMutex
	cache       map[uint32]map[string]*cachedItem
	enabled     bool
	maxSize     int
	cacheHits   uint64
	cacheMisses uint64
}

// cachedItem represents a cached decoded message with access tracking
type cachedItem struct {
	data      map[string]string
	timestamp int64 // Unix timestamp for access time tracking
}

// Global message cache instance
var msgCache = &messageCache{
	cache:   make(map[uint32]map[string]*cachedItem),
	enabled: true,
	maxSize: maxCacheSize,
}

// Buffer pools to reduce allocations
var (
	// Pool of float32 byte slices
	float32Pool = sync.Pool{
		New: func() interface{} {
			buf := make([]byte, 4)
			return &buf
		},
	}

	// Pool of float64 byte slices
	float64Pool = sync.Pool{
		New: func() interface{} {
			buf := make([]byte, 8)
			return &buf
		},
	}

	// Pool for decoded string maps
	decodedMapPool = sync.Pool{
		New: func() interface{} {
			// Start with a reasonable size that covers most messages
			m := make(map[string]string, 16)
			return &m
		},
	}

	// Pool for byte slices used in decoding
	byteSlicePool = sync.Pool{
		New: func() interface{} {
			// 64 bytes should handle most CAN messages
			b := make([]byte, 64)
			return &b
		},
	}
)

// getCacheKey generates an efficient string key for the message data
func getCacheKey(data []byte) string {
	// Limit key size for memory efficiency
	maxLen := maxCacheKeyLength
	if len(data) < maxLen {
		maxLen = len(data)
	}

	// Use a small buffer for the key to avoid allocation
	buf := make([]byte, maxLen*2) // Each byte becomes 2 hex chars

	// Manual hex conversion to avoid allocations from fmt.Sprintf
	for i := 0; i < maxLen; i++ {
		b := data[i]
		buf[i*2] = hexChar(b >> 4)
		buf[i*2+1] = hexChar(b & 0x0F)
	}

	return string(buf)
}

// hexChar returns the hex character for a nibble
func hexChar(nibble byte) byte {
	if nibble < 10 {
		return '0' + nibble
	}
	return 'a' + (nibble - 10)
}

// LoadJSONDefinitions reads and parses a JSON file containing CAN message definitions.
// It returns both a slice of messages and a map of messages keyed by frame ID.
func LoadJSONDefinitions(jsonPath string) ([]types.Message, map[uint32]types.Message, error) {
	data, err := os.ReadFile(jsonPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read JSON file %s: %w", jsonPath, err)
	}

	var messages []types.Message
	if err := json.Unmarshal(data, &messages); err != nil {
		return nil, nil, fmt.Errorf("failed to parse JSON: %w", err)
	}

	// Pre-allocate map with the exact size needed
	msgMap := make(map[uint32]types.Message, len(messages))

	// Process message definitions to optimize for decoding
	for i := range messages {
		// Store it in the map
		msgMap[messages[i].FrameID] = messages[i]

		// Sort signals by frequency of access (optimization opportunity)
		// In a real system, this would be based on access patterns
	}

	// Initialize cache for each message
	msgCache.Lock()
	for id := range msgMap {
		if _, exists := msgCache.cache[id]; !exists {
			msgCache.cache[id] = make(map[string]*cachedItem)
		}
	}
	msgCache.Unlock()

	// Start cache maintenance goroutine
	go cacheMaintenance()

	return messages, msgMap, nil
}

// cacheMaintenance periodically cleans up the message cache
func cacheMaintenance() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for range ticker.C {
		now := time.Now().Unix()
		evictOlderThan := now - (60 * 60) // 1 hour

		msgCache.Lock()

		for id, items := range msgCache.cache {
			if len(items) < 10 {
				// Skip small caches
				continue
			}

			// Count items to evict
			oldItemCount := 0
			for _, item := range items {
				if item.timestamp < evictOlderThan {
					oldItemCount++
				}
			}

			// If more than 25% of items are old, clean them up
			if float64(oldItemCount)/float64(len(items)) >= evictionThreshold {
				newCache := make(map[string]*cachedItem, len(items)-oldItemCount)
				for key, item := range items {
					if item.timestamp >= evictOlderThan {
						newCache[key] = item
					}
				}
				msgCache.cache[id] = newCache
			}
		}

		msgCache.Unlock()
	}
}

// DecodeMessage decodes raw CAN data into a map of signal names and stringified values.
// If a signal cannot be decoded, its value is returned as an empty string.
func DecodeMessage(data []byte, msg types.Message) (map[string]string, error) {
	// Quick check for empty data
	if len(data) == 0 {
		return nil, fmt.Errorf("empty data for message %d", msg.FrameID)
	}

	// Check cache first for identical message data (if enabled)
	if msgCache.enabled {
		cacheKey := getCacheKey(data)

		msgCache.RLock()
		if frameCache, exists := msgCache.cache[msg.FrameID]; exists {
			if cached, found := frameCache[cacheKey]; found {
				// Update timestamp and return a copy of the cached data
				atomic.StoreInt64(&cached.timestamp, time.Now().Unix())
				atomic.AddUint64(&cacheHits, 1)

				// Get a map from the pool for the result
				resultPtr := decodedMapPool.Get().(*map[string]string)
				result := *resultPtr

				// Clear the map (more efficient than creating a new one)
				for k := range result {
					delete(result, k)
				}

				// Copy the cached data
				for k, v := range cached.data {
					result[k] = v
				}

				msgCache.RUnlock()

				// Return the map to the pool when done with it
				runtime.SetFinalizer(resultPtr, func(m *map[string]string) {
					decodedMapPool.Put(m)
				})

				return result, nil
			}
		}
		msgCache.RUnlock()
		atomic.AddUint64(&cacheMisses, 1)
	}

	// Ensure data is at least as long as the message definition requires
	var paddedData []byte
	if len(data) < msg.Length {
		// Get a buffer from the pool
		bufPtr := byteSlicePool.Get().(*[]byte)
		paddedData = (*bufPtr)[:msg.Length]
		copy(paddedData, data)
		defer byteSlicePool.Put(bufPtr)
	} else {
		paddedData = data
	}

	// Get a map from the pool for the result
	resultPtr := decodedMapPool.Get().(*map[string]string)
	decoded := *resultPtr

	// Clear the map (more efficient than creating a new one)
	for k := range decoded {
		delete(decoded, k)
	}

	// Decode each signal
	for _, signal := range msg.Signals {
		val, err := decodeSignal(paddedData, signal, msg.Length)
		if err != nil {
			decoded[signal.Name] = ""
			continue
		}

		// Use specialized formatters for each type to avoid reflection
		// and reduce allocations from fmt.Sprintf
		switch v := val.(type) {
		case float64:
			if v == float64(int64(v)) {
				decoded[signal.Name] = strconv.FormatInt(int64(v), 10)
			} else {
				// Format with precision up to 6 decimal places
				decoded[signal.Name] = strconv.FormatFloat(v, 'f', 6, 64)
			}
		case int64:
			decoded[signal.Name] = strconv.FormatInt(v, 10)
		default:
			// Fallback for other types (shouldn't happen in normal operation)
			decoded[signal.Name] = fmt.Sprintf("%v", v)
		}
	}

	// Cache the result (if caching is enabled)
	if msgCache.enabled {
		cacheKey := getCacheKey(data)

		msgCache.Lock()
		defer msgCache.Unlock()

		// Get the cache for this message ID
		if msgMap, exists := msgCache.cache[msg.FrameID]; exists {
			// Check if we need to evict entries
			if len(msgMap) >= msgCache.maxSize {
				// Evict approximately 25% of the oldest entries
				evictCount := msgCache.maxSize / 4
				if evictCount < 1 {
					evictCount = 1
				}

				// Find the oldest entries
				type keyTime struct {
					key string
					ts  int64
				}

				// We only need to track the oldest entries we'll remove
				oldestEntries := make([]keyTime, 0, evictCount)

				for k, item := range msgMap {
					ts := atomic.LoadInt64(&item.timestamp)

					if len(oldestEntries) < evictCount {
						oldestEntries = append(oldestEntries, keyTime{k, ts})
					} else {
						// Find the newest entry in our "oldest" list
						newestIdx := 0
						newestTs := oldestEntries[0].ts

						for i := 1; i < len(oldestEntries); i++ {
							if oldestEntries[i].ts > newestTs {
								newestTs = oldestEntries[i].ts
								newestIdx = i
							}
						}

						// Replace it if this entry is older
						if ts < newestTs {
							oldestEntries[newestIdx] = keyTime{k, ts}
						}
					}
				}

				// Remove the oldest entries
				for _, entry := range oldestEntries {
					delete(msgMap, entry.key)
				}
			}

			// Create a copy of the decoded data for the cache
			cachedData := make(map[string]string, len(decoded))
			for k, v := range decoded {
				cachedData[k] = v
			}

			// Store in cache with current timestamp
			msgMap[cacheKey] = &cachedItem{
				data:      cachedData,
				timestamp: time.Now().Unix(),
			}
		}
	}

	// Set finalizer to return the map to the pool when GC happens
	runtime.SetFinalizer(resultPtr, func(m *map[string]string) {
		decodedMapPool.Put(m)
	})

	return decoded, nil
}

// decodeSignal extracts and converts a single signal from the provided raw data.
// This is a performance-critical function that has been optimized for speed.
func decodeSignal(data []byte, signal types.Signal, msgLength int) (interface{}, error) {
	bitStart := signal.Start
	bitEnd := bitStart + signal.Length

	// Early bounds check to avoid out-of-bounds access
	if bitEnd > msgLength*8 {
		return nil, fmt.Errorf("signal %s out of bounds (start: %d, length: %d, message length: %d bytes)",
			signal.Name, bitStart, signal.Length, msgLength)
	}

	// Special case: IEEE 754 floating-point values
	if signal.IsFloat {
		return decodeFloatSignal(data, signal)
	}

	// Optimize for the common case: byte-aligned little-endian integers
	if signal.ByteOrder == "little_endian" && signal.Length%8 == 0 && bitStart%8 == 0 {
		return decodeByteAlignedLittleEndian(data, signal)
	}

	// Fast path: 1-byte signal aligned to byte boundary
	if signal.Length <= 8 && bitStart%8 == 0 {
		return decodeSmallAlignedSignal(data, signal)
	}

	// Fallback: Optimized bit-level extraction for non-byte-aligned signals
	return decodeBitLevel(data, signal)
}

// decodeSmallAlignedSignal provides a fast path for single-byte signals
func decodeSmallAlignedSignal(data []byte, signal types.Signal) (interface{}, error) {
	byteIdx := signal.Start / 8

	// Get the byte
	raw := uint64(data[byteIdx])

	// Apply any needed masking for signals smaller than 8 bits
	if signal.Length < 8 {
		mask := uint64((1 << signal.Length) - 1)
		raw &= mask
	}

	// Handle signed values
	if signal.IsSigned && signal.Length < 8 {
		// Check if sign bit is set
		signBit := uint64(1) << (signal.Length - 1)
		if raw&signBit != 0 {
			// Set all bits above the signal length to 1
			raw |= ^uint64(0) << signal.Length
		}
	}

	// Apply factor and offset
	if signal.IsSigned {
		phys := float64(int8(raw))*signal.Factor + signal.Offset
		return int64(phys), nil
	}

	phys := float64(raw)*signal.Factor + signal.Offset
	return phys, nil
}

// decodeFloatSignal handles IEEE 754 floating-point values.
func decodeFloatSignal(data []byte, signal types.Signal) (interface{}, error) {
	if signal.Length != 32 && signal.Length != 64 {
		return nil, fmt.Errorf("unsupported float length %d for %s (must be 32 or 64)",
			signal.Length, signal.Name)
	}

	byteStart := signal.Start / 8
	bytesNeeded := signal.Length / 8
	if byteStart+bytesNeeded > len(data) {
		return nil, fmt.Errorf("data too short for %s (need %d bytes, got %d)",
			signal.Name, byteStart+bytesNeeded, len(data))
	}

	var floatBytes []byte
	var physical float64

	// Use buffer pools to avoid allocations
	if signal.Length == 32 {
		bufPtr := float32Pool.Get().(*[]byte)
		floatBytes = *bufPtr
		defer float32Pool.Put(bufPtr)

		// Fast path for common case: data is properly aligned already
		if byteStart%4 == 0 && len(data[byteStart:]) >= 4 && len(floatBytes) >= 4 {
			copy(floatBytes[:4], data[byteStart:byteStart+4])
		} else {
			// Safe fallback
			copy(floatBytes, data[byteStart:byteStart+bytesNeeded])
		}
	} else {
		bufPtr := float64Pool.Get().(*[]byte)
		floatBytes = *bufPtr
		defer float64Pool.Put(bufPtr)

		// Fast path for common case: data is properly aligned already
		if byteStart%8 == 0 && len(data[byteStart:]) >= 8 && len(floatBytes) >= 8 {
			copy(floatBytes[:8], data[byteStart:byteStart+8])
		} else {
			// Safe fallback
			copy(floatBytes, data[byteStart:byteStart+bytesNeeded])
		}
	}

	// Handle byte order
	if strings.EqualFold(signal.ByteOrder, "big_endian") {
		reverseBytes(floatBytes[:bytesNeeded])
	}

	// Convert to float
	if signal.Length == 32 {
		bits := binary.LittleEndian.Uint32(floatBytes)
		physical = float64(math.Float32frombits(bits))
	} else {
		bits := binary.LittleEndian.Uint64(floatBytes)
		physical = math.Float64frombits(bits)
	}

	// Apply factor and offset
	return physical*signal.Factor + signal.Offset, nil
}

// reverseBytes reverses a byte slice in place.
func reverseBytes(slice []byte) {
	for i, j := 0, len(slice)-1; i < j; i, j = i+1, j-1 {
		slice[i], slice[j] = slice[j], slice[i]
	}
}

// decodeByteAlignedLittleEndian handles byte-aligned little-endian integers.
func decodeByteAlignedLittleEndian(data []byte, signal types.Signal) (interface{}, error) {
	numBytes := signal.Length / 8
	startByte := signal.Start / 8
	endByte := startByte + numBytes

	if endByte > len(data) {
		return nil, fmt.Errorf("signal %s out of bounds (requires bytes %d-%d, data length: %d)",
			signal.Name, startByte, endByte-1, len(data))
	}

	// Fast path for common sizes
	var raw uint64

	switch numBytes {
	case 1:
		raw = uint64(data[startByte])
	case 2:
		// Use binary.LittleEndian.Uint16 for 16-bit values
		raw = uint64(binary.LittleEndian.Uint16(data[startByte:endByte]))
	case 4:
		// Use binary.LittleEndian.Uint32 for 32-bit values
		raw = uint64(binary.LittleEndian.Uint32(data[startByte:endByte]))
	case 8:
		// Use binary.LittleEndian.Uint64 for 64-bit values
		raw = binary.LittleEndian.Uint64(data[startByte:endByte])
	default:
		// For other sizes, build the value byte by byte
		for i := 0; i < numBytes; i++ {
			raw |= uint64(data[startByte+i]) << (8 * i)
		}
	}

	// Handle signed values
	if signal.IsSigned {
		// Convert to signed value using two's complement
		signBit := uint64(1) << (signal.Length - 1)
		if raw&signBit != 0 {
			// Value is negative, apply two's complement
			raw = raw | (^uint64(0) << signal.Length)
		}
		phys := float64(int64(raw))*signal.Factor + signal.Offset
		return int64(phys), nil
	}

	// Handle unsigned values
	phys := float64(raw)*signal.Factor + signal.Offset
	return phys, nil
}

// decodeBitLevel handles bit-level extraction for non-byte-aligned signals.
func decodeBitLevel(data []byte, signal types.Signal) (interface{}, error) {
	bitStart := signal.Start
	bitLength := signal.Length

	// Calculate the raw value using optimized bit-level access
	var raw uint64

	if signal.ByteOrder == "little_endian" {
		// Little-endian bit numbering (LSB first)
		for i := 0; i < bitLength; i++ {
			bitPos := bitStart + i
			byteIndex := bitPos / 8
			bitIndex := bitPos % 8

			if (data[byteIndex] & (1 << bitIndex)) != 0 {
				raw |= 1 << i
			}
		}
	} else {
		// Big-endian bit numbering (MSB first)
		for i := 0; i < bitLength; i++ {
			bitPos := bitStart + i
			byteIndex := bitPos / 8
			bitIndex := 7 - (bitPos % 8)

			if (data[byteIndex] & (1 << bitIndex)) != 0 {
				raw |= 1 << (bitLength - i - 1)
			}
		}
	}

	// Handle signed values
	if signal.IsSigned {
		// Convert to signed value using two's complement
		signBit := uint64(1) << (bitLength - 1)
		if raw&signBit != 0 {
			// If the sign bit is set, extend the sign
			mask := ^uint64(0) << bitLength
			raw |= mask
		}

		phys := float64(int64(raw))*signal.Factor + signal.Offset
		return int64(phys), nil
	}

	// Handle unsigned values
	phys := float64(raw)*signal.Factor + signal.Offset
	return phys, nil
}

// byteToNibbles converts a byte to its ASCII hex representation
var byteToNibbles [256][2]byte

// Initialize lookup table for byte to hex conversion
func init() {
	// Pre-compute hex representations for all byte values
	for i := 0; i < 256; i++ {
		byteToNibbles[i][0] = hexChar(byte(i >> 4))
		byteToNibbles[i][1] = hexChar(byte(i & 0x0F))
	}
}

// ParseLiveCANPacket converts a space-separated CAN packet string into a byte slice.
// This function is optimized for minimal allocations.
func ParseLiveCANPacket(packet string) ([]byte, error) {
	// Special case for empty packet
	if len(packet) == 0 {
		return nil, fmt.Errorf("empty CAN packet")
	}

	// Fast path for small packets
	if len(packet) <= 32 {
		// Small packet optimization
		return parseSmallCANPacket(packet)
	}

	// Count the fields first to pre-allocate the slice
	fieldCount := 0
	for i := 0; i < len(packet); i++ {
		// Check if we're at the start of a new field
		if packet[i] != ' ' && (i == 0 || packet[i-1] == ' ') {
			fieldCount++
		}
	}

	if fieldCount == 0 {
		return nil, fmt.Errorf("empty CAN packet")
	}

	// Pre-allocate the result
	data := make([]byte, 0, fieldCount)

	// Process each field
	start := 0
	for i := 0; i <= len(packet); i++ {
		if i == len(packet) || packet[i] == ' ' {
			if start < i {
				// Extract the hex value
				hexVal := packet[start:i]
				b, err := parseHexByte(hexVal)
				if err != nil {
					return nil, fmt.Errorf("invalid hex byte '%s' at position %d: %w",
						hexVal, start, err)
				}
				data = append(data, b)
			}
			start = i + 1
		}
	}

	return data, nil
}

// parseSmallCANPacket is an optimized version for small packets
func parseSmallCANPacket(packet string) ([]byte, error) {
	// For small packets, use a stack-allocated buffer
	var buf [16]byte // Most small CAN packets will fit in 16 bytes
	data := buf[:0]

	// Process each space-delimited field
	start := 0
	for i := 0; i <= len(packet); i++ {
		if i == len(packet) || packet[i] == ' ' {
			if start < i {
				// Extract the hex value
				hexVal := packet[start:i]
				b, err := parseHexByte(hexVal)
				if err != nil {
					return nil, fmt.Errorf("invalid hex byte '%s' at position %d: %w",
						hexVal, start, err)
				}
				data = append(data, b)
			}
			start = i + 1
		}
	}

	// Make a copy to return (since we can't return a slice of a stack var)
	result := make([]byte, len(data))
	copy(result, data)
	return result, nil
}

// parseHexByte parses a hex string into a byte with minimal allocations
func parseHexByte(hex string) (byte, error) {
	// Fast path for common 2-character hex values
	if len(hex) == 2 {
		high := hexValue(hex[0])
		low := hexValue(hex[1])

		// Check for invalid characters
		if high < 0 || low < 0 {
			return 0, fmt.Errorf("invalid hex characters")
		}

		return byte(high<<4 | low), nil
	}

	// Fallback to standard library for other cases
	val, err := strconv.ParseUint(hex, 16, 8)
	return byte(val), err
}

// hexValue converts a hex character to its numeric value
func hexValue(c byte) int {
	switch {
	case c >= '0' && c <= '9':
		return int(c - '0')
	case c >= 'a' && c <= 'f':
		return int(c - 'a' + 10)
	case c >= 'A' && c <= 'F':
		return int(c - 'A' + 10)
	default:
		return -1 // Invalid hex character
	}
}

// GetCacheStats returns cache hit/miss statistics
func GetCacheStats() (hits, misses uint64) {
	return atomic.LoadUint64(&cacheHits), atomic.LoadUint64(&cacheMisses)
}

// ClearCache clears the message cache
func ClearCache() {
	msgCache.Lock()
	defer msgCache.Unlock()

	// Reinitialize the cache map
	for id := range msgCache.cache {
		msgCache.cache[id] = make(map[string]*cachedItem)
	}

	// Reset statistics
	atomic.StoreUint64(&cacheHits, 0)
	atomic.StoreUint64(&cacheMisses, 0)
}

// SetCacheEnabled enables or disables the message cache
func SetCacheEnabled(enabled bool) {
	msgCache.Lock()
	defer msgCache.Unlock()

	msgCache.enabled = enabled

	// Clear cache if disabling
	if !enabled {
		for id := range msgCache.cache {
			msgCache.cache[id] = make(map[string]*cachedItem)
		}
	}
}

// SetCacheSize sets the maximum number of entries in the cache per message ID
func SetCacheSize(size int) {
	if size < 10 {
		size = 10 // Enforce minimum size
	}

	msgCache.Lock()
	defer msgCache.Unlock()

	msgCache.maxSize = size
}
