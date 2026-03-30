import { z } from "zod";

export const UnlockRuleEnum = z.enum(["SEQUENTIAL", "MANUAL", "TIME_BASED"]);

export const CreateModuleSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  summary: z.string().max(2000).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  unlockRule: UnlockRuleEnum.optional().default("SEQUENTIAL"),
});

export const UpdateModuleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(2000).optional(),
  estimatedMinutes: z.number().int().min(1).optional(),
  unlockRule: UnlockRuleEnum.optional(),
});

export const ReorderModulesSchema = z.object({
  moduleIds: z.array(z.string()).min(1),
});

export type CreateModuleInput = z.input<typeof CreateModuleSchema>;
export type UpdateModuleInput = z.infer<typeof UpdateModuleSchema>;
export type ReorderModulesInput = z.infer<typeof ReorderModulesSchema>;
