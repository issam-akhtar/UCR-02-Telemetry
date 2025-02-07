-- BEGIN;

-- =============================================================
-- Drop Existing Tables
-- =============================================================

DROP TABLE IF EXISTS tcu_data;
DROP TABLE IF EXISTS cell_data;
DROP TABLE IF EXISTS therm_data;
DROP TABLE IF EXISTS bamocar_data;
DROP TABLE IF EXISTS bamocar_tx_data;
DROP TABLE IF EXISTS bamo_car_re_transmit;
DROP TABLE IF EXISTS encoder_data;
DROP TABLE IF EXISTS pack_current;
DROP TABLE IF EXISTS pack_voltage;
DROP TABLE IF EXISTS pdm_current;
DROP TABLE IF EXISTS pdm_re_transmit;
DROP TABLE IF EXISTS ins_gps;
DROP TABLE IF EXISTS ins_imu;
DROP TABLE IF EXISTS front_frequency;
DROP TABLE IF EXISTS front_strain_gauges_1;
DROP TABLE IF EXISTS front_strain_gauges_2;
DROP TABLE IF EXISTS front_analog;
DROP TABLE IF EXISTS aculv_fd_1;

-- =============================================================
-- Create Tables
-- =============================================================
SET TIME ZONE 'MST';

-- ================================================
-- TCU Data Table
-- ================================================
CREATE TABLE IF NOT EXISTS tcu_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    apps1 DOUBLE PRECISION NOT NULL,
    apps2 DOUBLE PRECISION NOT NULL,
    bse DOUBLE PRECISION NOT NULL,
    status SMALLINT NOT NULL
);

-- ================================================
-- Cell Data Table
-- ================================================
CREATE TABLE IF NOT EXISTS cell_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cell1 FLOAT,  cell2 FLOAT,  cell3 FLOAT,  cell4 FLOAT,
    cell5 FLOAT,  cell6 FLOAT,  cell7 FLOAT,  cell8 FLOAT,
    cell9 FLOAT,  cell10 FLOAT, cell11 FLOAT, cell12 FLOAT,
    cell13 FLOAT, cell14 FLOAT, cell15 FLOAT, cell16 FLOAT,
    cell17 FLOAT, cell18 FLOAT, cell19 FLOAT, cell20 FLOAT,
    cell21 FLOAT, cell22 FLOAT, cell23 FLOAT, cell24 FLOAT,
    cell25 FLOAT, cell26 FLOAT, cell27 FLOAT, cell28 FLOAT,
    cell29 FLOAT, cell30 FLOAT, cell31 FLOAT, cell32 FLOAT,
    cell33 FLOAT, cell34 FLOAT, cell35 FLOAT, cell36 FLOAT,
    cell37 FLOAT, cell38 FLOAT, cell39 FLOAT, cell40 FLOAT,
    cell41 FLOAT, cell42 FLOAT, cell43 FLOAT, cell44 FLOAT,
    cell45 FLOAT, cell46 FLOAT, cell47 FLOAT, cell48 FLOAT,
    cell49 FLOAT, cell50 FLOAT, cell51 FLOAT, cell52 FLOAT,
    cell53 FLOAT, cell54 FLOAT, cell55 FLOAT, cell56 FLOAT,
    cell57 FLOAT, cell58 FLOAT, cell59 FLOAT, cell60 FLOAT,
    cell61 FLOAT, cell62 FLOAT, cell63 FLOAT, cell64 FLOAT,
    cell65 FLOAT, cell66 FLOAT, cell67 FLOAT, cell68 FLOAT,
    cell69 FLOAT, cell70 FLOAT, cell71 FLOAT, cell72 FLOAT,
    cell73 FLOAT, cell74 FLOAT, cell75 FLOAT, cell76 FLOAT,
    cell77 FLOAT, cell78 FLOAT, cell79 FLOAT, cell80 FLOAT,
    cell81 FLOAT, cell82 FLOAT, cell83 FLOAT, cell84 FLOAT,
    cell85 FLOAT, cell86 FLOAT, cell87 FLOAT, cell88 FLOAT,
    cell89 FLOAT, cell90 FLOAT, cell91 FLOAT, cell92 FLOAT,
    cell93 FLOAT, cell94 FLOAT, cell95 FLOAT, cell96 FLOAT,
    cell97 FLOAT, cell98 FLOAT, cell99 FLOAT, cell100 FLOAT,
    cell101 FLOAT, cell102 FLOAT, cell103 FLOAT, cell104 FLOAT,
    cell105 FLOAT, cell106 FLOAT, cell107 FLOAT, cell108 FLOAT,
    cell109 FLOAT, cell110 FLOAT, cell111 FLOAT, cell112 FLOAT,
    cell113 FLOAT, cell114 FLOAT, cell115 FLOAT, cell116 FLOAT,
    cell117 FLOAT, cell118 FLOAT, cell119 FLOAT, cell120 FLOAT,
    cell121 FLOAT, cell122 FLOAT, cell123 FLOAT, cell124 FLOAT,
    cell125 FLOAT, cell126 FLOAT, cell127 FLOAT, cell128 FLOAT
);

