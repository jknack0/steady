import { Router, Request, Response } from "express";
import express from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { CreateTelehealthTokenSchema } from "@steady/shared";
import { generateToken, handleWebhookEvent, TelehealthError } from "../services/telehealth";
import {
  requestRecordingConsent,
  respondToConsent,
  stopRecording,
  getRecordingState,
} from "../services/recording-control";
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

// GET /api/telehealth/:appointmentId/recording/state
// Returns current recording state (used for polling by both participants)
router.get(
  "/:appointmentId/recording/state",
  authenticate,
  requireRole("CLINICIAN", "PARTICIPANT", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.params;
      const state = await getRecordingState(appointmentId);
      res.json({ success: true, data: state });
    } catch (err) {
      logger.error("Get recording state error", err);
      res.status(500).json({ success: false, error: "Failed to get state" });
    }
  },
);

// POST /api/telehealth/:appointmentId/recording/request-consent
// Clinician initiates a consent request — creates PENDING consent + broadcasts
router.post(
  "/:appointmentId/recording/request-consent",
  authenticate,
  requireRole("CLINICIAN", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.params;
      const userId = req.user!.userId;
      const result = await requestRecordingConsent(appointmentId, userId);
      res.json({ success: true, data: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      logger.error("Request consent error", err);
      res.status(400).json({ success: false, error: msg });
    }
  },
);

// POST /api/telehealth/:appointmentId/recording/consent
// Patient (or same-practice clinician in test mode) responds to a consent request
router.post(
  "/:appointmentId/recording/consent",
  authenticate,
  requireRole("PARTICIPANT", "CLINICIAN", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { consentId, granted } = req.body;
      const userId = req.user!.userId;

      if (typeof consentId !== "string" || typeof granted !== "boolean") {
        res.status(400).json({ success: false, error: "Invalid request" });
        return;
      }

      // Capture IP for audit
      const ipAddress =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.socket.remoteAddress ||
        undefined;

      const result = await respondToConsent(consentId, userId, granted, ipAddress);
      res.json({ success: true, data: result });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      logger.error("Respond to consent error", err);
      res.status(400).json({ success: false, error: msg });
    }
  },
);

// POST /api/telehealth/:appointmentId/recording/stop
// Stop an active recording (clinician-initiated or patient revoke)
router.post(
  "/:appointmentId/recording/stop",
  authenticate,
  requireRole("CLINICIAN", "PARTICIPANT", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.params;
      const userId = req.user!.userId;
      const isRevoke = req.user!.role === "PARTICIPANT";
      await stopRecording(appointmentId, userId, isRevoke);
      res.json({ success: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      logger.error("Stop recording error", err);
      res.status(400).json({ success: false, error: msg });
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
          summary: session.summary,
          summaryStatus: session.summaryStatus,
          summarizedAt: session.summarizedAt,
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
  // LiveKit sends Content-Type: "application/webhook+json" (NOT
  // "application/json"), so a strict type match misses the request and
  // the body gets parsed as JSON elsewhere, corrupting the bytes the
  // SHA-256 signature was computed over. Match any content type here —
  // this router ONLY handles the webhook endpoint, so it's safe.
  express.raw({ type: () => true }),
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
