import { z } from "zod";

// ----- Schemas for Each Table ----- //

const tcuSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  apps1: z.number(),
  apps2: z.number(),
  base: z.number(),
  status: z.number(),
});

const cellSchema = z
  .object({
    timestamp: z.union([z.string(), z.number()]),
  })
  .catchall(z.number())
  .transform((data) => {
    const transformed = {
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    };

    // Validate and include only Cell1-Cell128 with proper numbering
    for (const key in data) {
      if (key === "timestamp") continue;

      // Regex matches Cell1 to Cell128
      if (/^Cell(12[0-8]|1[01]\d|[1-9]\d?)$/.test(key)) {
        transformed[key] = parseFloat(data[key]) || 0;
      }
    }

    return transformed;
  });

const thermSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  thermistor_id: z.number(),
  therm1: z.number(),
  therm2: z.number(),
  therm3: z.number(),
  therm4: z.number(),
  therm5: z.number(),
  therm6: z.number(),
  therm7: z.number(),
  therm8: z.number(),
  therm9: z.number(),
  therm10: z.number(),
  therm11: z.number(),
  therm12: z.number(),
  therm13: z.number(),
  therm14: z.number(),
  therm15: z.number(),
  therm16: z.number(),
});

const bamocarSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  bamocar_frg: z.number(),
  bamocar_rfe: z.number(),
  brake_light: z.number(),
});

const bamocarTxDataSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  regid: z.number(),
  data: z.number(),
});

const bamoCarReTransmitSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  motor_temp: z.number(),
  controller_temp: z.number(),
});

const encoderSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  encoder1: z.number(),
  encoder2: z.number(),
  encoder3: z.number(),
  encoder4: z.number(),
});

const packCurrentSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  packcurrent: z.number(),
});

const packVoltageSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  packvoltage: z.number(),
});

const pdmCurrentSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  accumulator_current: z.number(),
  tcu_current: z.number(),
  bamocar_current: z.number(),
  pumps_current: z.number(),
  tsal_current: z.number(),
  daq_current: z.number(),
  display_kvaser_current: z.number(),
  shutdown_reset_current: z.number(),
});

const pdmReTransmitSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  pdm_int_temperature: z.number(),
  pdm_batt_voltage: z.number(),
  global_error_flag: z.number(),
  total_current: z.number(),
  internal_rail_voltage: z.number(),
  reset_source: z.number(),
});

const insGPSSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  gnss_week: z.number(),
  gnss_seconds: z.number(),
  gnss_lat: z.number(),
  gnss_long: z.number(),
  gnss_height: z.number(),
});

const insIMUSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  north_vel: z.number(),
  east_vel: z.number(),
  up_vel: z.number(),
  roll: z.number(),
  pitch: z.number(),
  azimuth: z.number(),
  status: z.number(),
});

const frontFrequencySchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  rear_right: z.number(),
  front_right: z.number(),
  rear_left: z.number(),
  front_left: z.number(),
});

const frontStrainGauges1Schema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  gauge1: z.number(),
  gauge2: z.number(),
  gauge3: z.number(),
  gauge4: z.number(),
  gauge5: z.number(),
  gauge6: z.number(),
});

const frontStrainGauges2Schema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  gauge1: z.number(),
  gauge2: z.number(),
  gauge3: z.number(),
  gauge4: z.number(),
  gauge5: z.number(),
  gauge6: z.number(),
});

const frontAnalogSchema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  left_rad: z.number(),
  right_rad: z.number(),
  front_right_pot: z.number(),
  front_left_pot: z.number(),
  rear_right_pot: z.number(),
  rear_left_pot: z.number(),
  steering_angle: z.number(),
  analog8: z.number(),
});

const aculvFd1Schema = z.object({
  timestamp: z.union([z.string(), z.number()]),
  ams_status: z.number(),
  fld: z.number(),
  state_of_charge: z.number(),
  accumulator_voltage: z.number(),
  tractive_voltage: z.number(),
  cell_current: z.number(),
  isolation_monitoring: z.number(),
  isolation_monitoring1: z.number(),
});

export const mappingConfig = {
  tcuData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: tcuSchema,
    version: "1.0",
  },
  cellData: {
    transform: (data) => ({
      ...Object.fromEntries(
        Object.entries(data).map(([k, v]) => [
          k.replace(/cell/i, "Cell"), // Normalize key case
          v,
        ])
      ),
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: cellSchema,
    version: "1.0",
  },
  thermData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: thermSchema,
    version: "1.0",
  },
  bamocarData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: bamocarSchema,
    version: "1.0",
  },
  bamocarTxData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: bamocarTxDataSchema,
    version: "1.0",
  },
  bamoCarReTransmitData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: bamoCarReTransmitSchema,
    version: "1.0",
  },
  encoderData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: encoderSchema,
    version: "1.0",
  },
  packCurrentData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: packCurrentSchema,
    version: "1.0",
  },
  packVoltageData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: packVoltageSchema,
    version: "1.0",
  },
  pdmCurrentData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: pdmCurrentSchema,
    version: "1.0",
  },
  pdmReTransmitData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: pdmReTransmitSchema,
    version: "1.0",
  },
  insGPSData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: insGPSSchema,
    version: "1.0",
  },
  insIMUData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: insIMUSchema,
    version: "1.0",
  },
  frontFrequencyData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: frontFrequencySchema,
    version: "1.0",
  },
  frontStrainGauges1Data: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: frontStrainGauges1Schema,
    version: "1.0",
  },
  frontStrainGauges2Data: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: frontStrainGauges2Schema,
    version: "1.0",
  },
  frontAnalogData: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: frontAnalogSchema,
    version: "1.0",
  },
  aculvFd1Data: {
    transform: (data) => ({
      ...data,
      timestamp:
        typeof data.timestamp === "number"
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
    }),
    schema: aculvFd1Schema,
    version: "1.0",
  },
};
