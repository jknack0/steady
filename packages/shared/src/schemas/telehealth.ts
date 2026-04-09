import { z } from "zod";

// ── Enums ──────────────────────────────────────────────

export const TelehealthSessionStatusEnum = z.enum([
  "WAITING",
  "ACTIVE",
  "ENDED",
]);

// ── POST /api/telehealth/token ─────────────────────────

export const CreateTelehealthTokenSchema = z.object({
  appointmentId: z.string().min(1, "Appointment ID is required").max(200),
});

// ── Response shape (type export, not used for validation) ─

export const TelehealthTokenResponseSchema = z.object({
  token: z.string(),
  url: z.string().max(500),
  roomName: z.string().max(200),
});

// ── PATCH /api/telehealth/:appointmentId/transcript/speakers ──

export const UpdateSpeakerMapSchema = z.object({
  speakerMap: z.record(z.string().max(50)),
});

// ── Transcript status enum ────────────────────────────

export const TranscriptStatusEnum = z.enum([
  "NONE",
  "RECORDING",
  "PENDING",
  "TRANSCRIBING",
  "COMPLETED",
  "FAILED",
]);

// ── Type exports ───────────────────────────────────────

export type TelehealthSessionStatus = z.infer<typeof TelehealthSessionStatusEnum>;
export type CreateTelehealthTokenInput = z.infer<typeof CreateTelehealthTokenSchema>;
export type TelehealthTokenResponse = z.infer<typeof TelehealthTokenResponseSchema>;
export type UpdateSpeakerMapInput = z.infer<typeof UpdateSpeakerMapSchema>;
export type TranscriptStatus = z.infer<typeof TranscriptStatusEnum>;
