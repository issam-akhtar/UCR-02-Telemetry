// src/config/chart-config.js
export default {
  realTime: {
    // Battery Systems
    cell: {
      type: 'bar',
      title: 'Cell Voltages',
      fieldPattern: 'cell*',
      colors: ['#4ECDC4'],
      axis: {
        x: { label: 'Cell Number', tickFormat: '#' },
        y: { label: 'Voltage (V)', tickFormat: '0.2f' }
      },
      maxBars: 128
    },

    // Vehicle Control Units
    tcu: {
      type: 'line',
      title: 'TCU Real-Time Metrics',
      fields: ['apps1', 'apps2', 'bse'],
      colors: ['#FF6B6B', '#45B7B1', '#FFE66D'],
      axis: {
        x: { label: 'Time', tickFormat: '%H:%M:%S' },
        y: { label: 'Value', tickFormat: '0.2f' }
      }
    },
    pack_current: {
      type: 'line',
      title: 'Battery Pack Current',
      fields: ['current'],
      colors: ['#2A9D8F'],
      axis: {
        x: { label: 'Time', tickFormat: '%H:%M:%S' },
        y: { label: 'Current (A)', tickFormat: '0.1f' }
      }
    },


    // GPS Systems
    gps_best_pos: {
      type: 'scatter',
      title: 'GPS Position',
      fields: ['latitude', 'longitude'],
      colors: ['#2A9D8F'],
      mapIntegration: true,
      axis: {
        x: { label: 'Longitude', tickFormat: '0.4f' },
        y: { label: 'Latitude', tickFormat: '0.4f' }
      }
    },

    // Thermal Systems
    thermistor: {
      type: 'line',
      title: 'Thermal Sensors',
      fieldPattern: 'therm*',
      colors: ['#E76F51', '#F4A261', '#E9C46A', '#2A9D8F', '#264653'],
      maxLines: 16,
      axis: {
        x: { label: 'Time', tickFormat: '%H:%M:%S' },
        y: { label: 'Temperature (°C)', tickFormat: '0.1f' }
      }
    },

    // Aerodynamics
    front_aero: {
      type: 'multi-axis',
      title: 'Front Aerodynamics',
      fields: {
        pressure: ['pressure1', 'pressure2', 'pressure3'],
        temperature: ['temperature1', 'temperature2', 'temperature3']
      },
      colors: ['#3A86FF', '#8338EC', '#FF006E'],
      axis: {
        x: { label: 'Time' },
        y1: { label: 'Pressure (Pa)' },
        y2: { label: 'Temp (°C)' }
      }
    },

    // Strain Gauges
    front_strain_gauges_1: {
      type: 'bar',
      title: 'Front Strain Gauges Set 1',
      fields: ['gauge1', 'gauge2', 'gauge3', 'gauge4', 'gauge5', 'gauge6'],
      colors: ['#588B8B', '#FFD5C2', '#F28F3B', '#C8553D', '#6B9080', '#A4C3B2'],
      axis: {
        x: { label: 'Measurement Time' },
        y: { label: 'Strain Value' }
      }
    },

    // Power Distribution
    pdm1: {
      type: 'combo',
      title: 'Power Distribution Module',
      fields: {
        voltage: ['pdm_batt_voltage', 'internal_rail_voltage'],
        current: ['total_current'],
        temp: ['pdm_int_temperature']
      },
      colors: ['#3A86FF', '#8338EC', '#FF006E'],
      axis: {
        x: { label: 'Time' },
        y1: { label: 'Voltage (V)' },
        y2: { label: 'Current (A)' },
        y3: { label: 'Temp (°C)' }
      }
    },

    // Add other systems following the same pattern
    ins_imu: {
      type: '3d-scatter',
      title: 'IMU Orientation',
      fields: ['roll', 'pitch', 'azimuth'],
      colors: ['#E63946'],
      axis: {
        x: { label: 'Roll' },
        y: { label: 'Pitch' },
        z: { label: 'Azimuth' }
      }
    },

    encoder: {
      type: 'line',
      title: 'Encoder Readings',
      fields: ['encoder1', 'encoder2', 'encoder3', 'encoder4'],
      colors: ['#457B9D', '#A8DADC', '#E63946', '#1D3557'],
      axis: {
        x: { label: 'Time' },
        y: { label: 'Position' }
      }
    }
  },

  historical: {
    // Battery Historical Data
    cell_history: {
      type: 'heatmap',
      title: 'Cell Voltage History',
      endpoint: '/api/cell/history',
      timeField: 'timestamp',
      valueField: 'voltage',
      colors: ['#2A9D8F', '#E9C46A', '#F4A261', '#E76F51']
    },
    pack_current_history: {
      type: 'area',
      title: 'Pack Current History',
      endpoint: '/api/pack_current/history',
      fields: ['current'],
      colors: ['#2A9D8F']
    },

    // GPS History
    gps_track: {
      type: 'map',
      title: 'Historical GPS Track',
      endpoint: '/api/gps/history',
      latField: 'latitude',
      lonField: 'longitude',
      colorScale: {
        field: 'speed',
        range: ['#457B9D', '#E63946']
      }
    },

    // Thermal History
    thermal_history: {
      type: 'area',
      title: 'Thermal System History',
      endpoint: '/api/thermal/history',
      fields: ['max_temp', 'min_temp', 'avg_temp'],
      colors: ['#E76F51', '#F4A261', '#E9C46A'],
      stack: true
    },

    // Add other historical data endpoints
    aero_history: {
      type: 'scatter',
      title: 'Aerodynamic Performance History',
      endpoint: '/api/aero/history',
      xField: 'speed',
      yField: 'pressure',
      colorField: 'temperature',
      colors: ['#3A86FF', '#8338EC', '#FF006E']
    }
  },

  // Common visual settings
  defaultStyles: {
    fontFamily: 'Roboto, sans-serif',
    colorPalettes: {
      primary: ['#2A9D8F', '#E9C46A', '#F4A261', '#E76F51', '#264653'],
      sequential: ['#457B9D', '#A8DADC', '#F1FAEE', '#E63946', '#1D3557'],
      divergent: ['#3A86FF', '#8338EC', '#FF006E']
    },
    layoutPresets: {
      singleMetric: { width: 400, height: 300 },
      mainDashboard: { width: 1200, height: 800 },
      mapView: { width: 1600, height: 900 }
    }
  }
};