import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import type { ServiceCtx } from "../lib/practice-context";

export async function getStediConfig(ctx: ServiceCtx) {
  const practice = await prisma.practice.findUnique({
    where: { id: ctx.practiceId },
    select: { stediApiKeyEncrypted: true, stediApiKeyLastFour: true },
  });

  if (!practice) {
    return { configured: false, keyLastFour: null };
  }

  return {
    configured: !!practice.stediApiKeyEncrypted,
    keyLastFour: practice.stediApiKeyLastFour || null,
  };
}

export async function setStediKey(ctx: ServiceCtx, apiKey: string) {
  if (!ctx.isAccountOwner) {
    return { error: "forbidden", message: "Only the account owner can update the Stedi API key" };
  }

  const lastFour = apiKey.slice(-4);

  // The encryption middleware automatically encrypts stediApiKeyEncrypted on write
  const updated = await prisma.practice.update({
    where: { id: ctx.practiceId },
    data: {
      stediApiKeyEncrypted: apiKey,
      stediApiKeyLastFour: lastFour,
    },
    select: { stediApiKeyEncrypted: true, stediApiKeyLastFour: true },
  });

  return {
    configured: true,
    keyLastFour: updated.stediApiKeyLastFour,
  };
}

export async function getEncryptedKey(practiceId: string): Promise<string | null> {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { stediApiKeyEncrypted: true },
  });
  return practice?.stediApiKeyEncrypted || null;
}

export async function testStediConnection(ctx: ServiceCtx) {
  const practice = await prisma.practice.findUnique({
    where: { id: ctx.practiceId },
    select: { stediApiKeyEncrypted: true },
  });

  if (!practice?.stediApiKeyEncrypted) {
    return { error: "not_configured", message: "No Stedi API key configured" };
  }

  // Import dynamically to avoid circular dependency issues in tests
  const { testConnection } = await import("./stedi-client");
  const valid = await testConnection(practice.stediApiKeyEncrypted);
  return { valid };
}
