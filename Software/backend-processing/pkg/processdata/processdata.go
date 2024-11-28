// pkg/processdata/process_data.go
package processdata

import (
	"context"
	"fmt"
	"log"

	"telem-system/pkg/db"
	"telem-system/pkg/types"
	"telem-system/pkg/utils"
)

// HandleDataInsertions routes the decoded data to the appropriate insertion function.
func HandleDataInsertions(frameID uint32, decodedSignalsMap map[string]string, cellDataBuffers map[float64]*types.Cell_Data, recordCount int, path string) {
	switch frameID {
	case 4:
		processPackCurrentData(decodedSignalsMap, recordCount, path)
	case 5:
		processPackVoltageData(decodedSignalsMap, recordCount, path)
	case 6:
		processTCUData(decodedSignalsMap, recordCount, path)
	case 8:
		processACULV_FD_1_Data(decodedSignalsMap, recordCount, path)
	case 50, 51, 52, 53, 54, 55, 56, 57:
		processCellData(frameID, decodedSignalsMap, cellDataBuffers, recordCount, path)
	case 81:
		processINS_GPS_Data(decodedSignalsMap, recordCount, path)
	case 82:
		processINS_IMUData(decodedSignalsMap, recordCount, path)
	case 100:
		processBamocarData(decodedSignalsMap, recordCount, path)
	case 200:
		processEncoderData(decodedSignalsMap, recordCount, path)
	case 259:
		processFrontAnalogData(decodedSignalsMap, recordCount, path)
	case 385:
		processBamocarTxData(decodedSignalsMap, recordCount, path)
	case 600:
		processBamoCarReTransmitData(decodedSignalsMap, recordCount, path)
	case 101:
		processFrontFrequencyData(decodedSignalsMap, recordCount, path)
	case 1312:
		processPDMCurrentData(decodedSignalsMap, recordCount, path)
	case 1552:
		processFrontStrainGauges1Data(decodedSignalsMap, recordCount, path)
	case 1553:
		processFrontStrainGauges2Data(decodedSignalsMap, recordCount, path)
	case 1680:
		processPDMReTransmitData(decodedSignalsMap, recordCount, path)
	default:
		// Unrecognized frame ID; optionally log or handle differently
	}
}

// processTCUData processes and inserts TCU_Data.
func processTCUData(decodedSignalsMap map[string]string, recordCount int, path string) {
	tcuData := types.TCU_Data{
		APPS1:  utils.ParseFloatSignal(decodedSignalsMap, "APPS1"),
		APPS2:  utils.ParseFloatSignal(decodedSignalsMap, "APPS2"),
		BSE:    utils.ParseFloatSignal(decodedSignalsMap, "BSE"),
		Status: utils.ParseIntSignal(decodedSignalsMap, "Status"),
	}

	if err := db.InsertTCUData(context.Background(), tcuData); err != nil {
		log.Printf("Failed to insert TCU data in record #%d of file %s: %v", recordCount, path, err)
	}
}

// processACULV_FD_1_Data processes and inserts ACULV_FD_1_Data.
func processACULV_FD_1_Data(decodedSignalsMap map[string]string, recordCount int, path string) {
	aculvData := types.ACULV_FD_1_Data{
		AMSStatus:            utils.ParseIntSignal(decodedSignalsMap, "AMSStatus"),
		FLD:                  utils.ParseIntSignal(decodedSignalsMap, "FLD"),
		StateOfCharge:        utils.ParseFloatSignal(decodedSignalsMap, "StateOfCharge"),
		AccumulatorVoltage:   utils.ParseFloatSignal(decodedSignalsMap, "AccumulatorVoltage"),
		TractiveVoltage:      utils.ParseFloatSignal(decodedSignalsMap, "TractiveVoltage"),
		CellCurrent:          utils.ParseFloatSignal(decodedSignalsMap, "CellCurrent"),
		IsolationMonitoring:  utils.ParseIntSignal(decodedSignalsMap, "IsolationMonitoring"),
		IsolationMonitoring1: utils.ParseFloatSignal(decodedSignalsMap, "IsolationMonitoring1"),
	}

	if err := db.InsertACULV_FD_1_Data(context.Background(), aculvData); err != nil {
		log.Printf("Failed to insert ACULV_FD_1 data in record #%d of file %s: %v", recordCount, path, err)
	}
}

// processPackCurrentData processes and inserts PackCurrent_Data.
func processPackCurrentData(decodedSignalsMap map[string]string, recordCount int, path string) {
	packCurrentData := types.PackCurrent_Data{
		Current: utils.ParseFloatSignal(decodedSignalsMap, "PackCurrent"),
	}

	if err := db.InsertPackCurrentData(context.Background(), packCurrentData); err != nil {
		log.Printf("Failed to insert PackCurrent data in record #%d of file %s: %v", recordCount, path, err)
	}
}

