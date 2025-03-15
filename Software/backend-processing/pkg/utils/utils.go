// utils.go
//
// Package utils provides a collection of helper functions for string manipulation,
// CSV parsing, JSON conversion, timestamp formatting, and safe number parsing.
// These utilities are used throughout the telemetry system for decoding and data processing.
package utils

import (
	"encoding/csv"
	"encoding/json"
	"strconv"
	"strings"
	"time"
)

// RemoveEmptyFields filters out empty strings from a slice.
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

// CurrentTimestampString returns the current time formatted as a timestamp string.
func CurrentTimestampString() string {
	return time.Now().Format("2006-01-02 15:04:05.000")
}

// AtoiSafe attempts to convert a string to an integer.
func AtoiSafe(s string) (int, error) {
	return strconv.Atoi(s)
}

// ParseFloatSignal extracts a float64 value from a map given a key.
// If the value is missing or cannot be parsed, it returns 0.
func ParseFloatSignal(decoded map[string]string, key string) float64 {
	if val, ok := decoded[key]; ok && val != "" {
		if f, err := strconv.ParseFloat(val, 64); err == nil {
			return f
		}
	}
	return 0
}

// ParseIntSignal extracts an integer value from a map given a key.
// If the value is missing or cannot be parsed, it returns 0.
func ParseIntSignal(decoded map[string]string, key string) int {
	if val, ok := decoded[key]; ok && val != "" {
		if i, err := strconv.Atoi(val); err == nil {
			return i
		}
	}
	return 0
}

// ParseCSVLine reads a CSV line and returns a slice of non-empty fields.
func ParseCSVLine(line string) []string {
	r := csv.NewReader(strings.NewReader(line))
	// Allow a variable number of fields per record.
	r.FieldsPerRecord = -1
	record, err := r.Read()
	if err != nil {
		return nil
	}
	return RemoveEmptyFields(record)
}

// RemoveDuplicates returns a slice with duplicate integers removed.
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
