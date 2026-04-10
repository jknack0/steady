import { Router, Request, Response } from "express";
import express from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { CreateTelehealthTokenSchema } from "@steady/shared";
import { generateToken, handleWebhookEvent, TelehealthError } from "../services/telehealth";
import { logger } from "../lib/logger";

// ── Main router (registered after express.json()) ──────

const router = Router();

// POST /api/telehealth/token
// Both clinicians and participants can request a token.
// Auth required — ownership verified in service layer.
router.post(
  "/token",
  authenticate,
  requireRole("CLINICIAN", "PARTICIPANT", "ADMIN"),
  validate(CreateTelehealthTokenSchema),
  async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.body;
      const userId = req.user!.userId;
      const role = req.user!.role === "PARTICIPANT" ? "PARTICIPANT" as const : "CLINICIAN" as const;

      const result = await generateToken(appointmentId, userId, role);

      res.json({ success: true, data: result });
    } catch (err) {
      if (err instanceof TelehealthError) {
        res.status(err.statusCode).json({ success: false, error: err.message });
        return;
      }
      logger.error("Telehealth token generation error", err);
      res.status(500).json({ success: false, error: "Failed to generate video token" });
    }
  },
);

// GET /api/telehealth/:appointmentId/transcript
// Returns the transcript for a completed session.
router.get(
  "/:appointmentId/transcript",
  authenticate,
  requireRole("CLINICIAN", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.params;
      const clinicianProfileId = req.user!.clinicianProfileId;

      if (!clinicianProfileId) {
        res.status(403).json({ success: false, error: "Not authorized" });
        return;
      }

      // Verify ownership
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
          deletedAt: null,
        },
        include: {
          telehealthSession: true,
        },
      });

      if (!appointment) {
        res.status(404).json({ success: false, error: "Appointment not found" });
        return;
      }

      // Allow same-practice clinicians
      if (appointment.clinicianId !== clinicianProfileId) {
        const sameClinic = await prisma.practiceMembership.findFirst({
          where: {
            practiceId: appointment.practiceId,
            clinicianId: clinicianProfileId,
          },
        });
        if (!sameClinic) {
          res.status(403).json({ success: false, error: "Not authorized" });
          return;
        }
      }

      if (!appointment.telehealthSession) {
        res.status(404).json({ success: false, error: "No telehealth session found" });
        return;
      }

      const session = appointment.telehealthSession;

      res.json({
        success: true,
        data: {
          status: session.transcriptStatus,
          transcribedAt: session.transcribedAt,
          durationSeconds: session.durationSeconds,
          transcript: session.transcript,
        },
      });
    } catch (err) {
      logger.error("Get transcript error", err);
      res.status(500).json({ success: false, error: "Failed to fetch transcript" });
    }
  },
);

export default router;

// ── Webhook router (registered BEFORE express.json()) ──
// LiveKit sends room/participant events here.
// NO authenticate middleware — signature verified via LiveKit SDK (HIPAA COND-3d).
// Uses express.raw() for signature verification (same pattern as Stripe webhooks).

export const telehealthWebhookRouter = Router();

telehealthWebhookRouter.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req: Request, res: Response) => {
    try {
      // LiveKit sends the auth token in the Authorization header
      const authHeader = req.headers["authorization"] as string | undefined;
      if (!authHeader) {
        res.status(401).json({ error: "Missing authorization header" });
        return;
      }

      // Body arrives as raw Buffer from express.raw() — convert to string for signature verification
      const rawBody = req.body;
      let body: string;
      if (Buffer.isBuffer(rawBody)) {
        body = rawBody.toString("utf8");
      } else if (typeof rawBody === "string") {
        body = rawBody;
      } else {
        // Fallback: re-serialize if somehow parsed as JSON
        body = JSON.stringify(rawBody);
      }

      await handleWebhookEvent(body, authHeader);

      // Always return 200 to prevent LiveKit retry storms
      res.json({ received: true });
    } catch (err) {
      // Signature verification failures should return 401
      if (err instanceof Error && err.message.toLowerCase().includes("signature")) {
        logger.warn("LiveKit webhook signature verification failed");
        res.status(401).json({ error: "Invalid webhook signature" });
        return;
      }
      // All other errors: return 200 to prevent retries on unrecoverable errors
      logger.error("LiveKit webhook processing error", err);
      res.json({ received: true });
    }
  },
);
