// src/utils/protobuf.js
import protobuf from 'protobufjs';

export const loadTelemetryProto = async () => {
  try {
    // Load struct.proto from the public folder
    const root = await protobuf.load('/proto/google/protobuf/struct.proto');
    // Then load telemetry.proto from the public folder
    await root.load('/proto/telemetry.proto');
    return root;
  } catch (error) {
    console.error("Proto loading failed:", error);
    throw error;
  }
};

export const decodeTelemetryMessage = (protoRoot, buffer) => {
  const TelemetryMessage = protoRoot.lookupType("telemetry.TelemetryMessage");
  const message = TelemetryMessage.decode(buffer);
  return TelemetryMessage.toObject(message, {
    longs: String,
    enums: String,
    bytes: String,
    defaults: true,
    json: true,
  });
};
