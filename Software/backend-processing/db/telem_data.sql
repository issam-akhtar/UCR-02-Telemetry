-- =============================================
-- Telemetry System Database Schema
-- Auto-generated based on CAN JSON definitions.
-- Each incoming message (by frame_id) is stored
-- in its own hypertable.
-- =============================================

-- =============================================================
-- Drop Existing Tables (if any)
-- =============================================================
DROP TABLE IF EXISTS front_analog      CASCADE;
DROP TABLE IF EXISTS rear_analog       CASCADE;
DROP TABLE IF EXISTS front_aero        CASCADE;
DROP TABLE IF EXISTS rear_aero         CASCADE;
DROP TABLE IF EXISTS encoder_data      CASCADE;
DROP TABLE IF EXISTS front_strain_gauges_1 CASCADE;
DROP TABLE IF EXISTS front_strain_gauges_2 CASCADE;
DROP TABLE IF EXISTS rear_strain_gauges_1  CASCADE;
DROP TABLE IF EXISTS rear_strain_gauges_2  CASCADE;
DROP TABLE IF EXISTS gps_best_pos      CASCADE;
DROP TABLE IF EXISTS front_frequency   CASCADE;
DROP TABLE IF EXISTS rear_frequency    CASCADE;
DROP TABLE IF EXISTS bamocar_rx_data   CASCADE;
DROP TABLE IF EXISTS cell_data         CASCADE;
DROP TABLE IF EXISTS therm_data        CASCADE;
DROP TABLE IF EXISTS pack_voltage      CASCADE;
DROP TABLE IF EXISTS pack_current      CASCADE;
DROP TABLE IF EXISTS tcu1              CASCADE;
DROP TABLE IF EXISTS tcu2              CASCADE;
DROP TABLE IF EXISTS aculv_fd_1        CASCADE;
DROP TABLE IF EXISTS aculv_fd_2        CASCADE;
DROP TABLE IF EXISTS aculv1            CASCADE;
DROP TABLE IF EXISTS aculv2            CASCADE;
DROP TABLE IF EXISTS pdm1              CASCADE;
DROP TABLE IF EXISTS bamocar_tx_data   CASCADE;
DROP TABLE IF EXISTS ins_gps           CASCADE;
DROP TABLE IF EXISTS ins_imu           CASCADE;
DROP TABLE IF EXISTS bamo_car_re_transmit CASCADE;
DROP TABLE IF EXISTS pdm_current       CASCADE;
DROP TABLE IF EXISTS pdm_re_transmit   CASCADE;

-- =============================================================
-- Create Consolidated Tables for Batch Inserts
-- =============================================================

