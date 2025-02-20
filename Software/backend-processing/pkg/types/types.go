package types

import (
	"fmt"
	"strconv"
	"strings"
	"time"
	"unicode"
)

// Signal represents a signal in a CAN message.
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

type RearStrainGauges2_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Gauge1    int       `json:"gauge1"`
	Gauge2    int       `json:"gauge2"`
	Gauge3    int       `json:"gauge3"`
	Gauge4    int       `json:"gauge4"`
	Gauge5    int       `json:"gauge5"`
	Gauge6    int       `json:"gauge6"`
}

type RearStrainGauges1_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Gauge1    int       `json:"gauge1"`
	Gauge2    int       `json:"gauge2"`
	Gauge3    int       `json:"gauge3"`
	Gauge4    int       `json:"gauge4"`
	Gauge5    int       `json:"gauge5"`
	Gauge6    int       `json:"gauge6"`
}

// Message represents a CAN message.
type Message struct {
	FrameID         uint32   `json:"frame_id"`
	Name            string   `json:"name"`
	IsExtendedFrame bool     `json:"is_extended_frame"`
	Length          int      `json:"length"`
	Signals         []Signal `json:"signals"`
}

// TCU_Data represents the TCU telemetry data.
type TCU_Data struct {
	Timestamp time.Time `json:"timestamp"`
	APPS1     float64   `json:"apps1"`
	APPS2     float64   `json:"apps2"`
	BSE       float64   `json:"bse"`
	Status    int       `json:"status"`
}

// TCU2_data represents the TCU2 (Bamocar) telemetry data.
type TCU2_data struct {
	Timestamp  time.Time `json:"timestamp"`
	BrakeLight int       `json:"brake_light"`
	BamocarRFE int       `json:"bamocar_rfe"`
	BamocarFRG int       `json:"bamocar_frg"`
}

type RearAero_Data struct {
	Timestamp    time.Time `json:"timestamp"`
	Pressure1    int       `json:"pressure1"`
	Pressure2    int       `json:"pressure2"`
	Pressure3    int       `json:"pressure3"`
	Temperature1 int       `json:"temperature1"`
	Temperature2 int       `json:"temperature2"`
	Temperature3 int       `json:"temperature3"`
}

type BamocarRxData_Data struct {
	Timestamp time.Time `json:"timestamp"`
	REGID     int       `json:"regid"`
	Byte1     int       `json:"byte1"`
	Byte2     int       `json:"byte2"`
	Byte3     int       `json:"byte3"`
	Byte4     int       `json:"byte4"`
	Byte5     int       `json:"byte5"`
}

type RearAnalog_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Analog1   int       `json:"analog1"`
	Analog2   int       `json:"analog2"`
	Analog3   int       `json:"analog3"`
	Analog4   int       `json:"analog4"`
	Analog5   int       `json:"analog5"`
	Analog6   int       `json:"analog6"`
	Analog7   int       `json:"analog7"`
	Analog8   int       `json:"analog8"`
}

type FrontAero_Data struct {
	Timestamp    time.Time `json:"timestamp"`
	Pressure1    int       `json:"pressure1"`
	Pressure2    int       `json:"pressure2"`
	Pressure3    int       `json:"pressure3"`
	Temperature1 int       `json:"temperature1"`
	Temperature2 int       `json:"temperature2"`
	Temperature3 int       `json:"temperature3"`
}

type PDM1_Data struct {
	Timestamp           time.Time `json:"timestamp"`
	CompoundID          int       `json:"compound_id"`
	PDMIntTemperature   int       `json:"pdm_int_temperature"`
	PDMBattVoltage      float64   `json:"pdm_batt_voltage"`
	GlobalErrorFlag     int       `json:"global_error_flag"`
	TotalCurrent        int       `json:"total_current"`
	InternalRailVoltage float64   `json:"internal_rail_voltage"`
	ResetSource         int       `json:"reset_source"`
}

