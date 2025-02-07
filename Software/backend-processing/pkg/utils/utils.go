package utils

import (
	"encoding/csv"
	"encoding/json"
	"strconv"
	"strings"
	"time"
)

// RemoveEmptyFields returns a new slice without empty entries.
func RemoveEmptyFields(fields []string) []string {
	var out []string
	for _, f := range fields {
		if f != "" {
			out = append(out, f)
		}
	}
	return out
}

// MapToJSON converts a map to its JSON string representation.
func MapToJSON(m map[string]interface{}) (string, error) {
	b, err := json.Marshal(m)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// CurrentTimestampString returns the current time in a standard string format.
func CurrentTimestampString() string {
	return time.Now().Format("2006-01-02 15:04:05.000")
}

// AtoiSafe wraps strconv.Atoi, returning an error if bad input.
func AtoiSafe(s string) (int, error) {
	return strconv.Atoi(s)
}

// ParseFloatSignal tries to parse a float from the map by the key.
func ParseFloatSignal(decoded map[string]string, key string) float64 {
	if val, ok := decoded[key]; ok && val != "" {
		f, err := strconv.ParseFloat(val, 64)
		if err == nil {
			return f
		}
	}
	return 0
}

// ParseIntSignal tries to parse an int from the map by the key.
func ParseIntSignal(decoded map[string]string, key string) int {
	if val, ok := decoded[key]; ok && val != "" {
		i, err := strconv.Atoi(val)
		if err == nil {
			return i
		}
	}
	return 0
}

// ParseCSVLine is a simple wrapper for reading a single line of CSV.
func ParseCSVLine(line string) []string {
	r := csv.NewReader(strings.NewReader(line))
	r.FieldsPerRecord = -1
	record, err := r.Read()
	if err != nil {
		return nil
	}
	return RemoveEmptyFields(record)
}

// RemoveDuplicates removes duplicate integers from a slice.
func RemoveDuplicates(ids []int) []int {
	seen := make(map[int]struct{})
	var result []int
	for _, id := range ids {
		if _, ok := seen[id]; !ok {
			seen[id] = struct{}{}
			result = append(result, id)
		}
	}
	return result
}
