import { z } from "zod";
import { AppointmentTypeEnum } from "./appointment";

export const RecurrenceRuleEnum = z.enum(["WEEKLY", "BIWEEKLY", "MONTHLY"]);

const HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const CreateSeriesSchema = z
  .object({
    participantId: z.string().min(1).max(200),
    serviceCodeId: z.string().min(1).max(200),
    locationId: z.string().min(1).max(200),
    recurrenceRule: RecurrenceRuleEnum,
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z
      .string()
      .max(5)
      .regex(HH_MM_REGEX, "Must be in HH:mm format (e.g. 14:00)"),
    endTime: z
      .string()
      .max(5)
      .regex(HH_MM_REGEX, "Must be in HH:mm format (e.g. 14:45)"),
    seriesStartDate: z.string().datetime(),
    seriesEndDate: z.string().datetime().optional(),
    appointmentType: AppointmentTypeEnum.optional().default("INDIVIDUAL"),
    internalNote: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    // endTime must be after startTime
    if (data.endTime <= data.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "endTime must be after startTime",
      });
    }
    // GROUP not supported
    if (data.appointmentType === "GROUP") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appointmentType"],
        message: "Group appointments are not yet supported",
      });
    }
  });

export const UpdateSeriesSchema = z
  .object({
    startTime: z
      .string()
      .max(5)
      .regex(HH_MM_REGEX, "Must be in HH:mm format")
      .optional(),
    endTime: z
      .string()
      .max(5)
      .regex(HH_MM_REGEX, "Must be in HH:mm format")
      .optional(),
    locationId: z.string().min(1).max(200).optional(),
    serviceCodeId: z.string().min(1).max(200).optional(),
    seriesEndDate: z.string().datetime().nullable().optional(),
    appointmentType: AppointmentTypeEnum.optional(),
    internalNote: z.string().max(500).nullable().optional(),
    recurrenceRule: RecurrenceRuleEnum.optional(),
    dayOfWeek: z.number().int().min(0).max(6).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startTime && data.endTime) {
      if (data.endTime <= data.startTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endTime"],
          message: "endTime must be after startTime",
        });
      }
    }
    if (data.appointmentType === "GROUP") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appointmentType"],
        message: "Group appointments are not yet supported",
      });
    }
  });

export const ListSeriesQuerySchema = z.object({
  participantId: z.string().max(200).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export type RecurrenceRule = z.infer<typeof RecurrenceRuleEnum>;
export type CreateSeriesInput = z.infer<typeof CreateSeriesSchema>;
export type UpdateSeriesInput = z.infer<typeof UpdateSeriesSchema>;
export type ListSeriesQuery = z.infer<typeof ListSeriesQuerySchema>;
