// config.go
// ----------------------------------------------------------------------
// Telemetry System Configuration Package
//
// This package loads and unmarshals the system configuration from a
// YAML file using Viper. The configuration includes database connection
// settings, WebSocket parameters, file paths for DBC/JSON definitions,
// the operating mode, and a throttler interval for real-time processing.
// ----------------------------------------------------------------------

// config.go
package config

import (
	"fmt"

	"github.com/spf13/viper"
)

// Config holds the application configuration.
type Config struct {
	Database struct {
		ConnectionString string `mapstructure:"connection_string"`
	} `mapstructure:"database"`

	WebSocket struct {
		URL  string `mapstructure:"url"`
		IP   string `mapstructure:"ip"`   // Used by the sender for connection.
		Port int    `mapstructure:"port"` // Telemetry port; receiver listens here.
	} `mapstructure:"websocket"`

	DBCFile           string `mapstructure:"dbc_file"`
	JSONFile          string `mapstructure:"json_file"`
	Mode              string `mapstructure:"mode"`               // "csv" or "live"
	ThrottlerInterval int    `mapstructure:"throttler_interval"` // in milliseconds
	APIPort           string `mapstructure:"apiport"`
}

// LoadConfig reads and unmarshals the configuration file.
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
