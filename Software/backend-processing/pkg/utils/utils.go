// pkg/utils/utils.go
package utils

import (
	"bufio"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"telem-system/pkg/types"
)

// RemoveEmptyFields removes empty strings from a slice.
func RemoveEmptyFields(fields []string) []string {
	var result []string
	for _, field := range fields {
		if field != "" {
			result = append(result, field)
		}
	}
	return result
}

// Contains checks if a slice contains a specific string.
func Contains(slice []string, target string) bool {
	for _, v := range slice {
		if v == target {
			return true
		}
	}
	return false
}

// RemoveDuplicates removes duplicate integers from a slice.
func RemoveDuplicates(ids []int) []int {
	unique := make(map[int]bool)
	var result []int
	for _, id := range ids {
		if !unique[id] {
			unique[id] = true
			result = append(result, id)
		}
	}
	return result
}

// ExpandCANIDOption expands a single CAN ID or a range of CAN IDs into a slice of integers.
func ExpandCANIDOption(option string) ([]int, error) {
	// Handle the case where 'All' is specified
	if strings.EqualFold(option, "All") {
		return []int{-1}, nil // Sentinel value for 'All'
	}

	// Handle a range of CAN IDs (e.g., "100-105")
	if strings.Contains(option, "-") {
		parts := strings.Split(option, "-")
		if len(parts) != 2 {
			return nil, fmt.Errorf("invalid range format")
		}
		start, err := strconv.Atoi(parts[0])
		if err != nil {
			return nil, fmt.Errorf("invalid start of range: %v", err)
		}
		end, err := strconv.Atoi(parts[1])
		if err != nil {
			return nil, fmt.Errorf("invalid end of range: %v", err)
		}
		if start > end {
			return nil, fmt.Errorf("start of range is greater than end")
		}
		var ids []int
		for i := start; i <= end; i++ {
			ids = append(ids, i)
		}
		return ids, nil
	}

	// Handle a single CAN ID
	id, err := strconv.Atoi(option)
	if err != nil {
		return nil, fmt.Errorf("invalid CAN ID: %v", err)
	}
	return []int{id}, nil
}

// PromptUserForCANIDs prompts the user to select CAN IDs from predefined options.
func PromptUserForCANIDs(options []types.Option) ([]int, error) {
	// Display available options to the user
	fmt.Println("\nPlease select the CAN IDs to include in output.csv from the list below:")
	for _, option := range options {
		fmt.Printf("%d. %s (%s)\n", option.Index, option.Range, option.Description)
	}
	fmt.Println("Enter the numbers corresponding to your choices, separated by commas (e.g., 0,2,4).")
	fmt.Println("Enter '0' or 'All' to include all CAN IDs.")

	// Read user input
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Your selection: ")
	input, err := reader.ReadString('\n')
	if err != nil {
		return nil, fmt.Errorf("error reading input: %v", err)
	}

	// Clean up input and validate
	input = strings.TrimSpace(input)
	if input == "" {
		return nil, fmt.Errorf("no input provided")
	}
	choices := strings.Split(input, ",")

	var selectedCANIDs []int
	includeAll := false

	// Process each choice from the user
	for _, choice := range choices {
		choice = strings.TrimSpace(choice)
		if choice == "" {
			continue
		}

		// Handle '0' or 'All' to select all CAN IDs
		if choice == "0" || strings.EqualFold(choice, "all") {
			includeAll = true
			break // No need to process further if 'All' is selected
		}

		// Validate the choice and expand the CAN ID option
		index, err := strconv.Atoi(choice)
		if err != nil || index < 0 || index >= len(options) {
			fmt.Printf("Invalid choice: %s. Skipping...\n", choice)
			continue
		}

		selectedOption := options[index]
		ids, err := ExpandCANIDOption(selectedOption.Range)
		if err != nil {
			fmt.Printf("Error expanding option '%s': %v. Skipping...\n", selectedOption.Range, err)
			continue
		}
		selectedCANIDs = append(selectedCANIDs, ids...)
	}

	// If 'All' was selected, return sentinel value
	if includeAll {
		return []int{-1}, nil
	}

	// Remove duplicates and sort the selected CAN IDs
	selectedCANIDs = RemoveDuplicates(selectedCANIDs)
	sort.Ints(selectedCANIDs)

	// Display the selected CAN IDs for confirmation
	fmt.Println("Selected CAN IDs:", selectedCANIDs)

	return selectedCANIDs, nil
}

// ParseFloatSignal parses a float signal from the decoded signals map.
func ParseFloatSignal(decodedSignalsMap map[string]string, key string) float64 {
	if val, exists := decodedSignalsMap[key]; exists && val != "" {
		floatVal, err := strconv.ParseFloat(val, 64)
		if err == nil {
			return floatVal
		}
	}
	return 0
}

// ParseIntSignal parses an integer signal from the decoded signals map.
func ParseIntSignal(decodedSignalsMap map[string]string, key string) int {
	if val, exists := decodedSignalsMap[key]; exists && val != "" {
		intVal, err := strconv.Atoi(val)
		if err == nil {
			return intVal
		}
	}
	return 0
}

// RemoveSentinelValue removes a sentinel value from a slice.
func RemoveSentinelValue(ids []int, sentinel int) []int {
	for i, id := range ids {
		if id == sentinel {
			return append(ids[:i], ids[i+1:]...)
		}
	}
	return ids
}
