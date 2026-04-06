import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  ParticipantCancelAppointmentSchema,
  ParticipantInvoiceListQuerySchema,
} from "@steady/shared";
import {
  getParticipantInvoices,
  getParticipantInvoice,
  participantCancelAppointment,
  getParticipantOutstandingInvoiceCount,
} from "../services/participant-portal";
import { toParticipantView } from "../services/appointments";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("PARTICIPANT"));

// ── Invoices ──────────────────────────────────────────────

// GET /api/participant/invoices
router.get("/invoices", async (req: Request, res: Response) => {
  try {
    const participantProfileId = req.user?.participantProfileId;
    if (!participantProfileId) {
      res.status(403).json({ success: false, error: "Participant profile required" });
      return;
    }

    const parsed = ParticipantInvoiceListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }

    const result = await getParticipantInvoices(participantProfileId, parsed.data);
    res.json({ success: true, data: result.data, cursor: result.cursor });
  } catch (err) {
    logger.error("List participant invoices error", err);
    res.status(500).json({ success: false, error: "Failed to list invoices" });
  }
});

// GET /api/participant/invoices/count
router.get("/invoices/count", async (req: Request, res: Response) => {
  try {
    const participantProfileId = req.user?.participantProfileId;
    if (!participantProfileId) {
      res.status(403).json({ success: false, error: "Participant profile required" });
      return;
    }

    const count = await getParticipantOutstandingInvoiceCount(participantProfileId);
    res.json({ success: true, data: { count } });
  } catch (err) {
    logger.error("Count participant invoices error", err);
    res.status(500).json({ success: false, error: "Failed to count invoices" });
  }
});

// GET /api/participant/invoices/:id
router.get("/invoices/:id", async (req: Request, res: Response) => {
  try {
    const participantProfileId = req.user?.participantProfileId;
    if (!participantProfileId) {
      res.status(403).json({ success: false, error: "Participant profile required" });
      return;
    }

    const invoice = await getParticipantInvoice(participantProfileId, req.params.id);
    if (!invoice) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    logger.error("Get participant invoice error", err);
    res.status(500).json({ success: false, error: "Failed to get invoice" });
  }
});

// ── Appointment Cancellation ──────────────────────────────

// POST /api/participant/appointments/:id/cancel
router.post(
  "/appointments/:id/cancel",
  validate(ParticipantCancelAppointmentSchema),
  async (req: Request, res: Response) => {
    try {
      const participantProfileId = req.user?.participantProfileId;
      const userId = req.user?.userId;
      if (!participantProfileId || !userId) {
        res.status(403).json({ success: false, error: "Participant profile required" });
        return;
      }

      const result = await participantCancelAppointment(
        participantProfileId,
        userId,
        req.params.id,
        req.body.cancelReason,
      );

      if ("error" in result) {
        if (result.error === "not_found") {
          res.status(404).json({ success: false, error: "Not found" });
          return;
        }
        if (result.error === "conflict") {
          res.status(409).json({ success: false, error: result.message });
          return;
        }
      }

      res.json({ success: true, data: toParticipantView((result as any).appointment) });
    } catch (err) {
      logger.error("Participant cancel appointment error", err);
      res.status(500).json({ success: false, error: "Failed to cancel appointment" });
    }
  },
);

export default router;
