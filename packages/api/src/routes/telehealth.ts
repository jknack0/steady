import { Router, Request, Response } from "express";
import express from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { CreateTelehealthTokenSchema, UpdateSpeakerMapSchema } from "@steady/shared";
import { generateToken, handleWebhookEvent, TelehealthError } from "../services/telehealth";
import { retryTranscription } from "../services/transcription";
import { prisma } from "@steady/db";
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
router.get(
  "/:appointmentId/transcript",
  authenticate,
  requireRole("CLINICIAN", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.params;

      // Look up appointment and verify practice membership
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { practiceId: true },
      });

      if (!appointment) {
        res.status(404).json({ success: false, error: "Appointment not found" });
        return;
      }

      // Verify clinician belongs to the same practice
      const clinicianProfileId = req.user!.clinicianProfileId;
      if (clinicianProfileId) {
        const membership = await prisma.practiceMembership.findFirst({
          where: {
            clinicianId: clinicianProfileId,
            practiceId: appointment.practiceId,
          },
        });
        if (!membership) {
          res.status(403).json({ success: false, error: "Not authorized for this appointment" });
          return;
        }
      }

      const session = await prisma.telehealthSession.findUnique({
        where: { appointmentId },
        select: {
          id: true,
          transcriptStatus: true,
          transcript: true,
          transcriptError: true,
          transcriptionAttempts: true,
          transcribedAt: true,
        },
      });

      if (!session) {
        res.status(404).json({ success: false, error: "Telehealth session not found" });
        return;
      }

      // Parse transcript JSON (stored as encrypted text, decrypted by middleware)
      let parsedTranscript = null;
      if (session.transcript) {
        try {
          parsedTranscript = JSON.parse(session.transcript);
        } catch {
          logger.warn("Failed to parse transcript JSON", `sessionId=${session.id}`);
        }
      }

      res.json({
        success: true,
        data: {
          sessionId: session.id,
          status: session.transcriptStatus,
          transcript: parsedTranscript,
          error: session.transcriptError,
          attempts: session.transcriptionAttempts,
          transcribedAt: session.transcribedAt,
        },
      });
    } catch (err) {
      logger.error("Get transcript error", err);
      res.status(500).json({ success: false, error: "Failed to fetch transcript" });
    }
  },
);

// PATCH /api/telehealth/:appointmentId/transcript/speakers
router.patch(
  "/:appointmentId/transcript/speakers",
  authenticate,
  requireRole("CLINICIAN", "ADMIN"),
  validate(UpdateSpeakerMapSchema),
  async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.params;
      const { speakerMap } = req.body;

      // Look up appointment and verify practice membership
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { practiceId: true },
      });

      if (!appointment) {
        res.status(404).json({ success: false, error: "Appointment not found" });
        return;
      }

      const clinicianProfileId = req.user!.clinicianProfileId;
      if (clinicianProfileId) {
        const membership = await prisma.practiceMembership.findFirst({
          where: {
            clinicianId: clinicianProfileId,
            practiceId: appointment.practiceId,
          },
        });
        if (!membership) {
          res.status(403).json({ success: false, error: "Not authorized for this appointment" });
          return;
        }
      }

      const session = await prisma.telehealthSession.findUnique({
        where: { appointmentId },
        select: { id: true, transcript: true, transcriptStatus: true },
      });

      if (!session) {
        res.status(404).json({ success: false, error: "Telehealth session not found" });
        return;
      }

      if (session.transcriptStatus !== "COMPLETED" || !session.transcript) {
        res.status(409).json({ success: false, error: "Transcript not available for editing" });
        return;
      }

      // Parse existing transcript, update speaker map, re-serialize
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(session.transcript);
      } catch {
        res.status(500).json({ success: false, error: "Corrupt transcript data" });
        return;
      }

      parsed.speakerMap = speakerMap;

      await prisma.telehealthSession.update({
        where: { id: session.id },
        data: {
          transcript: JSON.stringify(parsed),
        },
      });

      res.json({ success: true });
    } catch (err) {
      logger.error("Update speaker map error", err);
      res.status(500).json({ success: false, error: "Failed to update speaker map" });
    }
  },
);

// POST /api/telehealth/:appointmentId/transcript/retry
router.post(
  "/:appointmentId/transcript/retry",
  authenticate,
  requireRole("CLINICIAN", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { appointmentId } = req.params;

      // Look up appointment and verify practice membership
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { practiceId: true },
      });

      if (!appointment) {
        res.status(404).json({ success: false, error: "Appointment not found" });
        return;
      }

      const clinicianProfileId = req.user!.clinicianProfileId;
      if (clinicianProfileId) {
        const membership = await prisma.practiceMembership.findFirst({
          where: {
            clinicianId: clinicianProfileId,
            practiceId: appointment.practiceId,
          },
        });
        if (!membership) {
          res.status(403).json({ success: false, error: "Not authorized for this appointment" });
          return;
        }
      }

      const session = await prisma.telehealthSession.findUnique({
        where: { appointmentId },
        select: { id: true },
      });

      if (!session) {
        res.status(404).json({ success: false, error: "Telehealth session not found" });
        return;
      }

      await retryTranscription(session.id);

      res.json({ success: true });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("FAILED")) {
          res.status(409).json({ success: false, error: err.message });
          return;
        }
        if (err.message.includes("No audio path")) {
          res.status(409).json({ success: false, error: err.message });
          return;
        }
      }
      logger.error("Retry transcription error", err);
      res.status(500).json({ success: false, error: "Failed to retry transcription" });
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
