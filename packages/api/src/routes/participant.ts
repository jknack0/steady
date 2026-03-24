import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import { getStreakData } from "../services/homework-instances";
import { SubmitTrackerEntrySchema } from "@steady/shared";
import {
  acceptEnrollment,
  getProgramWithProgress,
  markPartComplete,
  getHomeworkInstances,
  saveHomeworkResponse,
  completeHomeworkInstance,
  skipHomeworkInstance,
  getAssignedTrackers,
  submitTrackerEntry,
  getTrackerStreak,
  NotFoundError,
  ConflictError,
  ValidationError,
} from "../services/participant";
import { logRtmEngagement } from "../services/rtm";

const router = Router();

router.use(authenticate, requireRole("PARTICIPANT"));

// ── Helper ───────────────────────────────────────────

function handleServiceError(res: Response, err: unknown, fallbackMsg: string) {
  if (err instanceof NotFoundError) {
    res.status(404).json({ success: false, error: err.message });
  } else if (err instanceof ConflictError) {
    res.status(409).json({ success: false, error: err.message });
  } else if (err instanceof ValidationError) {
    if (err.details) {
      res.status(400).json({ success: false, error: err.message, details: err.details });
    } else {
      res.status(400).json({ success: false, error: err.message });
    }
  } else {
    logger.error(fallbackMsg, err);
    res.status(500).json({ success: false, error: fallbackMsg });
  }
}

// GET /api/participant/enrollments — List my enrollments
router.get("/enrollments", async (req: Request, res: Response) => {
  try {
    const enrollments = await prisma.enrollment.findMany({
      where: {
        participantId: req.user!.participantProfileId!,
        status: { in: ["ACTIVE", "INVITED"] },
      },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            description: true,
            coverImageUrl: true,
            cadence: true,
            status: true,
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
      take: 50, // Cap at 50 enrollments per participant
    });

    res.json({ success: true, data: enrollments });
  } catch (err) {
    logger.error("List participant enrollments error", err);
    res.status(500).json({ success: false, error: "Failed to list enrollments" });
  }
});

// POST /api/participant/enrollments/:id/accept — Accept an invitation
router.post("/enrollments/:id/accept", async (req: Request, res: Response) => {
  try {
    const updated = await acceptEnrollment(req.params.id, req.user!.participantProfileId!);
    res.json({ success: true, data: updated });
  } catch (err) {
    handleServiceError(res, err, "Failed to accept enrollment");
  }
});

// GET /api/participant/programs/:enrollmentId — Get program content with progress
router.get("/programs/:enrollmentId", async (req: Request, res: Response) => {
  try {
    const data = await getProgramWithProgress(req.params.enrollmentId, req.user!.participantProfileId!);
    res.json({ success: true, data });
  } catch (err) {
    handleServiceError(res, err, "Failed to get program");
  }
});

