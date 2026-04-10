import crypto from "crypto";
import { prisma } from "@steady/db";
import type {
  PortalInvitation,
  PortalInvitationStatus,
} from "@prisma/client";
import { logger } from "../lib/logger";
import {
  PORTAL_BASE_URL,
  PORTAL_INVITE_TTL_DAYS,
  SES_FROM_ADDRESS,
} from "../lib/env";
import {
  isEmailSuppressed,
  sendEmail,
  renderPortalInviteEmail,
} from "./email";
import { isCircuitOpen, recordSend } from "./ses-circuit-breaker";
import { ConflictError, NotFoundError } from "./clinician";

// ── Custom error types ─────────────────────────────────────────────

export class InvitationExpiredError extends Error {
  code = "InvitationExpired";
  constructor() {
    super("This invitation has expired");
    this.name = "InvitationExpiredError";
  }
}

export class InvitationUsedError extends Error {
  code = "InvitationAlreadyUsed";
  constructor() {
    super("This invitation has already been used");
    this.name = "InvitationUsedError";
  }
}

export class InvitationRevokedError extends Error {
  code = "InvitationRevoked";
  constructor() {
    super("This invitation is no longer valid");
    this.name = "InvitationRevokedError";
  }
}

export class InvitationBindingMismatchError extends Error {
  code = "BindingMismatch";
  constructor() {
    super("The email you entered doesn't match the invitation");
    this.name = "InvitationBindingMismatchError";
  }
}

export class InvitationNoLongerValidError extends Error {
  code = "InvitationNoLongerValid";
  constructor() {
    super("This invitation is no longer valid");
    this.name = "InvitationNoLongerValidError";
  }
}

// ── Canonicalization + hashing ─────────────────────────────────────
// NFR-2.7: canonicalize emails consistently EVERYWHERE.

export function canonicalEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function hashEmail(email: string): string {
  return crypto
    .createHash("sha256")
    .update(canonicalEmail(email))
    .digest("hex");
}

export function hashToken(plaintextToken: string): string {
  return crypto.createHash("sha256").update(plaintextToken).digest("hex");
}

function generatePortalToken(): string {
  // 48 bytes = 384 bits of entropy (NFR-2.3)
  return crypto.randomBytes(48).toString("base64url");
}

// ── Serializer ─────────────────────────────────────────────────────
// COND-5: explicit select. Never returns raw token (NFR-2.4 / AC-1.8).

export function toPortalInvitationView(inv: PortalInvitation) {
  return {
    id: inv.id,
    status: inv.status,
    recipientEmail: inv.recipientEmail,
    existingUser: inv.existingUser,
    firstName: inv.firstName,
    lastName: inv.lastName,
    expiresAt: inv.expiresAt.toISOString(),
    sendCount: inv.sendCount,
    lastSentAt: inv.lastSentAt ? inv.lastSentAt.toISOString() : null,
    acceptedAt: inv.acceptedAt ? inv.acceptedAt.toISOString() : null,
    revokedAt: inv.revokedAt ? inv.revokedAt.toISOString() : null,
    bounceType: inv.bounceType,
    bouncedAt: inv.bouncedAt ? inv.bouncedAt.toISOString() : null,
    createdAt: inv.createdAt.toISOString(),
  };
}

// ── Create invitation (FR-1) ───────────────────────────────────────

interface CreateInvitationParams {
  recipientEmail: string;
  firstName: string;
  lastName: string;
}

