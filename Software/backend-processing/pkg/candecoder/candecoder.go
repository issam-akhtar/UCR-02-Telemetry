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

	msgMap := make(map[uint32]types.Message)
	for _, msg := range messages {
		msgMap[msg.FrameID] = msg
	}

	return messages, msgMap, nil
}

// DecodeMessage decodes all signals for a given message into map[string]string.
func DecodeMessage(data []byte, msg types.Message) (map[string]string, error) {
	decodedSignals := make(map[string]string)
	for _, signal := range msg.Signals {
		value, err := decodeSignal(data, signal, msg.Length)
		if err != nil {
			// Mark as blank if decoding fails
			decodedSignals[signal.Name] = ""
			continue
		}
		var strVal string
		switch v := value.(type) {
		case float64:
			strVal = fmt.Sprintf("%.6f", v)
		case int64:
			strVal = strconv.FormatInt(v, 10)
		default:
			strVal = fmt.Sprintf("%v", v)
		}
		decodedSignals[signal.Name] = strVal
	}
	return decodedSignals, nil
}

// decodeSignal handles an individual signal’s bits.
func decodeSignal(data []byte, signal types.Signal, msgLength int) (interface{}, error) {
	bitStart := signal.Start
	bitEnd := bitStart + signal.Length
	if bitEnd > msgLength*8 {
		return nil, fmt.Errorf("signal %s out of bounds", signal.Name)
	}

	if signal.IsFloat {
		// Only supporting 32 or 64-bit floats
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

		// If big_endian, reverse if needed
		if strings.EqualFold(signal.ByteOrder, "big_endian") {
			for i, j := 0, len(floatBytes)-1; i < j; i, j = i+1, j-1 {
				floatBytes[i], floatBytes[j] = floatBytes[j], floatBytes[i]
			}
		}

		var physical float64
		if signal.Length == 32 {
			bits := binary.LittleEndian.Uint32(floatBytes)
			f32 := math.Float32frombits(bits)
			physical = float64(f32)*signal.Factor + signal.Offset
		} else {
			bits := binary.LittleEndian.Uint64(floatBytes)
			f64 := math.Float64frombits(bits)
			physical = f64*signal.Factor + signal.Offset
		}
		return physical, nil
	}

	// integer signals
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
