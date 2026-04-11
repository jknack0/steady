import { z } from "zod";

export const CreatePracticeSchema = z.object({
  name: z.string().min(1).max(200),
});
export type CreatePracticeInput = z.infer<typeof CreatePracticeSchema>;

export const UpdatePracticeSchema = z.object({
  name: z.string().min(1).max(200),
});
export type UpdatePracticeInput = z.infer<typeof UpdatePracticeSchema>;

export const InviteToPracticeSchema = z.object({
  email: z.string().email().max(200),
});
export type InviteToPracticeInput = z.infer<typeof InviteToPracticeSchema>;