export async function createPortalInvitation(
  clinicianProfileId: string,
  params: CreateInvitationParams
): Promise<{ invitation: PortalInvitation; plaintextToken: string }> {
  const email = canonicalEmail(params.recipientEmail);
  const emailHash = hashEmail(email);

  // AC-1.6: reject if suppressed
  if (await isEmailSuppressed(email)) {
    throw new ConflictError(
      "This email cannot receive invitations. Please verify the address with the client."
    );
  }

  // AC-1.4: reject if a PENDING/SENT invitation already exists for this
  // clinician+email. (Partial unique index also enforces this at the DB
  // level, but we want a friendly error instead of a constraint violation.)
  const existing = await prisma.portalInvitation.findFirst({
    where: {
      clinicianId: clinicianProfileId,
      recipientEmailHash: emailHash,
      status: { in: ["PENDING", "SENT"] },
      deletedAt: null,
    },
  });
  if (existing) {
    throw new ConflictError(
      "An active invitation already exists for this email. Resend or revoke the existing invitation first."
    );
  }

  // Check if the email matches an existing User
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  const plaintextToken = generatePortalToken();
  const tokenHash = hashToken(plaintextToken);
  const expiresAt = new Date(
    Date.now() + PORTAL_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const invitation = await prisma.$transaction(async (tx) => {
    let clientId: string | null = existingUser?.id ?? null;

    // AC-1.2: If email doesn't match any User, create a stub User +
    // ParticipantProfile + ClinicianClient. The stub has passwordHash=NULL
    // and cognitoId=NULL until redemption.
    if (!existingUser) {
      const stubUser = await tx.user.create({
        data: {
          email,
          firstName: params.firstName,
          lastName: params.lastName,
          role: "PARTICIPANT",
          participantProfile: { create: {} },
        },
      });
      clientId = stubUser.id;
    }

    // AC-1.3: If an existing User, link them via a new ClinicianClient.
    // Use upsert because ClinicianClient has a unique (clinicianId, clientId).
    if (clientId) {
      await tx.clinicianClient.upsert({
        where: {
          clinicianId_clientId: {
            clinicianId: clinicianProfileId,
            clientId,
          },
        },
        update: {},
        create: {
          clinicianId: clinicianProfileId,
          clientId,
          status: "INVITED",
        },
      });
    }

    return tx.portalInvitation.create({
      data: {
        clinicianId: clinicianProfileId,
        clientId,
        recipientEmail: email,
        recipientEmailHash: emailHash,
        tokenHash,
        status: "PENDING",
        existingUser: !!existingUser,
        firstName: params.firstName,
        lastName: params.lastName,
        expiresAt,
      },
    });
  });

  // Enqueue the send job via pg-boss
  try {
    const { getQueue } = await import("./queue");
    const queue = await getQueue();
    await queue.send("send-portal-invite-email", {
      invitationId: invitation.id,
      plaintextToken, // passed in job payload only — never persisted
    });
    logger.info("Portal invite email job enqueued", `invitationId=${invitation.id}`);
  } catch (err) {
    logger.warn("Failed to enqueue portal invite email job", `invitationId=${invitation.id}`);
  }

  return { invitation, plaintextToken };
}

// ── Send invitation (worker handler) ────────────────────────────────

export async function processSendPortalInviteJob(payload: {
  invitationId: string;
  plaintextToken: string;
}) {
  if (await isCircuitOpen()) {
    logger.warn(
      "Portal invite send skipped — circuit breaker open",
      `invitationId=${payload.invitationId}`
    );
    await prisma.portalInvitation.update({
      where: { id: payload.invitationId },
      data: { status: "SEND_FAILED" },
    });
    return;
  }

  const invitation = await prisma.portalInvitation.findUnique({
    where: { id: payload.invitationId },
  });
  if (!invitation) {
    logger.warn("Portal invite not found", `invitationId=${payload.invitationId}`);
    return;
  }
  if (invitation.deletedAt || invitation.status === "REVOKED") {
    logger.info("Portal invite send skipped — revoked", `invitationId=${invitation.id}`);
    return;
  }

  // AC-1.3: look up clinician last name for existing-user template variant
  let clinicianLastName: string | undefined;
  if (invitation.existingUser) {
    const clinician = await prisma.clinicianProfile.findUnique({
      where: { id: invitation.clinicianId },
      select: { user: { select: { lastName: true } } },
    });
    clinicianLastName = clinician?.user?.lastName ?? undefined;
  }

  const signupUrl = `${PORTAL_BASE_URL}/signup?t=${payload.plaintextToken}`;
  const rendered = renderPortalInviteEmail({
    variant: invitation.existingUser ? "existing-user" : "new-user",
    signupUrl,
    clinicianLastName,
  });

  const result = await sendEmail({
    to: invitation.recipientEmail,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    tags: {
      type: "portal-invite",
      invitationId: invitation.id,
    },
  });

  if (result.success) {
    await prisma.portalInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "SENT",
        sendCount: { increment: 1 },
        lastSentAt: new Date(),
      },
    });
    await recordSend();
    logger.info("Portal invite sent", `invitationId=${invitation.id}`);
  } else if (result.skipped && result.reason === "suppressed") {
    await prisma.portalInvitation.update({
      where: { id: invitation.id },
      data: { status: "BOUNCED" },
    });
  } else {
    // Let pg-boss retry by throwing
    throw new Error(`SES send failed: ${result.reason ?? "unknown"}`);
  }
}