-- Cell Voltage Data Table (combined from CellVoltage1-8)
CREATE TABLE IF NOT EXISTS cell_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- CellVoltage1 (Cells 1-16)
    cell1  DOUBLE PRECISION,  cell2  DOUBLE PRECISION,  cell3  DOUBLE PRECISION,  cell4  DOUBLE PRECISION,
    cell5  DOUBLE PRECISION,  cell6  DOUBLE PRECISION,  cell7  DOUBLE PRECISION,  cell8  DOUBLE PRECISION,
    cell9  DOUBLE PRECISION,  cell10 DOUBLE PRECISION, cell11 DOUBLE PRECISION, cell12 DOUBLE PRECISION,
    cell13 DOUBLE PRECISION,  cell14 DOUBLE PRECISION,  cell15 DOUBLE PRECISION, cell16 DOUBLE PRECISION,
    -- CellVoltage2 (Cells 17-32)
    cell17 DOUBLE PRECISION,  cell18 DOUBLE PRECISION,  cell19 DOUBLE PRECISION, cell20 DOUBLE PRECISION,
    cell21 DOUBLE PRECISION,  cell22 DOUBLE PRECISION,  cell23 DOUBLE PRECISION, cell24 DOUBLE PRECISION,
    cell25 DOUBLE PRECISION,  cell26 DOUBLE PRECISION,  cell27 DOUBLE PRECISION, cell28 DOUBLE PRECISION,
    cell29 DOUBLE PRECISION,  cell30 DOUBLE PRECISION,  cell31 DOUBLE PRECISION, cell32 DOUBLE PRECISION,
    -- CellVoltage3 (Cells 33-48)
    cell33 DOUBLE PRECISION,  cell34 DOUBLE PRECISION,  cell35 DOUBLE PRECISION, cell36 DOUBLE PRECISION,
    cell37 DOUBLE PRECISION,  cell38 DOUBLE PRECISION,  cell39 DOUBLE PRECISION, cell40 DOUBLE PRECISION,
    cell41 DOUBLE PRECISION,  cell42 DOUBLE PRECISION,  cell43 DOUBLE PRECISION, cell44 DOUBLE PRECISION,
    cell45 DOUBLE PRECISION,  cell46 DOUBLE PRECISION,  cell47 DOUBLE PRECISION, cell48 DOUBLE PRECISION,
    -- CellVoltage4 (Cells 49-64)
    cell49 DOUBLE PRECISION,  cell50 DOUBLE PRECISION,  cell51 DOUBLE PRECISION, cell52 DOUBLE PRECISION,
    cell53 DOUBLE PRECISION,  cell54 DOUBLE PRECISION,  cell55 DOUBLE PRECISION, cell56 DOUBLE PRECISION,
    cell57 DOUBLE PRECISION,  cell58 DOUBLE PRECISION,  cell59 DOUBLE PRECISION, cell60 DOUBLE PRECISION,
    cell61 DOUBLE PRECISION,  cell62 DOUBLE PRECISION,  cell63 DOUBLE PRECISION, cell64 DOUBLE PRECISION,
    -- CellVoltage5 (Cells 65-80)
    cell65 DOUBLE PRECISION,  cell66 DOUBLE PRECISION,  cell67 DOUBLE PRECISION, cell68 DOUBLE PRECISION,
    cell69 DOUBLE PRECISION,  cell70 DOUBLE PRECISION,  cell71 DOUBLE PRECISION, cell72 DOUBLE PRECISION,
    cell73 DOUBLE PRECISION,  cell74 DOUBLE PRECISION,  cell75 DOUBLE PRECISION, cell76 DOUBLE PRECISION,
    cell77 DOUBLE PRECISION,  cell78 DOUBLE PRECISION,  cell79 DOUBLE PRECISION, cell80 DOUBLE PRECISION,
    -- CellVoltage6 (Cells 81-96)
    cell81 DOUBLE PRECISION,  cell82 DOUBLE PRECISION,  cell83 DOUBLE PRECISION, cell84 DOUBLE PRECISION,
    cell85 DOUBLE PRECISION,  cell86 DOUBLE PRECISION,  cell87 DOUBLE PRECISION, cell88 DOUBLE PRECISION,
    cell89 DOUBLE PRECISION,  cell90 DOUBLE PRECISION,  cell91 DOUBLE PRECISION, cell92 DOUBLE PRECISION,
    cell93 DOUBLE PRECISION,  cell94 DOUBLE PRECISION,  cell95 DOUBLE PRECISION, cell96 DOUBLE PRECISION,
    -- CellVoltage7 (Cells 97-113)
    cell97 DOUBLE PRECISION,  cell98 DOUBLE PRECISION,  cell99 DOUBLE PRECISION, cell100 DOUBLE PRECISION,
    cell101 DOUBLE PRECISION, cell102 DOUBLE PRECISION, cell103 DOUBLE PRECISION, cell104 DOUBLE PRECISION,
    cell105 DOUBLE PRECISION, cell106 DOUBLE PRECISION, cell107 DOUBLE PRECISION, cell108 DOUBLE PRECISION,
    cell109 DOUBLE PRECISION, cell110 DOUBLE PRECISION, cell111 DOUBLE PRECISION, cell112 DOUBLE PRECISION,
    cell113 DOUBLE PRECISION,
    -- CellVoltage8 (Cells 114-129)
    cell114 DOUBLE PRECISION, cell115 DOUBLE PRECISION, cell116 DOUBLE PRECISION, cell117 DOUBLE PRECISION,
    cell118 DOUBLE PRECISION, cell119 DOUBLE PRECISION, cell120 DOUBLE PRECISION, cell121 DOUBLE PRECISION,
    cell122 DOUBLE PRECISION, cell123 DOUBLE PRECISION, cell124 DOUBLE PRECISION, cell125 DOUBLE PRECISION,
    cell126 DOUBLE PRECISION, cell127 DOUBLE PRECISION, cell128 DOUBLE PRECISION
);

-- Pack Voltage Data Table (combined from PackVoltage1-4)
CREATE TABLE IF NOT EXISTS pack_voltage (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    voltage   DOUBLE PRECISION
);

-- Pack Current Data Table (combined from PackCurrent1-4)
CREATE TABLE IF NOT EXISTS pack_current (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current   DOUBLE PRECISION
);