// processPackVoltageData processes and inserts PackVoltage_Data.
func processPackVoltageData(decodedSignalsMap map[string]string, recordCount int, path string) {
	packVoltageData := types.PackVoltage_Data{
		Voltage: utils.ParseFloatSignal(decodedSignalsMap, "PackVoltage"),
	}

	if err := db.InsertPackVoltageData(context.Background(), packVoltageData); err != nil {
		log.Printf("Failed to insert PackVoltage data in record #%d of file %s: %v", recordCount, path, err)
	}
}

// processCellData processes and inserts Cell_Data.
func processCellData(frameID uint32, decodedSignalsMap map[string]string, cellDataBuffers map[float64]*types.Cell_Data, recordCount int, path string) {
	if frameID == 50 {
		cellData := mapToCellData(decodedSignalsMap)
		cellDataBuffers[0] = &cellData // Temporary buffer key
	}

	if frameID == 57 {
		if cellData, exists := cellDataBuffers[0]; exists && cellData != nil {
			err := db.InsertCellData(context.Background(), *cellData)
			if err != nil {
				log.Printf("Failed to insert Cell data in record #%d of file %s: %v", recordCount, path, err)
			} else {
				//log.Printf("Successfully inserted Cell data for record #%d of file %s", recordCount, path)
			}
			delete(cellDataBuffers, 0)
		}
	}
}

// mapToCellData maps decoded signals to a Cell_Data struct.
func mapToCellData(decodedSignalsMap map[string]string) types.Cell_Data {
	var cells [128]float64
	for i := 1; i <= 128; i++ {
		key := fmt.Sprintf("Cell%d", i)
		cells[i-1] = utils.ParseFloatSignal(decodedSignalsMap, key)
	}
	return types.Cell_Data{
		Cells: cells,
	}
}

// processBamocarData processes and inserts Bamocar_Data.
func processBamocarData(decodedSignalsMap map[string]string, recordCount int, path string) {
	bamocarData := types.Bamocar_Data{
		BamocarFRG: utils.ParseIntSignal(decodedSignalsMap, "BamocarFRG"),
		BamocarRFE: utils.ParseIntSignal(decodedSignalsMap, "BamocarRFE"),
		BrakeLight: utils.ParseIntSignal(decodedSignalsMap, "BrakeLight"),
	}

	if err := db.InsertBamocarData(context.Background(), bamocarData); err != nil {
		log.Printf("Failed to insert Bamocar data in record #%d of file %s: %v", recordCount, path, err)
	}
}

// processINS_GPS_Data processes and inserts INS_GPS_Data.
func processINS_GPS_Data(decodedSignalsMap map[string]string, recordCount int, path string) {
	insGPSData := types.INS_GPS_Data{
		GNSSWeek:    utils.ParseIntSignal(decodedSignalsMap, "gnss_week"),
		GNSSSeconds: utils.ParseFloatSignal(decodedSignalsMap, "gnss_seconds"),
		GNSSLat:     utils.ParseFloatSignal(decodedSignalsMap, "gnss_lat"),
		GNSSLong:    utils.ParseFloatSignal(decodedSignalsMap, "gnss_long"),
		GNSSHeight:  utils.ParseFloatSignal(decodedSignalsMap, "gnss_height"),
	}

	if err := db.InsertINS_GPS_Data(context.Background(), insGPSData); err != nil {
		log.Printf("Failed to insert INS_GPS data for record #%d of file %s: %v", recordCount, path, err)
	}
}

// processINS_IMUData processes and inserts INS_IMU_Data.
func processINS_IMUData(decodedSignalsMap map[string]string, recordCount int, path string) {
	insIMUData := types.INS_IMU_Data{
		NorthVel: utils.ParseFloatSignal(decodedSignalsMap, "north_vel"),
		EastVel:  utils.ParseFloatSignal(decodedSignalsMap, "east_vel"),
		UpVel:    utils.ParseFloatSignal(decodedSignalsMap, "up_vel"),
		Roll:     utils.ParseFloatSignal(decodedSignalsMap, "roll"),
		Pitch:    utils.ParseFloatSignal(decodedSignalsMap, "pitch"),
		Azimuth:  utils.ParseFloatSignal(decodedSignalsMap, "azimuth"),
		Status:   utils.ParseIntSignal(decodedSignalsMap, "status"),
	}

	if err := db.InsertINS_IMUData(context.Background(), insIMUData); err != nil {
		log.Printf("Failed to insert INS_IMU data for record #%d of file %s: %v", recordCount, path, err)
	}
}

