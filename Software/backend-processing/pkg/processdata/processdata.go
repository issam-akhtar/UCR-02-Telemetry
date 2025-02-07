package processdata

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"telem-system/pkg/db"
	"telem-system/pkg/types"
	"telem-system/pkg/utils"
)

// BroadcastFunc is set by main to push real-time messages to the Hub.
var BroadcastFunc func(msg []byte)

// HandleDataInsertions determines which table to insert into based on frameID.
func HandleDataInsertions(
	frameID uint32,
	decoded map[string]string,
	cellDataBuffers map[float64]*types.Cell_Data,
	recordCount int,
	path string,
) {
	switch frameID {
	case 4:
		processPackCurrentData(decoded, recordCount, path)
	case 5:
		processPackVoltageData(decoded, recordCount, path)
	case 6:
		processTCUData(decoded, recordCount, path)
	case 8:
		processACULVData(decoded, recordCount, path)

	case 50, 51, 52, 53, 54, 55, 56, 57:
		processCellData(frameID, decoded, cellDataBuffers, recordCount, path)

	case 81:
		processINS_GPS_Data(decoded, recordCount, path)
	case 82:
		processINS_IMUData(decoded, recordCount, path)
	case 100:
		processBamocarData(decoded, recordCount, path)
	case 200:
		processEncoderData(decoded, recordCount, path)
	case 259:
		processFrontAnalogData(decoded, recordCount, path)
	case 385:
		processBamocarTxData(decoded, recordCount, path)
	case 600:
		processBamoCarReTransmitData(decoded, recordCount, path)
	case 101:
		processFrontFrequencyData(decoded, recordCount, path)
	case 1312:
		processPDMCurrentData(decoded, recordCount, path)
	case 1552:
		processFrontStrainGauges1Data(decoded, recordCount, path)
	case 1553:
		processFrontStrainGauges2Data(decoded, recordCount, path)
	case 1680:
		processPDMReTransmitData(decoded, recordCount, path)
	default:
		// unrecognized frame
	}
}

