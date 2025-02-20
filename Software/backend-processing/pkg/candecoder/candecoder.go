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
	"io/ioutil"
	"math"
	"strconv"
	"strings"

	"telem-system/pkg/types"
)

// LoadJSONDefinitions reads and parses a JSON file containing CAN message definitions.
// It returns both a slice of messages and a map of messages keyed by frame ID.
func LoadJSONDefinitions(jsonPath string) ([]types.Message, map[uint32]types.Message, error) {
	data, err := ioutil.ReadFile(jsonPath)
	if err != nil {
		return nil, nil, fmt.Errorf("read JSON file: %v", err)
	}

	var messages []types.Message
	if err := json.Unmarshal(data, &messages); err != nil {
		return nil, nil, fmt.Errorf("parse JSON: %v", err)
	}

	msgMap := make(map[uint32]types.Message)
	for _, msg := range messages {
		msgMap[msg.FrameID] = msg
	}
	return messages, msgMap, nil
}

// DecodeMessage decodes raw CAN data into a map of signal names and stringified values.
// If a signal cannot be decoded, its value is returned as an empty string.
func DecodeMessage(data []byte, msg types.Message) (map[string]string, error) {
	// Pad data if shorter than expected
	if len(data) < msg.Length {
		pad := make([]byte, msg.Length-len(data))
		data = append(data, pad...)
	}
	decoded := make(map[string]string)

	for _, signal := range msg.Signals {
		val, err := decodeSignal(data, signal, msg.Length)
		if err != nil {
			decoded[signal.Name] = ""
			continue
		}
		switch v := val.(type) {
		case float64:
			// If the value is a whole number, output as an integer string.
			if v == float64(int64(v)) {
				decoded[signal.Name] = strconv.FormatInt(int64(v), 10)
			} else {
				decoded[signal.Name] = fmt.Sprintf("%.6f", v)
			}
		case int64:
			decoded[signal.Name] = strconv.FormatInt(v, 10)
		default:
			decoded[signal.Name] = fmt.Sprintf("%v", v)
		}
	}
	return decoded, nil
}

// decodeSignal extracts and converts a single signal from the provided raw data.
func decodeSignal(data []byte, signal types.Signal, msgLength int) (interface{}, error) {
	bitStart := signal.Start
	bitEnd := bitStart + signal.Length
	if bitEnd > msgLength*8 {
		return nil, fmt.Errorf("signal %s out of bounds", signal.Name)
	}

	// Handle float signals separately.
	if signal.IsFloat {
		if signal.Length != 32 && signal.Length != 64 {
			return nil, fmt.Errorf("unsupported float length %d for %s", signal.Length, signal.Name)
		}
		byteStart := bitStart / 8
		byteEnd := (bitStart + signal.Length) / 8
		if byteEnd > len(data) {
			return nil, fmt.Errorf("data too short for %s", signal.Name)
		}
		floatBytes := make([]byte, signal.Length/8)
		copy(floatBytes, data[byteStart:byteEnd])
		// Adjust for byte order.
		if strings.EqualFold(signal.ByteOrder, "big_endian") {
			for i, j := 0, len(floatBytes)-1; i < j; i, j = i+1, j-1 {
				floatBytes[i], floatBytes[j] = floatBytes[j], floatBytes[i]
			}
		}
		var physical float64
		if signal.Length == 32 {
			bits := binary.LittleEndian.Uint32(floatBytes)
			physical = float64(math.Float32frombits(bits))*signal.Factor + signal.Offset
		} else {
			bits := binary.LittleEndian.Uint64(floatBytes)
			physical = float64(math.Float64frombits(bits))*signal.Factor + signal.Offset
		}
		return physical, nil
	}

	// For little-endian integer signals that are whole-byte aligned.
	if signal.ByteOrder == "little_endian" && signal.Length%8 == 0 && bitStart%8 == 0 {
		numBytes := signal.Length / 8
		startByte := bitStart / 8
		endByte := startByte + numBytes
		if endByte > len(data) {
			return nil, fmt.Errorf("signal %s out of bounds", signal.Name)
		}
		bytesSlice := data[startByte:endByte]
		reversed := make([]byte, numBytes)
		for i := 0; i < numBytes; i++ {
			reversed[i] = bytesSlice[numBytes-1-i]
		}
		raw := 0
		for i, b := range reversed {
			raw |= int(b) << (8 * (numBytes - 1 - i))
		}
		phys := float64(raw)*signal.Factor + signal.Offset
		if signal.IsSigned {
			return int64(phys), nil
		}
		return phys, nil
	}

	// Fallback: bit-by-bit extraction.
	var raw int
	for i := bitStart; i < bitEnd; i++ {
		byteIndex := i / 8
		bitIndex := i % 8
		raw |= int((data[byteIndex]>>bitIndex)&1) << (i - bitStart)
	}
	if signal.IsSigned {
		maxVal := 1 << (signal.Length - 1)
		if raw >= maxVal {
			raw -= 1 << signal.Length
		}
	}
	phys := float64(raw)*signal.Factor + signal.Offset
	if signal.IsSigned {
		return int64(phys), nil
	}
	return phys, nil
}

// ParseLiveCANPacket converts a space-separated CAN packet string into a byte slice.
func ParseLiveCANPacket(packet string) ([]byte, error) {
	parts := strings.Fields(packet)
	if len(parts) == 0 {
		return nil, fmt.Errorf("empty CAN packet")
	}
	data := make([]byte, len(parts))
	for i, part := range parts {
		b, err := strconv.ParseUint(part, 16, 8)
		if err != nil {
			return nil, fmt.Errorf("parse hex byte '%s': %v", part, err)
		}
		data[i] = byte(b)
	}
	return data, nil
}
