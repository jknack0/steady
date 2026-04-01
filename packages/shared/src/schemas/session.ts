import { z } from "zod";

export const CreateSessionSchema = z.object({
  enrollmentId: z.string().min(1, "Enrollment is required"),
  scheduledAt: z.string().min(1, "Scheduled time is required"),
  videoCallUrl: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(5).max(480).optional(),
});

export const UpdateSessionSchema = z.object({
  scheduledAt: z.string().optional(),
  status: z.enum(["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"]).optional(),
  videoCallUrl: z.string().max(500).nullable().optional(),
  clinicianNotes: z.string().max(50000).nullable().optional(),
  participantSummary: z.string().max(50000).nullable().optional(),
});

export const CompleteSessionSchema = z.object({
  clinicianNotes: z.string().max(50000).optional(),
  participantSummary: z.string().max(50000).optional(),
  moduleCompletedId: z.string().optional(),
  tasksToAssign: z.array(z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    dueDate: z.string().optional(),
  })).optional(),
});

export const AssignHomeworkSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  content: z.any(), // JSON content — validated by type
  dueDate: z.string().optional(),
});

export const CreateJournalEntrySchema = z.object({
  entryDate: z.string().min(1, "Entry date is required"),
  freeformContent: z.string().max(50000).nullable().optional(),
  responses: z.any().optional(), // JSON
  regulationScore: z.number().int().min(1).max(10).nullable().optional(),
  isSharedWithClinician: z.boolean().optional(),
  promptPartId: z.string().optional(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;
export type UpdateSessionInput = z.infer<typeof UpdateSessionSchema>;
export type CompleteSessionInput = z.infer<typeof CompleteSessionSchema>;
export type AssignHomeworkInput = z.infer<typeof AssignHomeworkSchema>;
export type CreateJournalEntryInput = z.infer<typeof CreateJournalEntrySchema>;
