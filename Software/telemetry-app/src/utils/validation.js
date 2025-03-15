import { z } from 'zod';

export const TelemetryMessageSchema = z.object({
  type: z.string(),
  payload: z.object({
    fields: z.record(z.any())
  }),
  time: z.string()
});
