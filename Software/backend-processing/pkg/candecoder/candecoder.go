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
	"strconv"
	"strings"
	"sync"

	"telem-system/pkg/types"
)

// messageCache provides a simple caching mechanism for frequently decoded messages
var messageCache = struct {
	sync.RWMutex
	cache map[uint32]map[string]map[string]string
}{
	cache: make(map[uint32]map[string]map[string]string),
}

// maxCacheSize controls the maximum number of entries in the cache per message ID
const maxCacheSize = 100

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
)

// getCacheKey generates a consistent string key for the message data
func getCacheKey(data []byte) string {
	// Only use first 32 bytes max to keep keys reasonably sized
	maxLen := 32
	if len(data) < maxLen {
		maxLen = len(data)
	}
	return string(data[:maxLen])
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
	for _, msg := range messages {
		msgMap[msg.FrameID] = msg
	}

	// Initialize cache for each message
	messageCache.Lock()
	for id := range msgMap {
		if _, exists := messageCache.cache[id]; !exists {
			messageCache.cache[id] = make(map[string]map[string]string)
		}
	}
	messageCache.Unlock()

	return messages, msgMap, nil
}

// DecodeMessage decodes raw CAN data into a map of signal names and stringified values.
// If a signal cannot be decoded, its value is returned as an empty string.
func DecodeMessage(data []byte, msg types.Message) (map[string]string, error) {
	// Check cache first for identical message data
	cacheKey := getCacheKey(data)

	messageCache.RLock()
	if msgCache, exists := messageCache.cache[msg.FrameID]; exists {
		if cached, found := msgCache[cacheKey]; found {
			messageCache.RUnlock()
			// Return a copy to prevent modification of cached data
			result := make(map[string]string, len(cached))
			for k, v := range cached {
				result[k] = v
			}
			return result, nil
		}
	}
	messageCache.RUnlock()

	// Pad data if shorter than expected (only do this once)
	paddedData := data
	if len(data) < msg.Length {
		paddedData = make([]byte, msg.Length)
		copy(paddedData, data)
	}

	// Pre-allocate the result map with the exact size needed
	decoded := make(map[string]string, len(msg.Signals))

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

	// Cache the result
	messageCache.Lock()
	defer messageCache.Unlock()

	// Check cache size and evict if necessary
	if msgCache, exists := messageCache.cache[msg.FrameID]; exists {
		if len(msgCache) >= maxCacheSize {
			// Simple strategy: just clear the cache for this message ID
			messageCache.cache[msg.FrameID] = make(map[string]map[string]string)
		}

		// Cache a copy of the result
		cachedResult := make(map[string]string, len(decoded))
		for k, v := range decoded {
			cachedResult[k] = v
		}
		messageCache.cache[msg.FrameID][cacheKey] = cachedResult
	}

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

	// Fallback: Optimized bit-level extraction for non-byte-aligned signals
	return decodeBitLevel(data, signal)
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
	} else {
		bufPtr := float64Pool.Get().(*[]byte)
		floatBytes = *bufPtr
		defer float64Pool.Put(bufPtr)
	}

	// Copy the data to our buffer
	copy(floatBytes, data[byteStart:byteStart+bytesNeeded])

	// Handle byte order
	if strings.EqualFold(signal.ByteOrder, "big_endian") {
		reverseBytes(floatBytes)
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

// ParseLiveCANPacket converts a space-separated CAN packet string into a byte slice.
// This function is optimized for minimal allocations.
func ParseLiveCANPacket(packet string) ([]byte, error) {
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
				b, err := strconv.ParseUint(hexVal, 16, 8)
				if err != nil {
					return nil, fmt.Errorf("invalid hex byte '%s' at position %d: %w",
						hexVal, start, err)
				}
				data = append(data, byte(b))
			}
			start = i + 1
		}
	}

	return data, nil
}

// ClearCache clears the message cache
func ClearCache() {
	messageCache.Lock()
	defer messageCache.Unlock()

	// Reinitialize the cache map
	for id := range messageCache.cache {
		messageCache.cache[id] = make(map[string]map[string]string)
	}
}
