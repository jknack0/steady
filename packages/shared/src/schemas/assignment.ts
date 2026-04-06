import { z } from "zod";

export const AssignProgramSchema = z.object({
  participantId: z.string().min(1, "Participant ID is required"),
  title: z.string().min(1).max(200).optional(),
  excludedModuleIds: z.array(z.string()).default([]),
  excludedPartIds: z.array(z.string()).default([]),
});

export const AppendModulesSchema = z.object({
  clientProgramId: z.string().min(1, "Client program ID is required"),
  excludedModuleIds: z.array(z.string()).default([]),
  excludedPartIds: z.array(z.string()).default([]),
});

export type AssignProgramInput = z.infer<typeof AssignProgramSchema>;
export type AppendModulesInput = z.infer<typeof AppendModulesSchema>;