type RearFrequency_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Freq1     float64   `json:"freq1"`
	Freq2     float64   `json:"freq2"`
	Freq3     float64   `json:"freq3"`
	Freq4     float64   `json:"freq4"`
}

type ACULV_FD_2_Data struct {
	Timestamp   time.Time `json:"timestamp"`
	FanSetPoint float64   `json:"fan_set_point"`
	RPM         float64   `json:"rpm"`
}

type GPSBestPos_Data struct {
	Timestamp    time.Time `json:"timestamp"`
	Latitude     float64   `json:"latitude"`
	Longitude    float64   `json:"longitude"`
	Altitude     float64   `json:"altitude"`
	StdLatitude  float64   `json:"std_latitude"`
	StdLongitude float64   `json:"std_longitude"`
	StdAltitude  float64   `json:"std_altitude"`
	GPSStatus    int       `json:"gps_status"`
}

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

type Cell_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Cell1     float64   `json:"cell1"`
	Cell2     float64   `json:"cell2"`
	Cell3     float64   `json:"cell3"`
	Cell4     float64   `json:"cell4"`
	Cell5     float64   `json:"cell5"`
	Cell6     float64   `json:"cell6"`
	Cell7     float64   `json:"cell7"`
	Cell8     float64   `json:"cell8"`
	Cell9     float64   `json:"cell9"`
	Cell10    float64   `json:"cell10"`
	Cell11    float64   `json:"cell11"`
	Cell12    float64   `json:"cell12"`
	Cell13    float64   `json:"cell13"`
	Cell14    float64   `json:"cell14"`
	Cell15    float64   `json:"cell15"`
	Cell16    float64   `json:"cell16"`
	Cell17    float64   `json:"cell17"`
	Cell18    float64   `json:"cell18"`
	Cell19    float64   `json:"cell19"`
	Cell20    float64   `json:"cell20"`
	Cell21    float64   `json:"cell21"`
	Cell22    float64   `json:"cell22"`
	Cell23    float64   `json:"cell23"`
	Cell24    float64   `json:"cell24"`
	Cell25    float64   `json:"cell25"`
	Cell26    float64   `json:"cell26"`
	Cell27    float64   `json:"cell27"`
	Cell28    float64   `json:"cell28"`
	Cell29    float64   `json:"cell29"`
	Cell30    float64   `json:"cell30"`
	Cell31    float64   `json:"cell31"`
	Cell32    float64   `json:"cell32"`
	Cell33    float64   `json:"cell33"`
	Cell34    float64   `json:"cell34"`
	Cell35    float64   `json:"cell35"`
	Cell36    float64   `json:"cell36"`
	Cell37    float64   `json:"cell37"`
	Cell38    float64   `json:"cell38"`
	Cell39    float64   `json:"cell39"`
	Cell40    float64   `json:"cell40"`
	Cell41    float64   `json:"cell41"`
	Cell42    float64   `json:"cell42"`
	Cell43    float64   `json:"cell43"`
	Cell44    float64   `json:"cell44"`
	Cell45    float64   `json:"cell45"`
	Cell46    float64   `json:"cell46"`
	Cell47    float64   `json:"cell47"`
	Cell48    float64   `json:"cell48"`
	Cell49    float64   `json:"cell49"`
	Cell50    float64   `json:"cell50"`
	Cell51    float64   `json:"cell51"`
	Cell52    float64   `json:"cell52"`
	Cell53    float64   `json:"cell53"`
	Cell54    float64   `json:"cell54"`
	Cell55    float64   `json:"cell55"`
	Cell56    float64   `json:"cell56"`
	Cell57    float64   `json:"cell57"`
	Cell58    float64   `json:"cell58"`
	Cell59    float64   `json:"cell59"`
	Cell60    float64   `json:"cell60"`
	Cell61    float64   `json:"cell61"`
	Cell62    float64   `json:"cell62"`
	Cell63    float64   `json:"cell63"`
	Cell64    float64   `json:"cell64"`
	Cell65    float64   `json:"cell65"`
	Cell66    float64   `json:"cell66"`
	Cell67    float64   `json:"cell67"`
	Cell68    float64   `json:"cell68"`
	Cell69    float64   `json:"cell69"`
	Cell70    float64   `json:"cell70"`
	Cell71    float64   `json:"cell71"`
	Cell72    float64   `json:"cell72"`
	Cell73    float64   `json:"cell73"`
	Cell74    float64   `json:"cell74"`
	Cell75    float64   `json:"cell75"`
	Cell76    float64   `json:"cell76"`
	Cell77    float64   `json:"cell77"`
	Cell78    float64   `json:"cell78"`
	Cell79    float64   `json:"cell79"`
	Cell80    float64   `json:"cell80"`
	Cell81    float64   `json:"cell81"`
	Cell82    float64   `json:"cell82"`
	Cell83    float64   `json:"cell83"`
	Cell84    float64   `json:"cell84"`
	Cell85    float64   `json:"cell85"`
	Cell86    float64   `json:"cell86"`
	Cell87    float64   `json:"cell87"`
	Cell88    float64   `json:"cell88"`
	Cell89    float64   `json:"cell89"`
	Cell90    float64   `json:"cell90"`
	Cell91    float64   `json:"cell91"`
	Cell92    float64   `json:"cell92"`
	Cell93    float64   `json:"cell93"`
	Cell94    float64   `json:"cell94"`
	Cell95    float64   `json:"cell95"`
	Cell96    float64   `json:"cell96"`
	Cell97    float64   `json:"cell97"`
	Cell98    float64   `json:"cell98"`
	Cell99    float64   `json:"cell99"`
	Cell100   float64   `json:"cell100"`
	Cell101   float64   `json:"cell101"`
	Cell102   float64   `json:"cell102"`
	Cell103   float64   `json:"cell103"`
	Cell104   float64   `json:"cell104"`
	Cell105   float64   `json:"cell105"`
	Cell106   float64   `json:"cell106"`
	Cell107   float64   `json:"cell107"`
	Cell108   float64   `json:"cell108"`
	Cell109   float64   `json:"cell109"`
	Cell110   float64   `json:"cell110"`
	Cell111   float64   `json:"cell111"`
	Cell112   float64   `json:"cell112"`
	Cell113   float64   `json:"cell113"`
	Cell114   float64   `json:"cell114"`
	Cell115   float64   `json:"cell115"`
	Cell116   float64   `json:"cell116"`
	Cell117   float64   `json:"cell117"`
	Cell118   float64   `json:"cell118"`
	Cell119   float64   `json:"cell119"`
	Cell120   float64   `json:"cell120"`
	Cell121   float64   `json:"cell121"`
	Cell122   float64   `json:"cell122"`
	Cell123   float64   `json:"cell123"`
	Cell124   float64   `json:"cell124"`
	Cell125   float64   `json:"cell125"`
	Cell126   float64   `json:"cell126"`
	Cell127   float64   `json:"cell127"`
	Cell128   float64   `json:"cell128"`
}

