import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import type { ServiceCtx } from "../lib/practice-context";
import type { UpsertInsuranceInput } from "@steady/shared";

async function verifyOwnership(ctx: ServiceCtx, participantId: string): Promise<boolean> {
  const relationship = await prisma.clinicianClient.findFirst({
    where: {
      clinicianId: ctx.clinicianProfileId!,
      clientId: participantId,
    },
  });
  return !!relationship;
}

export async function getInsurance(ctx: ServiceCtx, participantId: string) {
  const owns = await verifyOwnership(ctx, participantId);
  if (!owns) return { error: "not_found" as const };

  const insurance = await prisma.patientInsurance.findFirst({
    where: { participantId, isActive: true },
  });

  return { data: insurance };
}

export async function upsertInsurance(ctx: ServiceCtx, participantId: string, input: UpsertInsuranceInput) {
  const owns = await verifyOwnership(ctx, participantId);
  if (!owns) return { error: "not_found" as const };

  const insurance = await prisma.patientInsurance.upsert({
    where: { participantId },
    create: {
      participantId,
      payerId: input.payerId,
      payerName: input.payerName,
      subscriberId: input.subscriberId,
      groupNumber: input.groupNumber || null,
      relationshipToSubscriber: input.relationshipToSubscriber as any,
      policyHolderFirstName: input.policyHolderFirstName || null,
      policyHolderLastName: input.policyHolderLastName || null,
      policyHolderDob: input.policyHolderDob || null,
      policyHolderGender: input.policyHolderGender || null,
    },
    update: {
      payerId: input.payerId,
      payerName: input.payerName,
      subscriberId: input.subscriberId,
      groupNumber: input.groupNumber || null,
      relationshipToSubscriber: input.relationshipToSubscriber as any,
      policyHolderFirstName: input.policyHolderFirstName || null,
      policyHolderLastName: input.policyHolderLastName || null,
      policyHolderDob: input.policyHolderDob || null,
      policyHolderGender: input.policyHolderGender || null,
      isActive: true,
    },
  });

  return { data: insurance };
}

export async function removeInsurance(ctx: ServiceCtx, participantId: string) {
  const owns = await verifyOwnership(ctx, participantId);
  if (!owns) return { error: "not_found" as const };

  const existing = await prisma.patientInsurance.findFirst({
    where: { participantId, isActive: true },
  });

  if (!existing) return { error: "not_found" as const };

  await prisma.patientInsurance.update({
    where: { id: existing.id },
    data: { isActive: false },
  });

  return { success: true };
}

export async function checkEligibility(ctx: ServiceCtx, participantId: string, serviceCode?: string) {
  const owns = await verifyOwnership(ctx, participantId);
  if (!owns) return { error: "not_found" as const };

  const insurance = await prisma.patientInsurance.findFirst({
    where: { participantId, isActive: true },
  });

  if (!insurance) return { error: "no_insurance" as const };

  // Check cache (24 hour window)
  const cacheWindow = 24 * 60 * 60 * 1000;
  if (
    insurance.cachedEligibility &&
    insurance.eligibilityCheckedAt &&
    Date.now() - new Date(insurance.eligibilityCheckedAt).getTime() < cacheWindow
  ) {
    return { data: insurance };
  }

  // Get Stedi key
  const { getEncryptedKey } = await import("./stedi-config");
  const encryptedKey = await getEncryptedKey(ctx.practiceId);
  if (!encryptedKey) return { error: "not_configured" as const };

  // Get provider NPI
  const billing = await prisma.clinicianBillingProfile.findUnique({
    where: { clinicianId: ctx.clinicianProfileId! },
  });

  const { checkEligibility: stediCheck, isStediError } = await import("./stedi-client");
  const result = await stediCheck(encryptedKey, {
    subscriberId: insurance.subscriberId,
    payerId: insurance.payerId,
    providerNpi: billing?.npiNumber || "",
    serviceTypeCode: serviceCode,
  });

  if (isStediError(result)) {
    return { error: "stedi_error" as const, message: result.message };
  }

  // Cache result
  const updated = await prisma.patientInsurance.update({
    where: { id: insurance.id },
    data: {
      cachedEligibility: result as any,
      eligibilityCheckedAt: new Date(),
    },
  });

  return { data: updated };
}
