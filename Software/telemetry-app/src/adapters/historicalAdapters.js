// src/adapters/historicalAdapters.js
import { mappingConfig } from "./mappingConfig.js";
export const adaptHistoricalData = (endpoint, rawData) => {
  const config = mappingConfig[endpoint];
  if (!config) {
    console.warn(`No mapping configuration found for endpoint "${endpoint}"`);
    return rawData;
  }

  const adapted = rawData.map((item) => {
    // Normalize cell data keys
    if (endpoint === "cellData") {
      const normalized = { timestamp: item.timestamp };
      for (const key in item) {
        if (/^cell\d+$/i.test(key)) {
          const normalizedKey = key.replace(/cell/i, "Cell");
          normalized[normalizedKey] = item[key];
        } else if (key !== "timestamp") {
          normalized[key] = item[key];
        }
      }
      item = normalized;
    }

    if (item.version && config.version && item.version !== config.version) {
      console.warn(
        `Version mismatch for "${endpoint}": expected ${config.version}, got ${item.version}`
      );
    }

    let transformed = config.transform ? config.transform(item) : item;

    if (config.schema) {
      const result = config.schema.safeParse(transformed);
      if (!result.success) {
        console.error(
          `Schema validation failed for "${endpoint}":`,
          result.error
        );
      }
      transformed = result.success ? result.data : transformed;
    } else {
      const result = normalizedDataSchema.safeParse(transformed);
      if (!result.success) {
        console.error(
          `Generic schema validation failed for "${endpoint}":`,
          result.error
        );
      }
    }
    return transformed;
  });
  return adapted;
};
