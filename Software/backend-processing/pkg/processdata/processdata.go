// processdata.go
// ----------------------------------------------------------------------
// Package processdata routes and processes incoming CAN telemetry data.
// It determines the message type from the CAN frame ID, decodes the message,
// inserts the telemetry data into the database, and broadcasts the data in real time.
// ----------------------------------------------------------------------

package processdata

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"telem-system/pkg/db"
	"telem-system/pkg/types"
	"telem-system/pkg/utils"

	"telem-system/proto"

	protobuf "google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/structpb"
)

// BroadcastFunc is assigned by main to push real‑time messages to the WebSocket hub.
var BroadcastFunc func(msg []byte)

// broadcastTelemetry converts a map payload into a TelemetryMessage proto,
// marshals it into binary format and then calls BroadcastFunc.
func broadcastTelemetry(payloadMap map[string]interface{}) {
	typ, _ := payloadMap["type"].(string)
	// Use the top‑level time field (not nested in payload)
	timeStr, _ := payloadMap["time"].(string)
	payloadContent, ok := payloadMap["payload"].(map[string]interface{})
	if !ok {
		payloadContent = make(map[string]interface{})
	}
	st, err := structpb.NewStruct(payloadContent)
	if err != nil {
		return
	}
	msg := &proto.TelemetryMessage{
		Type:    typ,
		Payload: st,
		Time:    timeStr,
	}
	bin, err := protobuf.Marshal(msg)
	if err != nil {
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc(bin)
	}
}

// HandleDataInsertions routes decoded CAN frame data to its appropriate processing function.
func HandleDataInsertions(
	frameID uint32,
	decoded map[string]string,
	cellDataBuffers map[float64]*types.Cell_Data,
	recordCount int,
	path string,
) {
	switch frameID {
	case 4:
		processPackCurrentData(decoded)
	case 5:
		processPackVoltageData(decoded)
	case 6:
		processTCUData(decoded)
	case 8:
		processACULVFD1Data(decoded)
	case 30:
		processACULVFD2Data(decoded)
	case 40:
		processACULV1Data(decoded)
	case 41:
		processACULV2Data(decoded)
	case 50, 51, 52, 53, 54, 55, 56, 57:
		processCellData(frameID, decoded, cellDataBuffers)
	case 60:
		processThermData(decoded, 1)
	case 61:
		processThermData(decoded, 2)
	case 62:
		processThermData(decoded, 3)
	case 63:
		processThermData(decoded, 4)
	case 64:
		processThermData(decoded, 5)
	case 65:
		processThermData(decoded, 6)
	case 66:
		processThermData(decoded, 7)
	case 67:
		processThermData(decoded, 8)
	case 68:
		processThermData(decoded, 9)
	case 69:
		processThermData(decoded, 10)
	case 70:
		processThermData(decoded, 11)
	case 71:
		processThermData(decoded, 12)
	case 80:
		processGPSBestPosData(decoded)
	case 81:
		processINS_GPS_Data(decoded)
	case 82:
		processINS_IMUData(decoded)
	case 100:
		processBamocarData(decoded)
	case 101:
		processFrontFrequencyData(decoded)
	case 102:
		processRearFrequencyData(decoded)
	case 1280:
		processPDM1Data(decoded)
	case 1536:
		processFrontAeroData(decoded)
	case 1537:
		processRearAeroData(decoded)
	case 200:
		processEncoderData(decoded)
	case 258:
		processRearAnalogData(decoded)
	case 259:
		processFrontAnalogData(decoded)
	case 385:
		processBamocarTxData(decoded)
	case 513:
		processBamocarRxData(decoded)
	case 600:
		processBamoCarReTransmitData(decoded)
	case 1312:
		processPDMCurrentData(decoded)
	case 1552:
		processFrontStrainGauges1Data(decoded)
	case 1553:
		processFrontStrainGauges2Data(decoded)
	case 1554:
		processRearStrainGauges1Data(decoded)
	case 1555:
		processRearStrainGauges2Data(decoded)
	case 1680:
		processPDMReTransmitData(decoded)
	default:
		// Unrecognized frame; no action taken.
	}
}

// --- Processing Functions ---

