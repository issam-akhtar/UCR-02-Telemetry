// db.go
//
// Package db provides a set of functions for interacting with the Telemetry System database.
// It includes both data retrieval (fetch) and data insertion functions for various CAN messages.
// The code is optimized for production use and runs efficiently on resource‐constrained systems.
// Note: Non‑essential error checking and excessive logging have been removed to maximize performance.
package db

import (
	"context"
	"database/sql"
	"telem-system/pkg/types"

	_ "github.com/jackc/pgx/v4/stdlib"
)

// Queries provides methods to interact with the database.
type Queries struct {
	db *sql.DB
}

// New creates a new Queries instance.
func New(db *sql.DB) *Queries {
	return &Queries{db: db}
}

// Global variable for package-level insert functions.
var DB *sql.DB

// Connect opens a new database connection.
func Connect(connStr string) (*sql.DB, error) {
	db, err := sql.Open("pgx", connStr)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Set connection pool settings for better performance
	db.SetMaxOpenConns(15)
	db.SetMaxIdleConns(5)

	DB = db
	return db, nil
}

// FetchTCUDataPaginated returns TCU data with pagination.
func (q *Queries) FetchTCUDataPaginated(ctx context.Context, limit, offset int) ([]types.TCU_Data, error) {
	query := `
		SELECT timestamp, apps1, apps2, bse, status
		FROM tcu1
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.TCU_Data
	for rows.Next() {
		var rec types.TCU_Data
		if err := rows.Scan(&rec.Timestamp, &rec.APPS1, &rec.APPS2, &rec.BSE, &rec.Status); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchCellDataPaginated returns paginated cell data.
func (q *Queries) FetchCellDataPaginated(ctx context.Context, limit, offset int) ([]types.Cell_Data, error) {
	query := `
		SELECT 
			timestamp, 
			cell1, cell2, cell3, cell4, cell5, cell6, cell7, cell8,
			cell9, cell10, cell11, cell12, cell13, cell14, cell15, cell16,
			cell17, cell18, cell19, cell20, cell21, cell22, cell23, cell24,
			cell25, cell26, cell27, cell28, cell29, cell30, cell31, cell32,
			cell33, cell34, cell35, cell36, cell37, cell38, cell39, cell40,
			cell41, cell42, cell43, cell44, cell45, cell46, cell47, cell48,
			cell49, cell50, cell51, cell52, cell53, cell54, cell55, cell56,
			cell57, cell58, cell59, cell60, cell61, cell62, cell63, cell64,
			cell65, cell66, cell67, cell68, cell69, cell70, cell71, cell72,
			cell73, cell74, cell75, cell76, cell77, cell78, cell79, cell80,
			cell81, cell82, cell83, cell84, cell85, cell86, cell87, cell88,
			cell89, cell90, cell91, cell92, cell93, cell94, cell95, cell96,
			cell97, cell98, cell99, cell100, cell101, cell102, cell103, cell104,
			cell105, cell106, cell107, cell108, cell109, cell110, cell111, cell112,
			cell113, cell114, cell115, cell116, cell117, cell118, cell119, cell120,
			cell121, cell122, cell123, cell124, cell125, cell126, cell127, cell128
		FROM cell_data
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.Cell_Data
	for rows.Next() {
		var rec types.Cell_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.Cell1, &rec.Cell2, &rec.Cell3, &rec.Cell4, &rec.Cell5, &rec.Cell6, &rec.Cell7, &rec.Cell8,
			&rec.Cell9, &rec.Cell10, &rec.Cell11, &rec.Cell12, &rec.Cell13, &rec.Cell14, &rec.Cell15, &rec.Cell16,
			&rec.Cell17, &rec.Cell18, &rec.Cell19, &rec.Cell20, &rec.Cell21, &rec.Cell22, &rec.Cell23, &rec.Cell24,
			&rec.Cell25, &rec.Cell26, &rec.Cell27, &rec.Cell28, &rec.Cell29, &rec.Cell30, &rec.Cell31, &rec.Cell32,
			&rec.Cell33, &rec.Cell34, &rec.Cell35, &rec.Cell36, &rec.Cell37, &rec.Cell38, &rec.Cell39, &rec.Cell40,
			&rec.Cell41, &rec.Cell42, &rec.Cell43, &rec.Cell44, &rec.Cell45, &rec.Cell46, &rec.Cell47, &rec.Cell48,
			&rec.Cell49, &rec.Cell50, &rec.Cell51, &rec.Cell52, &rec.Cell53, &rec.Cell54, &rec.Cell55, &rec.Cell56,
			&rec.Cell57, &rec.Cell58, &rec.Cell59, &rec.Cell60, &rec.Cell61, &rec.Cell62, &rec.Cell63, &rec.Cell64,
			&rec.Cell65, &rec.Cell66, &rec.Cell67, &rec.Cell68, &rec.Cell69, &rec.Cell70, &rec.Cell71, &rec.Cell72,
			&rec.Cell73, &rec.Cell74, &rec.Cell75, &rec.Cell76, &rec.Cell77, &rec.Cell78, &rec.Cell79, &rec.Cell80,
			&rec.Cell81, &rec.Cell82, &rec.Cell83, &rec.Cell84, &rec.Cell85, &rec.Cell86, &rec.Cell87, &rec.Cell88,
			&rec.Cell89, &rec.Cell90, &rec.Cell91, &rec.Cell92, &rec.Cell93, &rec.Cell94, &rec.Cell95, &rec.Cell96,
			&rec.Cell97, &rec.Cell98, &rec.Cell99, &rec.Cell100, &rec.Cell101, &rec.Cell102, &rec.Cell103, &rec.Cell104,
			&rec.Cell105, &rec.Cell106, &rec.Cell107, &rec.Cell108, &rec.Cell109, &rec.Cell110, &rec.Cell111, &rec.Cell112,
			&rec.Cell113, &rec.Cell114, &rec.Cell115, &rec.Cell116, &rec.Cell117, &rec.Cell118, &rec.Cell119, &rec.Cell120,
			&rec.Cell121, &rec.Cell122, &rec.Cell123, &rec.Cell124, &rec.Cell125, &rec.Cell126, &rec.Cell127, &rec.Cell128,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// Rear Analog Data
func (q *Queries) FetchRearAnalogDataPaginated(ctx context.Context, limit, offset int) ([]types.RearAnalog_Data, error) {
	query := `
		SELECT timestamp, analog1, analog2, analog3, analog4, analog5, analog6, analog7, analog8
		FROM rear_analog
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.RearAnalog_Data
	for rows.Next() {
		var rec types.RearAnalog_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.Analog1,
			&rec.Analog2,
			&rec.Analog3,
			&rec.Analog4,
			&rec.Analog5,
			&rec.Analog6,
			&rec.Analog7,
			&rec.Analog8,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// Rear Aero Data
func (q *Queries) FetchRearAeroDataPaginated(ctx context.Context, limit, offset int) ([]types.RearAero_Data, error) {
	query := `
		SELECT timestamp, pressure1, pressure2, pressure3, temperature1, temperature2, temperature3
		FROM rear_aero
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.RearAero_Data
	for rows.Next() {
		var rec types.RearAero_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.Pressure1,
			&rec.Pressure2,
			&rec.Pressure3,
			&rec.Temperature1,
			&rec.Temperature2,
			&rec.Temperature3,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// Front Aero Data
func (q *Queries) FetchFrontAeroDataPaginated(ctx context.Context, limit, offset int) ([]types.FrontAero_Data, error) {
	query := `
		SELECT timestamp, pressure1, pressure2, pressure3, temperature1, temperature2, temperature3
		FROM front_aero
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.FrontAero_Data
	for rows.Next() {
		var rec types.FrontAero_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.Pressure1,
			&rec.Pressure2,
			&rec.Pressure3,
			&rec.Temperature1,
			&rec.Temperature2,
			&rec.Temperature3,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// GPS Best Position Data
func (q *Queries) FetchGPSBestPosDataPaginated(ctx context.Context, limit, offset int) ([]types.GPSBestPos_Data, error) {
	query := `
		SELECT timestamp, latitude, longitude, altitude, std_latitude, std_longitude, std_altitude, gps_status
		FROM gps_best_pos
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.GPSBestPos_Data
	for rows.Next() {
		var rec types.GPSBestPos_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.Latitude,
			&rec.Longitude,
			&rec.Altitude,
			&rec.StdLatitude,
			&rec.StdLongitude,
			&rec.StdAltitude,
			&rec.GPSStatus,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// Rear Frequency Data
func (q *Queries) FetchRearFrequencyDataPaginated(ctx context.Context, limit, offset int) ([]types.RearFrequency_Data, error) {
	query := `
		SELECT timestamp, freq1, freq2, freq3, freq4
		FROM rear_frequency
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.RearFrequency_Data
	for rows.Next() {
		var rec types.RearFrequency_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.Freq1,
			&rec.Freq2,
			&rec.Freq3,
			&rec.Freq4,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// Bamocar RX Data
func (q *Queries) FetchBamocarRxDataPaginated(ctx context.Context, limit, offset int) ([]types.BamocarRxData_Data, error) {
	query := `
		SELECT timestamp, regid, byte1, byte2, byte3, byte4, byte5
		FROM bamocar_rx_data
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.BamocarRxData_Data
	for rows.Next() {
		var rec types.BamocarRxData_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.REGID,
			&rec.Byte1,
			&rec.Byte2,
			&rec.Byte3,
			&rec.Byte4,
			&rec.Byte5,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// ACULV FD_2 Data
func (q *Queries) FetchACULVFD2DataPaginated(ctx context.Context, limit, offset int) ([]types.ACULV_FD_2_Data, error) {
	query := `
		SELECT timestamp, fan_set_point, rpm
		FROM aculv_fd_2
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.ACULV_FD_2_Data
	for rows.Next() {
		var rec types.ACULV_FD_2_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.FanSetPoint,
			&rec.RPM,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// ACULV1 Data
func (q *Queries) FetchACULV1DataPaginated(ctx context.Context, limit, offset int) ([]types.ACULV1_Data, error) {
	query := `
		SELECT timestamp, charge_status1, charge_status2
		FROM aculv1
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.ACULV1_Data
	for rows.Next() {
		var rec types.ACULV1_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.ChargeStatus1,
			&rec.ChargeStatus2,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// ACULV2 Data
func (q *Queries) FetchACULV2DataPaginated(ctx context.Context, limit, offset int) ([]types.ACULV2_Data, error) {
	query := `
		SELECT timestamp, charge_request
		FROM aculv2
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.ACULV2_Data
	for rows.Next() {
		var rec types.ACULV2_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.ChargeRequest,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// PDM1 Data
func (q *Queries) FetchPDM1DataPaginated(ctx context.Context, limit, offset int) ([]types.PDM1_Data, error) {
	query := `
		SELECT timestamp, compound_id, pdm_int_temperature, pdm_batt_voltage, global_error_flag, total_current, internal_rail_voltage, reset_source
		FROM pdm1
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.PDM1_Data
	for rows.Next() {
		var rec types.PDM1_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.CompoundID,
			&rec.PDMIntTemperature,
			&rec.PDMBattVoltage,
			&rec.GlobalErrorFlag,
			&rec.TotalCurrent,
			&rec.InternalRailVoltage,
			&rec.ResetSource,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

func (q *Queries) FetchRearStrainGauges2DataPaginated(ctx context.Context, limit, offset int) ([]types.RearStrainGauges2_Data, error) {
	query := `
		SELECT timestamp, gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		FROM rear_strain_gauges_2
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.RearStrainGauges2_Data
	for rows.Next() {
		var rec types.RearStrainGauges2_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.Gauge1,
			&rec.Gauge2,
			&rec.Gauge3,
			&rec.Gauge4,
			&rec.Gauge5,
			&rec.Gauge6,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

func (q *Queries) FetchRearStrainGauges1DataPaginated(ctx context.Context, limit, offset int) ([]types.RearStrainGauges1_Data, error) {
	query := `
		SELECT timestamp, gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		FROM rear_strain_gauges_1
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.RearStrainGauges1_Data
	for rows.Next() {
		var rec types.RearStrainGauges1_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.Gauge1,
			&rec.Gauge2,
			&rec.Gauge3,
			&rec.Gauge4,
			&rec.Gauge5,
			&rec.Gauge6,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

func (q *Queries) FetchBamocarDataPaginated(ctx context.Context, limit, offset int) ([]types.TCU2_data, error) {
	query := `
		SELECT timestamp, bamocar_frg, bamocar_rfe, brake_light
		FROM tcu2
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var data []types.TCU2_data
	for rows.Next() {
		var rec types.TCU2_data
		if err := rows.Scan(&rec.Timestamp, &rec.BamocarFRG, &rec.BamocarRFE, &rec.BrakeLight); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchThermDataPaginated returns paginated Thermistor data.
func (q *Queries) FetchThermDataPaginated(ctx context.Context, limit, offset int) ([]types.Therm_Data, error) {
	query := `
		SELECT timestamp, thermistor_id, therm1, therm2, therm3, therm4, therm5, therm6, therm7, therm8, 
		       therm9, therm10, therm11, therm12, therm13, therm14, therm15, therm16
		FROM therm_data
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.Therm_Data
	for rows.Next() {
		var rec types.Therm_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.ThermistorID, &rec.Therm1, &rec.Therm2, &rec.Therm3, &rec.Therm4,
			&rec.Therm5, &rec.Therm6, &rec.Therm7, &rec.Therm8, &rec.Therm9, &rec.Therm10,
			&rec.Therm11, &rec.Therm12, &rec.Therm13, &rec.Therm14, &rec.Therm15, &rec.Therm16,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchTCU2DataPaginated returns paginated TCU2 data.
func (q *Queries) FetchTCU2DataPaginated(ctx context.Context, limit, offset int) ([]types.TCU2_data, error) {
	query := `
		SELECT timestamp, brake_light, bamocar_rfe, bamocar_frg
		FROM tcu2
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.TCU2_data
	for rows.Next() {
		var rec types.TCU2_data
		if err := rows.Scan(&rec.Timestamp, &rec.BrakeLight, &rec.BamocarRFE, &rec.BamocarFRG); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchBamocarTxDataPaginated returns paginated Bamocar Tx data.
func (q *Queries) FetchBamocarTxDataPaginated(ctx context.Context, limit, offset int) ([]types.BamocarTxData_Data, error) {
	query := `
		SELECT timestamp, regid, data
		FROM bamocar_tx_data
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.BamocarTxData_Data
	for rows.Next() {
		var rec types.BamocarTxData_Data
		if err := rows.Scan(&rec.Timestamp, &rec.REGID, &rec.Data); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchBamoCarReTransmitDataPaginated returns paginated Bamo Car Re-transmit data.
func (q *Queries) FetchBamoCarReTransmitDataPaginated(ctx context.Context, limit, offset int) ([]types.BamoCarReTransmit_Data, error) {
	query := `
		SELECT timestamp, motor_temp, controller_temp
		FROM bamo_car_re_transmit
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.BamoCarReTransmit_Data
	for rows.Next() {
		var rec types.BamoCarReTransmit_Data
		if err := rows.Scan(&rec.Timestamp, &rec.MotorTemp, &rec.ControllerTemp); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchEncoderDataPaginated returns paginated Encoder data.
func (q *Queries) FetchEncoderDataPaginated(ctx context.Context, limit, offset int) ([]types.Encoder_Data, error) {
	query := `
		SELECT timestamp, encoder1, encoder2, encoder3, encoder4
		FROM encoder_data
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.Encoder_Data
	for rows.Next() {
		var rec types.Encoder_Data
		if err := rows.Scan(&rec.Timestamp, &rec.Encoder1, &rec.Encoder2, &rec.Encoder3, &rec.Encoder4); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchPackCurrentDataPaginated returns paginated Pack Current data.
func (q *Queries) FetchPackCurrentDataPaginated(ctx context.Context, limit, offset int) ([]types.PackCurrent_Data, error) {
	query := `
		SELECT timestamp, current
		FROM pack_current
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.PackCurrent_Data
	for rows.Next() {
		var rec types.PackCurrent_Data
		if err := rows.Scan(&rec.Timestamp, &rec.Current); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchPackVoltageDataPaginated returns paginated Pack Voltage data.
func (q *Queries) FetchPackVoltageDataPaginated(ctx context.Context, limit, offset int) ([]types.PackVoltage_Data, error) {
	query := `
		SELECT timestamp, voltage
		FROM pack_voltage
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.PackVoltage_Data
	for rows.Next() {
		var rec types.PackVoltage_Data
		if err := rows.Scan(&rec.Timestamp, &rec.Voltage); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchPDMCurrentDataPaginated returns paginated PDM Current data.
func (q *Queries) FetchPDMCurrentDataPaginated(ctx context.Context, limit, offset int) ([]types.PDMCurrent_Data, error) {
	query := `
		SELECT timestamp, accumulator_current, tcu_current, bamocar_current, pumps_current, tsal_current, daq_current, display_kvaser_current, shutdown_reset_current
		FROM pdm_current
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.PDMCurrent_Data
	for rows.Next() {
		var rec types.PDMCurrent_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.AccumulatorCurrent,
			&rec.TCUCurrent,
			&rec.BamocarCurrent,
			&rec.PumpsCurrent,
			&rec.TSALCurrent,
			&rec.DAQCurrent,
			&rec.DisplayKvaserCurrent,
			&rec.ShutdownResetCurrent,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchPDMReTransmitDataPaginated returns paginated PDM Re-transmit data.
func (q *Queries) FetchPDMReTransmitDataPaginated(ctx context.Context, limit, offset int) ([]types.PDMReTransmit_Data, error) {
	query := `
		SELECT timestamp, pdm_int_temperature, pdm_batt_voltage, global_error_flag, total_current, internal_rail_voltage, reset_source
		FROM pdm_re_transmit
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.PDMReTransmit_Data
	for rows.Next() {
		var rec types.PDMReTransmit_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.PDMIntTemperature,
			&rec.PDMBattVoltage,
			&rec.GlobalErrorFlag,
			&rec.TotalCurrent,
			&rec.InternalRailVoltage,
			&rec.ResetSource,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchINSGPSDataPaginated returns paginated INS GPS data.
func (q *Queries) FetchINSGPSDataPaginated(ctx context.Context, limit, offset int) ([]types.INS_GPS_Data, error) {
	query := `
		SELECT timestamp, gnss_week, gnss_seconds, gnss_lat, gnss_long, gnss_height
		FROM ins_gps
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.INS_GPS_Data
	for rows.Next() {
		var rec types.INS_GPS_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.GNSSWeek,
			&rec.GNSSSeconds,
			&rec.GNSSLat,
			&rec.GNSSLong,
			&rec.GNSSHeight,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchINSIMUDataPaginated returns paginated INS IMU data.
func (q *Queries) FetchINSIMUDataPaginated(ctx context.Context, limit, offset int) ([]types.INS_IMU_Data, error) {
	query := `
		SELECT timestamp, north_vel, east_vel, up_vel, roll, pitch, azimuth, status
		FROM ins_imu
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.INS_IMU_Data
	for rows.Next() {
		var rec types.INS_IMU_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.NorthVel,
			&rec.EastVel,
			&rec.UpVel,
			&rec.Roll,
			&rec.Pitch,
			&rec.Azimuth,
			&rec.Status,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchFrontFrequencyDataPaginated returns paginated Front Frequency data.
func (q *Queries) FetchFrontFrequencyDataPaginated(ctx context.Context, limit, offset int) ([]types.FrontFrequency_Data, error) {
	query := `
		SELECT timestamp, rear_right, front_right, rear_left, front_left
		FROM front_frequency
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.FrontFrequency_Data
	for rows.Next() {
		var rec types.FrontFrequency_Data
		if err := rows.Scan(&rec.Timestamp, &rec.RearRight, &rec.FrontRight, &rec.RearLeft, &rec.FrontLeft); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchFrontStrainGauges1DataPaginated returns paginated Front Strain Gauges 1 data.
func (q *Queries) FetchFrontStrainGauges1DataPaginated(ctx context.Context, limit, offset int) ([]types.FrontStrainGauges1_Data, error) {
	query := `
		SELECT timestamp, gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		FROM front_strain_gauges_1
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.FrontStrainGauges1_Data
	for rows.Next() {
		var rec types.FrontStrainGauges1_Data
		if err := rows.Scan(&rec.Timestamp, &rec.Gauge1, &rec.Gauge2, &rec.Gauge3, &rec.Gauge4, &rec.Gauge5, &rec.Gauge6); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchFrontStrainGauges2DataPaginated returns paginated Front Strain Gauges 2 data.
func (q *Queries) FetchFrontStrainGauges2DataPaginated(ctx context.Context, limit, offset int) ([]types.FrontStrainGauges2_Data, error) {
	query := `
		SELECT timestamp, gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		FROM front_strain_gauges_2
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.FrontStrainGauges2_Data
	for rows.Next() {
		var rec types.FrontStrainGauges2_Data
		if err := rows.Scan(&rec.Timestamp, &rec.Gauge1, &rec.Gauge2, &rec.Gauge3, &rec.Gauge4, &rec.Gauge5, &rec.Gauge6); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchFrontAnalogDataPaginated returns paginated Front Analog data.
func (q *Queries) FetchFrontAnalogDataPaginated(ctx context.Context, limit, offset int) ([]types.FrontAnalog_Data, error) {
	query := `
		SELECT timestamp, left_rad, right_rad, front_right_pot, front_left_pot, rear_right_pot, rear_left_pot, steering_angle, analog8
		FROM front_analog
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.FrontAnalog_Data
	for rows.Next() {
		var rec types.FrontAnalog_Data
		if err := rows.Scan(&rec.Timestamp, &rec.LeftRad, &rec.RightRad, &rec.FrontRightPot, &rec.FrontLeftPot, &rec.RearRightPot, &rec.RearLeftPot, &rec.SteeringAngle, &rec.Analog8); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

// FetchACULVFD1DataPaginated returns paginated ACULV FD 1 data.
func (q *Queries) FetchACULVFD1DataPaginated(ctx context.Context, limit, offset int) ([]types.ACULV_FD_1_Data, error) {
	query := `
		SELECT timestamp, ams_status, fld, state_of_charge, accumulator_voltage, tractive_voltage, cell_current, isolation_monitoring, isolation_monitoring1
		FROM aculv_fd_1
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := q.db.QueryContext(ctx, query, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var data []types.ACULV_FD_1_Data
	for rows.Next() {
		var rec types.ACULV_FD_1_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.AMSStatus,
			&rec.FLD,
			&rec.StateOfCharge,
			&rec.AccumulatorVoltage,
			&rec.TractiveVoltage,
			&rec.CellCurrent,
			&rec.IsolationMonitoring,
			&rec.IsolationMonitoring1,
		); err != nil {
			return nil, err
		}
		data = append(data, rec)
	}
	return data, nil
}

//
// --- BATCH INSERT FUNCTIONS ---
//

// InsertCellDataBatch inserts multiple cell data records in a single transaction
func InsertCellDataBatch(ctx context.Context, batch []types.Cell_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO cell_data (
			timestamp,
			cell1, cell2, cell3, cell4, cell5, cell6, cell7, cell8,
			cell9, cell10, cell11, cell12, cell13, cell14, cell15, cell16,
			cell17, cell18, cell19, cell20, cell21, cell22, cell23, cell24,
			cell25, cell26, cell27, cell28, cell29, cell30, cell31, cell32,
			cell33, cell34, cell35, cell36, cell37, cell38, cell39, cell40,
			cell41, cell42, cell43, cell44, cell45, cell46, cell47, cell48,
			cell49, cell50, cell51, cell52, cell53, cell54, cell55, cell56,
			cell57, cell58, cell59, cell60, cell61, cell62, cell63, cell64,
			cell65, cell66, cell67, cell68, cell69, cell70, cell71, cell72,
			cell73, cell74, cell75, cell76, cell77, cell78, cell79, cell80,
			cell81, cell82, cell83, cell84, cell85, cell86, cell87, cell88,
			cell89, cell90, cell91, cell92, cell93, cell94, cell95, cell96,
			cell97, cell98, cell99, cell100, cell101, cell102, cell103, cell104,
			cell105, cell106, cell107, cell108, cell109, cell110, cell111, cell112,
			cell113, cell114, cell115, cell116, cell117, cell118, cell119, cell120,
			cell121, cell122, cell123, cell124, cell125, cell126, cell127, cell128
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
			$21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
			$31, $32, $33, $34, $35, $36, $37, $38, $39, $40,
			$41, $42, $43, $44, $45, $46, $47, $48, $49, $50,
			$51, $52, $53, $54, $55, $56, $57, $58, $59, $60,
			$61, $62, $63, $64, $65, $66, $67, $68, $69, $70,
			$71, $72, $73, $74, $75, $76, $77, $78, $79, $80,
			$81, $82, $83, $84, $85, $86, $87, $88, $89, $90,
			$91, $92, $93, $94, $95, $96, $97, $98, $99, $100,
			$101, $102, $103, $104, $105, $106, $107, $108, $109, $110,
			$111, $112, $113, $114, $115, $116, $117, $118, $119, $120,
			$121, $122, $123, $124, $125, $126, $127, $128, $129
		)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		args := []interface{}{
			data.Timestamp,
			data.Cell1, data.Cell2, data.Cell3, data.Cell4, data.Cell5, data.Cell6, data.Cell7, data.Cell8,
			data.Cell9, data.Cell10, data.Cell11, data.Cell12, data.Cell13, data.Cell14, data.Cell15, data.Cell16,
			data.Cell17, data.Cell18, data.Cell19, data.Cell20, data.Cell21, data.Cell22, data.Cell23, data.Cell24,
			data.Cell25, data.Cell26, data.Cell27, data.Cell28, data.Cell29, data.Cell30, data.Cell31, data.Cell32,
			data.Cell33, data.Cell34, data.Cell35, data.Cell36, data.Cell37, data.Cell38, data.Cell39, data.Cell40,
			data.Cell41, data.Cell42, data.Cell43, data.Cell44, data.Cell45, data.Cell46, data.Cell47, data.Cell48,
			data.Cell49, data.Cell50, data.Cell51, data.Cell52, data.Cell53, data.Cell54, data.Cell55, data.Cell56,
			data.Cell57, data.Cell58, data.Cell59, data.Cell60, data.Cell61, data.Cell62, data.Cell63, data.Cell64,
			data.Cell65, data.Cell66, data.Cell67, data.Cell68, data.Cell69, data.Cell70, data.Cell71, data.Cell72,
			data.Cell73, data.Cell74, data.Cell75, data.Cell76, data.Cell77, data.Cell78, data.Cell79, data.Cell80,
			data.Cell81, data.Cell82, data.Cell83, data.Cell84, data.Cell85, data.Cell86, data.Cell87, data.Cell88,
			data.Cell89, data.Cell90, data.Cell91, data.Cell92, data.Cell93, data.Cell94, data.Cell95, data.Cell96,
			data.Cell97, data.Cell98, data.Cell99, data.Cell100, data.Cell101, data.Cell102, data.Cell103, data.Cell104,
			data.Cell105, data.Cell106, data.Cell107, data.Cell108, data.Cell109, data.Cell110, data.Cell111, data.Cell112,
			data.Cell113, data.Cell114, data.Cell115, data.Cell116, data.Cell117, data.Cell118, data.Cell119, data.Cell120,
			data.Cell121, data.Cell122, data.Cell123, data.Cell124, data.Cell125, data.Cell126, data.Cell127, data.Cell128,
		}
		_, err := stmt.ExecContext(ctx, args...)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertThermDataBatch inserts multiple thermistor data records in a single transaction
func InsertThermDataBatch(ctx context.Context, batch []types.Therm_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO therm_data (
			timestamp, thermistor_id, therm1, therm2, therm3, therm4, 
			therm5, therm6, therm7, therm8, therm9, therm10, 
			therm11, therm12, therm13, therm14, therm15, therm16
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.ThermistorID, data.Therm1, data.Therm2, data.Therm3, data.Therm4,
			data.Therm5, data.Therm6, data.Therm7, data.Therm8, data.Therm9, data.Therm10,
			data.Therm11, data.Therm12, data.Therm13, data.Therm14, data.Therm15, data.Therm16,
		)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertPackCurrentDataBatch inserts multiple pack current data records in a single transaction
func InsertPackCurrentDataBatch(ctx context.Context, batch []types.PackCurrent_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `INSERT INTO pack_current (timestamp, current) VALUES ($1, $2)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx, data.Timestamp, data.Current)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertPackVoltageDataBatch inserts multiple pack voltage data records in a single transaction
func InsertPackVoltageDataBatch(ctx context.Context, batch []types.PackVoltage_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `INSERT INTO pack_voltage (timestamp, voltage) VALUES ($1, $2)`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx, data.Timestamp, data.Voltage)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertTCU2DataBatch inserts multiple TCU2 data records in a single transaction
func InsertTCU2DataBatch(ctx context.Context, batch []types.TCU2_data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO tcu2 (timestamp, brake_light, bamocar_rfe, bamocar_frg) 
		VALUES ($1, $2, $3, $4)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx, data.Timestamp, data.BrakeLight, data.BamocarRFE, data.BamocarFRG)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertTCUDataBatch inserts multiple TCU data records in a single transaction
func InsertTCUDataBatch(ctx context.Context, batch []types.TCU_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO tcu1 (timestamp, apps1, apps2, bse, status) 
		VALUES ($1, $2, $3, $4, $5)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx, data.Timestamp, data.APPS1, data.APPS2, data.BSE, data.Status)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertFrontAnalogDataBatch inserts multiple front analog data records in a single transaction
func InsertFrontAnalogDataBatch(ctx context.Context, batch []types.FrontAnalog_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO front_analog (
			timestamp, left_rad, right_rad, front_right_pot, front_left_pot, 
			rear_right_pot, rear_left_pot, steering_angle, analog8
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.LeftRad, data.RightRad, data.FrontRightPot,
			data.FrontLeftPot, data.RearRightPot, data.RearLeftPot, data.SteeringAngle, data.Analog8)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertRearStrainGauges1DataBatch inserts multiple rear strain gauges 1 data records in a single transaction
func InsertRearStrainGauges1DataBatch(ctx context.Context, batch []types.RearStrainGauges1_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO rear_strain_gauges_1 (
			timestamp, gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.Gauge1, data.Gauge2, data.Gauge3, data.Gauge4, data.Gauge5, data.Gauge6)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertRearStrainGauges2DataBatch inserts multiple rear strain gauges 2 data records in a single transaction
func InsertRearStrainGauges2DataBatch(ctx context.Context, batch []types.RearStrainGauges2_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO rear_strain_gauges_2 (
			timestamp, gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.Gauge1, data.Gauge2, data.Gauge3, data.Gauge4, data.Gauge5, data.Gauge6)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertFrontStrainGauges1DataBatch inserts multiple front strain gauges 1 data records in a single transaction
func InsertFrontStrainGauges1DataBatch(ctx context.Context, batch []types.FrontStrainGauges1_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO front_strain_gauges_1 (
			timestamp, gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.Gauge1, data.Gauge2, data.Gauge3, data.Gauge4, data.Gauge5, data.Gauge6)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertFrontStrainGauges2DataBatch inserts multiple front strain gauges 2 data records in a single transaction
func InsertFrontStrainGauges2DataBatch(ctx context.Context, batch []types.FrontStrainGauges2_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO front_strain_gauges_2 (
			timestamp, gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.Gauge1, data.Gauge2, data.Gauge3, data.Gauge4, data.Gauge5, data.Gauge6)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertRearAnalogDataBatch inserts multiple rear analog data records in a single transaction
func InsertRearAnalogDataBatch(ctx context.Context, batch []types.RearAnalog_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO rear_analog (
			timestamp, analog1, analog2, analog3, analog4, analog5, analog6, analog7, analog8
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.Analog1, data.Analog2, data.Analog3, data.Analog4,
			data.Analog5, data.Analog6, data.Analog7, data.Analog8)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertRearAeroDataBatch inserts multiple rear aero data records in a single transaction
func InsertRearAeroDataBatch(ctx context.Context, batch []types.RearAero_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO rear_aero (
			timestamp, pressure1, pressure2, pressure3, temperature1, temperature2, temperature3
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.Pressure1, data.Pressure2, data.Pressure3,
			data.Temperature1, data.Temperature2, data.Temperature3)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertFrontAeroDataBatch inserts multiple front aero data records in a single transaction
func InsertFrontAeroDataBatch(ctx context.Context, batch []types.FrontAero_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO front_aero (
			timestamp, pressure1, pressure2, pressure3, temperature1, temperature2, temperature3
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.Pressure1, data.Pressure2, data.Pressure3,
			data.Temperature1, data.Temperature2, data.Temperature3)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertBamocarRxDataBatch inserts multiple bamocar rx data records in a single transaction
func InsertBamocarRxDataBatch(ctx context.Context, batch []types.BamocarRxData_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO bamocar_rx_data (
			timestamp, regid, byte1, byte2, byte3, byte4, byte5
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.REGID, data.Byte1, data.Byte2, data.Byte3, data.Byte4, data.Byte5)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertBamocarTxDataBatch inserts multiple bamocar tx data records in a single transaction
func InsertBamocarTxDataBatch(ctx context.Context, batch []types.BamocarTxData_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO bamocar_tx_data (timestamp, regid, data) 
		VALUES ($1, $2, $3)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx, data.Timestamp, data.REGID, data.Data)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// Individual legacy insert functions - These remain for compatibility
// Each should create a single item batch and call the corresponding batch function

// InsertTCUData inserts a TCU_Data record.
func (q *Queries) InsertTCUData(ctx context.Context, data types.TCU_Data) error {
	// Create a batch of 1 item and use the batch function
	return InsertTCUDataBatch(ctx, []types.TCU_Data{data})
}

func (q *Queries) InsertThermData(ctx context.Context, data types.Therm_Data) error {
	return InsertThermDataBatch(ctx, []types.Therm_Data{data})
}

func (q *Queries) InsertACULV2Data(ctx context.Context, data types.ACULV2_Data) error {
	query := `
        INSERT INTO aculv2 (timestamp, charge_request)
        VALUES ($1, $2)
    `
	_, err := q.db.ExecContext(ctx, query, data.Timestamp, data.ChargeRequest)
	return err
}

func (q *Queries) InsertACULV_FD_2_Data(ctx context.Context, data types.ACULV_FD_2_Data) error {
	query := `
        INSERT INTO aculv_fd_2 (timestamp, fan_set_point, rpm)
        VALUES ($1, $2, $3)
    `
	_, err := q.db.ExecContext(ctx, query, data.Timestamp, data.FanSetPoint, data.RPM)
	return err
}

func InsertCellData(ctx context.Context, data types.Cell_Data) error {
	return InsertCellDataBatch(ctx, []types.Cell_Data{data})
}

// Additional batch insert functions for db.go to support the new batch processors

// InsertACULVFD1DataBatch inserts multiple ACULV FD 1 data records in a single transaction
func InsertACULVFD1DataBatch(ctx context.Context, batch []types.ACULV_FD_1_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO aculv_fd_1 (
			timestamp, ams_status, fld, state_of_charge, accumulator_voltage, 
			tractive_voltage, cell_current, isolation_monitoring, isolation_monitoring1
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.AMSStatus, data.FLD, data.StateOfCharge,
			data.AccumulatorVoltage, data.TractiveVoltage, data.CellCurrent,
			data.IsolationMonitoring, data.IsolationMonitoring1)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertACULVFD2DataBatch inserts multiple ACULV FD 2 data records in a single transaction
func InsertACULVFD2DataBatch(ctx context.Context, batch []types.ACULV_FD_2_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO aculv_fd_2 (timestamp, fan_set_point, rpm)
		VALUES ($1, $2, $3)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx, data.Timestamp, data.FanSetPoint, data.RPM)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertACULV1DataBatch inserts multiple ACULV1 data records in a single transaction
func InsertACULV1DataBatch(ctx context.Context, batch []types.ACULV1_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO aculv1 (timestamp, charge_status1, charge_status2)
		VALUES ($1, $2, $3)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx, data.Timestamp, data.ChargeStatus1, data.ChargeStatus2)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertACULV2DataBatch inserts multiple ACULV2 data records in a single transaction
func InsertACULV2DataBatch(ctx context.Context, batch []types.ACULV2_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO aculv2 (timestamp, charge_request)
		VALUES ($1, $2)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx, data.Timestamp, data.ChargeRequest)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertGPSBestPosDataBatch inserts multiple GPS Best Pos data records in a single transaction
func InsertGPSBestPosDataBatch(ctx context.Context, batch []types.GPSBestPos_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO gps_best_pos (
			timestamp, latitude, longitude, altitude, std_latitude, std_longitude, std_altitude, gps_status
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.Latitude, data.Longitude, data.Altitude,
			data.StdLatitude, data.StdLongitude, data.StdAltitude, data.GPSStatus)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertINSGPSDataBatch inserts multiple INS GPS data records in a single transaction
func InsertINSGPSDataBatch(ctx context.Context, batch []types.INS_GPS_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO ins_gps (timestamp, gnss_week, gnss_seconds, gnss_lat, gnss_long, gnss_height)
		VALUES ($1, $2, $3, $4, $5, $6)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.GNSSWeek, data.GNSSSeconds, data.GNSSLat, data.GNSSLong, data.GNSSHeight)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertINSIMUDataBatch inserts multiple INS IMU data records in a single transaction
func InsertINSIMUDataBatch(ctx context.Context, batch []types.INS_IMU_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO ins_imu (timestamp, north_vel, east_vel, up_vel, roll, pitch, azimuth, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.NorthVel, data.EastVel, data.UpVel, data.Roll, data.Pitch, data.Azimuth, data.Status)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertFrontFrequencyDataBatch inserts multiple Front Frequency data records in a single transaction
func InsertFrontFrequencyDataBatch(ctx context.Context, batch []types.FrontFrequency_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO front_frequency (timestamp, rear_right, front_right, rear_left, front_left)
		VALUES ($1, $2, $3, $4, $5)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.RearRight, data.FrontRight, data.RearLeft, data.FrontLeft)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertRearFrequencyDataBatch inserts multiple Rear Frequency data records in a single transaction
func InsertRearFrequencyDataBatch(ctx context.Context, batch []types.RearFrequency_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO rear_frequency (timestamp, freq1, freq2, freq3, freq4)
		VALUES ($1, $2, $3, $4, $5)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.Freq1, data.Freq2, data.Freq3, data.Freq4)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertPDM1DataBatch inserts multiple PDM1 data records in a single transaction
func InsertPDM1DataBatch(ctx context.Context, batch []types.PDM1_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO pdm1 (
			timestamp, compound_id, pdm_int_temperature, pdm_batt_voltage, 
			global_error_flag, total_current, internal_rail_voltage, reset_source
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.CompoundID, data.PDMIntTemperature, data.PDMBattVoltage,
			data.GlobalErrorFlag, data.TotalCurrent, data.InternalRailVoltage, data.ResetSource)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertEncoderDataBatch inserts multiple Encoder data records in a single transaction
func InsertEncoderDataBatch(ctx context.Context, batch []types.Encoder_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO encoder_data (timestamp, encoder1, encoder2, encoder3, encoder4)
		VALUES ($1, $2, $3, $4, $5)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.Encoder1, data.Encoder2, data.Encoder3, data.Encoder4)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertBamoCarReTransmitDataBatch inserts multiple Bamo Car Re Transmit data records in a single transaction
func InsertBamoCarReTransmitDataBatch(ctx context.Context, batch []types.BamoCarReTransmit_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO bamo_car_re_transmit (timestamp, motor_temp, controller_temp)
		VALUES ($1, $2, $3)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.MotorTemp, data.ControllerTemp)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertPDMCurrentDataBatch inserts multiple PDM Current data records in a single transaction
func InsertPDMCurrentDataBatch(ctx context.Context, batch []types.PDMCurrent_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO pdm_current (
			timestamp, accumulator_current, tcu_current, bamocar_current, pumps_current, 
			tsal_current, daq_current, display_kvaser_current, shutdown_reset_current
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.AccumulatorCurrent, data.TCUCurrent, data.BamocarCurrent,
			data.PumpsCurrent, data.TSALCurrent, data.DAQCurrent,
			data.DisplayKvaserCurrent, data.ShutdownResetCurrent)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

// InsertPDMReTransmitDataBatch inserts multiple PDM Re Transmit data records in a single transaction
func InsertPDMReTransmitDataBatch(ctx context.Context, batch []types.PDMReTransmit_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement once for reuse
	stmt, err := tx.PrepareContext(ctx, `
		INSERT INTO pdm_re_transmit (
			timestamp, pdm_int_temperature, pdm_batt_voltage, global_error_flag, 
			total_current, internal_rail_voltage, reset_source
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record
	for _, data := range batch {
		_, err := stmt.ExecContext(ctx,
			data.Timestamp, data.PDMIntTemperature, data.PDMBattVoltage,
			data.GlobalErrorFlag, data.TotalCurrent, data.InternalRailVoltage, data.ResetSource)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}

func InsertBamocarDataBatch(ctx context.Context, batch []types.BamocarTxData_Data) error {
	if len(batch) == 0 {
		return nil
	}

	// Start a transaction
	tx, err := DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Prepare the statement for inserting into bamocar_tx_data
	stmt, err := tx.PrepareContext(ctx, `
        INSERT INTO bamocar_tx_data (
            timestamp, regid, data
        ) VALUES ($1, $2, $3)
    `)
	if err != nil {
		return err
	}
	defer stmt.Close()

	// Insert each record in the batch
	for _, record := range batch {
		_, err := stmt.ExecContext(ctx, record.Timestamp, record.REGID, record.Data)
		if err != nil {
			return err
		}
	}

	// Commit the transaction
	return tx.Commit()
}
