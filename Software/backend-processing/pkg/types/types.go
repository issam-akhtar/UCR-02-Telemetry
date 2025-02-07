package types

import (
	"fmt"
	"strconv"
	"strings"
	"time"
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

// TCU_Data represents the TCU telemetry data
type TCU_Data struct {
	Timestamp time.Time `json:"timestamp"`
	APPS1     float64   `json:"apps1"`
	APPS2     float64   `json:"apps2"`
	BSE       float64   `json:"bse"`
	Status    int       `json:"status"`
}

// Therm_Data represents the Thermistor telemetry data
type Therm_Data struct {
	Timestamp    time.Time `json:"timestamp"`
	ThermistorID int       `json:"thermistor_id"`
	Therm1       float64   `json:"therm1"`
	Therm2       float64   `json:"therm2"`
	Therm3       float64   `json:"therm3"`
	Therm4       float64   `json:"therm4"`
	Therm5       float64   `json:"therm5"`
	Therm6       float64   `json:"therm6"`
	Therm7       float64   `json:"therm7"`
	Therm8       float64   `json:"therm8"`
	Therm9       float64   `json:"therm9"`
	Therm10      float64   `json:"therm10"`
	Therm11      float64   `json:"therm11"`
	Therm12      float64   `json:"therm12"`
	Therm13      float64   `json:"therm13"`
	Therm14      float64   `json:"therm14"`
	Therm15      float64   `json:"therm15"`
	Therm16      float64   `json:"therm16"`
}

// Cell_Data represents Cell telemetry data for cells 1..128
type Cell_Data struct {
	Timestamp time.Time `json:"timestamp"`

	Cell1 float64 `json:"Cell1"`
	Cell2 float64 `json:"Cell2"`
	Cell3 float64 `json:"Cell3"`
	Cell4 float64 `json:"Cell4"`
	Cell5 float64 `json:"Cell5"`
	Cell6 float64 `json:"Cell6"`
	Cell7 float64 `json:"Cell7"`
	Cell8 float64 `json:"Cell8"`

	Cell9  float64 `json:"Cell9"`
	Cell10 float64 `json:"Cell10"`
	Cell11 float64 `json:"Cell11"`
	Cell12 float64 `json:"Cell12"`
	Cell13 float64 `json:"Cell13"`
	Cell14 float64 `json:"Cell14"`
	Cell15 float64 `json:"Cell15"`
	Cell16 float64 `json:"Cell16"`

	Cell17 float64 `json:"Cell17"`
	Cell18 float64 `json:"Cell18"`
	Cell19 float64 `json:"Cell19"`
	Cell20 float64 `json:"Cell20"`
	Cell21 float64 `json:"Cell21"`
	Cell22 float64 `json:"Cell22"`
	Cell23 float64 `json:"Cell23"`
	Cell24 float64 `json:"Cell24"`

	Cell25 float64 `json:"Cell25"`
	Cell26 float64 `json:"Cell26"`
	Cell27 float64 `json:"Cell27"`
	Cell28 float64 `json:"Cell28"`
	Cell29 float64 `json:"Cell29"`
	Cell30 float64 `json:"Cell30"`
	Cell31 float64 `json:"Cell31"`
	Cell32 float64 `json:"Cell32"`

	Cell33 float64 `json:"Cell33"`
	Cell34 float64 `json:"Cell34"`
	Cell35 float64 `json:"Cell35"`
	Cell36 float64 `json:"Cell36"`
	Cell37 float64 `json:"Cell37"`
	Cell38 float64 `json:"Cell38"`
	Cell39 float64 `json:"Cell39"`
	Cell40 float64 `json:"Cell40"`

	Cell41 float64 `json:"Cell41"`
	Cell42 float64 `json:"Cell42"`
	Cell43 float64 `json:"Cell43"`
	Cell44 float64 `json:"Cell44"`
	Cell45 float64 `json:"Cell45"`
	Cell46 float64 `json:"Cell46"`
	Cell47 float64 `json:"Cell47"`
	Cell48 float64 `json:"Cell48"`

	Cell49 float64 `json:"Cell49"`
	Cell50 float64 `json:"Cell50"`
	Cell51 float64 `json:"Cell51"`
	Cell52 float64 `json:"Cell52"`
	Cell53 float64 `json:"Cell53"`
	Cell54 float64 `json:"Cell54"`
	Cell55 float64 `json:"Cell55"`
	Cell56 float64 `json:"Cell56"`

	Cell57 float64 `json:"Cell57"`
	Cell58 float64 `json:"Cell58"`
	Cell59 float64 `json:"Cell59"`
	Cell60 float64 `json:"Cell60"`
	Cell61 float64 `json:"Cell61"`
	Cell62 float64 `json:"Cell62"`
	Cell63 float64 `json:"Cell63"`
	Cell64 float64 `json:"Cell64"`

	Cell65 float64 `json:"Cell65"`
	Cell66 float64 `json:"Cell66"`
	Cell67 float64 `json:"Cell67"`
	Cell68 float64 `json:"Cell68"`
	Cell69 float64 `json:"Cell69"`
	Cell70 float64 `json:"Cell70"`
	Cell71 float64 `json:"Cell71"`
	Cell72 float64 `json:"Cell72"`

	Cell73 float64 `json:"Cell73"`
	Cell74 float64 `json:"Cell74"`
	Cell75 float64 `json:"Cell75"`
	Cell76 float64 `json:"Cell76"`
	Cell77 float64 `json:"Cell77"`
	Cell78 float64 `json:"Cell78"`
	Cell79 float64 `json:"Cell79"`
	Cell80 float64 `json:"Cell80"`

	Cell81 float64 `json:"Cell81"`
	Cell82 float64 `json:"Cell82"`
	Cell83 float64 `json:"Cell83"`
	Cell84 float64 `json:"Cell84"`
	Cell85 float64 `json:"Cell85"`
	Cell86 float64 `json:"Cell86"`
	Cell87 float64 `json:"Cell87"`
	Cell88 float64 `json:"Cell88"`

	Cell89 float64 `json:"Cell89"`
	Cell90 float64 `json:"Cell90"`
	Cell91 float64 `json:"Cell91"`
	Cell92 float64 `json:"Cell92"`
	Cell93 float64 `json:"Cell93"`
	Cell94 float64 `json:"Cell94"`
	Cell95 float64 `json:"Cell95"`
	Cell96 float64 `json:"Cell96"`

	Cell97  float64 `json:"Cell97"`
	Cell98  float64 `json:"Cell98"`
	Cell99  float64 `json:"Cell99"`
	Cell100 float64 `json:"Cell100"`
	Cell101 float64 `json:"Cell101"`
	Cell102 float64 `json:"Cell102"`
	Cell103 float64 `json:"Cell103"`
	Cell104 float64 `json:"Cell104"`

	Cell105 float64 `json:"Cell105"`
	Cell106 float64 `json:"Cell106"`
	Cell107 float64 `json:"Cell107"`
	Cell108 float64 `json:"Cell108"`
	Cell109 float64 `json:"Cell109"`
	Cell110 float64 `json:"Cell110"`
	Cell111 float64 `json:"Cell111"`
	Cell112 float64 `json:"Cell112"`

	Cell113 float64 `json:"Cell113"`
	Cell114 float64 `json:"Cell114"`
	Cell115 float64 `json:"Cell115"`
	Cell116 float64 `json:"Cell116"`
	Cell117 float64 `json:"Cell117"`
	Cell118 float64 `json:"Cell118"`
	Cell119 float64 `json:"Cell119"`
	Cell120 float64 `json:"Cell120"`

	Cell121 float64 `json:"Cell121"`
	Cell122 float64 `json:"Cell122"`
	Cell123 float64 `json:"Cell123"`
	Cell124 float64 `json:"Cell124"`
	Cell125 float64 `json:"Cell125"`
	Cell126 float64 `json:"Cell126"`
	Cell127 float64 `json:"Cell127"`
	Cell128 float64 `json:"Cell128"`
}

// Bamocar_Data represents Bamocar telemetry data
type Bamocar_Data struct {
	Timestamp  time.Time `json:"timestamp"`
	BamocarFRG int       `json:"bamocar_frg"`
	BamocarRFE int       `json:"bamocar_rfe"`
	BrakeLight int       `json:"brake_light"`
}

// BamocarTxData_Data represents Bamocar Tx Data telemetry data
type BamocarTxData_Data struct {
	Timestamp time.Time `json:"timestamp"`
	REGID     int       `json:"regid"`
	Data      int       `json:"data"`
}

// BamoCarReTransmit_Data represents Bamo Car Re-transmit telemetry data
type BamoCarReTransmit_Data struct {
	Timestamp      time.Time `json:"timestamp"`
	MotorTemp      int       `json:"motor_temp"`
	ControllerTemp int       `json:"controller_temp"`
}

// Encoder_Data represents Encoder telemetry data
type Encoder_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Encoder1  int       `json:"encoder1"`
	Encoder2  int       `json:"encoder2"`
	Encoder3  int       `json:"encoder3"`
	Encoder4  int       `json:"encoder4"`
}

