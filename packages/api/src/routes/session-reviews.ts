import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { validate } from "../middleware/validate";
import { SubmitReviewSchema } from "@steady/shared";
import {
  submitReview,
  getReviewForAppointment,
  getReviewWithTemplate,
} from "../services/session-reviews";
import { logger } from "../lib/logger";

const router = Router({ mergeParams: true });

// Participant submits review
router.post(
  "/:id/review",
  authenticate,
  requireRole("PARTICIPANT"),
  validate(SubmitReviewSchema),
  async (req: Request, res: Response) => {
    try {
      const participantProfileId = req.user?.participantProfileId;
      if (!participantProfileId) {
        res.status(403).json({ success: false, error: "Participant profile required" });
        return;
      }

      const result = await submitReview(participantProfileId, req.params.id, req.body);
      if (result && "error" in result) {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      logger.error("Submit review error", err);
      res.status(500).json({ success: false, error: "Failed to submit review" });
    }
  },
);

// Clinician gets review for appointment
router.get(
  "/:id/review",
  authenticate,
  requireRole("CLINICIAN", "ADMIN"),
  requirePracticeCtx,
  async (req: Request, res: Response) => {
    try {
      const ctx = res.locals.practiceCtx!;
      const appointment = await prisma.appointment.findFirst({
        where: { id: req.params.id, practiceId: ctx.practiceId },
      });
      if (!appointment) {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (!ctx.isAccountOwner && appointment.clinicianId !== ctx.clinicianProfileId) {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }

      const review = await getReviewForAppointment(req.params.id);
      res.json({ success: true, data: review });
    } catch (err) {
      logger.error("Get review error", err);
      res.status(500).json({ success: false, error: "Failed to get review" });
    }
  },
);

export default router;

// Participant view: mounted on /api/participant/appointments/:id/review
export const participantReviewRouter = Router({ mergeParams: true });

participantReviewRouter.get(
  "/:id/review",
  authenticate,
  requireRole("PARTICIPANT"),
  async (req: Request, res: Response) => {
    try {
      const participantProfileId = req.user?.participantProfileId;
      if (!participantProfileId) {
        res.status(403).json({ success: false, error: "Participant profile required" });
        return;
      }

      const result = await getReviewWithTemplate(participantProfileId, req.params.id);
      if ("error" in result) {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error("Get participant review error", err);
      res.status(500).json({ success: false, error: "Failed to get review" });
    }
  },
);
