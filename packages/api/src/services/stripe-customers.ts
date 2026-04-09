import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { getStripeClient, getConnectedAccountId } from "./stripe-client";

export async function getOrCreateCustomer(practiceId: string, participantId: string): Promise<string> {
  // Check for existing mapping
  const existing = await prisma.stripeCustomer.findUnique({
    where: { practiceId_participantId: { practiceId, participantId } },
  });

  if (existing) return existing.stripeCustomerId;

  // Get participant info for Stripe Customer (name + email only — COND-7)
  const participant = await prisma.participantProfile.findUnique({
    where: { id: participantId },
    select: { user: { select: { firstName: true, lastName: true, email: true } } },
  });

  if (!participant) {
    throw new Error("Participant not found");
  }

  const connectedAccountId = await getConnectedAccountId(practiceId);
  if (!connectedAccountId) {
    throw new Error("Practice has no Stripe connected account");
  }

  const stripe = getStripeClient();
  const customer = await stripe.customers.create(
    {
      name: `${participant.user.firstName} ${participant.user.lastName}`,
      email: participant.user.email,
      metadata: { participantId, practiceId },
    },
    { stripeAccount: connectedAccountId },
  );

  const record = await prisma.stripeCustomer.create({
    data: {
      practiceId,
      participantId,
      stripeCustomerId: customer.id,
    },
  });

  return record.stripeCustomerId;
}

export async function listSavedCards(practiceId: string, participantId: string) {
  const stripeCustomer = await prisma.stripeCustomer.findUnique({
    where: { practiceId_participantId: { practiceId, participantId } },
    include: { savedPaymentMethods: { orderBy: { createdAt: "desc" } } },
  });

  if (!stripeCustomer) return [];
  return stripeCustomer.savedPaymentMethods;
}

export async function saveCardFromCheckout(
  practiceId: string,
  stripeCustomerDbId: string,
  paymentMethodId: string,
) {
  // Check if already saved
  const existing = await prisma.savedPaymentMethod.findUnique({
    where: { stripePaymentMethodId: paymentMethodId },
  });
  if (existing) return existing;

  const connectedAccountId = await getConnectedAccountId(practiceId);
  if (!connectedAccountId) return null;

  const stripe = getStripeClient();
  const pm = await stripe.paymentMethods.retrieve(
    paymentMethodId,
    { stripeAccount: connectedAccountId },
  );

  if (!pm.card) return null;

  // Store only brand + last4 + expiry (COND-5: no card data)
  const saved = await prisma.savedPaymentMethod.create({
    data: {
      stripeCustomerId: stripeCustomerDbId,
      stripePaymentMethodId: paymentMethodId,
      cardBrand: pm.card.brand || "unknown",
      cardLastFour: pm.card.last4 || "0000",
      expiryMonth: pm.card.exp_month,
      expiryYear: pm.card.exp_year,
    },
  });

  // Audit log — COND-6: card saved from checkout
  prisma.auditLog.create({
    data: {
      userId: "system",
      action: "CREATE",
      resourceType: "SavedPaymentMethod",
      resourceId: saved.id,
      metadata: { changedFields: ["cardBrand", "cardLastFour", "stripePaymentMethodId"] },
    },
  }).catch(() => {}); // fire-and-forget

  return saved;
}

export async function removeCard(savedPaymentMethodId: string, practiceId: string) {
  const saved = await prisma.savedPaymentMethod.findUnique({
    where: { id: savedPaymentMethodId },
    include: { stripeCustomer: true },
  });

  if (!saved || saved.stripeCustomer.practiceId !== practiceId) {
    return { error: "not_found" as const };
  }

  const connectedAccountId = await getConnectedAccountId(practiceId);
  if (connectedAccountId) {
    try {
      const stripe = getStripeClient();
      await stripe.paymentMethods.detach(
        saved.stripePaymentMethodId,
        { stripeAccount: connectedAccountId },
      );
    } catch (err) {
      logger.warn("Failed to detach PaymentMethod from Stripe", String(err));
    }
  }

  await prisma.savedPaymentMethod.delete({
    where: { id: savedPaymentMethodId },
  });

  // Audit log — COND-6: card removed
  prisma.auditLog.create({
    data: {
      userId: "system",
      action: "DELETE",
      resourceType: "SavedPaymentMethod",
      resourceId: savedPaymentMethodId,
      metadata: { changedFields: ["stripePaymentMethodId"] },
    },
  }).catch(() => {}); // fire-and-forget

  return { success: true };
}