// processFrontFrequencyData processes and inserts FrontFrequency_Data.
func processFrontFrequencyData(decodedSignalsMap map[string]string, recordCount int, path string) {
	frontFrequencyData := types.FrontFrequency_Data{
		RearRight:  utils.ParseFloatSignal(decodedSignalsMap, "RearRight"),
		FrontRight: utils.ParseFloatSignal(decodedSignalsMap, "FrontRight"),
		RearLeft:   utils.ParseFloatSignal(decodedSignalsMap, "RearLeft"),
		FrontLeft:  utils.ParseFloatSignal(decodedSignalsMap, "FrontLeft"),
	}

	if err := db.InsertFrontFrequencyData(context.Background(), frontFrequencyData); err != nil {
		log.Printf("Failed to insert FrontFrequency data for record #%d of file %s: %v", recordCount, path, err)
	}
}

// processFrontAnalogData processes and inserts FrontAnalog_Data.
func processFrontAnalogData(decodedSignalsMap map[string]string, recordCount int, path string) {
	frontAnalogData := types.FrontAnalog_Data{
		LeftRad:       utils.ParseIntSignal(decodedSignalsMap, "LeftRad"),
		RightRad:      utils.ParseIntSignal(decodedSignalsMap, "RightRad"),
		FrontRightPot: utils.ParseFloatSignal(decodedSignalsMap, "FrontRightPot"),
		FrontLeftPot:  utils.ParseFloatSignal(decodedSignalsMap, "FrontLeftPot"),
		RearRightPot:  utils.ParseFloatSignal(decodedSignalsMap, "RearRightPot"),
		RearLeftPot:   utils.ParseFloatSignal(decodedSignalsMap, "RearLeftPot"),
		SteeringAngle: utils.ParseFloatSignal(decodedSignalsMap, "SteeringAngle"),
		Analog8:       utils.ParseIntSignal(decodedSignalsMap, "Analog8"),
	}

	if err := db.InsertFrontAnalogData(context.Background(), frontAnalogData); err != nil {
		log.Printf("Failed to insert FrontAnalog data for record #%d of file %s: %v", recordCount, path, err)
	}
}

// processBamocarTxData processes and inserts BamocarTxData_Data.
func processBamocarTxData(decodedSignalsMap map[string]string, recordCount int, path string) {
	bamocarTxData := types.BamocarTxData_Data{
		REGID: utils.ParseIntSignal(decodedSignalsMap, "REGID"),
		Data:  utils.ParseIntSignal(decodedSignalsMap, "Data"),
	}

	if err := db.InsertBamocarTxData(context.Background(), bamocarTxData); err != nil {
		log.Printf("Failed to insert BamocarTxData data for record #%d of file %s: %v", recordCount, path, err)
	}
}

// processBamoCarReTransmitData processes and inserts BamoCarReTransmit_Data.
func processBamoCarReTransmitData(decodedSignalsMap map[string]string, recordCount int, path string) {
	bamoCarReTransmitData := types.BamoCarReTransmit_Data{
		MotorTemp:      utils.ParseIntSignal(decodedSignalsMap, "MotorTemp"),
		ControllerTemp: utils.ParseIntSignal(decodedSignalsMap, "ControllerTemp"),
	}

	if err := db.InsertBamoCarReTransmitData(context.Background(), bamoCarReTransmitData); err != nil {
		log.Printf("Failed to insert BamoCarReTransmit data for record #%d of file %s: %v", recordCount, path, err)
	}
}

// processEncoderData processes and inserts Encoder_Data.
func processEncoderData(decodedSignalsMap map[string]string, recordCount int, path string) {
	encoderData := types.Encoder_Data{
		Encoder1: utils.ParseIntSignal(decodedSignalsMap, "Encoder1"),
		Encoder2: utils.ParseIntSignal(decodedSignalsMap, "Encoder2"),
		Encoder3: utils.ParseIntSignal(decodedSignalsMap, "Encoder3"),
		Encoder4: utils.ParseIntSignal(decodedSignalsMap, "Encoder4"),
	}

	if err := db.InsertEncoderData(context.Background(), encoderData); err != nil {
		log.Printf("Failed to insert Encoder data in record #%d of file %s: %v", recordCount, path, err)
	}
}

