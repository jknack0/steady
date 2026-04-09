import { z } from "zod";

export const AddClientSchema = z.object({
  email: z.string().email().max(200),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
});
export type AddClientInput = z.infer<typeof AddClientSchema>;

export const PushTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  dueDate: z.string().max(100).optional().nullable(),
});
export type PushTaskInput = z.infer<typeof PushTaskSchema>;

export const UnlockModuleSchema = z.object({
  moduleId: z.string().min(1).max(200),
  enrollmentId: z.string().min(1).max(200),
});
export type UnlockModuleInput = z.infer<typeof UnlockModuleSchema>;

export const ManageEnrollmentSchema = z.object({
  action: z.enum(["pause", "resume", "drop", "reset-progress"]),
});
export type ManageEnrollmentInput = z.infer<typeof ManageEnrollmentSchema>;

export const BulkActionSchema = z.object({
  action: z.string().min(1).max(100),
  participantIds: z.array(z.string().max(200)).min(1).max(50),
  data: z.record(z.unknown()).optional(),
});
export type BulkActionInput = z.infer<typeof BulkActionSchema>;
