import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import type { ServiceCtx } from "../lib/practice-context";

// ── State Machine ────────────────────────────────────

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["ACCEPTED", "REJECTED", "DENIED"],
  ACCEPTED: ["PAID"],
  REJECTED: ["DRAFT"], // resubmit
  DENIED: [],          // terminal
  PAID: [],            // terminal
};

const REFRESHABLE_STATUSES = new Set(["SUBMITTED", "ACCEPTED"]);

export async function createClaim(
  ctx: ServiceCtx,
  input: { appointmentId: string; diagnosisCodes: string[]; placeOfServiceCode?: string; modifiers?: string[] },
) {
  // Verify appointment exists and belongs to clinician's practice
  const appointment = await prisma.appointment.findUnique({
    where: { id: input.appointmentId },
    include: { serviceCode: true, location: true },
  });

  if (!appointment || appointment.practiceId !== ctx.practiceId) {
    return { error: "not_found" as const, message: "Appointment not found" };
  }

  // Must be ATTENDED
  if (appointment.status !== "ATTENDED") {
    return { error: "not_attended" as const, message: "Appointment must be ATTENDED to submit a claim" };
  }

  // Check for active insurance
  const insurance = await prisma.patientInsurance.findFirst({
    where: { participantId: appointment.participantId, isActive: true },
  });

  if (!insurance) {
    return { error: "no_insurance" as const, message: "No active insurance on file for this participant" };
  }

  // Check for existing claim
  const existingClaim = await prisma.insuranceClaim.findFirst({
    where: { appointmentId: input.appointmentId },
  });

  if (existingClaim) {
    return { error: "claim_exists" as const, message: "A claim already exists for this appointment" };
  }

  // Determine place of service code
  const posCode = input.placeOfServiceCode || (appointment.location?.type === "VIRTUAL" ? "02" : "11");

  // Calculate retention expiry (7 years — COND-9)
  const retentionExpiresAt = new Date(appointment.startAt);
  retentionExpiresAt.setFullYear(retentionExpiresAt.getFullYear() + 7);

  const claim = await prisma.insuranceClaim.create({
    data: {
      practiceId: ctx.practiceId,
      clinicianId: ctx.clinicianProfileId!,
      participantId: appointment.participantId,
      appointmentId: input.appointmentId,
      patientInsuranceId: insurance.id,
      status: "DRAFT",
      serviceCode: appointment.serviceCode.code,
      modifiers: input.modifiers ?? [],
      servicePriceCents: appointment.serviceCode.defaultPriceCents || 0,
      placeOfServiceCode: posCode,
      dateOfService: appointment.startAt,
      diagnosisCodes: input.diagnosisCodes,
      retentionExpiresAt,
    },
    include: {
      statusHistory: true,
      participant: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      patientInsurance: { select: { payerName: true } },
    },
  });

  // Create initial status history
  await prisma.claimStatusHistory.create({
    data: {
      claimId: claim.id,
      fromStatus: null,
      toStatus: "DRAFT",
      changedBy: ctx.userId,
    },
  });

  return { data: claim };
}

export async function listClaims(ctx: ServiceCtx, query: { status?: string; cursor?: string; limit?: number }) {
  const take = Math.min(query.limit || 50, 100);

  const where: any = {};
  if (ctx.isAccountOwner) {
    where.practiceId = ctx.practiceId;
  } else {
    where.clinicianId = ctx.clinicianProfileId;
  }
  if (query.status) {
    where.status = query.status;
  }

  const claims = await prisma.insuranceClaim.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
    include: {
      participant: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      patientInsurance: { select: { payerName: true } },
    },
  });

  const hasMore = claims.length > take;
  const data = hasMore ? claims.slice(0, take) : claims;

  return {
    data,
    cursor: hasMore ? data[data.length - 1].id : null,
  };
}

export async function getClaim(ctx: ServiceCtx, claimId: string) {
  const where: any = { id: claimId };
  if (!ctx.isAccountOwner) {
    where.clinicianId = ctx.clinicianProfileId;
  } else {
    where.practiceId = ctx.practiceId;
  }

  const claim = await prisma.insuranceClaim.findFirst({
    where,
    include: {
      statusHistory: { orderBy: { createdAt: "asc" } },
      participant: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      patientInsurance: { select: { payerName: true } },
    },
  });

  if (!claim) return { error: "not_found" as const };
  return { data: claim };
}