type BamocarTxData_Data struct {
	Timestamp time.Time `json:"timestamp"`
	REGID     int       `json:"regid"`
	Data      int       `json:"data"`
}

type BamoCarReTransmit_Data struct {
	Timestamp      time.Time `json:"timestamp"`
	MotorTemp      int       `json:"motor_temp"`
	ControllerTemp int       `json:"controller_temp"`
}

type Encoder_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Encoder1  int       `json:"encoder1"`
	Encoder2  int       `json:"encoder2"`
	Encoder3  int       `json:"encoder3"`
	Encoder4  int       `json:"encoder4"`
}

type PackCurrent_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Current   float64   `json:"current"`
}

type PackVoltage_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Voltage   float64   `json:"voltage"`
}

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

type PDMReTransmit_Data struct {
	Timestamp           time.Time `json:"timestamp"`
	PDMIntTemperature   int       `json:"pdm_int_temperature"`
	PDMBattVoltage      float64   `json:"pdm_batt_voltage"`
	GlobalErrorFlag     int       `json:"global_error_flag"`
	TotalCurrent        int       `json:"total_current"`
	InternalRailVoltage float64   `json:"internal_rail_voltage"`
	ResetSource         int       `json:"reset_source"`
}

type INS_GPS_Data struct {
	Timestamp   time.Time `json:"timestamp"`
	GNSSWeek    int       `json:"gnss_week"`
	GNSSSeconds float64   `json:"gnss_seconds"`
	GNSSLat     float64   `json:"gnss_lat"`
	GNSSLong    float64   `json:"gnss_long"`
	GNSSHeight  float64   `json:"gnss_height"`
}

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