-- ================================================
-- Thermistor Data Table
-- ================================================
CREATE TABLE IF NOT EXISTS therm_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    thermistor_id SMALLINT NOT NULL,
    therm1 DOUBLE PRECISION,
    therm2 DOUBLE PRECISION,
    therm3 DOUBLE PRECISION,
    therm4 DOUBLE PRECISION,
    therm5 DOUBLE PRECISION,
    therm6 DOUBLE PRECISION,
    therm7 DOUBLE PRECISION,
    therm8 DOUBLE PRECISION,
    therm9 DOUBLE PRECISION,
    therm10 DOUBLE PRECISION,
    therm11 DOUBLE PRECISION,
    therm12 DOUBLE PRECISION,
    therm13 DOUBLE PRECISION,
    therm14 DOUBLE PRECISION,
    therm15 DOUBLE PRECISION,
    therm16 DOUBLE PRECISION
);

-- ================================================
-- Bamocar Data Tables
-- ================================================
CREATE TABLE IF NOT EXISTS bamocar_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bamocar_frg SMALLINT NOT NULL,
    bamocar_rfe SMALLINT NOT NULL,
    brake_light SMALLINT NOT NULL
);

CREATE TABLE IF NOT EXISTS bamocar_tx_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    regid INT,
    data INT
);

CREATE TABLE IF NOT EXISTS bamo_car_re_transmit (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    motor_temp INT,
    controller_temp INT
);

-- ================================================
-- Encoder Data Table
-- ================================================
CREATE TABLE IF NOT EXISTS encoder_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    encoder1 INTEGER NOT NULL,
    encoder2 INTEGER NOT NULL,
    encoder3 INTEGER NOT NULL,
    encoder4 INTEGER NOT NULL
);

