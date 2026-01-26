import { z } from 'zod';

// Common validators
const uuid = z.string().uuid();
const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// Allocation schemas
export const CreateAllocationSchema = z.object({
  user_id: uuid,
  project_id: uuid,
  phase_id: uuid.optional().nullable(),
  hours: z.number().min(0).max(168),
  week_start: dateString,
  is_billable: z.boolean().default(true),
  notes: z.string().max(500).optional().nullable(),
});

export const UpdateAllocationSchema = CreateAllocationSchema.partial();

// Project schemas
export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  client_id: uuid.optional().nullable(),
  status: z.enum(['active', 'archived', 'on_hold']).default('active'),
  budget_hours: z.number().min(0).optional().nullable(),
  start_date: dateString.optional().nullable(),
  end_date: dateString.optional().nullable(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

// Time entry schemas
export const CreateTimeEntrySchema = z.object({
  project_id: uuid,
  phase_id: uuid.optional().nullable(),
  hours: z.number().min(0).max(24),
  date: dateString,
  notes: z.string().max(1000).optional().nullable(),
  is_billable: z.boolean().default(true),
});

// Voice command schema
export const VoiceCommandSchema = z.object({
  text: z.string().min(1).max(1000),
  context: z.record(z.string(), z.unknown()).optional(),
});

// Validation helper
export function validate<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}
