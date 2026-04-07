import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { getStripeClient, getConnectedAccountId } from "./stripe-client";
import type { ServiceCtx } from "../lib/practice-context";

export async function chargeCardOnFile(
  ctx: ServiceCtx,
  invoiceId: string,
  savedPaymentMethodId: string,
) {
  // Validate invoice
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, practiceId: ctx.practiceId },
  });

  if (!invoice) {
    return { error: "not_found" as const, message: "Invoice not found" };
  }

  if (invoice.status === "PAID" || invoice.status === "VOID") {
    return { error: "invalid_status" as const, message: `Cannot charge for ${invoice.status} invoice` };
  }

  // Validate saved card exists and belongs to this participant
  const savedCard = await prisma.savedPaymentMethod.findUnique({
    where: { id: savedPaymentMethodId },
    include: {
      stripeCustomer: {
        select: { stripeCustomerId: true, participantId: true, practiceId: true },
      },
    },
  });

  if (!savedCard || savedCard.stripeCustomer.practiceId !== ctx.practiceId) {
    return { error: "not_found" as const, message: "Saved card not found" };
  }

  // Verify ownership (COND-8)
  if (savedCard.stripeCustomer.participantId !== invoice.participantId) {
    return { error: "not_found" as const, message: "Card does not belong to invoice participant" };
  }

  const connectedAccountId = await getConnectedAccountId(ctx.practiceId);
  if (!connectedAccountId) {
    return { error: "not_configured" as const, message: "Stripe not configured" };
  }

  const remainingCents = invoice.totalCents - invoice.paidCents;
  if (remainingCents <= 0) {
    return { error: "invalid_status" as const, message: "Invoice has no remaining balance" };
  }

  try {
    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: remainingCents,
        currency: "usd",
        customer: savedCard.stripeCustomer.stripeCustomerId,
        payment_method: savedCard.stripePaymentMethodId,
        confirm: true,
        off_session: false,
        metadata: { invoiceId, practiceId: ctx.practiceId },
      },
      { stripeAccount: connectedAccountId },
    );

    if (paymentIntent.status === "succeeded") {
      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          invoiceId,
          amountCents: remainingCents,
          method: "CREDIT_CARD",
          reference: paymentIntent.id,
          receivedAt: new Date(),
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      // Recalculate invoice
      const newPaidCents = invoice.paidCents + remainingCents;
      const newStatus = newPaidCents >= invoice.totalCents ? "PAID" : "PARTIALLY_PAID";

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { paidCents: newPaidCents, status: newStatus },
      });

      return { data: { payment, status: newStatus } };
    }

    return { error: "payment_failed" as const, message: "Payment requires additional action" };
  } catch (err: any) {
    const declineCode = err?.raw?.decline_code || err?.code || "unknown";
    logger.warn("Card charge failed", declineCode);
    // Return generic message — never forward Stripe error details which may contain PII
    const safeMessages: Record<string, string> = {
      card_declined: "Card was declined",
      expired_card: "Card has expired",
      insufficient_funds: "Insufficient funds",
      incorrect_cvc: "Incorrect security code",
      processing_error: "Processing error — try again",
    };
    const safeMsg = safeMessages[declineCode] || "Card was declined";
    return { error: "payment_failed" as const, message: `Payment failed: ${safeMsg}` };
  }
}
