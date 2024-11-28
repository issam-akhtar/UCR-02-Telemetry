// pkg/candecoder/candecoder.go
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

var messageMap map[uint32]types.Message

// LoadJSONDefinitions loads CAN message definitions from a JSON file.
func LoadJSONDefinitions(jsonPath string) ([]types.Message, map[uint32]types.Message, error) {
	data, err := ioutil.ReadFile(jsonPath)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to read JSON file: %v", err)
	}

	var messages []types.Message
	if err := json.Unmarshal(data, &messages); err != nil {
		return nil, nil, fmt.Errorf("failed to parse JSON: %v", err)
	}

	messageMap = make(map[uint32]types.Message)
	for _, msg := range messages {
		messageMap[msg.FrameID] = msg
	}

	return messages, messageMap, nil
}

// DecodeSignal decodes a single signal from data based on the signal definition.
func DecodeSignal(data []byte, signal types.Signal, messageLength int) (interface{}, error) {
	// Extract bits based on start and length
	bitStart := signal.Start
	bitEnd := bitStart + signal.Length
	if bitEnd > messageLength*8 {
		return nil, fmt.Errorf("signal %s exceeds message length", signal.Name)
	}

	if signal.IsFloat {
		// Handle float signal (assuming float32 for 32 bits and float64 for 64 bits)
		if signal.Length != 32 && signal.Length != 64 {
			return nil, fmt.Errorf("unsupported float length %d for signal %s", signal.Length, signal.Name)
		}

		// Calculate byte indices
		byteStart := bitStart / 8
		byteEnd := (bitStart + signal.Length) / 8
		if byteEnd > len(data) {
			return nil, fmt.Errorf("data too short for signal %s", signal.Name)
		}

		// Extract the relevant bytes
		floatBytes := data[byteStart:byteEnd]

		// Handle byte order
		if strings.EqualFold(signal.ByteOrder, "big_endian") {
			// For big endian, ensure bytes are in network byte order
			// No action needed if data is already in big endian
			// If data is in little endian, reverse the bytes
			// Assuming data is in little endian by default
			for i, j := 0, len(floatBytes)-1; i < j; i, j = i+1, j-1 {
				floatBytes[i], floatBytes[j] = floatBytes[j], floatBytes[i]
			}
		}
		// Else, little endian: bytes are already in correct order

		var physicalValue float64
		if signal.Length == 32 {
			bits := binary.LittleEndian.Uint32(floatBytes)
			floatVal := math.Float32frombits(bits)
			physicalValue = float64(floatVal)*signal.Factor + signal.Offset
		} else if signal.Length == 64 {
			bits := binary.LittleEndian.Uint64(floatBytes)
			floatVal := math.Float64frombits(bits)
			physicalValue = floatVal*signal.Factor + signal.Offset
		}

		return physicalValue, nil
	}

	// Else handle as integer signal
	raw := 0
	for i := bitStart; i < bitEnd; i++ {
		byteIndex := i / 8
		bitIndex := i % 8
		raw |= int(data[byteIndex]>>bitIndex&1) << (i - bitStart)
	}

	// Handle signedness
	if signal.IsSigned {
		max := 1 << (signal.Length - 1)
		if raw >= max {
			raw -= 1 << signal.Length
		}
	}

	// Apply scaling and offset
	physicalValue := float64(raw)*signal.Factor + signal.Offset

	if signal.IsSigned {
		return int64(physicalValue), nil
	}

	return physicalValue, nil
}

// DecodeMessage decodes all signals for a given message.
func DecodeMessage(data []byte, msg types.Message) (map[string]string, error) {
	decodedSignals := make(map[string]string)
	for _, signal := range msg.Signals {
		value, err := DecodeSignal(data, signal, msg.Length)
		if err != nil {
			decodedSignals[signal.Name] = ""
			continue
		}

		var formattedValue string
		switch v := value.(type) {
		case float64:
			formattedValue = fmt.Sprintf("%.6f", v)
		case int64:
			formattedValue = strconv.FormatInt(v, 10)
		default:
			formattedValue = fmt.Sprintf("%v", v)
		}

		decodedSignals[signal.Name] = formattedValue
	}
	return decodedSignals, nil
}
