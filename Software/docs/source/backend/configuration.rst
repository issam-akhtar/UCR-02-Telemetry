Configuration
=============

This document describes the configuration options available in the UCR-02-Telemetry system and how they affect backend behavior.

Introduction
-----------

The UCR-02-Telemetry system uses a centralized configuration file in YAML format to control all aspects of the system's behavior. This includes database connections, WebSocket server settings, data processing modes, and API ports. The configuration is loaded at startup and can be easily modified without changing code.

Configuration File
---------------

Key Files:

.. list-table::
   :header-rows: 1
   :widths: 60 40

   * - File Path
     - Functional Description
   * - ``backend-processing/configs/config.yaml``
     - Primary YAML configuration file with all system settings
   * - ``backend-processing/internal/config/config.go``
     - Configuration loading and validation implementation

The primary configuration file is located at `backend-processing/configs/config.yaml`. This file contains all the settings needed to run the telemetry system.

Basic Configuration
----------------

.. code-block:: yaml

    database:
      connection_string: "postgres://postgres:password@localhost:5432/telem_db?sslmode=disable"

    websocket:
      url: "ws://localhost:9091/telemetry"
      ip: "localhost"
      port: 9091

    mode: "csv"            # Allowed values: "csv" or "live"
    apiport: "9092"        # REST API server port

    dbc_file: "../../configs/UCR-01.dbc"
    json_file: "../../configs/UCR-01.json"

    throttler_interval: 0  # in milliseconds

    live_ws_port: 9094     # Port for the live data WebSocket (backend to frontend)

Configuration Options
------------------

### Database Settings

.. code-block:: yaml

    database:
      connection_string: "postgres://postgres:password@localhost:5432/telem_db?sslmode=disable"

* **connection_string**: PostgreSQL connection string for connecting to the TimescaleDB database
  * Format: `postgres://username:password@hostname:port/database?sslmode=mode`
  * The connection string supports all standard PostgreSQL parameters

### WebSocket Ingest Settings

.. code-block:: yaml

    websocket:
      url: "ws://localhost:9091/telemetry"
      ip: "localhost"
      port: 9091

* **url**: Full WebSocket URL for the telemetry ingest endpoint
* **ip**: Host/IP address to bind the WebSocket server to
* **port**: Port for the raw telemetry data ingest WebSocket server

### Operation Mode

.. code-block:: yaml

    mode: "csv"  # Allowed values: "csv" or "live"

* **mode**: Determines how incoming data is processed
  * `csv`: Process data as CSV rows with timestamp, frame ID, and values
  * `live`: Process data as binary CAN frames directly from the vehicle

### API Settings

.. code-block:: yaml

    apiport: "9092"  # REST API server port

* **apiport**: Port for the REST API server used for historical data retrieval

### Signal Definition Files

.. code-block:: yaml

    dbc_file: "../../configs/UCR-01.dbc"
    json_file: "../../configs/UCR-01.json"

* **dbc_file**: Path to the DBC file containing CAN signal definitions
* **json_file**: Path to the JSON representation of the DBC file for faster loading

### Throttling and Live Updates

.. code-block:: yaml

    throttler_interval: 0  # in milliseconds
    live_ws_port: 9094     # Port for the live data WebSocket (backend to frontend)

* **throttler_interval**: Minimum interval between broadcasts in milliseconds (0 = no throttling)
* **live_ws_port**: Port for the live data WebSocket server connecting backend to frontend

Loading Configuration
------------------

The configuration is loaded by the `LoadConfig` function in `internal/config/config.go`:

.. code-block:: go

    func LoadConfig(path, name, fileType string) (*Config, error) {
        viper.SetConfigName(name)
        viper.SetConfigType(fileType)
        viper.AddConfigPath(path)

        if err := viper.ReadInConfig(); err != nil {
            return nil, fmt.Errorf("config file error: %v", err)
        }

        var cfg Config
        if err := viper.Unmarshal(&cfg); err != nil {
            return nil, fmt.Errorf("config decode error: %v", err)
        }
        return &cfg, nil
    }

The application loads this configuration at startup:

.. code-block:: go

    cfg, err := config.LoadConfig("../../configs", "config", "yaml")
    if err != nil {
        log.Fatalf("Failed to load configuration: %v", err)
    }

Environment-Specific Configuration
-----------------------------

For different environments (development, testing, production), you can:

1. Use separate configuration files (e.g., `config.dev.yaml`, `config.prod.yaml`)
2. Override configuration values via environment variables
3. Use Docker Compose environment variables to inject configuration values

Configuration Structure
-------------------

The configuration is mapped to a Go struct for type safety:

.. code-block:: go

    type Config struct {
        Database struct {
            ConnectionString string `mapstructure:"connection_string"`
        } `mapstructure:"database"`

        WebSocket struct {
            URL  string `mapstructure:"url"`
            IP   string `mapstructure:"ip"`
            Port int    `mapstructure:"port"`
        } `mapstructure:"websocket"`

        DBCFile           string `mapstructure:"dbc_file"`
        JSONFile          string `mapstructure:"json_file"`
        Mode              string `mapstructure:"mode"`
        ThrottlerInterval int    `mapstructure:"throttler_interval"`
        APIPort           string `mapstructure:"apiport"`
        LiveWSPort        int    `mapstructure:"live_ws_port"`
    }

Docker Environment Configuration
-----------------------------

When running in Docker, you can override configuration values using environment variables in the `.env` file or directly in the docker-compose command. The Docker setup will pass these environment variables to the container, which can then be used to override the default configuration.