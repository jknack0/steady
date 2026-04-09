import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { validate } from "../middleware/validate";
import { CreateCheckoutSessionSchema, ChargeCardSchema } from "@steady/shared";
import { createCheckoutSession } from "../services/stripe-checkout";
import { chargeCardOnFile } from "../services/stripe-payments";
import { listSavedCards, removeCard } from "../services/stripe-customers";
import { getConnectionStatus } from "../services/stripe-connect";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

// POST /api/stripe/payments/checkout — create Checkout session for invoice
router.post("/payments/checkout", validate(CreateCheckoutSessionSchema), async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await createCheckoutSession(ctx, req.body.invoiceId);

    if (result && typeof result === "object" && "error" in result) {
      const r = result as any;
      if (r.error === "not_found") { res.status(404).json({ success: false, error: r.message }); return; }
      if (r.error === "invalid_status") { res.status(409).json({ success: false, error: r.message }); return; }
      if (r.error === "not_configured") { res.status(400).json({ success: false, error: r.message }); return; }
      res.status(400).json({ success: false, error: r.message || r.error });
      return;
    }

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error("Create checkout session error", err);
    res.status(500).json({ success: false, error: "Failed to create checkout session" });
  }
});

// POST /api/stripe/payments/charge — charge saved card on file
router.post("/payments/charge", validate(ChargeCardSchema), async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await chargeCardOnFile(ctx, req.body.invoiceId, req.body.savedPaymentMethodId);

    if (result && typeof result === "object" && "error" in result) {
      const r = result as any;
      if (r.error === "not_found" || r.error === "card_not_found") {
        res.status(404).json({ success: false, error: r.message });
        return;
      }
      if (r.error === "forbidden") {
        res.status(403).json({ success: false, error: r.message });
        return;
      }
      if (r.error === "invalid_status") {
        res.status(409).json({ success: false, error: r.message });
        return;
      }
      if (r.error === "payment_failed") {
        res.status(402).json({ success: false, error: r.message });
        return;
      }
      res.status(400).json({ success: false, error: r.message || r.error });
      return;
    }

    res.json({ success: true, data: (result as any)?.data });
  } catch (err) {
    logger.error("Charge card error", err);
    res.status(500).json({ success: false, error: "Failed to charge card" });
  }
});

// GET /api/stripe/customers/:participantId/cards — list saved cards
router.get("/customers/:participantId/cards", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const { participantId } = req.params;

    // Ownership check — COND-8
    const { prisma } = await import("@steady/db");
    const owns = await prisma.clinicianClient.findFirst({
      where: { clinicianId: ctx.clinicianProfileId!, clientId: participantId },
    });
    if (!owns) {
      res.status(403).json({ success: false, error: "Not authorized" });
      return;
    }

    const cards = await listSavedCards(ctx.practiceId, participantId);
    res.json({ success: true, data: cards });
  } catch (err) {
    logger.error("List saved cards error", err);
    res.status(500).json({ success: false, error: "Failed to list saved cards" });
  }
});

// DELETE /api/stripe/customers/:participantId/cards/:cardId — remove saved card
router.delete("/customers/:participantId/cards/:cardId", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const { participantId, cardId } = req.params;

    // Ownership check — COND-8
    const { prisma } = await import("@steady/db");
    const owns = await prisma.clinicianClient.findFirst({
      where: { clinicianId: ctx.clinicianProfileId!, clientId: participantId },
    });
    if (!owns) {
      res.status(403).json({ success: false, error: "Not authorized" });
      return;
    }

    const result = await removeCard(cardId, ctx.practiceId);
    if ("error" in result) {
      if (result.error === "not_found") { res.status(404).json({ success: false, error: "Card not found" }); return; }
      if (result.error === "forbidden") { res.status(403).json({ success: false, error: "Not authorized" }); return; }
    }

    res.json({ success: true });
  } catch (err) {
    logger.error("Remove card error", err);
    res.status(500).json({ success: false, error: "Failed to remove card" });
  }
});

// GET /api/stripe/connection-status — check if practice has Stripe
router.get("/connection-status", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const status = await getConnectionStatus(ctx.practiceId);
    res.json({ success: true, data: status });
  } catch (err) {
    logger.error("Connection status error", err);
    res.status(500).json({ success: false, error: "Failed to check connection status" });
  }
});

export default router;
