import { z } from "zod";

export const OverrideTypeEnum = z.enum([
  "HIDE_HOMEWORK_ITEM",
  "ADD_HOMEWORK_ITEM",
  "ADD_RESOURCE",
  "CLINICIAN_NOTE",
]);

export const CreateOverrideSchema = z
  .object({
    overrideType: OverrideTypeEnum,
    moduleId: z.string().max(200).optional(),
    targetPartId: z.string().max(200).optional(),
    payload: z.object({
      title: z.string().max(200).optional(),
      url: z.string().max(2000).optional(),
      description: z.string().max(2000).optional(),
      content: z.string().max(5000).optional(),
      itemType: z.string().max(100).optional(),
    }),
  })
  .superRefine((data, ctx) => {
    if (data.overrideType === "HIDE_HOMEWORK_ITEM" && !data.targetPartId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["targetPartId"],
        message: "targetPartId required for HIDE_HOMEWORK_ITEM",
      });
    }
    if (
      ["ADD_RESOURCE", "CLINICIAN_NOTE", "ADD_HOMEWORK_ITEM"].includes(data.overrideType) &&
      !data.moduleId
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["moduleId"],
        message: "moduleId required for this override type",
      });
    }
    if (data.overrideType === "ADD_RESOURCE") {
      if (!data.payload.title) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payload", "title"],
          message: "title required for ADD_RESOURCE",
        });
      }
      if (!data.payload.url) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["payload", "url"],
          message: "url required for ADD_RESOURCE",
        });
      }
    }
    if (data.overrideType === "CLINICIAN_NOTE" && !data.payload.content) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payload", "content"],
        message: "content required for CLINICIAN_NOTE",
      });
    }
    if (data.overrideType === "ADD_HOMEWORK_ITEM" && !data.payload.title) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payload", "title"],
        message: "title required for ADD_HOMEWORK_ITEM",
      });
    }
  });

export type CreateOverrideInput = z.infer<typeof CreateOverrideSchema>;
export type OverrideType = z.infer<typeof OverrideTypeEnum>;