func processRearStrainGauges2Data(decoded map[string]string) {
	d := types.RearStrainGauges2_Data{
		Timestamp: time.Now(),
		Gauge1:    utils.ParseIntSignal(decoded, "Gauge1"),
		Gauge2:    utils.ParseIntSignal(decoded, "Gauge2"),
		Gauge3:    utils.ParseIntSignal(decoded, "Gauge3"),
		Gauge4:    utils.ParseIntSignal(decoded, "Gauge4"),
		Gauge5:    utils.ParseIntSignal(decoded, "Gauge5"),
		Gauge6:    utils.ParseIntSignal(decoded, "Gauge6"),
	}
	if err := db.New(db.DB).InsertRearStrainGauges2Data(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "rear_strain_gauges2",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"gauge1":    d.Gauge1,
			"gauge2":    d.Gauge2,
			"gauge3":    d.Gauge3,
			"gauge4":    d.Gauge4,
			"gauge5":    d.Gauge5,
			"gauge6":    d.Gauge6,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processRearStrainGauges1Data(decoded map[string]string) {
	d := types.RearStrainGauges1_Data{
		Timestamp: time.Now(),
		Gauge1:    utils.ParseIntSignal(decoded, "Gauge1"),
		Gauge2:    utils.ParseIntSignal(decoded, "Gauge2"),
		Gauge3:    utils.ParseIntSignal(decoded, "Gauge3"),
		Gauge4:    utils.ParseIntSignal(decoded, "Gauge4"),
		Gauge5:    utils.ParseIntSignal(decoded, "Gauge5"),
		Gauge6:    utils.ParseIntSignal(decoded, "Gauge6"),
	}
	if err := db.New(db.DB).InsertRearStrainGauges1Data(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "rear_strain_gauges1",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"gauge1":    d.Gauge1,
			"gauge2":    d.Gauge2,
			"gauge3":    d.Gauge3,
			"gauge4":    d.Gauge4,
			"gauge5":    d.Gauge5,
			"gauge6":    d.Gauge6,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processBamocarRxData(decoded map[string]string) {
	data := types.BamocarRxData_Data{
		Timestamp: time.Now(),
		REGID:     utils.ParseIntSignal(decoded, "REGID"),
		Byte1:     utils.ParseIntSignal(decoded, "Byte1"),
		Byte2:     utils.ParseIntSignal(decoded, "Byte2"),
		Byte3:     utils.ParseIntSignal(decoded, "Byte3"),
		Byte4:     utils.ParseIntSignal(decoded, "Byte4"),
		Byte5:     utils.ParseIntSignal(decoded, "Byte5"),
	}
	if err := db.New(db.DB).InsertBamocarRxData(context.Background(), data); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "bamocar_rx_data",
		"payload": map[string]interface{}{
			"timestamp": data.Timestamp.Unix(),
			"regid":     data.REGID,
			"byte1":     data.Byte1,
			"byte2":     data.Byte2,
			"byte3":     data.Byte3,
			"byte4":     data.Byte4,
			"byte5":     data.Byte5,
		},
		"time": data.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processRearAeroData(decoded map[string]string) {
	rearAero := types.RearAero_Data{
		Timestamp:    time.Now(),
		Pressure1:    utils.ParseIntSignal(decoded, "Pressure1"),
		Pressure2:    utils.ParseIntSignal(decoded, "Pressure2"),
		Pressure3:    utils.ParseIntSignal(decoded, "Pressure3"),
		Temperature1: utils.ParseIntSignal(decoded, "Temperature1"),
		Temperature2: utils.ParseIntSignal(decoded, "Temperature2"),
		Temperature3: utils.ParseIntSignal(decoded, "Temperature3"),
	}
	if err := db.New(db.DB).InsertRearAeroData(context.Background(), rearAero); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "rear_aero",
		"payload": map[string]interface{}{
			"timestamp":    rearAero.Timestamp.Unix(),
			"pressure1":    rearAero.Pressure1,
			"pressure2":    rearAero.Pressure2,
			"pressure3":    rearAero.Pressure3,
			"temperature1": rearAero.Temperature1,
			"temperature2": rearAero.Temperature2,
			"temperature3": rearAero.Temperature3,
		},
		"time": rearAero.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processRearAnalogData(decoded map[string]string) {
	rearAnalog := types.RearAnalog_Data{
		Timestamp: time.Now(),
		Analog1:   utils.ParseIntSignal(decoded, "Analog1"),
		Analog2:   utils.ParseIntSignal(decoded, "Analog2"),
		Analog3:   utils.ParseIntSignal(decoded, "Analog3"),
		Analog4:   utils.ParseIntSignal(decoded, "Analog4"),
		Analog5:   utils.ParseIntSignal(decoded, "Analog5"),
		Analog6:   utils.ParseIntSignal(decoded, "Analog6"),
		Analog7:   utils.ParseIntSignal(decoded, "Analog7"),
		Analog8:   utils.ParseIntSignal(decoded, "Analog8"),
	}
	if err := db.New(db.DB).InsertRearAnalogData(context.Background(), rearAnalog); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "rear_analog",
		"payload": map[string]interface{}{
			"timestamp": rearAnalog.Timestamp.Unix(),
			"analog1":   rearAnalog.Analog1,
			"analog2":   rearAnalog.Analog2,
			"analog3":   rearAnalog.Analog3,
			"analog4":   rearAnalog.Analog4,
			"analog5":   rearAnalog.Analog5,
			"analog6":   rearAnalog.Analog6,
			"analog7":   rearAnalog.Analog7,
			"analog8":   rearAnalog.Analog8,
		},
		"time": rearAnalog.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processRearFrequencyData(decoded map[string]string) {
	d := types.RearFrequency_Data{
		Timestamp: time.Now(),
		Freq1:     utils.ParseFloatSignal(decoded, "Freq1"),
		Freq2:     utils.ParseFloatSignal(decoded, "Freq2"),
		Freq3:     utils.ParseFloatSignal(decoded, "Freq3"),
		Freq4:     utils.ParseFloatSignal(decoded, "Freq4"),
	}
	if err := db.New(db.DB).InsertRearFrequencyData(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "rear_frequency",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"freq1":     d.Freq1,
			"freq2":     d.Freq2,
			"freq3":     d.Freq3,
			"freq4":     d.Freq4,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processFrontAeroData(decoded map[string]string) {
	fa := types.FrontAero_Data{
		Timestamp:    time.Now(),
		Pressure1:    utils.ParseIntSignal(decoded, "Pressure1"),
		Pressure2:    utils.ParseIntSignal(decoded, "Pressure2"),
		Pressure3:    utils.ParseIntSignal(decoded, "Pressure3"),
		Temperature1: utils.ParseIntSignal(decoded, "Temperature1"),
		Temperature2: utils.ParseIntSignal(decoded, "Temperature2"),
		Temperature3: utils.ParseIntSignal(decoded, "Temperature3"),
	}
	if err := db.New(db.DB).InsertFrontAeroData(context.Background(), fa); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "front_aero",
		"payload": map[string]interface{}{
			"timestamp":    fa.Timestamp.Unix(),
			"pressure1":    fa.Pressure1,
			"pressure2":    fa.Pressure2,
			"pressure3":    fa.Pressure3,
			"temperature1": fa.Temperature1,
			"temperature2": fa.Temperature2,
			"temperature3": fa.Temperature3,
		},
		"time": fa.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processPDM1Data(decoded map[string]string) {
	pdm1 := types.PDM1_Data{
		Timestamp:           time.Now(),
		CompoundID:          utils.ParseIntSignal(decoded, "CompoundID"),
		PDMIntTemperature:   utils.ParseIntSignal(decoded, "PDMIntTemperature"),
		PDMBattVoltage:      utils.ParseFloatSignal(decoded, "PDMBattVoltage"),
		GlobalErrorFlag:     utils.ParseIntSignal(decoded, "GlobalErrorFlag"),
		TotalCurrent:        utils.ParseIntSignal(decoded, "TotalCurrent"),
		InternalRailVoltage: utils.ParseFloatSignal(decoded, "InternalRailVoltage"),
		ResetSource:         utils.ParseIntSignal(decoded, "ResetSource"),
	}
	if err := db.New(db.DB).InsertPDM1Data(context.Background(), pdm1); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "pdm1",
		"payload": map[string]interface{}{
			"timestamp":             pdm1.Timestamp.Unix(),
			"compound_id":           pdm1.CompoundID,
			"pdm_int_temperature":   pdm1.PDMIntTemperature,
			"pdm_batt_voltage":      pdm1.PDMBattVoltage,
			"global_error_flag":     pdm1.GlobalErrorFlag,
			"total_current":         pdm1.TotalCurrent,
			"internal_rail_voltage": pdm1.InternalRailVoltage,
			"reset_source":          pdm1.ResetSource,
		},
		"time": pdm1.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processCellData(
	frameID uint32,
	decoded map[string]string,
	cellDataBuffers map[float64]*types.Cell_Data,
) {
	// Use key 0 as the aggregator.
	if _, ok := cellDataBuffers[0]; !ok {
		cellDataBuffers[0] = &types.Cell_Data{}
	}
	agg := cellDataBuffers[0]
	for sigName := range decoded {
		if strings.HasPrefix(sigName, "Cell") {
			idxStr := sigName[4:]
			if idx, err := utils.AtoiSafe(idxStr); err == nil && idx >= 1 && idx <= 128 {
				val := utils.ParseFloatSignal(decoded, sigName)
				setCellValue(agg, idx, val)
			}
		}
	}
	if frameID == 57 {
		agg.Timestamp = time.Now()
		if err := db.InsertCellData(context.Background(), *agg); err == nil {
			broadcastCells(agg)
		}
		delete(cellDataBuffers, 0)
	}
}

func processGPSBestPosData(decoded map[string]string) {
	gps := types.GPSBestPos_Data{
		Timestamp:    time.Now(),
		Latitude:     utils.ParseFloatSignal(decoded, "Latitude"),
		Longitude:    utils.ParseFloatSignal(decoded, "Longitude"),
		Altitude:     utils.ParseFloatSignal(decoded, "Altitude"),
		StdLatitude:  utils.ParseFloatSignal(decoded, "stdLatitude"),
		StdLongitude: utils.ParseFloatSignal(decoded, "stdLongitude"),
		StdAltitude:  utils.ParseFloatSignal(decoded, "stdAltitude"),
		GPSStatus:    utils.ParseIntSignal(decoded, "gpsStatus"),
	}
	if err := db.New(db.DB).InsertGPSBestPosData(context.Background(), gps); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "gps_best_pos",
		"payload": map[string]interface{}{
			"timestamp":     gps.Timestamp.Unix(),
			"latitude":      gps.Latitude,
			"longitude":     gps.Longitude,
			"altitude":      gps.Altitude,
			"std_latitude":  gps.StdLatitude,
			"std_longitude": gps.StdLongitude,
			"std_altitude":  gps.StdAltitude,
			"gps_status":    gps.GPSStatus,
		},
		"time": gps.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processThermData(decoded map[string]string, thermID int) {
	t := types.Therm_Data{
		Timestamp:    time.Now(),
		ThermistorID: thermID,
		Therm1:       utils.ParseFloatSignal(decoded, "Therm1"),
		Therm2:       utils.ParseFloatSignal(decoded, "Therm2"),
		Therm3:       utils.ParseFloatSignal(decoded, "Therm3"),
		Therm4:       utils.ParseFloatSignal(decoded, "Therm4"),
		Therm5:       utils.ParseFloatSignal(decoded, "Therm5"),
		Therm6:       utils.ParseFloatSignal(decoded, "Therm6"),
		Therm7:       utils.ParseFloatSignal(decoded, "Therm7"),
		Therm8:       utils.ParseFloatSignal(decoded, "Therm8"),
		Therm9:       utils.ParseFloatSignal(decoded, "Therm9"),
		Therm10:      utils.ParseFloatSignal(decoded, "Therm10"),
		Therm11:      utils.ParseFloatSignal(decoded, "Therm11"),
		Therm12:      utils.ParseFloatSignal(decoded, "Therm12"),
		Therm13:      utils.ParseFloatSignal(decoded, "Therm13"),
		Therm14:      utils.ParseFloatSignal(decoded, "Therm14"),
		Therm15:      utils.ParseFloatSignal(decoded, "Therm15"),
		Therm16:      utils.ParseFloatSignal(decoded, "Therm16"),
	}
	if err := db.New(db.DB).InsertThermData(context.Background(), t); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "thermistor",
		"payload": map[string]interface{}{
			"timestamp":     t.Timestamp.Unix(),
			"thermistor_id": t.ThermistorID,
			"therm1":        t.Therm1,
			"therm2":        t.Therm2,
			"therm3":        t.Therm3,
			"therm4":        t.Therm4,
			"therm5":        t.Therm5,
			"therm6":        t.Therm6,
			"therm7":        t.Therm7,
			"therm8":        t.Therm8,
			"therm9":        t.Therm9,
			"therm10":       t.Therm10,
			"therm11":       t.Therm11,
			"therm12":       t.Therm12,
			"therm13":       t.Therm13,
			"therm14":       t.Therm14,
			"therm15":       t.Therm15,
			"therm16":       t.Therm16,
		},
		"time": t.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processACULV2Data(decoded map[string]string) {
	aculv2 := types.ACULV2_Data{
		Timestamp:     time.Now(),
		ChargeRequest: utils.ParseIntSignal(decoded, "ChargeRequest"),
	}
	if err := db.New(db.DB).InsertACULV2Data(context.Background(), aculv2); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "aculv2",
		"payload": map[string]interface{}{
			"timestamp":      aculv2.Timestamp.Unix(),
			"charge_request": aculv2.ChargeRequest,
		},
		"time": aculv2.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processTCUData(decoded map[string]string) {
	t := types.TCU_Data{
		Timestamp: time.Now(),
		APPS1:     utils.ParseFloatSignal(decoded, "APPS1"),
		APPS2:     utils.ParseFloatSignal(decoded, "APPS2"),
		BSE:       utils.ParseFloatSignal(decoded, "BSE"),
		Status:    utils.ParseIntSignal(decoded, "Status"),
	}
	db.New(db.DB).InsertTCUData(context.Background(), t)
	payload := map[string]interface{}{
		"type": "tcu",
		"payload": map[string]interface{}{
			"timestamp": t.Timestamp.Unix(),
			"apps1":     t.APPS1,
			"apps2":     t.APPS2,
			"bse":       t.BSE,
			"status":    t.Status,
		},
		"time": t.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processACULVFD2Data(decoded map[string]string) {
	aculv2 := types.ACULV_FD_2_Data{
		Timestamp:   time.Now(),
		FanSetPoint: utils.ParseFloatSignal(decoded, "FanSetPoint"),
		RPM:         utils.ParseFloatSignal(decoded, "RPM"),
	}
	if err := db.New(db.DB).InsertACULV_FD_2_Data(context.Background(), aculv2); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "aculv_fd_2",
		"payload": map[string]interface{}{
			"timestamp":     aculv2.Timestamp.Unix(),
			"fan_set_point": aculv2.FanSetPoint,
			"rpm":           aculv2.RPM,
		},
		"time": aculv2.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processACULV1Data(decoded map[string]string) {
	aculv1 := types.ACULV1_Data{
		Timestamp:     time.Now(),
		ChargeStatus1: utils.ParseFloatSignal(decoded, "ChargeStatus1"),
		ChargeStatus2: utils.ParseFloatSignal(decoded, "ChargeStatus2"),
	}
	if err := db.New(db.DB).InsertACULV1Data(context.Background(), aculv1); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "aculv1",
		"payload": map[string]interface{}{
			"timestamp":      aculv1.Timestamp.Unix(),
			"charge_status1": aculv1.ChargeStatus1,
			"charge_status2": aculv1.ChargeStatus2,
		},
		"time": aculv1.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processACULVFD1Data(decoded map[string]string) {
	aculv := types.ACULV_FD_1_Data{
		Timestamp:            time.Now(),
		AMSStatus:            utils.ParseIntSignal(decoded, "AMSStatus"),
		FLD:                  utils.ParseIntSignal(decoded, "FLD"),
		StateOfCharge:        utils.ParseFloatSignal(decoded, "StateOfCharge"),
		AccumulatorVoltage:   utils.ParseFloatSignal(decoded, "AccumulatorVoltage"),
		TractiveVoltage:      utils.ParseFloatSignal(decoded, "TractiveVoltage"),
		CellCurrent:          utils.ParseFloatSignal(decoded, "CellCurrent"),
		IsolationMonitoring:  utils.ParseIntSignal(decoded, "IsolationMonitoring"),
		IsolationMonitoring1: utils.ParseFloatSignal(decoded, "IsolationMonitoring1"),
	}
	if err := db.New(db.DB).InsertACULV_FD_1_Data(context.Background(), aculv); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "aculv_fd_1",
		"payload": map[string]interface{}{
			"timestamp":             aculv.Timestamp.Unix(),
			"ams_status":            aculv.AMSStatus,
			"fld":                   aculv.FLD,
			"state_of_charge":       aculv.StateOfCharge,
			"accumulator_voltage":   aculv.AccumulatorVoltage,
			"tractive_voltage":      aculv.TractiveVoltage,
			"cell_current":          aculv.CellCurrent,
			"isolation_monitoring":  aculv.IsolationMonitoring,
			"isolation_monitoring1": aculv.IsolationMonitoring1,
		},
		"time": aculv.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processPackCurrentData(decoded map[string]string) {
	d := types.PackCurrent_Data{
		Timestamp: time.Now(),
		Current:   utils.ParseFloatSignal(decoded, "PackCurrent"),
	}
	if err := db.InsertPackCurrentData(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "pack_current",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"current":   d.Current,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processPackVoltageData(decoded map[string]string) {
	d := types.PackVoltage_Data{
		Timestamp: time.Now(),
		Voltage:   utils.ParseFloatSignal(decoded, "PackVoltage"),
	}
	if err := db.InsertPackVoltageData(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "pack_voltage",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"voltage":   d.Voltage,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processBamocarData(decoded map[string]string) {
	b := types.TCU2_data{
		Timestamp:  time.Now(),
		BamocarFRG: utils.ParseIntSignal(decoded, "BamocarFRG"),
		BamocarRFE: utils.ParseIntSignal(decoded, "BamocarRFE"),
		BrakeLight: utils.ParseIntSignal(decoded, "BrakeLight"),
	}
	if err := db.InsertBamocarData(context.Background(), b); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "bamocar",
		"payload": map[string]interface{}{
			"timestamp":   b.Timestamp.Unix(),
			"bamocar_frg": b.BamocarFRG,
			"bamocar_rfe": b.BamocarRFE,
			"brake_light": b.BrakeLight,
		},
		"time": b.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processINS_GPS_Data(decoded map[string]string) {
	data := types.INS_GPS_Data{
		Timestamp:   time.Now(),
		GNSSWeek:    utils.ParseIntSignal(decoded, "gnss_week"),
		GNSSSeconds: utils.ParseFloatSignal(decoded, "gnss_seconds"),
		GNSSLat:     utils.ParseFloatSignal(decoded, "gnss_lat"),
		GNSSLong:    utils.ParseFloatSignal(decoded, "gnss_long"),
		GNSSHeight:  utils.ParseFloatSignal(decoded, "gnss_height"),
	}
	if err := db.InsertINS_GPS_Data(context.Background(), data); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "ins_gps",
		"payload": map[string]interface{}{
			"timestamp":    data.Timestamp.Unix(),
			"gnss_week":    data.GNSSWeek,
			"gnss_seconds": data.GNSSSeconds,
			"gnss_lat":     data.GNSSLat,
			"gnss_long":    data.GNSSLong,
			"gnss_height":  data.GNSSHeight,
		},
		"time": data.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processINS_IMUData(decoded map[string]string) {
	data := types.INS_IMU_Data{
		Timestamp: time.Now(),
		NorthVel:  utils.ParseFloatSignal(decoded, "north_vel"),
		EastVel:   utils.ParseFloatSignal(decoded, "east_vel"),
		UpVel:     utils.ParseFloatSignal(decoded, "up_vel"),
		Roll:      utils.ParseFloatSignal(decoded, "roll"),
		Pitch:     utils.ParseFloatSignal(decoded, "pitch"),
		Azimuth:   utils.ParseFloatSignal(decoded, "azimuth"),
		Status:    utils.ParseIntSignal(decoded, "status"),
	}
	if err := db.InsertINS_IMUData(context.Background(), data); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "ins_imu",
		"payload": map[string]interface{}{
			"timestamp": data.Timestamp.Unix(),
			"north_vel": data.NorthVel,
			"east_vel":  data.EastVel,
			"up_vel":    data.UpVel,
			"roll":      data.Roll,
			"pitch":     data.Pitch,
			"azimuth":   data.Azimuth,
			"status":    data.Status,
		},
		"time": data.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processFrontFrequencyData(decoded map[string]string) {
	d := types.FrontFrequency_Data{
		Timestamp:  time.Now(),
		RearRight:  utils.ParseFloatSignal(decoded, "RearRight"),
		FrontRight: utils.ParseFloatSignal(decoded, "FrontRight"),
		RearLeft:   utils.ParseFloatSignal(decoded, "RearLeft"),
		FrontLeft:  utils.ParseFloatSignal(decoded, "FrontLeft"),
	}
	if err := db.InsertFrontFrequencyData(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "front_frequency",
		"payload": map[string]interface{}{
			"timestamp":   d.Timestamp.Unix(),
			"rear_right":  d.RearRight,
			"front_right": d.FrontRight,
			"rear_left":   d.RearLeft,
			"front_left":  d.FrontLeft,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processFrontAnalogData(decoded map[string]string) {
	d := types.FrontAnalog_Data{
		Timestamp:     time.Now(),
		LeftRad:       utils.ParseIntSignal(decoded, "LeftRad"),
		RightRad:      utils.ParseIntSignal(decoded, "RightRad"),
		FrontRightPot: utils.ParseFloatSignal(decoded, "FrontRightPot"),
		FrontLeftPot:  utils.ParseFloatSignal(decoded, "FrontLeftPot"),
		RearRightPot:  utils.ParseFloatSignal(decoded, "RearRightPot"),
		RearLeftPot:   utils.ParseFloatSignal(decoded, "RearLeftPot"),
		SteeringAngle: utils.ParseFloatSignal(decoded, "SteeringAngle"),
		Analog8:       utils.ParseIntSignal(decoded, "Analog8"),
	}
	if err := db.InsertFrontAnalogData(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "front_analog",
		"payload": map[string]interface{}{
			"timestamp":       d.Timestamp.Unix(),
			"left_rad":        d.LeftRad,
			"right_rad":       d.RightRad,
			"front_right_pot": d.FrontRightPot,
			"front_left_pot":  d.FrontLeftPot,
			"rear_right_pot":  d.RearRightPot,
			"rear_left_pot":   d.RearLeftPot,
			"steering_angle":  d.SteeringAngle,
			"analog8":         d.Analog8,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processBamocarTxData(decoded map[string]string) {
	d := types.BamocarTxData_Data{
		Timestamp: time.Now(),
		REGID:     utils.ParseIntSignal(decoded, "REGID"),
		Data:      utils.ParseIntSignal(decoded, "Data"),
	}
	if err := db.InsertBamocarTxData(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "bamocar_tx_data",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"regid":     d.REGID,
			"data":      d.Data,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processBamoCarReTransmitData(decoded map[string]string) {
	d := types.BamoCarReTransmit_Data{
		Timestamp:      time.Now(),
		MotorTemp:      utils.ParseIntSignal(decoded, "MotorTemp"),
		ControllerTemp: utils.ParseIntSignal(decoded, "ControllerTemp"),
	}
	if err := db.InsertBamoCarReTransmitData(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "bamo_car_re_transmit",
		"payload": map[string]interface{}{
			"timestamp":       d.Timestamp.Unix(),
			"motor_temp":      d.MotorTemp,
			"controller_temp": d.ControllerTemp,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processEncoderData(decoded map[string]string) {
	d := types.Encoder_Data{
		Timestamp: time.Now(),
		Encoder1:  utils.ParseIntSignal(decoded, "Encoder1"),
		Encoder2:  utils.ParseIntSignal(decoded, "Encoder2"),
		Encoder3:  utils.ParseIntSignal(decoded, "Encoder3"),
		Encoder4:  utils.ParseIntSignal(decoded, "Encoder4"),
	}
	if err := db.InsertEncoderData(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "encoder",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"encoder1":  d.Encoder1,
			"encoder2":  d.Encoder2,
			"encoder3":  d.Encoder3,
			"encoder4":  d.Encoder4,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processPDMCurrentData(decoded map[string]string) {
	d := types.PDMCurrent_Data{
		Timestamp:            time.Now(),
		AccumulatorCurrent:   utils.ParseIntSignal(decoded, "AccumulatorCurrent"),
		TCUCurrent:           utils.ParseIntSignal(decoded, "TCUCurrent"),
		BamocarCurrent:       utils.ParseIntSignal(decoded, "BamocarCurrent"),
		PumpsCurrent:         utils.ParseIntSignal(decoded, "PumpsCurrent"),
		TSALCurrent:          utils.ParseIntSignal(decoded, "TSALCurrent"),
		DAQCurrent:           utils.ParseIntSignal(decoded, "DAQCurrent"),
		DisplayKvaserCurrent: utils.ParseIntSignal(decoded, "DisplayKvaserCurrent"),
		ShutdownResetCurrent: utils.ParseIntSignal(decoded, "ShutdownResetCurrent"),
	}
	if err := db.InsertPDMCurrentData(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "pdm_current",
		"payload": map[string]interface{}{
			"timestamp":              d.Timestamp.Unix(),
			"accumulator_current":    d.AccumulatorCurrent,
			"tcu_current":            d.TCUCurrent,
			"bamocar_current":        d.BamocarCurrent,
			"pumps_current":          d.PumpsCurrent,
			"tsal_current":           d.TSALCurrent,
			"daq_current":            d.DAQCurrent,
			"display_kvaser_current": d.DisplayKvaserCurrent,
			"shutdown_reset_current": d.ShutdownResetCurrent,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processPDMReTransmitData(decoded map[string]string) {
	d := types.PDMReTransmit_Data{
		Timestamp:           time.Now(),
		PDMIntTemperature:   utils.ParseIntSignal(decoded, "PDMIntTemperature"),
		PDMBattVoltage:      utils.ParseFloatSignal(decoded, "PDMBattVoltage"),
		GlobalErrorFlag:     utils.ParseIntSignal(decoded, "GlobalErrorFlag"),
		TotalCurrent:        utils.ParseIntSignal(decoded, "TotalCurrent"),
		InternalRailVoltage: utils.ParseFloatSignal(decoded, "InternalRailVoltage"),
		ResetSource:         utils.ParseIntSignal(decoded, "ResetSource"),
	}
	if err := db.InsertPDMReTransmitData(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "pdm_re_transmit",
		"payload": map[string]interface{}{
			"timestamp":             d.Timestamp.Unix(),
			"pdm_int_temperature":   d.PDMIntTemperature,
			"pdm_batt_voltage":      d.PDMBattVoltage,
			"global_error_flag":     d.GlobalErrorFlag,
			"total_current":         d.TotalCurrent,
			"internal_rail_voltage": d.InternalRailVoltage,
			"reset_source":          d.ResetSource,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processFrontStrainGauges1Data(decoded map[string]string) {
	d := types.FrontStrainGauges1_Data{
		Timestamp: time.Now(),
		Gauge1:    utils.ParseIntSignal(decoded, "Gauge1"),
		Gauge2:    utils.ParseIntSignal(decoded, "Gauge2"),
		Gauge3:    utils.ParseIntSignal(decoded, "Gauge3"),
		Gauge4:    utils.ParseIntSignal(decoded, "Gauge4"),
		Gauge5:    utils.ParseIntSignal(decoded, "Gauge5"),
		Gauge6:    utils.ParseIntSignal(decoded, "Gauge6"),
	}
	if err := db.InsertFrontStrainGauges1Data(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "front_strain_gauges_1",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"gauge1":    d.Gauge1,
			"gauge2":    d.Gauge2,
			"gauge3":    d.Gauge3,
			"gauge4":    d.Gauge4,
			"gauge5":    d.Gauge5,
			"gauge6":    d.Gauge6,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

func processFrontStrainGauges2Data(decoded map[string]string) {
	d := types.FrontStrainGauges2_Data{
		Timestamp: time.Now(),
		Gauge1:    utils.ParseIntSignal(decoded, "Gauge1"),
		Gauge2:    utils.ParseIntSignal(decoded, "Gauge2"),
		Gauge3:    utils.ParseIntSignal(decoded, "Gauge3"),
		Gauge4:    utils.ParseIntSignal(decoded, "Gauge4"),
		Gauge5:    utils.ParseIntSignal(decoded, "Gauge5"),
		Gauge6:    utils.ParseIntSignal(decoded, "Gauge6"),
	}
	if err := db.InsertFrontStrainGauges2Data(context.Background(), d); err != nil {
		return
	}
	payload := map[string]interface{}{
		"type": "front_strain_gauges_2",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"gauge1":    d.Gauge1,
			"gauge2":    d.Gauge2,
			"gauge3":    d.Gauge3,
			"gauge4":    d.Gauge4,
			"gauge5":    d.Gauge5,
			"gauge6":    d.Gauge6,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}
	broadcastTelemetry(payload)
}

// Helper functions for cell data.
func setCellValue(agg *types.Cell_Data, idx int, val float64) {
	switch idx {
	case 1:
		agg.Cell1 = val
	case 2:
		agg.Cell2 = val
	case 3:
		agg.Cell3 = val
	case 4:
		agg.Cell4 = val
	case 5:
		agg.Cell5 = val
	case 6:
		agg.Cell6 = val
	case 7:
		agg.Cell7 = val
	case 8:
		agg.Cell8 = val
	case 9:
		agg.Cell9 = val
	case 10:
		agg.Cell10 = val
	case 11:
		agg.Cell11 = val
	case 12:
		agg.Cell12 = val
	case 13:
		agg.Cell13 = val
	case 14:
		agg.Cell14 = val
	case 15:
		agg.Cell15 = val
	case 16:
		agg.Cell16 = val
	case 17:
		agg.Cell17 = val
	case 18:
		agg.Cell18 = val
	case 19:
		agg.Cell19 = val
	case 20:
		agg.Cell20 = val
	case 21:
		agg.Cell21 = val
	case 22:
		agg.Cell22 = val
	case 23:
		agg.Cell23 = val
	case 24:
		agg.Cell24 = val
	case 25:
		agg.Cell25 = val
	case 26:
		agg.Cell26 = val
	case 27:
		agg.Cell27 = val
	case 28:
		agg.Cell28 = val
	case 29:
		agg.Cell29 = val
	case 30:
		agg.Cell30 = val
	case 31:
		agg.Cell31 = val
	case 32:
		agg.Cell32 = val
	case 33:
		agg.Cell33 = val
	case 34:
		agg.Cell34 = val
	case 35:
		agg.Cell35 = val
	case 36:
		agg.Cell36 = val
	case 37:
		agg.Cell37 = val
	case 38:
		agg.Cell38 = val
	case 39:
		agg.Cell39 = val
	case 40:
		agg.Cell40 = val
	case 41:
		agg.Cell41 = val
	case 42:
		agg.Cell42 = val
	case 43:
		agg.Cell43 = val
	case 44:
		agg.Cell44 = val
	case 45:
		agg.Cell45 = val
	case 46:
		agg.Cell46 = val
	case 47:
		agg.Cell47 = val
	case 48:
		agg.Cell48 = val
	case 49:
		agg.Cell49 = val
	case 50:
		agg.Cell50 = val
	case 51:
		agg.Cell51 = val
	case 52:
		agg.Cell52 = val
	case 53:
		agg.Cell53 = val
	case 54:
		agg.Cell54 = val
	case 55:
		agg.Cell55 = val
	case 56:
		agg.Cell56 = val
	case 57:
		agg.Cell57 = val
	case 58:
		agg.Cell58 = val
	case 59:
		agg.Cell59 = val
	case 60:
		agg.Cell60 = val
	case 61:
		agg.Cell61 = val
	case 62:
		agg.Cell62 = val
	case 63:
		agg.Cell63 = val
	case 64:
		agg.Cell64 = val
	case 65:
		agg.Cell65 = val
	case 66:
		agg.Cell66 = val
	case 67:
		agg.Cell67 = val
	case 68:
		agg.Cell68 = val
	case 69:
		agg.Cell69 = val
	case 70:
		agg.Cell70 = val
	case 71:
		agg.Cell71 = val
	case 72:
		agg.Cell72 = val
	case 73:
		agg.Cell73 = val
	case 74:
		agg.Cell74 = val
	case 75:
		agg.Cell75 = val
	case 76:
		agg.Cell76 = val
	case 77:
		agg.Cell77 = val
	case 78:
		agg.Cell78 = val
	case 79:
		agg.Cell79 = val
	case 80:
		agg.Cell80 = val
	case 81:
		agg.Cell81 = val
	case 82:
		agg.Cell82 = val
	case 83:
		agg.Cell83 = val
	case 84:
		agg.Cell84 = val
	case 85:
		agg.Cell85 = val
	case 86:
		agg.Cell86 = val
	case 87:
		agg.Cell87 = val
	case 88:
		agg.Cell88 = val
	case 89:
		agg.Cell89 = val
	case 90:
		agg.Cell90 = val
	case 91:
		agg.Cell91 = val
	case 92:
		agg.Cell92 = val
	case 93:
		agg.Cell93 = val
	case 94:
		agg.Cell94 = val
	case 95:
		agg.Cell95 = val
	case 96:
		agg.Cell96 = val
	case 97:
		agg.Cell97 = val
	case 98:
		agg.Cell98 = val
	case 99:
		agg.Cell99 = val
	case 100:
		agg.Cell100 = val
	case 101:
		agg.Cell101 = val
	case 102:
		agg.Cell102 = val
	case 103:
		agg.Cell103 = val
	case 104:
		agg.Cell104 = val
	case 105:
		agg.Cell105 = val
	case 106:
		agg.Cell106 = val
	case 107:
		agg.Cell107 = val
	case 108:
		agg.Cell108 = val
	case 109:
		agg.Cell109 = val
	case 110:
		agg.Cell110 = val
	case 111:
		agg.Cell111 = val
	case 112:
		agg.Cell112 = val
	case 113:
		agg.Cell113 = val
	case 114:
		agg.Cell114 = val
	case 115:
		agg.Cell115 = val
	case 116:
		agg.Cell116 = val
	case 117:
		agg.Cell117 = val
	case 118:
		agg.Cell118 = val
	case 119:
		agg.Cell119 = val
	case 120:
		agg.Cell120 = val
	case 121:
		agg.Cell121 = val
	case 122:
		agg.Cell122 = val
	case 123:
		agg.Cell123 = val
	case 124:
		agg.Cell124 = val
	case 125:
		agg.Cell125 = val
	case 126:
		agg.Cell126 = val
	case 127:
		agg.Cell127 = val
	case 128:
		agg.Cell128 = val
	}
}

func broadcastCells(agg *types.Cell_Data) {
	signals := make(map[string]interface{}, 128)
	signals["type"] = "cell"
	for i := 1; i <= 128; i++ {
		key := "cell" + strconv.Itoa(i)
		signals[key] = fmt.Sprintf("%.3f", getCellValue(agg, i))
	}
	wrapper := map[string]interface{}{
		"type":    "cell",
		"payload": signals,
		"time":    utils.CurrentTimestampString(),
	}
	broadcastTelemetry(wrapper)
}

func getCellValue(agg *types.Cell_Data, idx int) float64 {
	switch idx {
	case 1:
		return agg.Cell1
	case 2:
		return agg.Cell2
	case 3:
		return agg.Cell3
	case 4:
		return agg.Cell4
	case 5:
		return agg.Cell5
	case 6:
		return agg.Cell6
	case 7:
		return agg.Cell7
	case 8:
		return agg.Cell8
	case 9:
		return agg.Cell9
	case 10:
		return agg.Cell10
	case 11:
		return agg.Cell11
	case 12:
		return agg.Cell12
	case 13:
		return agg.Cell13
	case 14:
		return agg.Cell14
	case 15:
		return agg.Cell15
	case 16:
		return agg.Cell16
	case 17:
		return agg.Cell17
	case 18:
		return agg.Cell18
	case 19:
		return agg.Cell19
	case 20:
		return agg.Cell20
	case 21:
		return agg.Cell21
	case 22:
		return agg.Cell22
	case 23:
		return agg.Cell23
	case 24:
		return agg.Cell24
	case 25:
		return agg.Cell25
	case 26:
		return agg.Cell26
	case 27:
		return agg.Cell27
	case 28:
		return agg.Cell28
	case 29:
		return agg.Cell29
	case 30:
		return agg.Cell30
	case 31:
		return agg.Cell31
	case 32:
		return agg.Cell32
	case 33:
		return agg.Cell33
	case 34:
		return agg.Cell34
	case 35:
		return agg.Cell35
	case 36:
		return agg.Cell36
	case 37:
		return agg.Cell37
	case 38:
		return agg.Cell38
	case 39:
		return agg.Cell39
	case 40:
		return agg.Cell40
	case 41:
		return agg.Cell41
	case 42:
		return agg.Cell42
	case 43:
		return agg.Cell43
	case 44:
		return agg.Cell44
	case 45:
		return agg.Cell45
	case 46:
		return agg.Cell46
	case 47:
		return agg.Cell47
	case 48:
		return agg.Cell48
	case 49:
		return agg.Cell49
	case 50:
		return agg.Cell50
	case 51:
		return agg.Cell51
	case 52:
		return agg.Cell52
	case 53:
		return agg.Cell53
	case 54:
		return agg.Cell54
	case 55:
		return agg.Cell55
	case 56:
		return agg.Cell56
	case 57:
		return agg.Cell57
	case 58:
		return agg.Cell58
	case 59:
		return agg.Cell59
	case 60:
		return agg.Cell60
	case 61:
		return agg.Cell61
	case 62:
		return agg.Cell62
	case 63:
		return agg.Cell63
	case 64:
		return agg.Cell64
	case 65:
		return agg.Cell65
	case 66:
		return agg.Cell66
	case 67:
		return agg.Cell67
	case 68:
		return agg.Cell68
	case 69:
		return agg.Cell69
	case 70:
		return agg.Cell70
	case 71:
		return agg.Cell71
	case 72:
		return agg.Cell72
	case 73:
		return agg.Cell73
	case 74:
		return agg.Cell74
	case 75:
		return agg.Cell75
	case 76:
		return agg.Cell76
	case 77:
		return agg.Cell77
	case 78:
		return agg.Cell78
	case 79:
		return agg.Cell79
	case 80:
		return agg.Cell80
	case 81:
		return agg.Cell81
	case 82:
		return agg.Cell82
	case 83:
		return agg.Cell83
	case 84:
		return agg.Cell84
	case 85:
		return agg.Cell85
	case 86:
		return agg.Cell86
	case 87:
		return agg.Cell87
	case 88:
		return agg.Cell88
	case 89:
		return agg.Cell89
	case 90:
		return agg.Cell90
	case 91:
		return agg.Cell91
	case 92:
		return agg.Cell92
	case 93:
		return agg.Cell93
	case 94:
		return agg.Cell94
	case 95:
		return agg.Cell95
	case 96:
		return agg.Cell96
	case 97:
		return agg.Cell97
	case 98:
		return agg.Cell98
	case 99:
		return agg.Cell99
	case 100:
		return agg.Cell100
	case 101:
		return agg.Cell101
	case 102:
		return agg.Cell102
	case 103:
		return agg.Cell103
	case 104:
		return agg.Cell104
	case 105:
		return agg.Cell105
	case 106:
		return agg.Cell106
	case 107:
		return agg.Cell107
	case 108:
		return agg.Cell108
	case 109:
		return agg.Cell109
	case 110:
		return agg.Cell110
	case 111:
		return agg.Cell111
	case 112:
		return agg.Cell112
	case 113:
		return agg.Cell113
	case 114:
		return agg.Cell114
	case 115:
		return agg.Cell115
	case 116:
		return agg.Cell116
	case 117:
		return agg.Cell117
	case 118:
		return agg.Cell118
	case 119:
		return agg.Cell119
	case 120:
		return agg.Cell120
	case 121:
		return agg.Cell121
	case 122:
		return agg.Cell122
	case 123:
		return agg.Cell123
	case 124:
		return agg.Cell124
	case 125:
		return agg.Cell125
	case 126:
		return agg.Cell126
	case 127:
		return agg.Cell127
	case 128:
		return agg.Cell128
	default:
		return 0
	}
}

func HandleRemainingCellData(cellDataBuffers map[float64]*types.Cell_Data) {
	if agg, ok := cellDataBuffers[0]; ok && agg != nil {
		if err := db.InsertCellData(context.Background(), *agg); err == nil {
			broadcastCells(agg)
		}
	}
}
