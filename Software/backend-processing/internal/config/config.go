package config

import (
	"fmt"

	"github.com/spf13/viper"
)

// Config holds the application configuration.
type Config struct {
	// Database configuration
	Database struct {
		ConnectionString string `mapstructure:"connection_string"`
	} `mapstructure:"database"`

	// Network configuration - centralized IP and port settings
	Network struct {
		HostIP string `mapstructure:"host_ip"`
		Ports  struct {
			RawTelemetryWS int `mapstructure:"raw_telemetry_ws"` // Port where car sends data
			RestAPI        int `mapstructure:"rest_api"`         // REST API port
			LiveDataWS     int `mapstructure:"live_data_ws"`     // Frontend WebSocket port
		} `mapstructure:"ports"`
	} `mapstructure:"network"`

	// Legacy WebSocket fields for backward compatibility
	WebSocket struct {
		URL  string `mapstructure:"sender_url"`
		IP   string `mapstructure:"ip"`   
		Port int    `mapstructure:"port"` 
	} `mapstructure:"websocket"`

	// CSV Simulation settings
	CSVSimulation struct {
		FilePath   string  `mapstructure:"file_path"`
		StartLine  int     `mapstructure:"start_line"`
		TimeAdjust float64 `mapstructure:"time_adjust"`
	} `mapstructure:"csv_simulation"`

	// Live mode settings
	LiveMode struct {
		MessageDelay float64 `mapstructure:"message_delay"`
	} `mapstructure:"live_mode"`

	// File paths
	DBCFile  string `mapstructure:"dbc_file"`
	JSONFile string `mapstructure:"json_file"`
	
	// System settings
	Mode              string `mapstructure:"mode"`               // "csv" or "live"
	ThrottlerInterval int    `mapstructure:"throttler_interval"` // in milliseconds
	
	// Legacy fields for backward compatibility
	APIPort    string `mapstructure:"apiport"`
	LiveWSPort int    `mapstructure:"live_ws_port"`
}

// LoadConfig reads and unmarshals the configuration file.
func LoadConfig(path, name, fileType string) (*Config, error) {
	viper.SetConfigName(name)
	viper.SetConfigType(fileType)
	viper.AddConfigPath(path)

	// Set defaults for backward compatibility
	viper.SetDefault("network.host_ip", "localhost")
	viper.SetDefault("network.ports.raw_telemetry_ws", 9091)
	viper.SetDefault("network.ports.rest_api", 9092)
	viper.SetDefault("network.ports.live_data_ws", 9094)
	viper.SetDefault("csv_simulation.file_path", "../../testdata/data.csv")
	viper.SetDefault("csv_simulation.start_line", 960000)
	viper.SetDefault("csv_simulation.time_adjust", 0.000415)
	viper.SetDefault("live_mode.message_delay", 3.0)

	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("config file error: %v", err)
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("config decode error: %v", err)
	}

	// Handle backward compatibility
	// If new network config is not set, use legacy fields
	if cfg.Network.HostIP == "" && cfg.WebSocket.IP != "" {
		cfg.Network.HostIP = cfg.WebSocket.IP
	}
	if cfg.Network.Ports.RawTelemetryWS == 0 && cfg.WebSocket.Port != 0 {
		cfg.Network.Ports.RawTelemetryWS = cfg.WebSocket.Port
	}
	if cfg.Network.Ports.RestAPI == 0 && cfg.APIPort != "" {
		// Convert string APIPort to int
		var port int
		fmt.Sscanf(cfg.APIPort, "%d", &port)
		if port > 0 {
			cfg.Network.Ports.RestAPI = port
		}
	}
	if cfg.Network.Ports.LiveDataWS == 0 && cfg.LiveWSPort != 0 {
		cfg.Network.Ports.LiveDataWS = cfg.LiveWSPort
	}

	// Update legacy fields from new network config (for any code still using them)
	cfg.WebSocket.IP = cfg.Network.HostIP
	cfg.WebSocket.Port = cfg.Network.Ports.RawTelemetryWS
	cfg.APIPort = fmt.Sprintf("%d", cfg.Network.Ports.RestAPI)
	cfg.LiveWSPort = cfg.Network.Ports.LiveDataWS
	
	return &cfg, nil
}