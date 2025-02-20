// config.go
// ----------------------------------------------------------------------
// Telemetry System Configuration Package
//
// This package loads and unmarshals the system configuration from a
// YAML file using Viper. The configuration includes database connection
// settings, WebSocket parameters, file paths for DBC/JSON definitions,
// the operating mode, and a throttler interval for real-time processing.
//
// ----------------------------------------------------------------------

package config

import (
	"fmt"

	"github.com/spf13/viper"
)

// Config holds the application configuration loaded from a YAML file.
type Config struct {
	Database struct {
		ConnectionString string `mapstructure:"connection_string"`
	} `mapstructure:"database"`

	WebSocket struct {
		URL  string `mapstructure:"url"`
		Port int    `mapstructure:"port"`
	} `mapstructure:"websocket"`

	DBCFile           string `mapstructure:"dbc_file"`
	JSONFile          string `mapstructure:"json_file"`
	Mode              string `mapstructure:"mode"`               // Allowed values: "csv", "live"
	ThrottlerInterval int    `mapstructure:"throttler_interval"` // in milliseconds
}

// LoadConfig reads and unmarshals the configuration file.
// Parameters:
//   - path: the directory where the config file is located.
//   - name: the config file name (without extension).
//   - fileType: the type/extension of the config file (e.g., "yaml").
//
// Returns a pointer to a Config struct or an error.
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