-- ================================================
-- Pack Data Tables
-- ================================================
CREATE TABLE IF NOT EXISTS pack_current (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    packcurrent DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS pack_voltage (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    packvoltage DOUBLE PRECISION
);

-- ================================================
-- PDM Data Tables
-- ================================================
CREATE TABLE IF NOT EXISTS pdm_current (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accumulator_current INT,
    tcu_current INT,
    bamocar_current INT,
    pumps_current INT,
    tsal_current INT,
    daq_current INT,
    display_kvaser_current INT,
    shutdown_reset_current INT
);

CREATE TABLE IF NOT EXISTS pdm_re_transmit (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pdm_int_temperature INT,
    pdm_batt_voltage FLOAT,
    global_error_flag INT,
    total_current INT,
    internal_rail_voltage FLOAT,
    reset_source INT
);

-- ================================================
-- INS Data Tables
-- ================================================
CREATE TABLE IF NOT EXISTS ins_gps (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gnss_week INT,
    gnss_seconds DOUBLE PRECISION,
    gnss_lat DOUBLE PRECISION,
    gnss_long DOUBLE PRECISION,
    gnss_height DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS ins_imu (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    north_vel DOUBLE PRECISION,
    east_vel DOUBLE PRECISION,
    up_vel DOUBLE PRECISION,
    roll DOUBLE PRECISION,
    pitch DOUBLE PRECISION,
    azimuth DOUBLE PRECISION,
    status INT
);

-- ================================================
-- Front Frequency Table
-- ================================================
CREATE TABLE IF NOT EXISTS front_frequency (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rear_right DOUBLE PRECISION,
    front_right DOUBLE PRECISION,
    rear_left DOUBLE PRECISION,
    front_left DOUBLE PRECISION
);

-- ================================================
-- Front Strain Gauges Tables
-- ================================================
CREATE TABLE IF NOT EXISTS front_strain_gauges_1 (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gauge1 INT,
    gauge2 INT,
    gauge3 INT,
    gauge4 INT,
    gauge5 INT,
    gauge6 INT
);

CREATE TABLE IF NOT EXISTS front_strain_gauges_2 (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gauge1 INT,
    gauge2 INT,
    gauge3 INT,
    gauge4 INT,
    gauge5 INT,
    gauge6 INT
);

-- ================================================
-- Front Analog Data Table
-- ================================================
CREATE TABLE IF NOT EXISTS front_analog (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_rad INTEGER,
    right_rad INTEGER,
    front_right_pot DOUBLE PRECISION,
    front_left_pot DOUBLE PRECISION,
    rear_right_pot DOUBLE PRECISION,
    rear_left_pot DOUBLE PRECISION,
    steering_angle DOUBLE PRECISION,
    analog8 INTEGER
);

-- ================================================
-- Aculv FD Table
-- ================================================
CREATE TABLE IF NOT EXISTS aculv_fd_1 (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ams_status INT,
    fld INT,
    state_of_charge DOUBLE PRECISION,
    accumulator_voltage DOUBLE PRECISION,
    tractive_voltage DOUBLE PRECISION,
    cell_current DOUBLE PRECISION,
    isolation_monitoring INT,
    isolation_monitoring1 DOUBLE PRECISION
);

-- =============================================================
-- Convert Tables to Hypertables
-- =============================================================
SELECT create_hypertable('tcu_data', 'timestamp');
SELECT create_hypertable('cell_data', 'timestamp');
SELECT create_hypertable('therm_data', 'timestamp');
SELECT create_hypertable('bamocar_data', 'timestamp');
SELECT create_hypertable('bamocar_tx_data', 'timestamp');
SELECT create_hypertable('bamo_car_re_transmit', 'timestamp');
SELECT create_hypertable('encoder_data', 'timestamp');
SELECT create_hypertable('pack_current', 'timestamp');
SELECT create_hypertable('pack_voltage', 'timestamp');
SELECT create_hypertable('pdm_current', 'timestamp');
SELECT create_hypertable('pdm_re_transmit', 'timestamp');
SELECT create_hypertable('ins_gps', 'timestamp');
SELECT create_hypertable('ins_imu', 'timestamp');
SELECT create_hypertable('front_frequency', 'timestamp');
SELECT create_hypertable('front_strain_gauges_1', 'timestamp');
SELECT create_hypertable('front_strain_gauges_2', 'timestamp');
SELECT create_hypertable('front_analog', 'timestamp');
SELECT create_hypertable('aculv_fd_1', 'timestamp');

-- =============================================================
-- Create Indexes
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_tcu_timestamp ON tcu_data (timestamp);
CREATE INDEX IF NOT EXISTS idx_cell_timestamp ON cell_data (timestamp);
CREATE INDEX IF NOT EXISTS idx_therm_timestamp ON therm_data (timestamp);
CREATE INDEX IF NOT EXISTS idx_bamocar_timestamp ON bamocar_data (timestamp);
CREATE INDEX IF NOT EXISTS idx_bamocar_tx_timestamp ON bamocar_tx_data (timestamp);
CREATE INDEX IF NOT EXISTS idx_bamo_car_re_transmit_timestamp ON bamo_car_re_transmit (timestamp);
CREATE INDEX IF NOT EXISTS idx_encoder_timestamp ON encoder_data (timestamp);
CREATE INDEX IF NOT EXISTS idx_pack_current_timestamp ON pack_current (timestamp);
CREATE INDEX IF NOT EXISTS idx_pack_voltage_timestamp ON pack_voltage (timestamp);
CREATE INDEX IF NOT EXISTS idx_pdm_current_timestamp ON pdm_current (timestamp);
CREATE INDEX IF NOT EXISTS idx_pdm_re_transmit_timestamp ON pdm_re_transmit (timestamp);
CREATE INDEX IF NOT EXISTS idx_ins_gps_timestamp ON ins_gps (timestamp);
CREATE INDEX IF NOT EXISTS idx_ins_imu_timestamp ON ins_imu (timestamp);
CREATE INDEX IF NOT EXISTS idx_front_frequency_timestamp ON front_frequency (timestamp);
CREATE INDEX IF NOT EXISTS idx_front_strain_gauges_1_timestamp ON front_strain_gauges_1 (timestamp);
CREATE INDEX IF NOT EXISTS idx_front_strain_gauges_2_timestamp ON front_strain_gauges_2 (timestamp);
CREATE INDEX IF NOT EXISTS idx_front_analog_timestamp ON front_analog (timestamp);
CREATE INDEX IF NOT EXISTS idx_aculv_fd_1_timestamp ON aculv_fd_1 (timestamp);

-- COMMIT;
