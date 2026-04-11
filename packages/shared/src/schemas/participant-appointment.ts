import { z } from "zod";

// ── Participant-scoped appointments — used by the client web portal ─
// Extends routes/participant-portal.ts with a new GET endpoint that returns
// the participant's appointments across ALL clinicians (no practice scope).
// See FR-6 and AC-6.* for the full acceptance criteria.

// Mirror of the Prisma AppointmentStatus enum.
export const PARTICIPANT_VISIBLE_APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "ATTENDED",
  "CLIENT_CANCELED",
  "CLINICIAN_CANCELED",
  "LATE_CANCELED",
  // NO_SHOW is intentionally excluded from the participant view
] as const;

export const ParticipantAppointmentListQuerySchema = z.object({
  from: z.string().datetime({ offset: true }).or(z.string().date()),
  to: z.string().datetime({ offset: true }).or(z.string().date()),
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
export type ParticipantAppointmentListQuery = z.infer<
  typeof ParticipantAppointmentListQuerySchema
>;

export const ParticipantAppointmentViewSchema = z.object({
  id: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  status: z.enum(PARTICIPANT_VISIBLE_APPOINTMENT_STATUSES),
  appointmentType: z.string().nullable(),
  cancelReason: z.string().nullable(),
  clinician: z.object({
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
    timezone: z.string().nullable(),
  }),
  location: z
    .object({
      name: z.string().nullable(),
      type: z.string().nullable(),
    })
    .nullable(),
  isJoinable: z.boolean(),
});
export type ParticipantAppointmentView = z.infer<
  typeof ParticipantAppointmentViewSchema
>;

// ── Participant profile timezone patch ───────────────────────────────

export const ParticipantProfileTimezonePatchSchema = z.object({
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .max(100)
    // Lightweight validation — IANA zones look like "America/New_York"
    .regex(/^[A-Za-z]+(\/[A-Za-z_+\-0-9]+)+$/, "Invalid timezone"),
});
export type ParticipantProfileTimezonePatch = z.infer<
  typeof ParticipantProfileTimezonePatchSchema
>;

// ── Telehealth event logging (AC-7.10, COND-7) ───────────────────────

export const ParticipantTelehealthEventSchema = z.object({
  appointmentId: z.string().cuid(),
  event: z.enum(["connected", "disconnected"]),
});
export type ParticipantTelehealthEvent = z.infer<
  typeof ParticipantTelehealthEventSchema
>;