// PackCurrent_Data represents Pack Current telemetry data
type PackCurrent_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Current   float64   `json:"packcurrent"`
}

// PackVoltage_Data represents Pack Voltage telemetry data
type PackVoltage_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Voltage   float64   `json:"packvoltage"`
}

// PDMCurrent_Data represents PDM current telemetry data
type PDMCurrent_Data struct {
	Timestamp            time.Time `json:"timestamp"`
	AccumulatorCurrent   int       `json:"accumulator_current"`
	TCUCurrent           int       `json:"tcu_current"`
	BamocarCurrent       int       `json:"bamocar_current"`
	PumpsCurrent         int       `json:"pumps_current"`
	TSALCurrent          int       `json:"tsal_current"`
	DAQCurrent           int       `json:"daq_current"`
	DisplayKvaserCurrent int       `json:"display_kvaser_current"`
	ShutdownResetCurrent int       `json:"shutdown_reset_current"`
}

// PDMReTransmit_Data represents PDM Re-transmit telemetry data
type PDMReTransmit_Data struct {
	Timestamp           time.Time `json:"timestamp"`
	PDMIntTemperature   int       `json:"pdm_int_temperature"`
	PDMBattVoltage      float64   `json:"pdm_batt_voltage"`
	GlobalErrorFlag     int       `json:"global_error_flag"`
	TotalCurrent        int       `json:"total_current"`
	InternalRailVoltage float64   `json:"internal_rail_voltage"`
	ResetSource         int       `json:"reset_source"`
}

