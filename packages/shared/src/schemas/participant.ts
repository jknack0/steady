import { z } from "zod";

export const ParticipantSearchQuerySchema = z.object({
  q: z.string().min(2, "Query must be at least 2 characters").max(200),
});

export const CreateParticipantSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email().max(200),
});

export type ParticipantSearchQuery = z.infer<typeof ParticipantSearchQuerySchema>;
export type CreateParticipantInput = z.infer<typeof CreateParticipantSchema>;
