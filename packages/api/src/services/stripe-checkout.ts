import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { getStripeClient, getConnectedAccountId } from "./stripe-client";
import { getOrCreateCustomer } from "./stripe-customers";
import type { ServiceCtx } from "../lib/practice-context";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export async function createCheckoutSession(ctx: ServiceCtx, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, practiceId: ctx.practiceId },
    include: {
      participant: { select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } } },
      lineItems: { include: { serviceCode: true } },
    },
  });

  if (!invoice) {
    return { error: "not_found" as const, message: "Invoice not found" };
  }

  if (invoice.status === "PAID" || invoice.status === "VOID") {
    return { error: "invalid_status" as const, message: `Cannot create payment link for ${invoice.status} invoice` };
  }

  const connectedAccountId = await getConnectedAccountId(ctx.practiceId);
  if (!connectedAccountId) {
    return { error: "not_configured" as const, message: "Stripe not configured for this practice" };
  }

  // Calculate remaining balance
  const remainingCents = invoice.totalCents - invoice.paidCents;
  if (remainingCents <= 0) {
    return { error: "invalid_status" as const, message: "Invoice has no remaining balance" };
  }

  try {
    const stripeCustomerId = await getOrCreateCustomer(ctx.practiceId, invoice.participantId);
    const stripe = getStripeClient();

    // Expire any existing open sessions for this invoice
    const openSessions = await prisma.checkoutSession.findMany({
      where: { invoiceId, status: "OPEN" },
    });
    for (const s of openSessions) {
      try {
        await stripe.checkout.sessions.expire(s.stripeSessionId, { stripeAccount: connectedAccountId });
      } catch { /* session may already be expired */ }
      await prisma.checkoutSession.update({
        where: { id: s.id },
        data: { status: "EXPIRED" },
      });
    }

    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        customer: stripeCustomerId,
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: remainingCents,
            product_data: {
              name: "Professional services", // COND-2: Generic description
              description: `Invoice ${invoice.invoiceNumber}`,
            },
          },
          quantity: 1,
        }],
        payment_intent_data: {
          setup_future_usage: "on_session", // FR-4: Enable card saving
          metadata: { invoiceId, practiceId: ctx.practiceId }, // COND-7: Minimal metadata
        },
        metadata: { invoiceId, practiceId: ctx.practiceId },
        success_url: `${APP_URL}/billing?payment=success&invoice=${invoiceId}`,
        cancel_url: `${APP_URL}/billing?payment=cancelled&invoice=${invoiceId}`,
      },
      { stripeAccount: connectedAccountId },
    );

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.checkoutSession.create({
      data: {
        invoiceId,
        practiceId: ctx.practiceId,
        stripeSessionId: session.id,
        status: "OPEN",
        expiresAt,
      },
    });

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paymentLinkUrl: session.url,
        paymentLinkExpiresAt: expiresAt,
      },
    });

    return { data: { url: session.url, sessionId: session.id, expiresAt } };
  } catch (err) {
    logger.error("Stripe Checkout session creation failed", err);
    return { error: "stripe_error" as const, message: "Failed to create payment link" };
  }
}

export async function handleSessionCompleted(sessionData: any, practiceId: string) {
  const invoiceId = sessionData.metadata?.invoiceId;
  if (!invoiceId) {
    logger.warn("Checkout session completed without invoiceId in metadata");
    return;
  }

  const paymentIntentId = sessionData.payment_intent;
  const amountTotal = sessionData.amount_total;

  // Idempotency check (COND-3/NFR-3)
  if (paymentIntentId) {
    const existing = await prisma.payment.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
    });
    if (existing) {
      logger.info(`Payment already recorded for PI ${paymentIntentId}, skipping`);
      return;
    }
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, totalCents: true, paidCents: true, status: true, practiceId: true, clinicianId: true, participantId: true },
  });

  if (!invoice || invoice.status === "VOID" || invoice.status === "PAID") {
    return;
  }

  // Create payment record
  await prisma.payment.create({
    data: {
      invoiceId,
      amountCents: amountTotal || 0,
      method: "CREDIT_CARD",
      reference: paymentIntentId || null,
      receivedAt: new Date(),
      stripePaymentIntentId: paymentIntentId || null,
    },
  });

  // Audit log — COND-6: webhook payment recorded
  prisma.auditLog.create({
    data: {
      userId: "system",
      action: "CREATE",
      resourceType: "Payment",
      resourceId: invoiceId,
      changedFields: ["amountCents", "method", "stripePaymentIntentId", "invoiceId"],
    },
  }).catch(() => {}); // fire-and-forget

  // Recalculate invoice status
  const newPaidCents = invoice.paidCents + (amountTotal || 0);
  const newStatus = newPaidCents >= invoice.totalCents ? "PAID" : "PARTIALLY_PAID";

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      paidCents: newPaidCents,
      status: newStatus,
      paymentLinkUrl: null,
      paymentLinkExpiresAt: null,
    },
  });

  // Update checkout session
  await prisma.checkoutSession.updateMany({
    where: { stripeSessionId: sessionData.id },
    data: { status: "COMPLETED", stripePaymentIntentId: paymentIntentId },
  });

  // Save card if setup_future_usage was set (FR-4)
  if (sessionData.customer && paymentIntentId) {
    try {
      const stripeCustomer = await prisma.stripeCustomer.findFirst({
        where: { stripeCustomerId: sessionData.customer, practiceId },
      });
      if (stripeCustomer) {
        const { saveCardFromCheckout } = await import("./stripe-customers");
        const connectedAccountId = await (await import("./stripe-client")).getConnectedAccountId(practiceId);
        if (connectedAccountId) {
          const stripe = (await import("./stripe-client")).getStripeClient();
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { stripeAccount: connectedAccountId });
          if (pi.payment_method && typeof pi.payment_method === "string") {
            await saveCardFromCheckout(practiceId, stripeCustomer.id, pi.payment_method);
          }
        }
      }
    } catch (err) {
      logger.warn("Failed to save card from checkout", String(err));
    }
  }

  logger.info(`Payment recorded for invoice ${invoiceId} via Checkout`);
}

export async function handleSessionExpired(sessionData: any) {
  await prisma.checkoutSession.updateMany({
    where: { stripeSessionId: sessionData.id },
    data: { status: "EXPIRED" },
  });

  const invoiceId = sessionData.metadata?.invoiceId;
  if (invoiceId) {
    await prisma.invoice.update({
      where: { id: invoiceId },
      data: { paymentLinkUrl: null, paymentLinkExpiresAt: null },
    });
  }
}
