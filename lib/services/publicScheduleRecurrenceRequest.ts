import { z } from 'zod';
import { RECURRENCE_API_BATCH_LIMIT } from '@/lib/services/publicScheduleRecurrence';

// Server-only (pulls in zod); the client-safe limit stays in
// publicScheduleRecurrence.ts so client bundles never import this module.
export const publicScheduleRecurrencesRequestSchema = z.object({
  truckIds: z.array(z.string().uuid()).max(RECURRENCE_API_BATCH_LIMIT),
  fromDate: z.string().date(),
  toDate: z.string().date(),
  overridesToDate: z.string().date().optional(),
});
