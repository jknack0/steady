import { z } from "zod";

export const CreateEnrollmentSchema = z.object({
  participantEmail: z.string().email("Invalid email address"),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
});

export const UpdateEnrollmentSchema = z.object({
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "DROPPED"]),
});

export type CreateEnrollmentInput = z.infer<typeof CreateEnrollmentSchema>;
export type UpdateEnrollmentInput = z.infer<typeof UpdateEnrollmentSchema>;
