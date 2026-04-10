import { z } from "zod";

// ── Portal Invitation — new token-based client web portal invites ──────
// Replaces the legacy code-based PatientInvitation system (FR-12).
// Tokens are 48-byte opaque strings, SHA-256 hashed at rest.
// Emails are bound to the invitation at creation and verified on redemption.

export const PORTAL_INVITATION_STATUSES = [
  "PENDING",
  "SENT",
  "ACCEPTED",
  "BOUNCED",
  "COMPLAINED",
  "SEND_FAILED",
  "EXPIRED",
  "REVOKED",
] as const;

export const PortalInvitationStatusSchema = z.enum(PORTAL_INVITATION_STATUSES);
export type PortalInvitationStatus = z.infer<typeof PortalInvitationStatusSchema>;

// ── Create invitation (clinician action) ─────────────────────────────

export const CreatePortalInvitationSchema = z.object({
  recipientEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("A valid email address is required")
    .max(255, "Email is too long"),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  existingClientId: z.string().cuid().optional(),
});
export type CreatePortalInvitationInput = z.infer<
  typeof CreatePortalInvitationSchema
>;

// ── Redeem invitation (public, rate-limited) ─────────────────────────

export const RedeemPortalInvitationSchema = z.object({
  token: z
    .string()
    .trim()
    .min(43, "Invalid invitation link")
    .max(128, "Invalid invitation link"),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("A valid email address is required")
    .max(255),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(256, "Password is too long"),
});
export type RedeemPortalInvitationInput = z.infer<
  typeof RedeemPortalInvitationSchema
>;

// ── Public status lookup (no auth) ───────────────────────────────────

export const PortalInvitationStatusQuerySchema = z.object({
  token: z.string().trim().min(43).max(128),
});

// Public status response — leaks nothing beyond what the user needs to see.
export const PortalInvitationStatusViewSchema = z.object({
  status: z.enum(["VALID", "EXPIRED", "USED", "REVOKED", "INVALID"]),
  existingUser: z.boolean().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
});
export type PortalInvitationStatusView = z.infer<
  typeof PortalInvitationStatusViewSchema
>;

// ── Clinician-facing view (authenticated) ────────────────────────────

export const PortalInvitationViewSchema = z.object({
  id: z.string(),
  status: PortalInvitationStatusSchema,
  recipientEmail: z.string().email(),
  existingUser: z.boolean(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  expiresAt: z.string().datetime(),
  sendCount: z.number().int().nonnegative(),
  lastSentAt: z.string().datetime().nullable(),
  acceptedAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  bounceType: z.string().nullable(),
  bouncedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type PortalInvitationView = z.infer<typeof PortalInvitationViewSchema>;

export const PortalInvitationListQuerySchema = z.object({
  cursor: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  status: PortalInvitationStatusSchema.optional(),
});