type FrontFrequency_Data struct {
	Timestamp  time.Time `json:"timestamp"`
	RearRight  float64   `json:"rear_right"`
	FrontRight float64   `json:"front_right"`
	RearLeft   float64   `json:"rear_left"`
	FrontLeft  float64   `json:"front_left"`
}

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

type FrontStrainGauges1_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Gauge1    int       `json:"gauge1"`
	Gauge2    int       `json:"gauge2"`
	Gauge3    int       `json:"gauge3"`
	Gauge4    int       `json:"gauge4"`
	Gauge5    int       `json:"gauge5"`
	Gauge6    int       `json:"gauge6"`
}

type FrontStrainGauges2_Data struct {
	Timestamp time.Time `json:"timestamp"`
	Gauge1    int       `json:"gauge1"`
	Gauge2    int       `json:"gauge2"`
	Gauge3    int       `json:"gauge3"`
	Gauge4    int       `json:"gauge4"`
	Gauge5    int       `json:"gauge5"`
	Gauge6    int       `json:"gauge6"`
}

type ACULV2_Data struct {
	Timestamp     time.Time `json:"timestamp"`
	ChargeRequest int       `json:"charge_request"`
}

type ACULV_FD_1_Data struct {
	Timestamp            time.Time `json:"timestamp"`
	AMSStatus            int       `json:"ams_status"`
	FLD                  int       `json:"fld"`
	StateOfCharge        float64   `json:"state_of_charge"`
	AccumulatorVoltage   float64   `json:"accumulator_voltage"`
	TractiveVoltage      float64   `json:"tractive_voltage"`
	CellCurrent          float64   `json:"cell_current"`
	IsolationMonitoring  int       `json:"isolation_monitoring"`
	IsolationMonitoring1 float64   `json:"isolation_monitoring1"`
}

type ACULV1_Data struct {
	Timestamp     time.Time `json:"timestamp"`
	ChargeStatus1 float64   `json:"charge_status1"`
	ChargeStatus2 float64   `json:"charge_status2"`
}

// Option represents a selectable CAN ID option with a description.
type Option struct {
	Index       int    `json:"index"`
	Description string `json:"description"`
	Range       string `json:"range"`
}

// NaturalSort is a custom sorter for headers.
type NaturalSort []string

func (ns NaturalSort) Len() int      { return len(ns) }
func (ns NaturalSort) Swap(i, j int) { ns[i], ns[j] = ns[j], ns[i] }
func (ns NaturalSort) Less(i, j int) bool {
	return naturalCompare(ns[i], ns[j])
}

func naturalCompare(a, b string) bool {
	if strings.HasPrefix(a, "Cell") && strings.HasPrefix(b, "Cell") {
		numA, errA := extractNumber(a, "Cell")
		numB, errB := extractNumber(b, "Cell")
		if errA == nil && errB == nil {
			return numA < numB
		}
	}
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