// processCellData aggregates partial frames 50..56, and on frame 57 does insert + broadcast.
func processCellData(
	frameID uint32,
	decoded map[string]string,
	cellDataBuffers map[float64]*types.Cell_Data,
	recordCount int,
	path string,
) {
	// Use key=0 as a single aggregator for all cell frames.
	if _, ok := cellDataBuffers[0]; !ok {
		cellDataBuffers[0] = &types.Cell_Data{}
	}
	agg := cellDataBuffers[0]

	// Merge partial signals "Cell1..Cell16" from each frame
	for sigName := range decoded {
		if strings.HasPrefix(sigName, "Cell") {
			idxStr := sigName[4:]
			idx, err := utils.AtoiSafe(idxStr)
			if err != nil {
				continue
			}
			if idx < 1 || idx > 128 {
				continue
			}
			val := utils.ParseFloatSignal(decoded, sigName)
			setCellValue(agg, idx, val)
		}
	}

	// If final frame = 57, we have a full aggregator => Insert + broadcast
	if frameID == 57 {
		agg.Timestamp = time.Now() // Set the timestamp
		if err := db.InsertCellData(context.Background(), *agg); err != nil {
			log.Printf("Failed to insert 128-cell data (#%d, %s): %v", recordCount, path, err)
		} else {
			broadcastCells(agg)
		}
		delete(cellDataBuffers, 0)
	}
}

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
	default:
		// Ignore invalid index
	}
}
func broadcastCells(agg *types.Cell_Data) {
	signals := map[string]string{}
	signals["type"] = "Cell"

	// Use uppercase keys to match historical API
	for i := 1; i <= 128; i++ {
		k := fmt.Sprintf("Cell%d", i) // Uppercase C
		val := getCellValue(agg, i)
		signals[k] = fmt.Sprintf("%.3f", val)
	}

	wrapper := map[string]interface{}{
		"type":    "Cell",
		"payload": signals,
		"time":    utils.CurrentTimestampString(),
	}

	j, err := utils.MapToJSON(wrapper)
	if err != nil {
		log.Printf("Error serializing cell aggregator: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
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
	// Same note: fill out the rest from 3..127 in practice.
}

// HandleRemainingCellData if aggregator remains after all lines processed.
func HandleRemainingCellData(cellDataBuffers map[float64]*types.Cell_Data, recordCount int, path string) {
	for k, agg := range cellDataBuffers {
		if k == 0 && agg != nil {
			if err := db.InsertCellData(context.Background(), *agg); err != nil {
				log.Printf("Failed leftover aggregator (#%d, %s): %v", recordCount, path, err)
			} else {
				broadcastCells(agg)
				log.Printf("Inserted and broadcasted leftover aggregator (#%d, %s).", recordCount, path)
			}
		}
	}
}

// processTCUData processes TCU telemetry data and broadcasts it.
func processTCUData(decoded map[string]string, recordCount int, path string) {
	t := types.TCU_Data{
		Timestamp: time.Now(),
		APPS1:     utils.ParseFloatSignal(decoded, "APPS1"),
		APPS2:     utils.ParseFloatSignal(decoded, "APPS2"),
		BSE:       utils.ParseFloatSignal(decoded, "BSE"),
		Status:    utils.ParseIntSignal(decoded, "Status"),
	}
	if err := db.InsertTCUData(context.Background(), t); err != nil {
		log.Printf("Failed TCU insert (#%d, %s): %v", recordCount, path, err)
	}

	// Prepare the real-time TCU message
	payload := map[string]interface{}{
		"type": "TCU",
		"payload": map[string]interface{}{
			"timestamp": t.Timestamp.Unix(),
			"apps1":     t.APPS1,
			"apps2":     t.APPS2,
			"bse":       t.BSE,
			"status":    t.Status,
		},
		"time": t.Timestamp.Format("2006-01-02 15:04:05.000"),
	}

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing TCU data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processACULVData processes ACULV telemetry data and broadcasts it.
func processACULVData(decoded map[string]string, recordCount int, path string) {
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
	if err := db.InsertACULV_FD_1_Data(context.Background(), aculv); err != nil {
		log.Printf("Failed ACULV insert (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time ACULV message
	payload := map[string]interface{}{
		"type": "ACULV",
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

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing ACULV data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processPackCurrentData processes PackCurrent telemetry data and broadcasts it.
func processPackCurrentData(decoded map[string]string, recordCount int, path string) {
	d := types.PackCurrent_Data{
		Timestamp: time.Now(),
		Current:   utils.ParseFloatSignal(decoded, "PackCurrent"),
	}
	if err := db.InsertPackCurrentData(context.Background(), d); err != nil {
		log.Printf("Failed PackCurrent (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time PackCurrent message
	payload := map[string]interface{}{
		"type": "PackCurrent",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"current":   d.Current,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing PackCurrent data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processPackVoltageData processes PackVoltage telemetry data and broadcasts it.
func processPackVoltageData(decoded map[string]string, recordCount int, path string) {
	d := types.PackVoltage_Data{
		Timestamp: time.Now(),
		Voltage:   utils.ParseFloatSignal(decoded, "PackVoltage"),
	}
	if err := db.InsertPackVoltageData(context.Background(), d); err != nil {
		log.Printf("Failed PackVoltage (#%d, %s): %v", recordCount, path, err)
		return
	}

	payload := map[string]interface{}{
		"type": "PackVoltage",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"voltage":   d.Voltage,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing PackVoltage data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processBamocarData processes Bamocar telemetry data and broadcasts it.
func processBamocarData(decoded map[string]string, recordCount int, path string) {
	b := types.Bamocar_Data{
		Timestamp:  time.Now(),
		BamocarFRG: utils.ParseIntSignal(decoded, "BamocarFRG"),
		BamocarRFE: utils.ParseIntSignal(decoded, "BamocarRFE"),
		BrakeLight: utils.ParseIntSignal(decoded, "BrakeLight"),
	}
	if err := db.InsertBamocarData(context.Background(), b); err != nil {
		log.Printf("Failed Bamocar (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time Bamocar message
	payload := map[string]interface{}{
		"type": "Bamocar",
		"payload": map[string]interface{}{
			"timestamp":   b.Timestamp.Unix(),
			"bamocar_frg": b.BamocarFRG,
			"bamocar_rfe": b.BamocarRFE,
			"brake_light": b.BrakeLight,
		},
		"time": b.Timestamp.Format("2006-01-02 15:04:05.000"),
	}

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing Bamocar data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processINS_GPS_Data processes INS_GPS telemetry data and broadcasts it.
func processINS_GPS_Data(decoded map[string]string, recordCount int, path string) {
	data := types.INS_GPS_Data{
		Timestamp:   time.Now(),
		GNSSWeek:    utils.ParseIntSignal(decoded, "gnss_week"),
		GNSSSeconds: utils.ParseFloatSignal(decoded, "gnss_seconds"),
		GNSSLat:     utils.ParseFloatSignal(decoded, "gnss_lat"),
		GNSSLong:    utils.ParseFloatSignal(decoded, "gnss_long"),
		GNSSHeight:  utils.ParseFloatSignal(decoded, "gnss_height"),
	}
	if err := db.InsertINS_GPS_Data(context.Background(), data); err != nil {
		log.Printf("Failed INS_GPS (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time INS_GPS message
	payload := map[string]interface{}{
		"type": "INS_GPS",
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

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing INS_GPS data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processINS_IMUData processes INS_IMU telemetry data and broadcasts it.
func processINS_IMUData(decoded map[string]string, recordCount int, path string) {
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
		log.Printf("Failed INS_IMU (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time INS_IMU message
	payload := map[string]interface{}{
		"type": "INS_IMU",
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

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing INS_IMU data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processFrontFrequencyData processes FrontFrequency telemetry data and broadcasts it.
func processFrontFrequencyData(decoded map[string]string, recordCount int, path string) {
	d := types.FrontFrequency_Data{
		Timestamp:  time.Now(),
		RearRight:  utils.ParseFloatSignal(decoded, "RearRight"),
		FrontRight: utils.ParseFloatSignal(decoded, "FrontRight"),
		RearLeft:   utils.ParseFloatSignal(decoded, "RearLeft"),
		FrontLeft:  utils.ParseFloatSignal(decoded, "FrontLeft"),
	}
	if err := db.InsertFrontFrequencyData(context.Background(), d); err != nil {
		log.Printf("Failed FrontFreq (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time FrontFrequency message
	payload := map[string]interface{}{
		"type": "FrontFrequency",
		"payload": map[string]interface{}{
			"timestamp":   d.Timestamp.Unix(),
			"rear_right":  d.RearRight,
			"front_right": d.FrontRight,
			"rear_left":   d.RearLeft,
			"front_left":  d.FrontLeft,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing FrontFrequency data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processFrontAnalogData processes FrontAnalog telemetry data and broadcasts it.
func processFrontAnalogData(decoded map[string]string, recordCount int, path string) {
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
		log.Printf("Failed FrontAnalog (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time FrontAnalog message
	payload := map[string]interface{}{
		"type": "FrontAnalog",
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

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing FrontAnalog data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processBamocarTxData processes BamocarTxData telemetry data and broadcasts it.
func processBamocarTxData(decoded map[string]string, recordCount int, path string) {
	d := types.BamocarTxData_Data{
		Timestamp: time.Now(),
		REGID:     utils.ParseIntSignal(decoded, "REGID"),
		Data:      utils.ParseIntSignal(decoded, "Data"),
	}
	if err := db.InsertBamocarTxData(context.Background(), d); err != nil {
		log.Printf("Failed BamocarTx (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time BamocarTxData message
	payload := map[string]interface{}{
		"type": "BamocarTxData",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"regid":     d.REGID,
			"data":      d.Data,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing BamocarTxData: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processBamoCarReTransmitData processes BamoCarReTransmit telemetry data and broadcasts it.
func processBamoCarReTransmitData(decoded map[string]string, recordCount int, path string) {
	d := types.BamoCarReTransmit_Data{
		Timestamp:      time.Now(),
		MotorTemp:      utils.ParseIntSignal(decoded, "MotorTemp"),
		ControllerTemp: utils.ParseIntSignal(decoded, "ControllerTemp"),
	}
	if err := db.InsertBamoCarReTransmitData(context.Background(), d); err != nil {
		log.Printf("Failed BamoCarReTx (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time BamoCarReTransmit message
	payload := map[string]interface{}{
		"type": "BamoCarReTransmit",
		"payload": map[string]interface{}{
			"timestamp":       d.Timestamp.Unix(),
			"motor_temp":      d.MotorTemp,
			"controller_temp": d.ControllerTemp,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing BamoCarReTransmit data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processEncoderData processes Encoder telemetry data and broadcasts it.
func processEncoderData(decoded map[string]string, recordCount int, path string) {
	d := types.Encoder_Data{
		Timestamp: time.Now(),
		Encoder1:  utils.ParseIntSignal(decoded, "Encoder1"),
		Encoder2:  utils.ParseIntSignal(decoded, "Encoder2"),
		Encoder3:  utils.ParseIntSignal(decoded, "Encoder3"),
		Encoder4:  utils.ParseIntSignal(decoded, "Encoder4"),
	}
	if err := db.InsertEncoderData(context.Background(), d); err != nil {
		log.Printf("Failed Encoder (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time Encoder message
	payload := map[string]interface{}{
		"type": "Encoder",
		"payload": map[string]interface{}{
			"timestamp": d.Timestamp.Unix(),
			"encoder1":  d.Encoder1,
			"encoder2":  d.Encoder2,
			"encoder3":  d.Encoder3,
			"encoder4":  d.Encoder4,
		},
		"time": d.Timestamp.Format("2006-01-02 15:04:05.000"),
	}

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing Encoder data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processPDMCurrentData processes PDMCurrent telemetry data and broadcasts it.
func processPDMCurrentData(decoded map[string]string, recordCount int, path string) {
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
		log.Printf("Failed PDMCurrent (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time PDMCurrent message
	payload := map[string]interface{}{
		"type": "PDMCurrent",
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

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing PDMCurrent data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processFrontStrainGauges1Data processes FrontStrainGauges1 telemetry data and broadcasts it.
func processFrontStrainGauges1Data(decoded map[string]string, recordCount int, path string) {
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
		log.Printf("Failed FSG1 (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time FrontStrainGauges1 message
	payload := map[string]interface{}{
		"type": "FrontStrainGauges1",
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

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing FrontStrainGauges1 data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processFrontStrainGauges2Data processes FrontStrainGauges2 telemetry data and broadcasts it.
func processFrontStrainGauges2Data(decoded map[string]string, recordCount int, path string) {
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
		log.Printf("Failed FSG2 (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time FrontStrainGauges2 message
	payload := map[string]interface{}{
		"type": "FrontStrainGauges2",
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

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing FrontStrainGauges2 data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}

// processPDMReTransmitData processes PDMReTransmit telemetry data and broadcasts it.
func processPDMReTransmitData(decoded map[string]string, recordCount int, path string) {
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
		log.Printf("Failed PDMReTx (#%d, %s): %v", recordCount, path, err)
		return
	}

	// Prepare the real-time PDMReTransmit message
	payload := map[string]interface{}{
		"type": "PDMReTransmit",
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

	j, err := utils.MapToJSON(payload)
	if err != nil {
		log.Printf("Error serializing PDMReTransmit data: %v", err)
		return
	}
	if BroadcastFunc != nil {
		BroadcastFunc([]byte(j))
	}
}
