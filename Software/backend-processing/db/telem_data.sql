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
    -- Store timestamp with timezone, using current time as default
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
    -- Store timestamp with timezone, using current time as default
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
    thermistor_id SMALLINT NOT NULL,      -- Thermistor ID (1 to 16)
    therm1 DOUBLE PRECISION,              -- Thermistor 1 reading
    therm2 DOUBLE PRECISION,              -- Thermistor 2 reading
    therm3 DOUBLE PRECISION,              -- Thermistor 3 reading
    therm4 DOUBLE PRECISION,              -- Thermistor 4 reading
    therm5 DOUBLE PRECISION,              -- Thermistor 5 reading
    therm6 DOUBLE PRECISION,              -- Thermistor 6 reading
    therm7 DOUBLE PRECISION,              -- Thermistor 7 reading
    therm8 DOUBLE PRECISION,              -- Thermistor 8 reading
    therm9 DOUBLE PRECISION,              -- Thermistor 9 reading
    therm10 DOUBLE PRECISION,             -- Thermistor 10 reading
    therm11 DOUBLE PRECISION,             -- Thermistor 11 reading
    therm12 DOUBLE PRECISION,             -- Thermistor 12 reading
    therm13 DOUBLE PRECISION,             -- Thermistor 13 reading
    therm14 DOUBLE PRECISION,             -- Thermistor 14 reading
    therm15 DOUBLE PRECISION,             -- Thermistor 15 reading
    therm16 DOUBLE PRECISION              -- Thermistor 16 reading
);

-- ================================================
-- Bamocar Data Tables
-- ================================================
CREATE TABLE IF NOT EXISTS bamocar_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    bamocar_frg SMALLINT NOT NULL,      -- BamocarFRG data
    bamocar_rfe SMALLINT NOT NULL,      -- BamocarRFE data
    brake_light SMALLINT NOT NULL       -- BrakeLight status
);

CREATE TABLE IF NOT EXISTS bamocar_tx_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    regid INT,                          -- REGID (8-bit unsigned integer)
    data INT                            -- Data (16-bit unsigned integer)
);

CREATE TABLE IF NOT EXISTS bamo_car_re_transmit (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    motor_temp INT,                     -- Motor temperature (16-bit unsigned integer)
    controller_temp INT                 -- Controller temperature (16-bit unsigned integer)
);

-- ================================================
-- Encoder Data Table
-- ================================================
CREATE TABLE IF NOT EXISTS encoder_data (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    encoder1 INTEGER NOT NULL,           -- Encoder1 value
    encoder2 INTEGER NOT NULL,           -- Encoder2 value
    encoder3 INTEGER NOT NULL,           -- Encoder3 value
    encoder4 INTEGER NOT NULL            -- Encoder4 value
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
    accumulator_current INT,                    -- Accumulator current (8-bit unsigned integer)
    tcu_current INT,                            -- TCU current (8-bit unsigned integer)
    bamocar_current INT,                        -- Bamocar current (8-bit unsigned integer)
    pumps_current INT,                          -- Pumps current (8-bit unsigned integer)
    tsal_current INT,                           -- TSAL current (8-bit unsigned integer)
    daq_current INT,                            -- DAQ current (8-bit unsigned integer)
    display_kvaser_current INT,                 -- Display/Kvaser current (8-bit unsigned integer)
    shutdown_reset_current INT                  -- Shutdown/Reset current (8-bit unsigned integer)
);

CREATE TABLE IF NOT EXISTS pdm_re_transmit (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    pdm_int_temperature INT,                    -- PDM Internal Temperature (8-bit unsigned integer)
    pdm_batt_voltage FLOAT,                     -- PDM Battery Voltage (scaled by 0.1216 factor, 8-bit signed integer)
    global_error_flag INT,                      -- Global Error Flag (8-bit unsigned integer)
    total_current INT,                          -- Total Current (8-bit unsigned integer)
    internal_rail_voltage FLOAT,                -- Internal Rail Voltage (scaled by 0.0615 factor, 8-bit signed integer)
    reset_source INT                            -- Reset Source (8-bit unsigned integer)
);

-- ================================================
-- INS Data Tables
-- ================================================
CREATE TABLE IF NOT EXISTS ins_gps (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gnss_week INT,                    -- GNSS Week (32-bit unsigned integer)
    gnss_seconds DOUBLE PRECISION,    -- GNSS Seconds (64-bit float, signed)
    gnss_lat DOUBLE PRECISION,        -- GNSS Latitude (64-bit float, signed)
    gnss_long DOUBLE PRECISION,       -- GNSS Longitude (64-bit float, signed)
    gnss_height DOUBLE PRECISION      -- GNSS Height (64-bit float, signed)
);