-- Thermistor Data Table (combined from Thermistor1-12)
CREATE TABLE IF NOT EXISTS therm_data (
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    thermistor_id   INTEGER NOT NULL,
    therm1  DOUBLE PRECISION,
    therm2  DOUBLE PRECISION,
    therm3  DOUBLE PRECISION,
    therm4  DOUBLE PRECISION,
    therm5  DOUBLE PRECISION,
    therm6  DOUBLE PRECISION,
    therm7  DOUBLE PRECISION,
    therm8  DOUBLE PRECISION,
    therm9  DOUBLE PRECISION,
    therm10 DOUBLE PRECISION,
    therm11 DOUBLE PRECISION,
    therm12 DOUBLE PRECISION,
    therm13 DOUBLE PRECISION,
    therm14 DOUBLE PRECISION,
    therm15 DOUBLE PRECISION,
    therm16 DOUBLE PRECISION
);

-- =============================================================
-- Create Individual Tables for Each CAN Message
-- =============================================================

-- 1. FrontAnalog (frame_id 259)
CREATE TABLE IF NOT EXISTS front_analog (
    timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_rad          INTEGER,
    right_rad         INTEGER,
    front_right_pot   DOUBLE PRECISION,
    front_left_pot    DOUBLE PRECISION,
    rear_right_pot    DOUBLE PRECISION,
    rear_left_pot     DOUBLE PRECISION,
    steering_angle    DOUBLE PRECISION,
    analog8           INTEGER
);

-- 2. RearAnalog (frame_id 258)
CREATE TABLE IF NOT EXISTS rear_analog (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    analog1   INTEGER,
    analog2   INTEGER,
    analog3   INTEGER,
    analog4   INTEGER,
    analog5   INTEGER,
    analog6   INTEGER,
    analog7   INTEGER,
    analog8   INTEGER
);

-- 3. FrontAero (frame_id 1536)
CREATE TABLE IF NOT EXISTS front_aero (
    timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pressure1     INTEGER,
    pressure2     INTEGER,
    pressure3     INTEGER,
    temperature1  INTEGER,
    temperature2  INTEGER,
    temperature3  INTEGER
);

-- 4. RearAero (frame_id 1537)
CREATE TABLE IF NOT EXISTS rear_aero (
    timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pressure1     INTEGER,
    pressure2     INTEGER,
    pressure3     INTEGER,
    temperature1  INTEGER,
    temperature2  INTEGER,
    temperature3  INTEGER
);

-- 5. EncoderPositions (frame_id 200)
CREATE TABLE IF NOT EXISTS encoder_data (
    timestamp  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    encoder1   INTEGER,
    encoder2   INTEGER,
    encoder3   INTEGER,
    encoder4   INTEGER
);

-- 6. FrontStrainGauges1 (frame_id 1552)
CREATE TABLE IF NOT EXISTS front_strain_gauges_1 (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gauge1    INTEGER,
    gauge2    INTEGER,
    gauge3    INTEGER,
    gauge4    INTEGER,
    gauge5    INTEGER,
    gauge6    INTEGER
);

-- 7. FrontStrainGauges2 (frame_id 1553)
CREATE TABLE IF NOT EXISTS front_strain_gauges_2 (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gauge1    INTEGER,
    gauge2    INTEGER,
    gauge3    INTEGER,
    gauge4    INTEGER,
    gauge5    INTEGER,
    gauge6    INTEGER
);

-- 8. RearStrainGauges1 (frame_id 1554)
CREATE TABLE IF NOT EXISTS rear_strain_gauges_1 (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gauge1    INTEGER,
    gauge2    INTEGER,
    gauge3    INTEGER,
    gauge4    INTEGER,
    gauge5    INTEGER,
    gauge6    INTEGER
);

-- 9. RearStrainGauges2 (frame_id 1555)
CREATE TABLE IF NOT EXISTS rear_strain_gauges_2 (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gauge1    INTEGER,
    gauge2    INTEGER,
    gauge3    INTEGER,
    gauge4    INTEGER,
    gauge5    INTEGER,
    gauge6    INTEGER
);

-- 10. GPSBestPos (frame_id 80)
CREATE TABLE IF NOT EXISTS gps_best_pos (
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    latitude     DOUBLE PRECISION,
    longitude    DOUBLE PRECISION,
    altitude     DOUBLE PRECISION,
    std_latitude DOUBLE PRECISION,
    std_longitude DOUBLE PRECISION,
    std_altitude DOUBLE PRECISION,
    gps_status   INTEGER
);

