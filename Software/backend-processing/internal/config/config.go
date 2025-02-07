// internal/config/config.go
package config

import (
	"fmt"

	"github.com/spf13/viper"
)

// Config holds our YAML configuration structure.
type Config struct {
	Database struct {
		ConnectionString string `mapstructure:"connection_string"`
	} `mapstructure:"database"`

	WebSocket struct {
		URL string `mapstructure:"url"`
	} `mapstructure:"websocket"`

	DBCFile  string `mapstructure:"dbc_file"`
	JSONFile string `mapstructure:"json_file"`
}

// LoadConfig attempts to read a config file using Viper.
func LoadConfig(path, name, fileType string) (*Config, error) {
	viper.SetConfigName(name)
	viper.SetConfigType(fileType)
	viper.AddConfigPath(path)

	if err := viper.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("error reading config file: %v", err)
	}

	var cfg Config
	if err := viper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unable to decode into struct: %v", err)
	}
	return &cfg, nil
}
