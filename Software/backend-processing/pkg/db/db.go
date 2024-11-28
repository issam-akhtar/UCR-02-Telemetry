// pkg/db/db.go
package db

import (
	"context"
	"fmt"
	"runtime"
	"strings"

	"telem-system/pkg/types"

	"github.com/jackc/pgx/v4/pgxpool"
)

var DBPool *pgxpool.Pool

// Connect initializes the database connection pool.
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

// ClosePool closes the database connection pool.
func ClosePool() {
	if DBPool != nil {
		DBPool.Close()
	}
}

// Insertion Functions

func InsertTCUData(ctx context.Context, data types.TCU_Data) error {
	query := `
        INSERT INTO tcu_data (apps1, apps2, bse, status)
        VALUES ($1, $2, $3, $4)
    `
	_, err := DBPool.Exec(ctx, query, data.APPS1, data.APPS2, data.BSE, data.Status)
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
	query := `
        INSERT INTO pack_current (packcurrent)
        VALUES ($1)
    `
	_, err := DBPool.Exec(ctx, query, data.Current)
	return err
}

func InsertPackVoltageData(ctx context.Context, data types.PackVoltage_Data) error {
	query := `
        INSERT INTO pack_voltage (packvoltage)
        VALUES ($1)
    `
	_, err := DBPool.Exec(ctx, query, data.Voltage)
	return err
}

func InsertCellData(ctx context.Context, data types.Cell_Data) error {
	columns := make([]string, 128)
	placeholders := make([]string, 128)
	values := make([]interface{}, 128)

	for i := 1; i <= 128; i++ {
		columns[i-1] = fmt.Sprintf("cell%d", i)
		placeholders[i-1] = fmt.Sprintf("$%d", i)
		values[i-1] = data.Cells[i-1]
	}

	insertStmt := fmt.Sprintf("INSERT INTO cell_data (%s) VALUES (%s)", strings.Join(columns, ", "), strings.Join(placeholders, ", "))
	_, err := DBPool.Exec(ctx, insertStmt, values...)
	return err
}

// Repeat similar insertion functions for other data types...

func InsertBamocarData(ctx context.Context, data types.Bamocar_Data) error {
	query := `
        INSERT INTO bamocar_data (bamocar_frg, bamocar_rfe, brake_light)
        VALUES ($1, $2, $3)
    `
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
            north_vel, east_vel, up_vel, 
            roll, pitch, azimuth, status
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
	_, err := DBPool.Exec(ctx, query,
		data.RearRight,
		data.FrontRight,
		data.RearLeft,
		data.FrontLeft,
	)
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
	query := `
        INSERT INTO bamocar_tx_data (
            regid, data
        ) VALUES ($1, $2)
    `
	_, err := DBPool.Exec(ctx, query, data.REGID, data.Data)
	return err
}

func InsertBamoCarReTransmitData(ctx context.Context, data types.BamoCarReTransmit_Data) error {
	query := `
        INSERT INTO bamo_car_re_transmit (
            motor_temp, controller_temp
        ) VALUES ($1, $2)
    `
	_, err := DBPool.Exec(ctx, query, data.MotorTemp, data.ControllerTemp)
	return err
}

func InsertEncoderData(ctx context.Context, data types.Encoder_Data) error {
	query := `
        INSERT INTO encoder_data (encoder1, encoder2, encoder3, encoder4)
        VALUES ($1, $2, $3, $4)
    `
	_, err := DBPool.Exec(ctx, query, data.Encoder1, data.Encoder2, data.Encoder3, data.Encoder4)
	return err
}
func InsertPDMCurrentData(ctx context.Context, data types.PDMCurrent_Data) error {
	query := `
        INSERT INTO pdm_current (
            accumulator_current, tcu_current, bamocar_current,
            pumps_current, tsal_current, daq_current, display_kvaser_current,
            shutdown_reset_current
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