CREATE TABLE IF NOT EXISTS ins_imu (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    north_vel DOUBLE PRECISION,       -- North velocity (64-bit float, signed)
    east_vel DOUBLE PRECISION,        -- East velocity (64-bit float, signed)
    up_vel DOUBLE PRECISION,          -- Up velocity (64-bit float, signed)
    roll DOUBLE PRECISION,            -- Roll (64-bit float, signed)
    pitch DOUBLE PRECISION,           -- Pitch (64-bit float, signed)
    azimuth DOUBLE PRECISION,         -- Azimuth (64-bit float, signed)
    status INT                        -- Status (8-bit unsigned integer)
);

-- ================================================
-- Front Frequency Table
-- ================================================
CREATE TABLE IF NOT EXISTS front_frequency (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rear_right DOUBLE PRECISION,      -- Rear Right (64-bit float, signed)
    front_right DOUBLE PRECISION,     -- Front Right (64-bit float, signed)
    rear_left DOUBLE PRECISION,       -- Rear Left (64-bit float, signed)
    front_left DOUBLE PRECISION       -- Front Left (64-bit float, signed)
);

-- ================================================
-- Front Strain Gauges Tables
-- ================================================
CREATE TABLE IF NOT EXISTS front_strain_gauges_1 (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gauge1 INT,                       -- Gauge1 (24-bit unsigned integer)
    gauge2 INT,                       -- Gauge2 (24-bit unsigned integer)
    gauge3 INT,                       -- Gauge3 (24-bit unsigned integer)
    gauge4 INT,                       -- Gauge4 (24-bit unsigned integer)
    gauge5 INT,                       -- Gauge5 (24-bit unsigned integer)
    gauge6 INT                        -- Gauge6 (24-bit unsigned integer)
);

CREATE TABLE IF NOT EXISTS front_strain_gauges_2 (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gauge1 INT,                       -- Gauge1 (24-bit unsigned integer)
    gauge2 INT,                       -- Gauge2 (24-bit unsigned integer)
    gauge3 INT,                       -- Gauge3 (24-bit unsigned integer)
    gauge4 INT,                       -- Gauge4 (24-bit unsigned integer)
    gauge5 INT,                       -- Gauge5 (24-bit unsigned integer)
    gauge6 INT                        -- Gauge6 (24-bit unsigned integer)
);

-- ================================================
-- Front Analog Data Table
-- ================================================
CREATE TABLE IF NOT EXISTS front_analog (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    left_rad INTEGER,                 -- LeftRad (16-bit unsigned integer)
    right_rad INTEGER,                -- RightRad (16-bit unsigned integer)
    front_right_pot DOUBLE PRECISION, -- FrontRightPot (scaled by 0.018315018315)
    front_left_pot DOUBLE PRECISION,  -- FrontLeftPot (scaled by 0.018315018315)
    rear_right_pot DOUBLE PRECISION,  -- RearRightPot (scaled by 0.018315018315)
    rear_left_pot DOUBLE PRECISION,   -- RearLeftPot (scaled by 0.018315018315)
    steering_angle DOUBLE PRECISION,  -- SteeringAngle (scaled by 0.018315018315)
    analog8 INTEGER                   -- Analog8 (16-bit unsigned integer)
);

