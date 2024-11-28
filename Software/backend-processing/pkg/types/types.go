// pkg/types/types.go
package types

import (
	"fmt"
	"strconv"
	"strings"
	"unicode"
)

// Signal represents a signal in a CAN message
type Signal struct {
	Name      string            `json:"name"`
	Start     int               `json:"start_bit"`
	Length    int               `json:"length"`
	ByteOrder string            `json:"byte_order"`
	IsSigned  bool              `json:"is_signed"`
	IsFloat   bool              `json:"is_float"`
	Factor    float64           `json:"factor"`
	Offset    float64           `json:"offset"`
	Minimum   *float64          `json:"minimum"`
	Maximum   *float64          `json:"maximum"`
	Unit      string            `json:"unit"`
	Choices   map[string]string `json:"choices"`
}

// Message represents a CAN message
type Message struct {
	FrameID         uint32   `json:"frame_id"`
	Name            string   `json:"name"`
	IsExtendedFrame bool     `json:"is_extended_frame"`
	Length          int      `json:"length"` // in bytes
	Signals         []Signal `json:"signals"`
}

// Data structure definitions for various CAN messages
type (
	TCU_Data struct {
		APPS1  float64
		APPS2  float64
		BSE    float64
		Status int
	}

	FrontStrainGauges1_Data struct {
		Gauge1, Gauge2, Gauge3, Gauge4, Gauge5, Gauge6 int
	}

	FrontStrainGauges2_Data FrontStrainGauges1_Data

	PDMReTransmit_Data struct {
		PDMIntTemperature   int
		PDMBattVoltage      float64
		GlobalErrorFlag     int
		TotalCurrent        int
		InternalRailVoltage float64
		ResetSource         int
	}

	PDMCurrent_Data struct {
		AccumulatorCurrent   int
		TCUCurrent           int
		BamocarCurrent       int
		PumpsCurrent         int
		TSALCurrent          int
		DAQCurrent           int
		DisplayKvaserCurrent int
		ShutdownResetCurrent int
	}

	ACULV_FD_1_Data struct {
		AMSStatus            int
		FLD                  int
		StateOfCharge        float64
		AccumulatorVoltage   float64
		TractiveVoltage      float64
		CellCurrent          float64
		IsolationMonitoring  int
		IsolationMonitoring1 float64
	}

	PackCurrent_Data struct {
		Current float64
	}

	PackVoltage_Data struct {
		Voltage float64
	}

	Cell_Data struct {
		Cells [128]float64
	}

	Bamocar_Data struct {
		BamocarFRG int
		BamocarRFE int
		BrakeLight int
	}

	INS_GPS_Data struct {
		GNSSWeek    int
		GNSSSeconds float64
		GNSSLat     float64
		GNSSLong    float64
		GNSSHeight  float64
	}

	INS_IMU_Data struct {
		NorthVel, EastVel, UpVel, Roll, Pitch, Azimuth float64
		Status                                         int
	}

	FrontFrequency_Data struct {
		RearRight, FrontRight, RearLeft, FrontLeft float64
	}

	FrontAnalog_Data struct {
		LeftRad, RightRad, Analog8                int
		FrontRightPot, FrontLeftPot, RearRightPot float64
		RearLeftPot, SteeringAngle                float64
	}

	BamocarTxData_Data struct {
		REGID int
		Data  int
	}

	BamoCarReTransmit_Data struct {
		MotorTemp, ControllerTemp int
	}

	Encoder_Data struct {
		Encoder1, Encoder2, Encoder3, Encoder4 int
	}

	// Option represents a selectable CAN ID option with a description
	Option struct {
		Index       int
		Description string
		Range       string
	}
)

// NaturalSort is a custom sorter for headers
type NaturalSort []string

func (ns NaturalSort) Len() int           { return len(ns) }
func (ns NaturalSort) Swap(i, j int)      { ns[i], ns[j] = ns[j], ns[i] }
func (ns NaturalSort) Less(i, j int) bool { return naturalCompare(ns[i], ns[j]) }

// naturalCompare compares two strings with a 'natural' sorting order
func naturalCompare(a, b string) bool {
	// Compare based on Cell prefix
	if strings.HasPrefix(a, "Cell") && strings.HasPrefix(b, "Cell") {
		numA, errA := extractNumber(a, "Cell")
		numB, errB := extractNumber(b, "Cell")
		if errA == nil && errB == nil {
			return numA < numB
		}
	}

	// Compare based on Therm prefix
	if strings.HasPrefix(a, "Therm") && strings.HasPrefix(b, "Therm") {
		numA, errA := extractNumber(a, "Therm")
		numB, errB := extractNumber(b, "Therm")
		if errA == nil && errB == nil {
			return numA < numB
		}
	}

	// Default to lexicographical comparison
	return a < b
}

// extractNumber extracts the numerical suffix from a header.
func extractNumber(header, prefix string) (int, error) {
	numStr := strings.TrimPrefix(header, prefix)
	// Ensure the remaining string is a number
	for _, r := range numStr {
		if !unicode.IsDigit(r) {
			return 0, fmt.Errorf("non-digit character found in header: %s", header)
		}
	}
	return strconv.Atoi(numStr)
}