-- 11. FrontFrequency (frame_id 101)
CREATE TABLE IF NOT EXISTS front_frequency (
    timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rear_right  DOUBLE PRECISION,
    front_right DOUBLE PRECISION,
    rear_left   DOUBLE PRECISION,
    front_left  DOUBLE PRECISION
);

-- 12. RearFrequency (frame_id 102)
CREATE TABLE IF NOT EXISTS rear_frequency (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    freq1     DOUBLE PRECISION,
    freq2     DOUBLE PRECISION,
    freq3     DOUBLE PRECISION,
    freq4     DOUBLE PRECISION
);

-- 13. BamocarRxData (frame_id 513)
CREATE TABLE IF NOT EXISTS bamocar_rx_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    regid     INTEGER,
    byte1     INTEGER,
    byte2     INTEGER,
    byte3     INTEGER,
    byte4     INTEGER,
    byte5     INTEGER
);

-- 14. TCU1 (frame_id 6)
CREATE TABLE IF NOT EXISTS tcu1 (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    apps1     DOUBLE PRECISION,
    apps2     DOUBLE PRECISION,
    bse       DOUBLE PRECISION,
    status    INTEGER
);

-- 15. TCU2 (frame_id 100)
CREATE TABLE IF NOT EXISTS tcu2 (
    timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    brake_light   INTEGER,
    bamocar_rfe   INTEGER,
    bamocar_frg   INTEGER
);

-- 16. ACULV_FD_1 (frame_id 8)
CREATE TABLE IF NOT EXISTS aculv_fd_1 (
    timestamp              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ams_status             INTEGER,
    fld                    INTEGER,
    state_of_charge        DOUBLE PRECISION,
    accumulator_voltage    DOUBLE PRECISION,
    tractive_voltage       DOUBLE PRECISION,
    cell_current           DOUBLE PRECISION,
    isolation_monitoring   INTEGER,
    isolation_monitoring1  DOUBLE PRECISION
);

-- 17. ACULV_FD_2 (frame_id 30)
CREATE TABLE IF NOT EXISTS aculv_fd_2 (
    timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    fan_set_point DOUBLE PRECISION,
    rpm           DOUBLE PRECISION
);

-- 18. ACULV1 (frame_id 40)
CREATE TABLE IF NOT EXISTS aculv1 (
    timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    charge_status1 DOUBLE PRECISION,
    charge_status2 DOUBLE PRECISION
);

-- 19. ACULV2 (frame_id 41)
CREATE TABLE IF NOT EXISTS aculv2 (
    timestamp      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    charge_request INTEGER
);

-- 20. PDM1 (frame_id 1280)
CREATE TABLE IF NOT EXISTS pdm1 (
    timestamp             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    compound_id           INTEGER,
    pdm_int_temperature   INTEGER,
    pdm_batt_voltage      DOUBLE PRECISION,
    global_error_flag     INTEGER,
    total_current         INTEGER,
    internal_rail_voltage DOUBLE PRECISION,
    reset_source          INTEGER
);

-- 21. BamocarTxData (frame_id 385)
CREATE TABLE IF NOT EXISTS bamocar_tx_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    regid     INTEGER,
    data      INTEGER
);

-- 22. INS_GPS (frame_id 81)
CREATE TABLE IF NOT EXISTS ins_gps (
    timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gnss_week    INTEGER,
    gnss_seconds DOUBLE PRECISION,
    gnss_lat     DOUBLE PRECISION,
    gnss_long    DOUBLE PRECISION,
    gnss_height  DOUBLE PRECISION
);

-- 23. INS_IMU (frame_id 82)
CREATE TABLE IF NOT EXISTS ins_imu (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    north_vel DOUBLE PRECISION,
    east_vel  DOUBLE PRECISION,
    up_vel    DOUBLE PRECISION,
    roll      DOUBLE PRECISION,
    pitch     DOUBLE PRECISION,
    azimuth   DOUBLE PRECISION,
    status    INTEGER
);

-- 24. BamoCarReTransmit (frame_id 600)
CREATE TABLE IF NOT EXISTS bamo_car_re_transmit (
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    motor_temp      INTEGER,
    controller_temp INTEGER
);

-- 25. PDMCurrent (frame_id 1312)
CREATE TABLE IF NOT EXISTS pdm_current (
    timestamp               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accumulator_current   INTEGER,
    tcu_current           INTEGER,
    bamocar_current       INTEGER,
    pumps_current         INTEGER,
    tsal_current          INTEGER,
    daq_current           INTEGER,
    display_kvaser_current INTEGER,
    shutdown_reset_current INTEGER
);