export async function refreshClaimStatus(ctx: ServiceCtx, claimId: string) {
  const where: any = { id: claimId };
  if (!ctx.isAccountOwner) {
    where.clinicianId = ctx.clinicianProfileId;
  } else {
    where.practiceId = ctx.practiceId;
  }

  const claim = await prisma.insuranceClaim.findFirst({ where });
  if (!claim) return { error: "not_found" as const };

  if (!REFRESHABLE_STATUSES.has(claim.status)) {
    return { error: "invalid_status" as const, message: `Cannot refresh status for a ${claim.status} claim. Only SUBMITTED or ACCEPTED claims can be refreshed.` };
  }

  // Get Stedi key and check status
  const { getEncryptedKey } = await import("./stedi-config");
  const encryptedKey = await getEncryptedKey(ctx.practiceId);
  if (!encryptedKey) return { error: "not_configured" as const };

  const { checkClaimStatus: stediCheck, isStediError } = await import("./stedi-client");
  const result = await stediCheck(encryptedKey, claim.stediTransactionId!);

  if (isStediError(result)) {
    return { error: "stedi_error" as const, message: result.message };
  }

  // Check if status actually changed
  if (result.status === claim.status) {
    return { data: claim };
  }

  // Validate transition
  const allowed = VALID_TRANSITIONS[claim.status] || [];
  if (!allowed.includes(result.status)) {
    logger.warn("Invalid claim transition from Stedi", `${claim.status} -> ${result.status}`);
    return { data: claim };
  }

  const updated = await prisma.insuranceClaim.update({
    where: { id: claimId },
    data: {
      status: result.status as any,
      rejectionReason: result.rejectionReason || null,
      respondedAt: new Date(),
    },
    include: {
      statusHistory: { orderBy: { createdAt: "asc" } },
      participant: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      patientInsurance: { select: { payerName: true } },
    },
  });

  await prisma.claimStatusHistory.create({
    data: {
      claimId,
      fromStatus: claim.status as any,
      toStatus: result.status as any,
      changedBy: "system",
      reason: result.rejectionReason,
    },
  });

  return { data: updated };
}

export async function submitDraftClaim(ctx: ServiceCtx, claimId: string) {
  const where: any = { id: claimId };
  if (!ctx.isAccountOwner) {
    where.clinicianId = ctx.clinicianProfileId;
  } else {
    where.practiceId = ctx.practiceId;
  }

  const claim = await prisma.insuranceClaim.findFirst({
    where,
    include: {
      participant: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      patientInsurance: { select: { payerName: true } },
    },
  });

  if (!claim) return { error: "not_found" as const };

  if (claim.status !== "DRAFT") {
    return { error: "invalid_status" as const, message: `Only DRAFT claims can be submitted. Current status: ${claim.status}` };
  }

  // Check practice has Stedi API key configured
  const { getEncryptedKey } = await import("./stedi-config");
  const encryptedKey = await getEncryptedKey(ctx.practiceId);
  if (!encryptedKey) {
    return { error: "not_configured" as const, message: "Insurance billing not configured" };
  }

  // Enqueue stedi-claim-submit job via pg-boss
  const { getQueue } = await import("./queue");
  const boss = await getQueue();
  await boss.send("stedi-claim-submit", { claimId });

  logger.info(`Claim ${claimId} enqueued for Stedi submission`);

  return { data: claim };
}

export async function resubmitClaim(
  ctx: ServiceCtx,
  claimId: string,
  updates?: { diagnosisCodes?: string[]; serviceCode?: string; modifiers?: string[] },
) {
  const where: any = { id: claimId };
  if (!ctx.isAccountOwner) {
    where.clinicianId = ctx.clinicianProfileId;
  } else {
    where.practiceId = ctx.practiceId;
  }

  const claim = await prisma.insuranceClaim.findFirst({ where });
  if (!claim) return { error: "not_found" as const };

  if (claim.status !== "REJECTED") {
    return { error: "invalid_status" as const, message: `Only REJECTED claims can be resubmitted. Current status: ${claim.status}` };
  }

  const updateData: any = {
    status: "DRAFT",
    rejectionReason: null,
    stediTransactionId: null,
    submittedAt: null,
    respondedAt: null,
    retryCount: 0,
  };

  if (updates?.diagnosisCodes) updateData.diagnosisCodes = updates.diagnosisCodes;
  if (updates?.serviceCode) updateData.serviceCode = updates.serviceCode;
  if (updates?.modifiers) updateData.modifiers = updates.modifiers;

  const updated = await prisma.insuranceClaim.update({
    where: { id: claimId },
    data: updateData,
    include: {
      statusHistory: { orderBy: { createdAt: "asc" } },
      participant: { select: { id: true, user: { select: { firstName: true, lastName: true } } } },
      patientInsurance: { select: { payerName: true } },
    },
  });

  await prisma.claimStatusHistory.create({
    data: {
      claimId,
      fromStatus: "REJECTED" as any,
      toStatus: "DRAFT" as any,
      changedBy: ctx.userId,
      reason: "Resubmitted with corrections",
    },
  });

  return { data: updated };
}
