const z = require('zod');

// Predefined message types for faster enum checking
const MESSAGE_TYPES = Object.freeze([
  'system', 
  'network', 
  'performance', 
  'custom'
]);

// Optimized schema with performance considerations
const TelemetryMessageSchema = z.object({
  // Lightweight type checking
  type: z.string().refine(
    (val) => MESSAGE_TYPES.includes(val),
    { message: 'Invalid message type' }
  ),

  // More efficient payload structure
  payload: z.object({
    // Performance-optimized field validation
    fields: z.record(
      z.union([
        z.string(),
        z.number(),
        z.boolean(),
        z.null()
      ])
    )
  }),

  // Simplified time validation
  time: z.string().refine(
    (val) => {
      // Quick ISO 8601 date validation
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}[+-]\d{2}:\d{2}$/;
      return dateRegex.test(val);
    },
    { message: 'Invalid timestamp format' }
  )
});

/**
 * Validate telemetry message with minimal overhead
 * @param {Object} message - The telemetry message to validate
 * @returns {Object} Validation result
 */
function validateTelemetryMessage(message) {
  try {
    // Perform fast initial type checks
    if (typeof message !== 'object' || message === null) {
      return { 
        success: false, 
        error: 'Message must be an object' 
      };
    }

    // Use safeParse for lightweight validation
    const result = TelemetryMessageSchema.safeParse(message);
    
    if (result.success) {
      return { 
        success: true, 
        data: result.data 
      };
    }
    
    // Efficient error handling
    return { 
      success: false, 
      error: result.error.errors
        .map(err => err.message)
        .join(', ')
    };
  } catch (error) {
    // Minimal error logging
    return {
      success: false,
      error: error.message || 'Validation failed'
    };
  }
}

// Memoization with minimal overhead
const createMemoizedSchema = () => {
  let cachedSchema = null;
  
  return () => {
    if (!cachedSchema) {
      cachedSchema = TelemetryMessageSchema;
    }
    return cachedSchema;
  };
};

const getMemoizedSchema = createMemoizedSchema();

// Performance profiling (optional, can be removed in production)
function profileValidation(iterations = 1000) {
  const testMessage = {
    type: 'system',
    payload: {
      fields: {
        cpu: 75.5,
        memory: 4096,
        status: true
      }
    },
    time: new Date().toISOString()
  };

  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    validateTelemetryMessage(testMessage);
  }
  
  const end = performance.now();
  console.log(`Validation performance: ${end - start}ms for ${iterations} iterations`);
}

module.exports = {
  TelemetryMessageSchema,
  validateTelemetryMessage,
  getMemoizedSchema,
  profileValidation
};