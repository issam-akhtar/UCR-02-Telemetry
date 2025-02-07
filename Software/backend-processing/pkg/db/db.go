package db

import (
	"context"
	"fmt"
	"log"
	"runtime"

	"telem-system/pkg/types"

	"github.com/jackc/pgx/v4/pgxpool"
)

// DBPool is our global PGX connection pool reference.
var DBPool *pgxpool.Pool

// Connect initializes the DB connection pool.
func Connect(connStr string) (*pgxpool.Pool, error) {
	config, err := pgxpool.ParseConfig(connStr)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database config: %v", err)
	}
	config.MaxConns = int32(runtime.NumCPU()) * 2

	pool, err := pgxpool.ConnectConfig(context.Background(), config)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %v", err)
	}

	DBPool = pool
	return pool, nil
}

// ClosePool closes the global DBPool if not nil.
func ClosePool() {
	if DBPool != nil {
		DBPool.Close()
	}
}

// ======================================
// Fetch / Query methods
// ======================================

// FetchTCUDataPaginated returns paginated TCU data
func FetchTCUDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.TCU_Data, error) {
	query := `
		SELECT timestamp, apps1, apps2, bse, status
		FROM tcu_data
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchTCUDataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.TCU_Data
	for rows.Next() {
		var rec types.TCU_Data
		if err := rows.Scan(&rec.Timestamp, &rec.APPS1, &rec.APPS2, &rec.BSE, &rec.Status); err != nil {
			log.Printf("FetchTCUDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchTCUDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchThermDataPaginated returns paginated Thermistor data
func FetchThermDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.Therm_Data, error) {
	query := `
		SELECT timestamp, thermistor_id, therm1, therm2, therm3, therm4, therm5, therm6, therm7, therm8, 
		       therm9, therm10, therm11, therm12, therm13, therm14, therm15, therm16
		FROM therm_data
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchThermDataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.Therm_Data
	for rows.Next() {
		var rec types.Therm_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.ThermistorID,
			&rec.Therm1, &rec.Therm2, &rec.Therm3, &rec.Therm4,
			&rec.Therm5, &rec.Therm6, &rec.Therm7, &rec.Therm8,
			&rec.Therm9, &rec.Therm10, &rec.Therm11, &rec.Therm12,
			&rec.Therm13, &rec.Therm14, &rec.Therm15, &rec.Therm16,
		); err != nil {
			log.Printf("FetchThermDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchThermDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchBamocarDataPaginated returns paginated Bamocar data
func FetchBamocarDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.Bamocar_Data, error) {
	query := `
		SELECT timestamp, bamocar_frg, bamocar_rfe, brake_light
		FROM bamocar_data
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchBamocarDataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.Bamocar_Data
	for rows.Next() {
		var rec types.Bamocar_Data
		if err := rows.Scan(&rec.Timestamp, &rec.BamocarFRG, &rec.BamocarRFE, &rec.BrakeLight); err != nil {
			log.Printf("FetchBamocarDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchBamocarDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchBamocarTxDataPaginated returns paginated Bamocar Tx data
func FetchBamocarTxDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.BamocarTxData_Data, error) {
	query := `
		SELECT timestamp, regid, data
		FROM bamocar_tx_data
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchBamocarTxDataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.BamocarTxData_Data
	for rows.Next() {
		var rec types.BamocarTxData_Data
		if err := rows.Scan(&rec.Timestamp, &rec.REGID, &rec.Data); err != nil {
			log.Printf("FetchBamocarTxDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchBamocarTxDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchBamoCarReTransmitDataPaginated returns paginated Bamo Car Re-transmit data
func FetchBamoCarReTransmitDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.BamoCarReTransmit_Data, error) {
	query := `
		SELECT timestamp, motor_temp, controller_temp
		FROM bamo_car_re_transmit
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchBamoCarReTransmitDataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.BamoCarReTransmit_Data
	for rows.Next() {
		var rec types.BamoCarReTransmit_Data
		if err := rows.Scan(&rec.Timestamp, &rec.MotorTemp, &rec.ControllerTemp); err != nil {
			log.Printf("FetchBamoCarReTransmitDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchBamoCarReTransmitDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchEncoderDataPaginated returns paginated Encoder data
func FetchEncoderDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.Encoder_Data, error) {
	query := `
		SELECT timestamp, encoder1, encoder2, encoder3, encoder4
		FROM encoder_data
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchEncoderDataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.Encoder_Data
	for rows.Next() {
		var rec types.Encoder_Data
		if err := rows.Scan(&rec.Timestamp, &rec.Encoder1, &rec.Encoder2, &rec.Encoder3, &rec.Encoder4); err != nil {
			log.Printf("FetchEncoderDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchEncoderDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchPackCurrentDataPaginated returns paginated Pack Current data
func FetchPackCurrentDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.PackCurrent_Data, error) {
	query := `
		SELECT timestamp, packcurrent
		FROM pack_current
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchPackCurrentDataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.PackCurrent_Data
	for rows.Next() {
		var rec types.PackCurrent_Data
		if err := rows.Scan(&rec.Timestamp, &rec.Current); err != nil {
			log.Printf("FetchPackCurrentDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchPackCurrentDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchPackVoltageDataPaginated returns paginated Pack Voltage data
func FetchPackVoltageDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.PackVoltage_Data, error) {
	query := `
		SELECT timestamp, packvoltage
		FROM pack_voltage
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchPackVoltageDataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.PackVoltage_Data
	for rows.Next() {
		var rec types.PackVoltage_Data
		if err := rows.Scan(&rec.Timestamp, &rec.Voltage); err != nil {
			log.Printf("FetchPackVoltageDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchPackVoltageDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchPDMCurrentDataPaginated returns paginated PDM Current data
func FetchPDMCurrentDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.PDMCurrent_Data, error) {
	query := `
		SELECT timestamp, accumulator_current, tcu_current, bamocar_current, pumps_current,
		       tsal_current, daq_current, display_kvaser_current, shutdown_reset_current
		FROM pdm_current
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchPDMCurrentDataPaginated query error: %v", err)
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
			log.Printf("FetchPDMCurrentDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchPDMCurrentDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchPDMReTransmitDataPaginated returns paginated PDM Re-transmit data
func FetchPDMReTransmitDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.PDMReTransmit_Data, error) {
	query := `
		SELECT timestamp, pdm_int_temperature, pdm_batt_voltage, global_error_flag,
		       total_current, internal_rail_voltage, reset_source
		FROM pdm_re_transmit
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchPDMReTransmitDataPaginated query error: %v", err)
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
			log.Printf("FetchPDMReTransmitDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchPDMReTransmitDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchINSGPSDataPaginated returns paginated INS GPS data
func FetchINSGPSDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.INS_GPS_Data, error) {
	query := `
		SELECT timestamp, gnss_week, gnss_seconds, gnss_lat, gnss_long, gnss_height
		FROM ins_gps
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchINSGPSDataPaginated query error: %v", err)
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
			log.Printf("FetchINSGPSDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchINSGPSDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchINSIMUDataPaginated returns paginated INS IMU data
func FetchINSIMUDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.INS_IMU_Data, error) {
	query := `
		SELECT timestamp, north_vel, east_vel, up_vel, roll, pitch, azimuth, status
		FROM ins_imu
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchINSIMUDataPaginated query error: %v", err)
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
			log.Printf("FetchINSIMUDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchINSIMUDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchFrontFrequencyDataPaginated returns paginated Front Frequency data
func FetchFrontFrequencyDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.FrontFrequency_Data, error) {
	query := `
		SELECT timestamp, rear_right, front_right, rear_left, front_left
		FROM front_frequency
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchFrontFrequencyDataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.FrontFrequency_Data
	for rows.Next() {
		var rec types.FrontFrequency_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.RearRight,
			&rec.FrontRight,
			&rec.RearLeft,
			&rec.FrontLeft,
		); err != nil {
			log.Printf("FetchFrontFrequencyDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchFrontFrequencyDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchFrontStrainGauges1DataPaginated returns paginated Front Strain Gauges 1 data
func FetchFrontStrainGauges1DataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.FrontStrainGauges1_Data, error) {
	query := `
		SELECT timestamp, gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		FROM front_strain_gauges_1
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchFrontStrainGauges1DataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.FrontStrainGauges1_Data
	for rows.Next() {
		var rec types.FrontStrainGauges1_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.Gauge1,
			&rec.Gauge2,
			&rec.Gauge3,
			&rec.Gauge4,
			&rec.Gauge5,
			&rec.Gauge6,
		); err != nil {
			log.Printf("FetchFrontStrainGauges1DataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchFrontStrainGauges1DataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchFrontStrainGauges2DataPaginated returns paginated Front Strain Gauges 2 data
func FetchFrontStrainGauges2DataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.FrontStrainGauges2_Data, error) {
	query := `
		SELECT timestamp, gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		FROM front_strain_gauges_2
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchFrontStrainGauges2DataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.FrontStrainGauges2_Data
	for rows.Next() {
		var rec types.FrontStrainGauges2_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.Gauge1,
			&rec.Gauge2,
			&rec.Gauge3,
			&rec.Gauge4,
			&rec.Gauge5,
			&rec.Gauge6,
		); err != nil {
			log.Printf("FetchFrontStrainGauges2DataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchFrontStrainGauges2DataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchFrontAnalogDataPaginated returns paginated Front Analog data
func FetchFrontAnalogDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.FrontAnalog_Data, error) {
	query := `
		SELECT timestamp, left_rad, right_rad, front_right_pot, front_left_pot, 
		       rear_right_pot, rear_left_pot, steering_angle, analog8
		FROM front_analog
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchFrontAnalogDataPaginated query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.FrontAnalog_Data
	for rows.Next() {
		var rec types.FrontAnalog_Data
		if err := rows.Scan(
			&rec.Timestamp,
			&rec.LeftRad,
			&rec.RightRad,
			&rec.FrontRightPot,
			&rec.FrontLeftPot,
			&rec.RearRightPot,
			&rec.RearLeftPot,
			&rec.SteeringAngle,
			&rec.Analog8,
		); err != nil {
			log.Printf("FetchFrontAnalogDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchFrontAnalogDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// FetchACULVFD1DataPaginated returns paginated ACULV FD 1 data
func FetchACULVFD1DataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.ACULV_FD_1_Data, error) {
	query := `
		SELECT timestamp, ams_status, fld, state_of_charge, accumulator_voltage, tractive_voltage, 
		       cell_current, isolation_monitoring, isolation_monitoring1
		FROM aculv_fd_1
		ORDER BY timestamp ASC
		LIMIT $1 OFFSET $2
	`
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchACULVFD1DataPaginated query error: %v", err)
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
			log.Printf("FetchACULVFD1DataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchACULVFD1DataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// ======================================
// Fetch / Query methods
// ======================================

// FetchTCUData returns all TCU data in ascending order.
func FetchTCUData(ctx context.Context, dbPool *pgxpool.Pool) ([]types.TCU_Data, error) {
	query := `
		SELECT timestamp, apps1, apps2, bse, status
		FROM tcu_data
		ORDER BY timestamp ASC
	`
	rows, err := dbPool.Query(ctx, query)
	if err != nil {
		log.Printf("FetchTCUData query error: %v", err)
		return nil, err
	}
	defer rows.Close()

	var data []types.TCU_Data
	for rows.Next() {
		var rec types.TCU_Data
		if err := rows.Scan(&rec.Timestamp, &rec.APPS1, &rec.APPS2, &rec.BSE, &rec.Status); err != nil {
			log.Printf("FetchTCUData scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchTCUData rows error: %v", err)
		return nil, err
	}
	return data, nil
}

func FetchCellData(ctx context.Context, dbPool *pgxpool.Pool) ([]types.Cell_Data, error) {
	query := `
		SELECT 
			timestamp, cell1, cell2, cell3, cell4, cell5, cell6, cell7, cell8,
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
	`
	rows, err := dbPool.Query(ctx, query)
	if err != nil {
		log.Printf("FetchCellData query error: %v", err)
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
			log.Printf("FetchCellData scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchCellData rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// db/db.go

// FetchCellDataPaginated returns cell data with limit and offset.
func FetchCellDataPaginated(ctx context.Context, dbPool *pgxpool.Pool, limit, offset int) ([]types.Cell_Data, error) {
	query := `
		SELECT 
			timestamp, cell1, cell2, cell3, cell4, cell5, cell6, cell7, cell8,
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
	rows, err := dbPool.Query(ctx, query, limit, offset)
	if err != nil {
		log.Printf("FetchCellDataPaginated query error: %v", err)
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
			log.Printf("FetchCellDataPaginated scan error: %v", err)
			return nil, err
		}
		data = append(data, rec)
	}
	if err := rows.Err(); err != nil {
		log.Printf("FetchCellDataPaginated rows error: %v", err)
		return nil, err
	}
	return data, nil
}

// ======================================
// Insert methods
// ======================================

func InsertTCUData(ctx context.Context, t types.TCU_Data) error {
	query := `
		INSERT INTO tcu_data (apps1, apps2, bse, status)
		VALUES ($1, $2, $3, $4)
	`
	_, err := DBPool.Exec(ctx, query, t.APPS1, t.APPS2, t.BSE, t.Status)
	return err
}

func InsertACULV_FD_1_Data(ctx context.Context, data types.ACULV_FD_1_Data) error {
	query := `
		INSERT INTO aculv_fd_1 (
			ams_status, fld, state_of_charge, 
			accumulator_voltage, tractive_voltage, cell_current, 
			isolation_monitoring, isolation_monitoring1
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := DBPool.Exec(ctx, query,
		data.AMSStatus,
		data.FLD,
		data.StateOfCharge,
		data.AccumulatorVoltage,
		data.TractiveVoltage,
		data.CellCurrent,
		data.IsolationMonitoring,
		data.IsolationMonitoring1,
	)
	return err
}

func InsertPackCurrentData(ctx context.Context, data types.PackCurrent_Data) error {
	query := `INSERT INTO pack_current (packcurrent) VALUES ($1)`
	_, err := DBPool.Exec(ctx, query, data.Current)
	return err
}

func InsertPackVoltageData(ctx context.Context, data types.PackVoltage_Data) error {
	query := `INSERT INTO pack_voltage (packvoltage) VALUES ($1)`
	_, err := DBPool.Exec(ctx, query, data.Voltage)
	return err
}

func InsertCellData(ctx context.Context, data types.Cell_Data) error {
	// Insert 128 cells into cell_data table
	query := `
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
			NOW(), 
			$1,  $2,  $3,  $4,  $5,  $6,  $7,  $8,
			$9,  $10, $11, $12, $13, $14, $15, $16,
			$17, $18, $19, $20, $21, $22, $23, $24,
			$25, $26, $27, $28, $29, $30, $31, $32,
			$33, $34, $35, $36, $37, $38, $39, $40,
			$41, $42, $43, $44, $45, $46, $47, $48,
			$49, $50, $51, $52, $53, $54, $55, $56,
			$57, $58, $59, $60, $61, $62, $63, $64,
			$65, $66, $67, $68, $69, $70, $71, $72,
			$73, $74, $75, $76, $77, $78, $79, $80,
			$81, $82, $83, $84, $85, $86, $87, $88,
			$89, $90, $91, $92, $93, $94, $95, $96,
			$97, $98, $99, $100, $101, $102, $103, $104,
			$105, $106, $107, $108, $109, $110, $111, $112,
			$113, $114, $115, $116, $117, $118, $119, $120,
			$121, $122, $123, $124, $125, $126, $127, $128
		)
	`
	_, err := DBPool.Exec(
		ctx,
		query,
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
	)
	return err
}

func InsertBamocarData(ctx context.Context, data types.Bamocar_Data) error {
	query := `INSERT INTO bamocar_data (bamocar_frg, bamocar_rfe, brake_light) VALUES ($1, $2, $3)`
	_, err := DBPool.Exec(ctx, query, data.BamocarFRG, data.BamocarRFE, data.BrakeLight)
	return err
}

func InsertINS_GPS_Data(ctx context.Context, data types.INS_GPS_Data) error {
	query := `
		INSERT INTO ins_gps (
			gnss_week, gnss_seconds, gnss_lat, gnss_long, gnss_height
		) VALUES ($1, $2, $3, $4, $5)
	`
	_, err := DBPool.Exec(ctx, query,
		data.GNSSWeek,
		data.GNSSSeconds,
		data.GNSSLat,
		data.GNSSLong,
		data.GNSSHeight,
	)
	return err
}

func InsertINS_IMUData(ctx context.Context, data types.INS_IMU_Data) error {
	query := `
		INSERT INTO ins_imu (
			north_vel, east_vel, up_vel, roll, pitch, azimuth, status
		) VALUES ($1, $2, $3, $4, $5, $6, $7)
	`
	_, err := DBPool.Exec(ctx, query,
		data.NorthVel,
		data.EastVel,
		data.UpVel,
		data.Roll,
		data.Pitch,
		data.Azimuth,
		data.Status,
	)
	return err
}

func InsertFrontFrequencyData(ctx context.Context, data types.FrontFrequency_Data) error {
	query := `
		INSERT INTO front_frequency (
			rear_right, front_right, rear_left, front_left
		) VALUES ($1, $2, $3, $4)
	`
	_, err := DBPool.Exec(ctx, query, data.RearRight, data.FrontRight, data.RearLeft, data.FrontLeft)
	return err
}

func InsertFrontAnalogData(ctx context.Context, data types.FrontAnalog_Data) error {
	query := `
		INSERT INTO front_analog (
			left_rad, right_rad, front_right_pot, front_left_pot,
			rear_right_pot, rear_left_pot, steering_angle, analog8
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := DBPool.Exec(ctx, query,
		data.LeftRad,
		data.RightRad,
		data.FrontRightPot,
		data.FrontLeftPot,
		data.RearRightPot,
		data.RearLeftPot,
		data.SteeringAngle,
		data.Analog8,
	)
	return err
}

func InsertBamocarTxData(ctx context.Context, data types.BamocarTxData_Data) error {
	query := `INSERT INTO bamocar_tx_data (regid, data) VALUES ($1, $2)`
	_, err := DBPool.Exec(ctx, query, data.REGID, data.Data)
	return err
}

func InsertBamoCarReTransmitData(ctx context.Context, data types.BamoCarReTransmit_Data) error {
	query := `INSERT INTO bamo_car_re_transmit (motor_temp, controller_temp) VALUES ($1, $2)`
	_, err := DBPool.Exec(ctx, query, data.MotorTemp, data.ControllerTemp)
	return err
}

func InsertEncoderData(ctx context.Context, data types.Encoder_Data) error {
	query := `INSERT INTO encoder_data (encoder1, encoder2, encoder3, encoder4) VALUES ($1, $2, $3, $4)`
	_, err := DBPool.Exec(ctx, query, data.Encoder1, data.Encoder2, data.Encoder3, data.Encoder4)
	return err
}

func InsertPDMCurrentData(ctx context.Context, data types.PDMCurrent_Data) error {
	query := `
		INSERT INTO pdm_current (
			accumulator_current, tcu_current, bamocar_current, pumps_current,
			tsal_current, daq_current, display_kvaser_current, shutdown_reset_current
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`
	_, err := DBPool.Exec(ctx, query,
		data.AccumulatorCurrent,
		data.TCUCurrent,
		data.BamocarCurrent,
		data.PumpsCurrent,
		data.TSALCurrent,
		data.DAQCurrent,
		data.DisplayKvaserCurrent,
		data.ShutdownResetCurrent,
	)
	return err
}

func InsertFrontStrainGauges1Data(ctx context.Context, data types.FrontStrainGauges1_Data) error {
	query := `
		INSERT INTO front_strain_gauges_1 (
			gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		) VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := DBPool.Exec(ctx, query,
		data.Gauge1,
		data.Gauge2,
		data.Gauge3,
		data.Gauge4,
		data.Gauge5,
		data.Gauge6,
	)
	return err
}

func InsertFrontStrainGauges2Data(ctx context.Context, data types.FrontStrainGauges2_Data) error {
	query := `
		INSERT INTO front_strain_gauges_2 (
			gauge1, gauge2, gauge3, gauge4, gauge5, gauge6
		) VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := DBPool.Exec(ctx, query,
		data.Gauge1,
		data.Gauge2,
		data.Gauge3,
		data.Gauge4,
		data.Gauge5,
		data.Gauge6,
	)
	return err
}

func InsertPDMReTransmitData(ctx context.Context, data types.PDMReTransmit_Data) error {
	query := `
		INSERT INTO pdm_re_transmit (
			pdm_int_temperature, pdm_batt_voltage, global_error_flag,
			total_current, internal_rail_voltage, reset_source
		) VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := DBPool.Exec(ctx, query,
		data.PDMIntTemperature,
		data.PDMBattVoltage,
		data.GlobalErrorFlag,
		data.TotalCurrent,
		data.InternalRailVoltage,
		data.ResetSource,
	)
	return err
}
