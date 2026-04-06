import { z } from "zod";

// ── Enums ──────────────────────────────────────────────

export const ReminderTypeEnum = z.enum(["EMAIL", "PUSH", "SMS"]);
export type ReminderType = z.infer<typeof ReminderTypeEnum>;

export const ReminderStatusEnum = z.enum(["PENDING", "SENT", "FAILED", "CANCELED"]);
export type ReminderStatus = z.infer<typeof ReminderStatusEnum>;

// ── Reminder Settings (stored in ClinicianConfig.reminderSettings) ──

export const ReminderSettingsSchema = z.object({
  enableReminders: z.boolean(),
  reminderTimes: z
    .array(z.number().int().min(5).max(10080))
    .min(1, "At least one reminder time is required")
    .max(5, "Maximum 5 reminder times"),
});
export type ReminderSettings = z.infer<typeof ReminderSettingsSchema>;

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enableReminders: true,
  reminderTimes: [1440, 60], // 24 hours, 1 hour
};

// ── PUT /api/config/reminders ──

export const UpdateReminderSettingsSchema = ReminderSettingsSchema;
export type UpdateReminderSettingsInput = z.infer<typeof UpdateReminderSettingsSchema>;

// ── Participant cancel appointment ──

export const ParticipantCancelAppointmentSchema = z.object({
  cancelReason: z.string().max(500).optional(),
});
export type ParticipantCancelAppointmentInput = z.infer<typeof ParticipantCancelAppointmentSchema>;

// ── Participant invoice list query ──

export const ParticipantInvoiceListQuerySchema = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});
export type ParticipantInvoiceListQuery = z.infer<typeof ParticipantInvoiceListQuerySchema>;