-- 26. PDMReTransmit (frame_id 1680)
CREATE TABLE IF NOT EXISTS pdm_re_transmit (
    timestamp               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pdm_int_temperature   INTEGER,
    pdm_batt_voltage      DOUBLE PRECISION,
    global_error_flag     INTEGER,
    total_current         INTEGER,
    internal_rail_voltage DOUBLE PRECISION,
    reset_source          INTEGER
);

-- =============================================================
-- Convert Tables to Hypertables (TimescaleDB)
-- =============================================================
SELECT create_hypertable('front_analog', 'timestamp');
SELECT create_hypertable('rear_analog', 'timestamp');
SELECT create_hypertable('front_aero', 'timestamp');
SELECT create_hypertable('rear_aero', 'timestamp');
SELECT create_hypertable('encoder_data', 'timestamp');
SELECT create_hypertable('front_strain_gauges_1', 'timestamp');
SELECT create_hypertable('front_strain_gauges_2', 'timestamp');
SELECT create_hypertable('rear_strain_gauges_1', 'timestamp');
SELECT create_hypertable('rear_strain_gauges_2', 'timestamp');
SELECT create_hypertable('gps_best_pos', 'timestamp');
SELECT create_hypertable('front_frequency', 'timestamp');
SELECT create_hypertable('rear_frequency', 'timestamp');
SELECT create_hypertable('bamocar_rx_data', 'timestamp');
SELECT create_hypertable('cell_data', 'timestamp');
SELECT create_hypertable('therm_data', 'timestamp');
SELECT create_hypertable('pack_voltage', 'timestamp');
SELECT create_hypertable('pack_current', 'timestamp');
SELECT create_hypertable('tcu1', 'timestamp');
SELECT create_hypertable('tcu2', 'timestamp');
SELECT create_hypertable('aculv_fd_1', 'timestamp');
SELECT create_hypertable('aculv_fd_2', 'timestamp');
SELECT create_hypertable('aculv1', 'timestamp');
SELECT create_hypertable('aculv2', 'timestamp');
SELECT create_hypertable('pdm1', 'timestamp');
SELECT create_hypertable('bamocar_tx_data', 'timestamp');
SELECT create_hypertable('ins_gps', 'timestamp');
SELECT create_hypertable('ins_imu', 'timestamp');
SELECT create_hypertable('bamo_car_re_transmit', 'timestamp');
SELECT create_hypertable('pdm_current', 'timestamp');
SELECT create_hypertable('pdm_re_transmit', 'timestamp');

-- =============================================================
-- Create BRIN Indexes on Timestamp Columns
-- =============================================================
CREATE INDEX IF NOT EXISTS brin_front_analog_timestamp ON front_analog USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_rear_analog_timestamp ON rear_analog USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_front_aero_timestamp ON front_aero USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_rear_aero_timestamp ON rear_aero USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_encoder_data_timestamp ON encoder_data USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_front_strain_gauges_1_timestamp ON front_strain_gauges_1 USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_front_strain_gauges_2_timestamp ON front_strain_gauges_2 USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_rear_strain_gauges_1_timestamp ON rear_strain_gauges_1 USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_rear_strain_gauges_2_timestamp ON rear_strain_gauges_2 USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_gps_best_pos_timestamp ON gps_best_pos USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_front_frequency_timestamp ON front_frequency USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_rear_frequency_timestamp ON rear_frequency USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_bamocar_rx_data_timestamp ON bamocar_rx_data USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_cell_data_timestamp ON cell_data USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_therm_data_timestamp ON therm_data USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_pack_voltage_timestamp ON pack_voltage USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_pack_current_timestamp ON pack_current USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_tcu1_timestamp ON tcu1 USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_tcu2_timestamp ON tcu2 USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_aculv_fd_1_timestamp ON aculv_fd_1 USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_aculv_fd_2_timestamp ON aculv_fd_2 USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_aculv1_timestamp ON aculv1 USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_aculv2_timestamp ON aculv2 USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_pdm1_timestamp ON pdm1 USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_bamocar_tx_data_timestamp ON bamocar_tx_data USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_ins_gps_timestamp ON ins_gps USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_ins_imu_timestamp ON ins_imu USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_bamo_car_re_transmit_timestamp ON bamo_car_re_transmit USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_pdm_current_timestamp ON pdm_current USING brin(timestamp);
CREATE INDEX IF NOT EXISTS brin_pdm_re_transmit_timestamp ON pdm_re_transmit USING brin(timestamp);
