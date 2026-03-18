import { z } from "zod";

export const CadenceEnum = z.enum(["WEEKLY", "BIWEEKLY", "SELF_PACED"]);
export const EnrollmentMethodEnum = z.enum(["INVITE", "LINK", "CODE"]);
export const SessionTypeEnum = z.enum(["ONE_ON_ONE", "GROUP", "SELF_PACED"]);
export const ProgramStatusEnum = z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]);

export const CreateProgramSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(2000).optional(),
  cadence: CadenceEnum.optional().default("WEEKLY"),
  enrollmentMethod: EnrollmentMethodEnum.optional().default("INVITE"),
  sessionType: SessionTypeEnum.optional().default("ONE_ON_ONE"),
});

export const UpdateProgramSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  cadence: CadenceEnum.optional(),
  enrollmentMethod: EnrollmentMethodEnum.optional(),
  sessionType: SessionTypeEnum.optional(),
  followUpCount: z.number().int().min(0).optional(),
  status: ProgramStatusEnum.optional(),
});

export type CreateProgramInput = z.input<typeof CreateProgramSchema>;
export type UpdateProgramInput = z.infer<typeof UpdateProgramSchema>;