// INS_GPS_Data represents INS GPS telemetry data
type INS_GPS_Data struct {
	Timestamp   time.Time `json:"timestamp"`
	GNSSWeek    int       `json:"gnss_week"`
	GNSSSeconds float64   `json:"gnss_seconds"`
	GNSSLat     float64   `json:"gnss_lat"`
	GNSSLong    float64   `json:"gnss_long"`
	GNSSHeight  float64   `json:"gnss_height"`
}

// INS_IMU_Data represents INS IMU telemetry data
type INS_IMU_Data struct {
	Timestamp time.Time `json:"timestamp"`
	NorthVel  float64   `json:"north_vel"`
	EastVel   float64   `json:"east_vel"`
	UpVel     float64   `json:"up_vel"`
	Roll      float64   `json:"roll"`
	Pitch     float64   `json:"pitch"`
	Azimuth   float64   `json:"azimuth"`
	Status    int       `json:"status"`
}

// FrontFrequency_Data represents Front Frequency telemetry data
type FrontFrequency_Data struct {
	Timestamp  time.Time `json:"timestamp"`
	RearRight  float64   `json:"rear_right"`
	FrontRight float64   `json:"front_right"`
	RearLeft   float64   `json:"rear_left"`
	FrontLeft  float64   `json:"front_left"`
}

