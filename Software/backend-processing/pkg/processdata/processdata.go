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
	"reflect"
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

// buildPayload constructs a payload with the given type, timestamp and data.
func buildPayload(msgType string, t time.Time, data map[string]interface{}) map[string]interface{} {
	data["timestamp"] = t.Unix()
	return map[string]interface{}{
		"type":    msgType,
		"payload": data,
		"time":    t.Format("2006-01-02 15:04:05.000"),
	}
}

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
	t := time.Now()
	d := types.RearStrainGauges2_Data{
		Timestamp: t,
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
	payload := buildPayload("rear_strain_gauges2", t, map[string]interface{}{
		"gauge1": d.Gauge1,
		"gauge2": d.Gauge2,
		"gauge3": d.Gauge3,
		"gauge4": d.Gauge4,
		"gauge5": d.Gauge5,
		"gauge6": d.Gauge6,
	})
	broadcastTelemetry(payload)
}

func processRearStrainGauges1Data(decoded map[string]string) {
	t := time.Now()
	d := types.RearStrainGauges1_Data{
		Timestamp: t,
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
	payload := buildPayload("rear_strain_gauges1", t, map[string]interface{}{
		"gauge1": d.Gauge1,
		"gauge2": d.Gauge2,
		"gauge3": d.Gauge3,
		"gauge4": d.Gauge4,
		"gauge5": d.Gauge5,
		"gauge6": d.Gauge6,
	})
	broadcastTelemetry(payload)
}

func processBamocarRxData(decoded map[string]string) {
	t := time.Now()
	data := types.BamocarRxData_Data{
		Timestamp: t,
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
	payload := buildPayload("bamocar_rx_data", t, map[string]interface{}{
		"regid": data.REGID,
		"byte1": data.Byte1,
		"byte2": data.Byte2,
		"byte3": data.Byte3,
		"byte4": data.Byte4,
		"byte5": data.Byte5,
	})
	broadcastTelemetry(payload)
}

func processRearAeroData(decoded map[string]string) {
	t := time.Now()
	rearAero := types.RearAero_Data{
		Timestamp:    t,
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
	payload := buildPayload("rear_aero", t, map[string]interface{}{
		"pressure1":    rearAero.Pressure1,
		"pressure2":    rearAero.Pressure2,
		"pressure3":    rearAero.Pressure3,
		"temperature1": rearAero.Temperature1,
		"temperature2": rearAero.Temperature2,
		"temperature3": rearAero.Temperature3,
	})
	broadcastTelemetry(payload)
}

func processRearAnalogData(decoded map[string]string) {
	t := time.Now()
	rearAnalog := types.RearAnalog_Data{
		Timestamp: t,
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
	payload := buildPayload("rear_analog", t, map[string]interface{}{
		"analog1": rearAnalog.Analog1,
		"analog2": rearAnalog.Analog2,
		"analog3": rearAnalog.Analog3,
		"analog4": rearAnalog.Analog4,
		"analog5": rearAnalog.Analog5,
		"analog6": rearAnalog.Analog6,
		"analog7": rearAnalog.Analog7,
		"analog8": rearAnalog.Analog8,
	})
	broadcastTelemetry(payload)
}

func processRearFrequencyData(decoded map[string]string) {
	t := time.Now()
	d := types.RearFrequency_Data{
		Timestamp: t,
		Freq1:     utils.ParseFloatSignal(decoded, "Freq1"),
		Freq2:     utils.ParseFloatSignal(decoded, "Freq2"),
		Freq3:     utils.ParseFloatSignal(decoded, "Freq3"),
		Freq4:     utils.ParseFloatSignal(decoded, "Freq4"),
	}
	if err := db.New(db.DB).InsertRearFrequencyData(context.Background(), d); err != nil {
		return
	}
	payload := buildPayload("rear_frequency", t, map[string]interface{}{
		"freq1": d.Freq1,
		"freq2": d.Freq2,
		"freq3": d.Freq3,
		"freq4": d.Freq4,
	})
	broadcastTelemetry(payload)
}

func processFrontAeroData(decoded map[string]string) {
	t := time.Now()
	fa := types.FrontAero_Data{
		Timestamp:    t,
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
	payload := buildPayload("front_aero", t, map[string]interface{}{
		"pressure1":    fa.Pressure1,
		"pressure2":    fa.Pressure2,
		"pressure3":    fa.Pressure3,
		"temperature1": fa.Temperature1,
		"temperature2": fa.Temperature2,
		"temperature3": fa.Temperature3,
	})
	broadcastTelemetry(payload)
}

func processPDM1Data(decoded map[string]string) {
	t := time.Now()
	pdm1 := types.PDM1_Data{
		Timestamp:           t,
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
	payload := buildPayload("pdm1", t, map[string]interface{}{
		"compound_id":           pdm1.CompoundID,
		"pdm_int_temperature":   pdm1.PDMIntTemperature,
		"pdm_batt_voltage":      pdm1.PDMBattVoltage,
		"global_error_flag":     pdm1.GlobalErrorFlag,
		"total_current":         pdm1.TotalCurrent,
		"internal_rail_voltage": pdm1.InternalRailVoltage,
		"reset_source":          pdm1.ResetSource,
	})
	broadcastTelemetry(payload)
}

func processCellData(frameID uint32, decoded map[string]string, cellDataBuffers map[float64]*types.Cell_Data) {
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
	t := time.Now()
	gps := types.GPSBestPos_Data{
		Timestamp:    t,
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
	payload := buildPayload("gps_best_pos", t, map[string]interface{}{
		"latitude":      gps.Latitude,
		"longitude":     gps.Longitude,
		"altitude":      gps.Altitude,
		"std_latitude":  gps.StdLatitude,
		"std_longitude": gps.StdLongitude,
		"std_altitude":  gps.StdAltitude,
		"gps_status":    gps.GPSStatus,
	})
	broadcastTelemetry(payload)
}

func processThermData(decoded map[string]string, thermID int) {
	t := time.Now()
	th := types.Therm_Data{
		Timestamp:    t,
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
	if err := db.New(db.DB).InsertThermData(context.Background(), th); err != nil {
		return
	}
	payload := buildPayload("thermistor", t, map[string]interface{}{
		"thermistor_id": th.ThermistorID,
		"therm1":        th.Therm1,
		"therm2":        th.Therm2,
		"therm3":        th.Therm3,
		"therm4":        th.Therm4,
		"therm5":        th.Therm5,
		"therm6":        th.Therm6,
		"therm7":        th.Therm7,
		"therm8":        th.Therm8,
		"therm9":        th.Therm9,
		"therm10":       th.Therm10,
		"therm11":       th.Therm11,
		"therm12":       th.Therm12,
		"therm13":       th.Therm13,
		"therm14":       th.Therm14,
		"therm15":       th.Therm15,
		"therm16":       th.Therm16,
	})
	broadcastTelemetry(payload)
}

func processACULV2Data(decoded map[string]string) {
	t := time.Now()
	aculv2 := types.ACULV2_Data{
		Timestamp:     t,
		ChargeRequest: utils.ParseIntSignal(decoded, "ChargeRequest"),
	}
	if err := db.New(db.DB).InsertACULV2Data(context.Background(), aculv2); err != nil {
		return
	}
	payload := buildPayload("aculv2", t, map[string]interface{}{
		"charge_request": aculv2.ChargeRequest,
	})
	broadcastTelemetry(payload)
}

func processTCUData(decoded map[string]string) {
	t := time.Now()
	tcu := types.TCU_Data{
		Timestamp: t,
		APPS1:     utils.ParseFloatSignal(decoded, "APPS1"),
		APPS2:     utils.ParseFloatSignal(decoded, "APPS2"),
		BSE:       utils.ParseFloatSignal(decoded, "BSE"),
		Status:    utils.ParseIntSignal(decoded, "Status"),
	}
	db.New(db.DB).InsertTCUData(context.Background(), tcu)
	payload := buildPayload("tcu", t, map[string]interface{}{
		"apps1":  tcu.APPS1,
		"apps2":  tcu.APPS2,
		"bse":    tcu.BSE,
		"status": tcu.Status,
	})
	broadcastTelemetry(payload)
}

func processACULVFD2Data(decoded map[string]string) {
	t := time.Now()
	aculv2 := types.ACULV_FD_2_Data{
		Timestamp:   t,
		FanSetPoint: utils.ParseFloatSignal(decoded, "FanSetPoint"),
		RPM:         utils.ParseFloatSignal(decoded, "RPM"),
	}
	if err := db.New(db.DB).InsertACULV_FD_2_Data(context.Background(), aculv2); err != nil {
		return
	}
	payload := buildPayload("aculv_fd_2", t, map[string]interface{}{
		"fan_set_point": aculv2.FanSetPoint,
		"rpm":           aculv2.RPM,
	})
	broadcastTelemetry(payload)
}

func processACULV1Data(decoded map[string]string) {
	t := time.Now()
	aculv1 := types.ACULV1_Data{
		Timestamp:     t,
		ChargeStatus1: utils.ParseFloatSignal(decoded, "ChargeStatus1"),
		ChargeStatus2: utils.ParseFloatSignal(decoded, "ChargeStatus2"),
	}
	if err := db.New(db.DB).InsertACULV1Data(context.Background(), aculv1); err != nil {
		return
	}
	payload := buildPayload("aculv1", t, map[string]interface{}{
		"charge_status1": aculv1.ChargeStatus1,
		"charge_status2": aculv1.ChargeStatus2,
	})
	broadcastTelemetry(payload)
}

func processACULVFD1Data(decoded map[string]string) {
	t := time.Now()
	aculv := types.ACULV_FD_1_Data{
		Timestamp:            t,
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
	payload := buildPayload("aculv_fd_1", t, map[string]interface{}{
		"ams_status":            aculv.AMSStatus,
		"fld":                   aculv.FLD,
		"state_of_charge":       aculv.StateOfCharge,
		"accumulator_voltage":   aculv.AccumulatorVoltage,
		"tractive_voltage":      aculv.TractiveVoltage,
		"cell_current":          aculv.CellCurrent,
		"isolation_monitoring":  aculv.IsolationMonitoring,
		"isolation_monitoring1": aculv.IsolationMonitoring1,
	})
	broadcastTelemetry(payload)
}

func processPackCurrentData(decoded map[string]string) {
	t := time.Now()
	d := types.PackCurrent_Data{
		Timestamp: t,
		Current:   utils.ParseFloatSignal(decoded, "PackCurrent"),
	}
	if err := db.InsertPackCurrentData(context.Background(), d); err != nil {
		return
	}
	payload := buildPayload("pack_current", t, map[string]interface{}{
		"current": d.Current,
	})
	broadcastTelemetry(payload)
}

func processPackVoltageData(decoded map[string]string) {
	t := time.Now()
	d := types.PackVoltage_Data{
		Timestamp: t,
		Voltage:   utils.ParseFloatSignal(decoded, "PackVoltage"),
	}
	if err := db.InsertPackVoltageData(context.Background(), d); err != nil {
		return
	}
	payload := buildPayload("pack_voltage", t, map[string]interface{}{
		"voltage": d.Voltage,
	})
	broadcastTelemetry(payload)
}

func processBamocarData(decoded map[string]string) {
	t := time.Now()
	b := types.TCU2_data{
		Timestamp:  t,
		BamocarFRG: utils.ParseIntSignal(decoded, "BamocarFRG"),
		BamocarRFE: utils.ParseIntSignal(decoded, "BamocarRFE"),
		BrakeLight: utils.ParseIntSignal(decoded, "BrakeLight"),
	}
	if err := db.InsertBamocarData(context.Background(), b); err != nil {
		return
	}
	payload := buildPayload("bamocar", t, map[string]interface{}{
		"bamocar_frg": b.BamocarFRG,
		"bamocar_rfe": b.BamocarRFE,
		"brake_light": b.BrakeLight,
	})
	broadcastTelemetry(payload)
}

func processINS_GPS_Data(decoded map[string]string) {
	t := time.Now()
	data := types.INS_GPS_Data{
		Timestamp:   t,
		GNSSWeek:    utils.ParseIntSignal(decoded, "gnss_week"),
		GNSSSeconds: utils.ParseFloatSignal(decoded, "gnss_seconds"),
		GNSSLat:     utils.ParseFloatSignal(decoded, "gnss_lat"),
		GNSSLong:    utils.ParseFloatSignal(decoded, "gnss_long"),
		GNSSHeight:  utils.ParseFloatSignal(decoded, "gnss_height"),
	}
	if err := db.InsertINS_GPS_Data(context.Background(), data); err != nil {
		return
	}
	payload := buildPayload("ins_gps", t, map[string]interface{}{
		"gnss_week":    data.GNSSWeek,
		"gnss_seconds": data.GNSSSeconds,
		"gnss_lat":     data.GNSSLat,
		"gnss_long":    data.GNSSLong,
		"gnss_height":  data.GNSSHeight,
	})
	broadcastTelemetry(payload)
}

func processINS_IMUData(decoded map[string]string) {
	t := time.Now()
	data := types.INS_IMU_Data{
		Timestamp: t,
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
	payload := buildPayload("ins_imu", t, map[string]interface{}{
		"north_vel": data.NorthVel,
		"east_vel":  data.EastVel,
		"up_vel":    data.UpVel,
		"roll":      data.Roll,
		"pitch":     data.Pitch,
		"azimuth":   data.Azimuth,
		"status":    data.Status,
	})
	broadcastTelemetry(payload)
}

func processFrontFrequencyData(decoded map[string]string) {
	t := time.Now()
	d := types.FrontFrequency_Data{
		Timestamp:  t,
		RearRight:  utils.ParseFloatSignal(decoded, "RearRight"),
		FrontRight: utils.ParseFloatSignal(decoded, "FrontRight"),
		RearLeft:   utils.ParseFloatSignal(decoded, "RearLeft"),
		FrontLeft:  utils.ParseFloatSignal(decoded, "FrontLeft"),
	}
	if err := db.InsertFrontFrequencyData(context.Background(), d); err != nil {
		return
	}
	payload := buildPayload("front_frequency", t, map[string]interface{}{
		"rear_right":  d.RearRight,
		"front_right": d.FrontRight,
		"rear_left":   d.RearLeft,
		"front_left":  d.FrontLeft,
	})
	broadcastTelemetry(payload)
}

func processFrontAnalogData(decoded map[string]string) {
	t := time.Now()
	d := types.FrontAnalog_Data{
		Timestamp:     t,
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
	payload := buildPayload("front_analog", t, map[string]interface{}{
		"left_rad":        d.LeftRad,
		"right_rad":       d.RightRad,
		"front_right_pot": d.FrontRightPot,
		"front_left_pot":  d.FrontLeftPot,
		"rear_right_pot":  d.RearRightPot,
		"rear_left_pot":   d.RearLeftPot,
		"steering_angle":  d.SteeringAngle,
		"analog8":         d.Analog8,
	})
	broadcastTelemetry(payload)
}

func processBamocarTxData(decoded map[string]string) {
	t := time.Now()
	d := types.BamocarTxData_Data{
		Timestamp: t,
		REGID:     utils.ParseIntSignal(decoded, "REGID"),
		Data:      utils.ParseIntSignal(decoded, "Data"),
	}
	if err := db.InsertBamocarTxData(context.Background(), d); err != nil {
		return
	}
	payload := buildPayload("bamocar_tx_data", t, map[string]interface{}{
		"regid": d.REGID,
		"data":  d.Data,
	})
	broadcastTelemetry(payload)
}

func processBamoCarReTransmitData(decoded map[string]string) {
	t := time.Now()
	d := types.BamoCarReTransmit_Data{
		Timestamp:      t,
		MotorTemp:      utils.ParseIntSignal(decoded, "MotorTemp"),
		ControllerTemp: utils.ParseIntSignal(decoded, "ControllerTemp"),
	}
	if err := db.InsertBamoCarReTransmitData(context.Background(), d); err != nil {
		return
	}
	payload := buildPayload("bamo_car_re_transmit", t, map[string]interface{}{
		"motor_temp":      d.MotorTemp,
		"controller_temp": d.ControllerTemp,
	})
	broadcastTelemetry(payload)
}

func processEncoderData(decoded map[string]string) {
	t := time.Now()
	d := types.Encoder_Data{
		Timestamp: t,
		Encoder1:  utils.ParseIntSignal(decoded, "Encoder1"),
		Encoder2:  utils.ParseIntSignal(decoded, "Encoder2"),
		Encoder3:  utils.ParseIntSignal(decoded, "Encoder3"),
		Encoder4:  utils.ParseIntSignal(decoded, "Encoder4"),
	}
	if err := db.InsertEncoderData(context.Background(), d); err != nil {
		return
	}
	payload := buildPayload("encoder", t, map[string]interface{}{
		"encoder1": d.Encoder1,
		"encoder2": d.Encoder2,
		"encoder3": d.Encoder3,
		"encoder4": d.Encoder4,
	})
	broadcastTelemetry(payload)
}

func processPDMCurrentData(decoded map[string]string) {
	t := time.Now()
	d := types.PDMCurrent_Data{
		Timestamp:            t,
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
	payload := buildPayload("pdm_current", t, map[string]interface{}{
		"accumulator_current":    d.AccumulatorCurrent,
		"tcu_current":            d.TCUCurrent,
		"bamocar_current":        d.BamocarCurrent,
		"pumps_current":          d.PumpsCurrent,
		"tsal_current":           d.TSALCurrent,
		"daq_current":            d.DAQCurrent,
		"display_kvaser_current": d.DisplayKvaserCurrent,
		"shutdown_reset_current": d.ShutdownResetCurrent,
	})
	broadcastTelemetry(payload)
}

func processPDMReTransmitData(decoded map[string]string) {
	t := time.Now()
	d := types.PDMReTransmit_Data{
		Timestamp:           t,
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
	payload := buildPayload("pdm_re_transmit", t, map[string]interface{}{
		"pdm_int_temperature":   d.PDMIntTemperature,
		"pdm_batt_voltage":      d.PDMBattVoltage,
		"global_error_flag":     d.GlobalErrorFlag,
		"total_current":         d.TotalCurrent,
		"internal_rail_voltage": d.InternalRailVoltage,
		"reset_source":          d.ResetSource,
	})
	broadcastTelemetry(payload)
}

func processFrontStrainGauges1Data(decoded map[string]string) {
	t := time.Now()
	d := types.FrontStrainGauges1_Data{
		Timestamp: t,
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
	payload := buildPayload("front_strain_gauges_1", t, map[string]interface{}{
		"gauge1": d.Gauge1,
		"gauge2": d.Gauge2,
		"gauge3": d.Gauge3,
		"gauge4": d.Gauge4,
		"gauge5": d.Gauge5,
		"gauge6": d.Gauge6,
	})
	broadcastTelemetry(payload)
}

func processFrontStrainGauges2Data(decoded map[string]string) {
	t := time.Now()
	d := types.FrontStrainGauges2_Data{
		Timestamp: t,
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
	payload := buildPayload("front_strain_gauges_2", t, map[string]interface{}{
		"gauge1": d.Gauge1,
		"gauge2": d.Gauge2,
		"gauge3": d.Gauge3,
		"gauge4": d.Gauge4,
		"gauge5": d.Gauge5,
		"gauge6": d.Gauge6,
	})
	broadcastTelemetry(payload)
}

// --- Helper Functions for Cell Data using Reflection ---

func setCellValue(agg *types.Cell_Data, idx int, val float64) {
	v := reflect.ValueOf(agg).Elem()
	fieldName := "Cell" + strconv.Itoa(idx)
	f := v.FieldByName(fieldName)
	if f.IsValid() && f.CanSet() && f.Kind() == reflect.Float64 {
		f.SetFloat(val)
	}
}

func getCellValue(agg *types.Cell_Data, idx int) float64 {
	v := reflect.ValueOf(agg).Elem()
	fieldName := "Cell" + strconv.Itoa(idx)
	f := v.FieldByName(fieldName)
	if f.IsValid() && f.Kind() == reflect.Float64 {
		return f.Float()
	}
	return 0
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

func HandleRemainingCellData(cellDataBuffers map[float64]*types.Cell_Data) {
	if agg, ok := cellDataBuffers[0]; ok && agg != nil {
		if err := db.InsertCellData(context.Background(), *agg); err == nil {
			broadcastCells(agg)
		}
	}
}
