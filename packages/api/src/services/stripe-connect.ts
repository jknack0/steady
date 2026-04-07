import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { getStripeClient } from "./stripe-client";

export async function provisionConnectedAccount(practiceId: string) {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { id: true, name: true, stripeConnectedAccountId: true },
  });

  if (!practice) {
    return { error: "not_found" as const, message: "Practice not found" };
  }

  if (practice.stripeConnectedAccountId) {
    return { error: "already_provisioned" as const, message: "Practice already has a Stripe account" };
  }

  try {
    const stripe = getStripeClient();
    const account = await stripe.accounts.create({
      type: "express",
      business_type: "individual",
      metadata: { practiceId, practiceName: practice.name },
    });

    await prisma.practice.update({
      where: { id: practiceId },
      data: { stripeConnectedAccountId: account.id },
    });

    return { data: { accountId: account.id } };
  } catch (err) {
    logger.error("Stripe account provisioning failed", err);
    return { error: "stripe_error" as const, message: "Failed to create Stripe account" };
  }
}

export async function saveStripeKeys(practiceId: string, apiKey: string, webhookSecret: string) {
  const lastFour = apiKey.slice(-4);

  // Encryption middleware auto-encrypts on write
  await prisma.practice.update({
    where: { id: practiceId },
    data: {
      stripeApiKeyEncrypted: apiKey,
      stripeApiKeyLastFour: lastFour,
      stripeWebhookSecretEncrypted: webhookSecret,
    },
  });

  return { data: { configured: true, keyLastFour: lastFour } };
}

export async function getConnectionStatus(practiceId: string) {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: {
      stripeConnectedAccountId: true,
      stripeApiKeyLastFour: true,
    },
  });

  if (!practice) {
    return { connected: false, accountId: null, keyLastFour: null };
  }

  return {
    connected: !!practice.stripeConnectedAccountId,
    accountId: practice.stripeConnectedAccountId || null,
    keyLastFour: practice.stripeApiKeyLastFour || null,
  };
}