// ── Public invitation status lookup (no auth) ──────────────────────

export async function lookupPortalInvitationStatus(
  plaintextToken: string
): Promise<{
  status: "VALID" | "EXPIRED" | "USED" | "REVOKED" | "INVALID";
  existingUser?: boolean;
  firstName?: string | null;
  lastName?: string | null;
}> {
  const tokenHash = hashToken(plaintextToken);
  const invitation = await prisma.portalInvitation.findUnique({
    where: { tokenHash },
  });

  if (!invitation) {
    return { status: "INVALID" };
  }
  if (invitation.status === "REVOKED" || invitation.deletedAt) {
    return { status: "REVOKED" };
  }
  if (invitation.status === "ACCEPTED" || invitation.tokenBurnedAt) {
    return { status: "USED" };
  }
  if (invitation.expiresAt < new Date()) {
    return { status: "EXPIRED" };
  }
  return {
    status: "VALID",
    existingUser: invitation.existingUser,
    firstName: invitation.firstName,
    lastName: invitation.lastName,
  };
}

// ── Redeem invitation (FR-3) ───────────────────────────────────────

export interface RedeemParams {
  token: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  // Cognito sub of an already-created user (for idempotent resume).
  // When null, the caller creates the Cognito user after our re-check.
  cognitoId?: string | null;
}

export interface RedeemResult {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    participantProfileId?: string;
  };
  invitation: PortalInvitation;
}

/**
 * Redeem a portal invitation. This function is the inner Prisma
 * transaction; callers (routes/auth.ts) are responsible for the Cognito
 * user lifecycle AROUND this call. The transaction:
 *
 * 1. SELECTs the invitation row FOR UPDATE
 * 2. Re-verifies all preconditions (status, expiry, binding)
 * 3. Promotes the stub User (or links existing) with the Cognito sub
 * 4. Transitions ClinicianClient INVITED → ACTIVE
 * 5. Marks invitation ACCEPTED and burns the token
 * 6. COMMITs
 *
 * Race safety (AC-10.6, COND-25): concurrent revoke holds the same
 * row lock, and the status re-check catches REVOKED state.
 */
