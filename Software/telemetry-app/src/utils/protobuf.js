import { z } from 'zod';
import protobuf from 'protobufjs';

export const TelemetryMessageSchema = z.object({
  type: z.string(),
  payload: z.object({
    fields: z.record(z.any())
  }),
  time: z.string()
});

export const loadTelemetryProto = async () => {
  try {
    const root = await protobuf.load('/proto/google/protobuf/struct.proto');
    await root.load('/proto/telemetry.proto');
    return root;
  } catch (error) {
    console.error("Proto loading failed:", error);
    throw error;
  }
};

export const decodeTelemetryMessage = (root, buffer) => {
  const TelemetryMessage = root.lookupType("telemetry.TelemetryMessage");
  const message = TelemetryMessage.decode(buffer);
  return TelemetryMessage.toObject(message, {
    longs: String,
    enums: String,
    bytes: String,
    defaults: true,
    json: true,
  });
};
