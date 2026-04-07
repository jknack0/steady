import { Router, Request, Response } from "express";
import express from "express";
import { logger } from "../lib/logger";

const router = Router();

// Use express.raw() for Stripe webhook signature verification (COND-4)
router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"] as string;
    if (!sig) {
      res.status(400).json({ error: "Missing stripe-signature header" });
      return;
    }

    const rawBody = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      res.status(400).json({ error: "Expected raw body" });
      return;
    }

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!webhookSecret) {
        logger.error("STRIPE_WEBHOOK_SECRET not configured");
        res.status(500).json({ error: "Webhook not configured" });
        return;
      }

      const Stripe = require("stripe");
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");
      const event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);

      // Determine practiceId from event metadata
      const eventData = event.data.object as any;
      const practiceId = eventData?.metadata?.practiceId || "";

      // Check for required metadata
      if (event.type.startsWith("checkout.session.") && !eventData?.metadata?.invoiceId) {
        res.status(400).json({ error: "Missing invoiceId in metadata" });
        return;
      }

      // Queue for async processing via pg-boss
      const { getQueue } = await import("../services/queue");
      const boss = await getQueue();
      await boss.send("stripe-webhook-process", {
        eventId: event.id,
        eventType: event.type,
        eventData,
        practiceId,
      });

      res.json({ received: true });
    } catch (err: any) {
      if (err?.type === "StripeSignatureVerificationError") {
        logger.warn("Webhook signature verification failed");
        res.status(400).json({ error: "Invalid signature" });
        return;
      }
      logger.error("Webhook processing error", err);
      res.status(400).json({ error: "Webhook processing failed" });
    }
  },
);

export default router;