export async function redeemPortalInvitation(
  params: RedeemParams
): Promise<RedeemResult> {
  const email = canonicalEmail(params.email);
  const emailHash = hashEmail(email);
  const tokenHash = hashToken(params.token);

  return prisma.$transaction(async (tx) => {
    // SELECT ... FOR UPDATE via raw SQL (Prisma doesn't expose this)
    const locked = await tx.$queryRaw<PortalInvitation[]>`
      SELECT * FROM portal_invitations WHERE "tokenHash" = ${tokenHash} FOR UPDATE
    `;
    const invitation = locked[0];

    if (!invitation) {
      throw new NotFoundError("Invitation not found");
    }
    if (invitation.status === "REVOKED" || invitation.deletedAt) {
      throw new InvitationRevokedError();
    }
    if (invitation.status === "ACCEPTED" || invitation.tokenBurnedAt) {
      // Idempotent resume: if the Cognito user was already created and
      // the invitation is already ACCEPTED, re-verify by email and
      // return the existing user record (AC-3.3).
      if (
        params.cognitoId &&
        invitation.recipientEmailHash === emailHash &&
        invitation.acceptedByUserId
      ) {
        const resumedUser = await tx.user.findUnique({
          where: { id: invitation.acceptedByUserId },
          include: { participantProfile: true },
        });
        if (resumedUser) {
          return {
            user: {
              id: resumedUser.id,
              email: resumedUser.email,
              firstName: resumedUser.firstName,
              lastName: resumedUser.lastName,
              role: resumedUser.role,
              participantProfileId: resumedUser.participantProfile?.id,
            },
            invitation,
          };
        }
      }
      throw new InvitationUsedError();
    }
    if (invitation.expiresAt < new Date()) {
      throw new InvitationExpiredError();
    }
    if (invitation.recipientEmailHash !== emailHash) {
      throw new InvitationBindingMismatchError();
    }

    // Verify clinician is still active (AC-3.10)
    const clinician = await tx.clinicianProfile.findUnique({
      where: { id: invitation.clinicianId },
      include: { user: true },
    });
    if (!clinician || !clinician.user || clinician.user.role !== "CLINICIAN") {
      throw new InvitationNoLongerValidError();
    }

    // Promote the stub User (or look up existing user for existingUser=true)
    let user;
    if (invitation.clientId) {
      user = await tx.user.update({
        where: { id: invitation.clientId },
        data: {
          firstName: params.firstName,
          lastName: params.lastName,
          ...(params.cognitoId ? { cognitoId: params.cognitoId } : {}),
        },
        include: { participantProfile: true },
      });
    } else {
      // Edge case: no clientId on the invitation (shouldn't happen post-FR-1)
      // — create a new User row.
      user = await tx.user.create({
        data: {
          email,
          firstName: params.firstName,
          lastName: params.lastName,
          role: "PARTICIPANT",
          ...(params.cognitoId ? { cognitoId: params.cognitoId } : {}),
          participantProfile: { create: {} },
        },
        include: { participantProfile: true },
      });
    }

    // Transition ClinicianClient INVITED → ACTIVE
    await tx.clinicianClient.updateMany({
      where: {
        clinicianId: invitation.clinicianId,
        clientId: user.id,
      },
      data: {
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });

    // Burn the token — set to null so it's un-lookupable
    const accepted = await tx.portalInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByUserId: user.id,
        tokenHash: null,
        tokenBurnedAt: new Date(),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        participantProfileId: user.participantProfile?.id,
      },
      invitation: accepted,
    };
  });
}

// ── Resend, Revoke, Renew (FR-10) ──────────────────────────────────

const RESEND_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_SEND_COUNT = 5;

export async function resendPortalInvitation(
  invitationId: string,
  clinicianProfileId: string
) {
  const invitation = await prisma.portalInvitation.findFirst({
    where: {
      id: invitationId,
      clinicianId: clinicianProfileId,
      deletedAt: null,
    },
  });
  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }

  if (!["PENDING", "SENT"].includes(invitation.status)) {
    throw new ConflictError(
      `Cannot resend invitation in status ${invitation.status}`
    );
  }

  if (invitation.sendCount >= MAX_SEND_COUNT) {
    throw new ConflictError(
      "Maximum resends reached. Revoke and create a new invitation."
    );
  }

  if (
    invitation.lastSentAt &&
    invitation.lastSentAt.getTime() + RESEND_COOLDOWN_MS > Date.now()
  ) {
    throw new ConflictError(
      "Please wait 5 minutes between resends."
    );
  }

  // NOTE: resend requires the plaintext token, which we don't have.
  // The architect spec says resend reuses the same token — but since
  // we only stored the hash, we can't regenerate the plaintext.
  //
  // DECISION: resend treats this like a renew internally — generates
  // a NEW token, updates tokenHash, and sends. The spec's "reuses same
  // token" is impractical with hashed storage. Documented in:
  // docs/sdlc/client-web-portal-mvp/07-implementation-plan.md under
  // "deviations from spec".
  const plaintextToken = generatePortalToken();
  const tokenHash = hashToken(plaintextToken);

  const updated = await prisma.portalInvitation.update({
    where: { id: invitation.id },
    data: { tokenHash },
  });

  // Enqueue the send job
  try {
    const { getQueue } = await import("./queue");
    const queue = await getQueue();
    await queue.send("send-portal-invite-email", {
      invitationId: updated.id,
      plaintextToken,
    });
  } catch (err) {
    logger.warn("Failed to enqueue resend job", `invitationId=${updated.id}`);
  }

  return updated;
}

