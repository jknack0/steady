import { prisma } from "@steady/db";
import { logger } from "../lib/logger";

let platformStripe: any = null;

export function getStripeClient(): any {
  if (platformStripe) return platformStripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  }
  // Dynamic require to avoid type conflicts with Express
  const Stripe = require("stripe");
  platformStripe = new Stripe(key);
  return platformStripe;
}

export async function getConnectedAccountId(practiceId: string): Promise<string | null> {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { stripeConnectedAccountId: true },
  });
  return practice?.stripeConnectedAccountId || null;
}

export async function getDecryptedApiKey(practiceId: string): Promise<string | null> {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { stripeApiKeyEncrypted: true },
  });
  // Encryption middleware auto-decrypts on read
  return practice?.stripeApiKeyEncrypted || null;
}

export async function getWebhookSecret(practiceId: string): Promise<string | null> {
  const practice = await prisma.practice.findUnique({
    where: { id: practiceId },
    select: { stripeWebhookSecretEncrypted: true },
  });
  // Encryption middleware auto-decrypts on read
  return practice?.stripeWebhookSecretEncrypted || null;
}
