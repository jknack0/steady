import crypto from "crypto";
import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { ConflictError, NotFoundError } from "./clinician";

// ── Helpers ─────────────────────────────────────────────

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/**
 * Generate a cryptographically random invite code in format STEADY-XXXX.
 * Uses crypto.randomBytes for NFR-2 compliance.
 */
export function generateInviteCode(): string {
  const bytes = crypto.randomBytes(4);
  let suffix = "";
  for (let i = 0; i < 4; i++) {
    suffix += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
  }
  return `STEADY-${suffix}`;
}

/**
 * SHA-256 hash of lowercased, trimmed email for duplicate lookups.
 * Encrypted email fields can't be indexed, so we store a hash for searching.
 */
export function hashEmail(email: string): string {
  return crypto.createHash("sha256").update(email.toLowerCase().trim()).digest("hex");
}

// ── Error Classes ───────────────────────────────────────

export class ExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpiredError";
  }
}

// ── Create Invitation ───────────────────────────────────

interface CreateInvitationData {
  patientName: string;
  patientEmail: string;
  programId?: string;
  sendEmail?: boolean;
}

export async function createInvitation(
  clinicianProfileId: string,
  data: CreateInvitationData
) {
  const { patientName, patientEmail, programId, sendEmail } = data;
  const emailHash = hashEmail(patientEmail);

  // Check for existing active invitation for same email + clinician
  const existing = await prisma.patientInvitation.findFirst({
    where: {
      clinicianId: clinicianProfileId,
      patientEmailHash: emailHash,
      status: "PENDING",
    },
  });

  if (existing) {
    throw new ConflictError("An active invitation already exists for this email");
  }

  // If programId provided, verify ownership
  if (programId) {
    const program = await prisma.program.findFirst({
      where: { id: programId, clinicianId: clinicianProfileId },
    });
    if (!program) {
      throw new NotFoundError("Program not found or not owned by you");
    }
  }

  // Generate unique code with retry (up to 3 attempts for collision)
  let code: string = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    code = generateInviteCode();
    const collision = await prisma.patientInvitation.findUnique({
      where: { code },
    });
    if (!collision) break;
    if (attempt === 2) {
      throw new Error("Failed to generate unique invite code after 3 attempts");
    }
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  const invitation = await prisma.patientInvitation.create({
    data: {
      clinicianId: clinicianProfileId,
      code,
      patientName: patientName.trim(),
      patientEmail: patientEmail.toLowerCase().trim(),
      patientEmailHash: emailHash,
      programId: programId || null,
      expiresAt,
      emailSent: false,
      emailSendCount: 0,
    },
  });

  // Queue email job if requested
  if (sendEmail) {
    try {
      const { getQueue } = await import("./queue");
      const queue = await getQueue();
      await queue.send("send-invite-email", {
        invitationId: invitation.id,
      });
      logger.info("Invite email job queued", `invitationId=${invitation.id}`);
    } catch (err) {
      // Non-blocking — email is optional
      logger.warn("Failed to queue invite email job", `invitationId=${invitation.id}`);
    }
  }

  return invitation;
}

// ── Redeem Invitation ───────────────────────────────────

