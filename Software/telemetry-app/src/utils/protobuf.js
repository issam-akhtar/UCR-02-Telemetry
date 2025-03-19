import protobuf from 'protobufjs';

// Memoization to prevent repeated loading
let cachedRoot = null;

export const loadTelemetryProto = async () => {
  // Return cached root if already loaded
  if (cachedRoot) return cachedRoot;

  try {
    // Load struct.proto from the public folder
    const root = await protobuf.load('/proto/google/protobuf/struct.proto');
    
    // Then load telemetry.proto from the public folder
    await root.load('/proto/telemetry.proto');
    
    // Cache the loaded root for subsequent calls
    cachedRoot = root;
    
    return root;
  } catch (error) {
    console.error("Proto loading failed:", error);
    
    // Reset cached root on failure
    cachedRoot = null;
    
    throw error;
  }
};

export const decodeTelemetryMessage = (protoRoot, buffer) => {
  // Optimize type lookup
  const TelemetryMessage = protoRoot.lookupType("telemetry.TelemetryMessage");
  
  // Decode message with minimal configuration
  const message = TelemetryMessage.decode(buffer);
  
  return TelemetryMessage.toObject(message, {
    longs: String,
    enums: String,
    bytes: String,
    defaults: false,  // Slightly more performant
    json: true,
  });
};

// Optional: Add method to clear cached root if needed
export const clearCachedProto = () => {
  cachedRoot = null;
};