// FrontAnalog_Data represents Front Analog telemetry data
type FrontAnalog_Data struct {
	Timestamp     time.Time `json:"timestamp"`
	LeftRad       int       `json:"left_rad"`
	RightRad      int       `json:"right_rad"`
	FrontRightPot float64   `json:"front_right_pot"`
	FrontLeftPot  float64   `json:"front_left_pot"`
	RearRightPot  float64   `json:"rear_right_pot"`
	RearLeftPot   float64   `json:"rear_left_pot"`
	SteeringAngle float64   `json:"steering_angle"`
	Analog8       int       `json:"analog8"`
}

// FrontStrainGauges1_Data represents Front Strain Gauges 1 telemetry data
type FrontStrainGauges1_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Gauge1    int       `json:"gauge1"`
	Gauge2    int       `json:"gauge2"`
	Gauge3    int       `json:"gauge3"`
	Gauge4    int       `json:"gauge4"`
	Gauge5    int       `json:"gauge5"`
	Gauge6    int       `json:"gauge6"`
}

// FrontStrainGauges2_Data represents Front Strain Gauges 2 telemetry data
type FrontStrainGauges2_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Gauge1    int       `json:"gauge1"`
	Gauge2    int       `json:"gauge2"`
	Gauge3    int       `json:"gauge3"`
	Gauge4    int       `json:"gauge4"`
	Gauge5    int       `json:"gauge5"`
	Gauge6    int       `json:"gauge6"`
}

// ACULV_FD_1_Data represents ACULV FD 1 telemetry data
type ACULV_FD_1_Data struct {
	Timestamp           time.Time `json:"timestamp"`
	AMSStatus           int       `json:"ams_status"`
	FLD                 int       `json:"fld"`
	StateOfCharge       float64   `json:"state_of_charge"`
	AccumulatorVoltage  float64   `json:"accumulator_voltage"`
	TractiveVoltage     float64   `json:"tractive_voltage"`
	CellCurrent         float64   `json:"cell_current"`
	IsolationMonitoring int       `json:"isolation_monitoring"`
	// This is named "IsolationMonitoring1" in your snippet; rename or keep it as is:
	IsolationMonitoring1 float64 `json:"isolation_monitoring1"`
}

// Option represents a selectable CAN ID option with a description
type Option struct {
	Index       int    `json:"index"`
	Description string `json:"description"`
	Range       string `json:"range"`
}

// NaturalSort is a custom sorter for headers
type NaturalSort []string

func (ns NaturalSort) Len() int           { return len(ns) }
func (ns NaturalSort) Swap(i, j int)      { ns[i], ns[j] = ns[j], ns[i] }
func (ns NaturalSort) Less(i, j int) bool { return naturalCompare(ns[i], ns[j]) }

// naturalCompare compares two strings with a 'natural' sorting order
func naturalCompare(a, b string) bool {
	// Example: "Cell1" < "Cell2" < "Cell10"
	if strings.HasPrefix(a, "Cell") && strings.HasPrefix(b, "Cell") {
		numA, errA := extractNumber(a, "Cell")
		numB, errB := extractNumber(b, "Cell")
		if errA == nil && errB == nil {
			return numA < numB
		}
	}
	// Example: "Therm1" < "Therm2" < "Therm10"
	if strings.HasPrefix(a, "Therm") && strings.HasPrefix(b, "Therm") {
		numA, errA := extractNumber(a, "Therm")
		numB, errB := extractNumber(b, "Therm")
		if errA == nil && errB == nil {
			return numA < numB
		}
	}
	return a < b
}

func extractNumber(header, prefix string) (int, error) {
	numStr := strings.TrimPrefix(header, prefix)
	for _, r := range numStr {
		if !unicode.IsDigit(r) {
			return 0, fmt.Errorf("non-digit character found in header: %s", header)
		}
	}
	return strconv.Atoi(numStr)
}