export async function renewPortalInvitation(
  invitationId: string,
  clinicianProfileId: string
) {
  const invitation = await prisma.portalInvitation.findFirst({
    where: {
      id: invitationId,
      clinicianId: clinicianProfileId,
      deletedAt: null,
    },
  });
  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }

  if (["BOUNCED", "COMPLAINED"].includes(invitation.status)) {
    const err = new Error(
      "Cannot renew a bounced or complained invitation. Verify the email and create a new invitation."
    );
    (err as Error & { code: string }).code = "InvalidStateForRenew";
    throw err;
  }

  const plaintextToken = generatePortalToken();
  const tokenHash = hashToken(plaintextToken);
  const newExpiresAt = new Date(
    Date.now() + PORTAL_INVITE_TTL_DAYS * 24 * 60 * 60 * 1000
  );

  const updated = await prisma.portalInvitation.update({
    where: { id: invitation.id },
    data: {
      tokenHash,
      status: "PENDING",
      expiresAt: newExpiresAt,
      sendCount: 0,
      lastSentAt: null,
      tokenBurnedAt: null,
    },
  });

  try {
    const { getQueue } = await import("./queue");
    const queue = await getQueue();
    await queue.send("send-portal-invite-email", {
      invitationId: updated.id,
      plaintextToken,
    });
  } catch (err) {
    logger.warn("Failed to enqueue renew job", `invitationId=${updated.id}`);
  }

  return updated;
}

export async function revokePortalInvitation(
  invitationId: string,
  clinicianProfileId: string
) {
  const invitation = await prisma.portalInvitation.findFirst({
    where: {
      id: invitationId,
      clinicianId: clinicianProfileId,
      deletedAt: null,
    },
  });
  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }

  if (!["PENDING", "SENT"].includes(invitation.status)) {
    throw new ConflictError(
      `Cannot revoke invitation in status ${invitation.status}`
    );
  }

  return prisma.portalInvitation.update({
    where: { id: invitation.id },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
      deletedAt: new Date(),
      tokenHash: null, // burn token on revoke too
    },
  });
}

// ── List invitations (FR-10) ───────────────────────────────────────

export async function listPortalInvitations(
  clinicianProfileId: string,
  options: {
    cursor?: string;
    limit?: number;
    status?: PortalInvitationStatus;
  } = {}
) {
  const take = Math.min(options.limit ?? 50, 100);

  const where: {
    clinicianId: string;
    deletedAt: null;
    status?: PortalInvitationStatus;
  } = {
    clinicianId: clinicianProfileId,
    deletedAt: null,
  };
  if (options.status) where.status = options.status;

  const items = await prisma.portalInvitation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(options.cursor ? { skip: 1, cursor: { id: options.cursor } } : {}),
  });

  const hasMore = items.length > take;
  const data = hasMore ? items.slice(0, take) : items;
  return {
    data: data.map(toPortalInvitationView),
    cursor: hasMore ? data[data.length - 1].id : null,
  };
}

// Re-export SES_FROM_ADDRESS check for tests
export const _SES_FROM_ADDRESS_CHECK = SES_FROM_ADDRESS;