-- ================================================
-- Aculv FD Table
-- ================================================
CREATE TABLE IF NOT EXISTS aculv_fd_1 (
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ams_status INT,                         -- AMSStatus (unsigned 8-bit integer)
    fld INT,                                -- FLD (unsigned 8-bit integer)
    state_of_charge DOUBLE PRECISION,       -- StateOfCharge (32-bit float, signed)
    accumulator_voltage DOUBLE PRECISION,   -- AccumulatorVoltage (32-bit float, signed)
    tractive_voltage DOUBLE PRECISION,      -- TractiveVoltage (32-bit float, signed)
    cell_current DOUBLE PRECISION,          -- CellCurrent (32-bit float, signed)
    isolation_monitoring INT,               -- IsolationMonitoring (unsigned 8-bit integer)
    isolation_monitoring1 DOUBLE PRECISION   -- IsolationMonitoring1 (32-bit float, signed)
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

-- ================================================
-- Indexes for tcu_data
-- ================================================
CREATE INDEX IF NOT EXISTS idx_tcu_timestamp ON tcu_data (timestamp);

-- ================================================
-- Indexes for cell_data
-- ================================================
CREATE INDEX IF NOT EXISTS idx_cell_timestamp ON cell_data (timestamp);

-- ================================================
-- Indexes for therm_data
-- ================================================
CREATE INDEX IF NOT EXISTS idx_therm_timestamp ON therm_data (timestamp);

-- ================================================
-- Indexes for bamocar_data
-- ================================================
CREATE INDEX IF NOT EXISTS idx_bamocar_timestamp ON bamocar_data (timestamp);

-- ================================================
-- Indexes for bamocar_tx_data
-- ================================================
CREATE INDEX IF NOT EXISTS idx_bamocar_tx_timestamp ON bamocar_tx_data (timestamp);

-- ================================================
-- Indexes for bamo_car_re_transmit
-- ================================================
CREATE INDEX IF NOT EXISTS idx_bamo_car_re_transmit_timestamp ON bamo_car_re_transmit (timestamp);

-- ================================================
-- Indexes for encoder_data
-- ================================================
CREATE INDEX IF NOT EXISTS idx_encoder_timestamp ON encoder_data (timestamp);

-- ================================================
-- Indexes for pack_current
-- ================================================
CREATE INDEX IF NOT EXISTS idx_pack_current_timestamp ON pack_current (timestamp);

-- ================================================
-- Indexes for pack_voltage
-- ================================================
CREATE INDEX IF NOT EXISTS idx_pack_voltage_timestamp ON pack_voltage (timestamp);

-- ================================================
-- Indexes for pdm_current
-- ================================================
CREATE INDEX IF NOT EXISTS idx_pdm_current_timestamp ON pdm_current (timestamp);

-- ================================================
-- Indexes for pdm_re_transmit
-- ================================================
CREATE INDEX IF NOT EXISTS idx_pdm_re_transmit_timestamp ON pdm_re_transmit (timestamp);

-- ================================================
-- Indexes for ins_gps
-- ================================================
CREATE INDEX IF NOT EXISTS idx_ins_gps_timestamp ON ins_gps (timestamp);

-- ================================================
-- Indexes for ins_imu
-- ================================================
CREATE INDEX IF NOT EXISTS idx_ins_imu_timestamp ON ins_imu (timestamp);

-- ================================================
-- Indexes for front_frequency
-- ================================================
CREATE INDEX IF NOT EXISTS idx_front_frequency_timestamp ON front_frequency (timestamp);

-- ================================================
-- Indexes for front_strain_gauges_1
-- ================================================
CREATE INDEX IF NOT EXISTS idx_front_strain_gauges_1_timestamp ON front_strain_gauges_1 (timestamp);

-- ================================================
-- Indexes for front_strain_gauges_2
-- ================================================
CREATE INDEX IF NOT EXISTS idx_front_strain_gauges_2_timestamp ON front_strain_gauges_2 (timestamp);

-- ================================================
-- Indexes for front_analog
-- ================================================
CREATE INDEX IF NOT EXISTS idx_front_analog_timestamp ON front_analog (timestamp);

-- ================================================
-- Indexes for aculv_fd_1
-- ================================================
CREATE INDEX IF NOT EXISTS idx_aculv_fd_1_timestamp ON aculv_fd_1 (timestamp);

-- =============================================================
-- Commit Transaction
-- =============================================================

-- COMMIT;

-- =============================================================
-- Optional: Count Total Rows (Commented Out)
-- =============================================================

-- SELECT SUM(row_count) AS total_rows
-- FROM (
--     SELECT COUNT(*) AS row_count FROM tcu_data
--     UNION ALL
--     SELECT COUNT(*) FROM cell_data
--     UNION ALL
--     SELECT COUNT(*) FROM therm_data
--     UNION ALL
--     SELECT COUNT(*) FROM bamocar_data
--     UNION ALL
--     SELECT COUNT(*) FROM bamocar_tx_data
--     UNION ALL
--     SELECT COUNT(*) FROM bamo_car_re_transmit
--     UNION ALL
--     SELECT COUNT(*) FROM encoder_data
--     UNION ALL
--     SELECT COUNT(*) FROM pack_current
--     UNION ALL
--     SELECT COUNT(*) FROM pack_voltage
--     UNION ALL
--     SELECT COUNT(*) FROM pdm_current
--     UNION ALL
--     SELECT COUNT(*) FROM pdm_re_transmit
--     UNION ALL
--     SELECT COUNT(*) FROM ins_gps
--     UNION ALL
--     SELECT COUNT(*) FROM ins_imu
--     UNION ALL
--     SELECT COUNT(*) FROM front_frequency
--     UNION ALL
--     SELECT COUNT(*) FROM front_strain_gauges_1
--     UNION ALL
--     SELECT COUNT(*) FROM front_strain_gauges_2
--     UNION ALL
--     SELECT COUNT(*) FROM front_analog
--     UNION ALL
--     SELECT COUNT(*) FROM aculv_fd_1
-- ) AS counts;

-- =============================================================
-- Performance Note
-- =============================================================

-- 1695755 took 2m57.7920317s (Vanilla Postgresql w/ CSV writing) - 9537 / sec
-- 1695755 took 2m37.8544765s (Vanilla Postgresql w/o CSV writing) - 10739 / sec
-- 1695755 took 3m32.5783055s (Timescaledb w/ CSV writing) - 7976 / sec
-- 1695755 took 3m20.8921297s (Timescaledb w/o CSV writing) - 8440 / sec
-- 1695755 took 3m19.6692358s (Timescaledb w/ cocurrency and w/o CSV writing) - 8491 / sec
-- 1695755 took 2m34.2955584s (Vanilla Postgresql w/ cocurrency and w/o CSV writing) - 10989 / sec
-- 1695755 took 2m54.4801568s (Timescaledb w/ cocurrency and w/o CSV writing and optimized .conf) - 9717 / sec
-- 1695755 took 2m22.9176138s (Vanilla Postgresql w/ cocurrency and w/o CSV writing and optimized .conf) - 11866 / sec