// processPDMCurrentData processes and inserts PDMCurrent_Data.
func processPDMCurrentData(decodedSignalsMap map[string]string, recordCount int, path string) {
	pdmCurrentData := types.PDMCurrent_Data{
		AccumulatorCurrent:   utils.ParseIntSignal(decodedSignalsMap, "AccumulatorCurrent"),
		TCUCurrent:           utils.ParseIntSignal(decodedSignalsMap, "TCUCurrent"),
		BamocarCurrent:       utils.ParseIntSignal(decodedSignalsMap, "BamocarCurrent"),
		PumpsCurrent:         utils.ParseIntSignal(decodedSignalsMap, "PumpsCurrent"),
		TSALCurrent:          utils.ParseIntSignal(decodedSignalsMap, "TSALCurrent"),
		DAQCurrent:           utils.ParseIntSignal(decodedSignalsMap, "DAQCurrent"),
		DisplayKvaserCurrent: utils.ParseIntSignal(decodedSignalsMap, "DisplayKvaserCurrent"),
		ShutdownResetCurrent: utils.ParseIntSignal(decodedSignalsMap, "ShutdownResetCurrent"),
	}

	if err := db.InsertPDMCurrentData(context.Background(), pdmCurrentData); err != nil {
		log.Printf("Failed to insert PDMCurrent data in record #%d of file %s: %v", recordCount, path, err)
	}
}

// processFrontStrainGauges1Data processes and inserts FrontStrainGauges1_Data.
func processFrontStrainGauges1Data(decodedSignalsMap map[string]string, recordCount int, path string) {
	frontStrainGauges1Data := types.FrontStrainGauges1_Data{
		Gauge1: utils.ParseIntSignal(decodedSignalsMap, "Gauge1"),
		Gauge2: utils.ParseIntSignal(decodedSignalsMap, "Gauge2"),
		Gauge3: utils.ParseIntSignal(decodedSignalsMap, "Gauge3"),
		Gauge4: utils.ParseIntSignal(decodedSignalsMap, "Gauge4"),
		Gauge5: utils.ParseIntSignal(decodedSignalsMap, "Gauge5"),
		Gauge6: utils.ParseIntSignal(decodedSignalsMap, "Gauge6"),
	}

	if err := db.InsertFrontStrainGauges1Data(context.Background(), frontStrainGauges1Data); err != nil {
		log.Printf("Failed to insert FrontStrainGauges1 data in record #%d of file %s: %v", recordCount, path, err)
	}
}

// processFrontStrainGauges2Data processes and inserts FrontStrainGauges2_Data.
func processFrontStrainGauges2Data(decodedSignalsMap map[string]string, recordCount int, path string) {
	frontStrainGauges2Data := types.FrontStrainGauges2_Data{
		Gauge1: utils.ParseIntSignal(decodedSignalsMap, "Gauge1"),
		Gauge2: utils.ParseIntSignal(decodedSignalsMap, "Gauge2"),
		Gauge3: utils.ParseIntSignal(decodedSignalsMap, "Gauge3"),
		Gauge4: utils.ParseIntSignal(decodedSignalsMap, "Gauge4"),
		Gauge5: utils.ParseIntSignal(decodedSignalsMap, "Gauge5"),
		Gauge6: utils.ParseIntSignal(decodedSignalsMap, "Gauge6"),
	}

	if err := db.InsertFrontStrainGauges2Data(context.Background(), frontStrainGauges2Data); err != nil {
		log.Printf("Failed to insert FrontStrainGauges2 data in record #%d of file %s: %v", recordCount, path, err)
	}
}

// processPDMReTransmitData processes and inserts PDMReTransmit_Data.
func processPDMReTransmitData(decodedSignalsMap map[string]string, recordCount int, path string) {
	pdmReTransmitData := types.PDMReTransmit_Data{
		PDMIntTemperature:   utils.ParseIntSignal(decodedSignalsMap, "PDMIntTemperature"),
		PDMBattVoltage:      utils.ParseFloatSignal(decodedSignalsMap, "PDMBattVoltage"),
		GlobalErrorFlag:     utils.ParseIntSignal(decodedSignalsMap, "GlobalErrorFlag"),
		TotalCurrent:        utils.ParseIntSignal(decodedSignalsMap, "TotalCurrent"),
		InternalRailVoltage: utils.ParseFloatSignal(decodedSignalsMap, "InternalRailVoltage"),
		ResetSource:         utils.ParseIntSignal(decodedSignalsMap, "ResetSource"),
	}

	if err := db.InsertPDMReTransmitData(context.Background(), pdmReTransmitData); err != nil {
		log.Printf("Failed to insert PDMReTransmit data in record #%d of file %s: %v", recordCount, path, err)
	}
}

// HandleRemainingCellData processes any remaining cell data after all data is processed.
func HandleRemainingCellData(cellDataBuffers map[float64]*types.Cell_Data, recordCount int, path string) {
	for key, cellData := range cellDataBuffers {
		if key == 0 {
			if err := db.InsertCellData(context.Background(), *cellData); err != nil {
				log.Printf("Failed to insert remaining Cell data: %v", err)
			} else {
				log.Printf("Successfully inserted remaining Cell data for record #%d of file %s", recordCount, path)
			}
		}
	}
}
