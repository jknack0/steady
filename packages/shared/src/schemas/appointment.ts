import { z } from "zod";

export const AppointmentStatusEnum = z.enum([
  "SCHEDULED",
  "ATTENDED",
  "NO_SHOW",
  "LATE_CANCELED",
  "CLIENT_CANCELED",
  "CLINICIAN_CANCELED",
]);

export const AppointmentTypeEnum = z.enum(["INDIVIDUAL", "COUPLE", "GROUP"]);

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 62;

export const CreateAppointmentSchema = z
  .object({
    participantId: z.string().min(1).max(200),
    serviceCodeId: z.string().min(1).max(200),
    locationId: z.string().min(1).max(200),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    appointmentType: AppointmentTypeEnum.optional().default("INDIVIDUAL"),
    internalNote: z.string().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (new Date(data.endAt) <= new Date(data.startAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "endAt must be after startAt",
      });
    }
    if (data.appointmentType === "GROUP") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["appointmentType"],
        message: "Group appointments are not yet supported",
      });
    }
  });

export const UpdateAppointmentSchema = z
  .object({
    startAt: z.string().datetime().optional(),
    endAt: z.string().datetime().optional(),
    serviceCodeId: z.string().min(1).max(200).optional(),
    locationId: z.string().min(1).max(200).optional(),
    internalNote: z.string().max(500).nullable().optional(),
    appointmentType: AppointmentTypeEnum.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.startAt && data.endAt) {
      if (new Date(data.endAt) <= new Date(data.startAt)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["endAt"],
          message: "endAt must be after startAt",
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

export const StatusChangeSchema = z.object({
  status: AppointmentStatusEnum,
  cancelReason: z.string().max(500).optional(),
});

export const ListAppointmentsQuerySchema = z
  .object({
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    cursor: z.string().max(200).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    locationId: z.string().max(200).optional(),
    status: z.string().max(200).optional(),
    clinicianId: z.string().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.startAt).getTime();
    const end = new Date(data.endAt).getTime();
    if (isNaN(start) || isNaN(end)) return;
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "endAt must be after startAt",
      });
      return;
    }
    if (end - start > MAX_RANGE_DAYS * MS_PER_DAY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endAt"],
        message: "Date range cannot exceed 62 days",
      });
    }
  });

export type CreateAppointmentInput = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof UpdateAppointmentSchema>;
export type StatusChangeInput = z.infer<typeof StatusChangeSchema>;
export type ListAppointmentsQuery = z.infer<typeof ListAppointmentsQuerySchema>;
export type AppointmentStatus = z.infer<typeof AppointmentStatusEnum>;
export type AppointmentType = z.infer<typeof AppointmentTypeEnum>;