// POST /api/participant/progress/part/:partId — Mark part as completed
router.post("/progress/part/:partId", async (req: Request, res: Response) => {
  try {
    const { enrollmentId, responseData } = req.body;
    const data = await markPartComplete(enrollmentId, req.params.partId, req.user!.participantProfileId!, responseData);

    // Log RTM engagement for assessment completions (fire-and-forget)
    const part = await prisma.part.findUnique({
      where: { id: req.params.partId },
      select: { type: true },
    });
    if (part?.type === "ASSESSMENT") {
      logRtmEngagement(req.user!.userId, "ASSESSMENT_COMPLETED", enrollmentId, {
        partId: req.params.partId,
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    handleServiceError(res, err, "Failed to update progress");
  }
});

// ── Homework Instance Endpoints ──────────────────────

// GET /api/participant/homework-instances — List instances for today (or a given date)
router.get("/homework-instances", async (req: Request, res: Response) => {
  try {
    const data = await getHomeworkInstances(req.user!.participantProfileId!, {
      date: req.query.date as string | undefined,
      enrollmentId: req.query.enrollmentId as string | undefined,
    });
    res.json({ success: true, data });
  } catch (err) {
    handleServiceError(res, err, "Failed to list homework instances");
  }
});

// GET /api/participant/homework-instances/:id/streak — Get streak data
router.get("/homework-instances/:id/streak", async (req: Request, res: Response) => {
  try {
    const instance = await prisma.homeworkInstance.findUnique({
      where: { id: req.params.id },
      include: {
        enrollment: {
          select: { participantId: true },
        },
      },
    });

    const ownsInstance = instance &&
      (instance.participantId === req.user!.participantProfileId! ||
       instance.enrollment?.participantId === req.user!.participantProfileId!);
    if (!ownsInstance) {
      res.status(404).json({ success: false, error: "Instance not found" });
      return;
    }

    const streak = instance.partId && instance.enrollmentId
      ? await getStreakData(instance.partId, instance.enrollmentId)
      : { currentStreak: 0, longestStreak: 0, totalCompleted: 0, totalInstances: 0, completionRate: 0 };
    res.json({ success: true, data: streak });
  } catch (err) {
    logger.error("Get streak error", err);
    res.status(500).json({ success: false, error: "Failed to get streak data" });
  }
});

// PATCH /api/participant/homework-instances/:id/response — Auto-save responses
router.patch("/homework-instances/:id/response", async (req: Request, res: Response) => {
  try {
    const data = await saveHomeworkResponse(req.params.id, req.user!.participantProfileId!, req.body);
    res.json({ success: true, data });
  } catch (err) {
    handleServiceError(res, err, "Failed to save homework response");
  }
});

// POST /api/participant/homework-instances/:id/complete — Complete an instance
router.post("/homework-instances/:id/complete", async (req: Request, res: Response) => {
  try {
    const data = await completeHomeworkInstance(req.params.id, req.user!.participantProfileId!, req.body);

    // Log RTM engagement for homework completion (fire-and-forget)
    if (data.enrollmentId) {
      logRtmEngagement(req.user!.userId, "HOMEWORK_COMPLETED", data.enrollmentId, {
        partId: data.partId,
        homeworkInstanceId: data.id,
      });
    }

    res.json({ success: true, data });
  } catch (err) {
    handleServiceError(res, err, "Failed to complete instance");
  }
});

// POST /api/participant/homework-instances/:id/skip — Skip an instance
router.post("/homework-instances/:id/skip", async (req: Request, res: Response) => {
  try {
    const data = await skipHomeworkInstance(req.params.id, req.user!.participantProfileId!);
    res.json({ success: true, data });
  } catch (err) {
    handleServiceError(res, err, "Failed to skip instance");
  }
});

// ── Daily Tracker Endpoints ──────────────────────────

// GET /api/participant/daily-trackers — List assigned trackers
router.get("/daily-trackers", async (req: Request, res: Response) => {
  try {
    const data = await getAssignedTrackers(req.user!.participantProfileId!, req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    handleServiceError(res, err, "Failed to list trackers");
  }
});

// GET /api/participant/daily-trackers/:id/today — Get today's entry
router.get("/daily-trackers/:id/today", async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const entry = await prisma.dailyTrackerEntry.findUnique({
      where: {
        trackerId_userId_date: {
          trackerId: req.params.id,
          userId: req.user!.userId,
          date: today,
        },
      },
    });

    const tracker = await prisma.dailyTracker.findUnique({
      where: { id: req.params.id },
      include: { fields: { orderBy: { sortOrder: "asc" } } },
    });

    if (!tracker) {
      res.status(404).json({ success: false, error: "Tracker not found" });
      return;
    }

    res.json({ success: true, data: { tracker, entry } });
  } catch (err) {
    logger.error("Get today tracker entry error", err);
    res.status(500).json({ success: false, error: "Failed to get today's entry" });
  }
});

// POST /api/participant/daily-trackers/:id/entries — Submit entry (upsert)
router.post("/daily-trackers/:id/entries", async (req: Request, res: Response) => {
  try {
    const parsed = SubmitTrackerEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }

    const { date, responses } = parsed.data;
    const data = await submitTrackerEntry(req.params.id, req.user!.userId, date, responses);
    res.json({ success: true, data });
  } catch (err) {
    handleServiceError(res, err, "Failed to submit entry");
  }
});

// GET /api/participant/daily-trackers/:id/history — Own past entries
router.get("/daily-trackers/:id/history", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, cursor, limit } = req.query;
    const take = Math.min(parseInt(limit as string) || 30, 100);

    const where: any = {
      trackerId: req.params.id,
      userId: req.user!.userId,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const entries = await prisma.dailyTrackerEntry.findMany({
      where,
      orderBy: { date: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    const hasMore = entries.length > take;
    const data = hasMore ? entries.slice(0, take) : entries;

    res.json({
      success: true,
      data,
      cursor: hasMore ? data[data.length - 1].id : null,
    });
  } catch (err) {
    logger.error("Get tracker history error", err);
    res.status(500).json({ success: false, error: "Failed to get history" });
  }
});

// GET /api/participant/daily-trackers/:id/streak — Current streak
router.get("/daily-trackers/:id/streak", async (req: Request, res: Response) => {
  try {
    const data = await getTrackerStreak(req.params.id, req.user!.userId);
    res.json({ success: true, data });
  } catch (err) {
    handleServiceError(res, err, "Failed to get streak");
  }
});

export default router;