interface RedeemData {
  inviteCode: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export async function redeemInvitation(data: RedeemData) {
  const { inviteCode: code, firstName, lastName, email, password } = data;

  // Look up invitation by code
  const invitation = await prisma.patientInvitation.findUnique({
    where: { code: code.toUpperCase() },
  });

  if (!invitation) {
    throw new NotFoundError("Invalid invite code. Please check and try again.");
  }

  if (invitation.status === "ACCEPTED") {
    throw new ConflictError("This invite code has already been used.");
  }

  if (invitation.status === "REVOKED") {
    throw new NotFoundError("Invalid invite code. Please check and try again.");
  }

  if (invitation.status === "EXPIRED" || invitation.expiresAt < new Date()) {
    throw new ExpiredError("This invite code has expired. Please contact your clinician for a new one.");
  }

  // Check email not already registered
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (existingUser) {
    throw new ConflictError("This email is already registered.");
  }

  // Atomic transaction: create user, profile, client relationship, config, optional enrollment, update invitation
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create User + ParticipantProfile (no passwordHash — Cognito handles passwords)
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase().trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: "PARTICIPANT",
        participantProfile: { create: {} },
      },
      include: {
        participantProfile: true,
      },
    });

    // 2. Create ClinicianClient (ACTIVE — patient accepted by entering code)
    await tx.clinicianClient.create({
      data: {
        clinicianId: invitation.clinicianId,
        clientId: user.id,
        status: "ACTIVE",
        acceptedAt: new Date(),
      },
    });

    // 3. Create ClientConfig from clinician defaults
    const clinicianConfig = await tx.clinicianConfig.findUnique({
      where: { clinicianId: invitation.clinicianId },
    });

    if (clinicianConfig) {
      await tx.clientConfig.create({
        data: {
          clientId: user.id,
          clinicianId: invitation.clinicianId,
          enabledModules: clinicianConfig.enabledModules ?? undefined,
          activeAssessments: clinicianConfig.defaultAssessments ?? undefined,
        },
      });
    }

    // 4. Optional enrollment
    let enrollment = null;
    if (invitation.programId && user.participantProfile) {
      enrollment = await tx.enrollment.create({
        data: {
          participantId: user.participantProfile.id,
          programId: invitation.programId,
          status: "ACTIVE",
          enrolledAt: new Date(),
        },
      });
    }

    // 5. Update invitation
    await tx.patientInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        acceptedByUserId: user.id,
      },
    });

    return { user, enrollment };
  });

  return {
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role,
      participantProfileId: result.user.participantProfile?.id,
    },
  };
}

// ── Revoke Invitation ───────────────────────────────────

export async function revokeInvitation(
  invitationId: string,
  clinicianProfileId: string
) {
  const invitation = await prisma.patientInvitation.findFirst({
    where: { id: invitationId, clinicianId: clinicianProfileId },
  });

  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }

  if (invitation.status !== "PENDING") {
    throw new ConflictError("Only pending invitations can be revoked");
  }

  const updated = await prisma.patientInvitation.update({
    where: { id: invitationId },
    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  logger.info("Invitation revoked", `invitationId=${invitationId}`);
  return updated;
}

// ── Resend Email ────────────────────────────────────────

export async function resendEmail(
  invitationId: string,
  clinicianProfileId: string
) {
  const invitation = await prisma.patientInvitation.findFirst({
    where: { id: invitationId, clinicianId: clinicianProfileId },
  });

  if (!invitation) {
    throw new NotFoundError("Invitation not found");
  }

  if (invitation.status !== "PENDING") {
    throw new ConflictError("Can only resend email for pending invitations");
  }

  if (invitation.expiresAt < new Date()) {
    throw new ExpiredError("This invitation has expired");
  }

  // Queue email job
  try {
    const { getQueue } = await import("./queue");
    const queue = await getQueue();
    await queue.send("send-invite-email", {
      invitationId: invitation.id,
    });
  } catch (err) {
    logger.warn("Failed to queue resend email job", `invitationId=${invitationId}`);
  }

  // Increment send count
  const updated = await prisma.patientInvitation.update({
    where: { id: invitationId },
    data: {
      emailSendCount: { increment: 1 },
    },
  });

  logger.info("Invite email resend queued", `invitationId=${invitationId}`);
  return updated;
}

// ── List Invitations ────────────────────────────────────

interface ListOptions {
  status?: string;
  cursor?: string;
  limit?: number;
}

export async function getInvitationsByClinicianId(
  clinicianProfileId: string,
  options: ListOptions = {}
) {
  const { status, cursor, limit } = options;
  const take = Math.min(limit || 50, 100);

  const where: any = { clinicianId: clinicianProfileId };
  if (status) {
    where.status = status;
  }

  const items = await prisma.patientInvitation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = items.length > take;
  const data = hasMore ? items.slice(0, take) : items;

  return {
    data,
    cursor: hasMore ? data[data.length - 1].id : null,
  };
}
