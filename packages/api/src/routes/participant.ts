import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import { cancelHomeworkReminders } from "../services/notifications";
import {
  generateInstancesForEnrollment,
  getStreakData,
} from "../services/homework-instances";
import { CompleteHomeworkInstanceSchema, SubmitTrackerEntrySchema } from "@steady/shared";

const router = Router();

router.use(authenticate, requireRole("PARTICIPANT"));

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
    });

    res.json({ success: true, data: enrollments });
  } catch (err) {
    console.error("List participant enrollments error:", err);
    res.status(500).json({ success: false, error: "Failed to list enrollments" });
  }
});

// POST /api/participant/enrollments/:id/accept — Accept an invitation
router.post("/enrollments/:id/accept", async (req: Request, res: Response) => {
  try {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: req.params.id,
        participantId: req.user!.participantProfileId!,
        status: "INVITED",
      },
      include: {
        program: {
          include: {
            modules: {
              orderBy: { sortOrder: "asc" },
              select: { id: true },
            },
          },
        },
      },
    });

    if (!enrollment) {
      res.status(404).json({ success: false, error: "Invitation not found" });
      return;
    }

    // Accept enrollment and initialize progress for first module
    const firstModule = enrollment.program.modules[0];

    const updated = await prisma.enrollment.update({
      where: { id: req.params.id },
      data: {
        status: "ACTIVE",
        currentModuleId: firstModule?.id || null,
      },
    });

    // Create module progress entries
    if (enrollment.program.modules.length > 0) {
      const progressData = enrollment.program.modules.map((mod, index) => ({
        enrollmentId: enrollment.id,
        moduleId: mod.id,
        status: index === 0 ? "UNLOCKED" as const : "LOCKED" as const,
        ...(index === 0 ? { unlockedAt: new Date() } : {}),
      }));

      await prisma.moduleProgress.createMany({
        data: progressData,
        skipDuplicates: true,
      });
    }

    // Generate homework instances for any recurring homework parts
    generateInstancesForEnrollment(enrollment.id).catch((err) => {
      console.error("Failed to generate homework instances on accept:", err);
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Accept enrollment error:", err);
    res.status(500).json({ success: false, error: "Failed to accept enrollment" });
  }
});

// GET /api/participant/programs/:enrollmentId — Get program content with progress
router.get("/programs/:enrollmentId", async (req: Request, res: Response) => {
  try {
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: req.params.enrollmentId,
        participantId: req.user!.participantProfileId!,
        status: "ACTIVE",
      },
      include: {
        program: {
          include: {
            modules: {
              orderBy: { sortOrder: "asc" },
              include: {
                parts: {
                  orderBy: { sortOrder: "asc" },
                  select: {
                    id: true,
                    type: true,
                    title: true,
                    isRequired: true,
                    content: true,
                    sortOrder: true,
                  },
                },
              },
            },
          },
        },
        moduleProgress: true,
        partProgress: true,
      },
    });

    if (!enrollment) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    // Build progress maps
    const moduleProgressMap = new Map(
      enrollment.moduleProgress.map((mp) => [mp.moduleId, mp])
    );
    const partProgressMap = new Map(
      enrollment.partProgress.map((pp) => [pp.partId, pp])
    );

    // Assemble response with progress
    const modules = enrollment.program.modules.map((mod) => {
      const mp = moduleProgressMap.get(mod.id);
      return {
        id: mod.id,
        title: mod.title,
        sortOrder: mod.sortOrder,
        status: mp?.status || "LOCKED",
        unlockedAt: mp?.unlockedAt,
        completedAt: mp?.completedAt,
        parts: mod.parts.map((part) => {
          const pp = partProgressMap.get(part.id);
          return {
            ...part,
            progressStatus: pp?.status || "NOT_STARTED",
            completedAt: pp?.completedAt,
            responseData: pp?.responseData,
          };
        }),
      };
    });

    res.json({
      success: true,
      data: {
        enrollmentId: enrollment.id,
        status: enrollment.status,
        currentModuleId: enrollment.currentModuleId,
        program: {
          id: enrollment.program.id,
          title: enrollment.program.title,
          description: enrollment.program.description,
          cadence: enrollment.program.cadence,
        },
        modules,
      },
    });
  } catch (err) {
    console.error("Get program content error:", err);
    res.status(500).json({ success: false, error: "Failed to get program" });
  }
});

// POST /api/participant/progress/part/:partId — Mark part as completed
router.post("/progress/part/:partId", async (req: Request, res: Response) => {
  try {
    const { enrollmentId, responseData } = req.body;

    // Verify enrollment belongs to participant
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        id: enrollmentId,
        participantId: req.user!.participantProfileId!,
        status: "ACTIVE",
      },
    });

    if (!enrollment) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    // Verify part exists
    const part = await prisma.part.findUnique({
      where: { id: req.params.partId },
      include: { module: true },
    });

    if (!part) {
      res.status(404).json({ success: false, error: "Part not found" });
      return;
    }

    // Upsert part progress
    const progress = await prisma.partProgress.upsert({
      where: {
        enrollmentId_partId: {
          enrollmentId,
          partId: req.params.partId,
        },
      },
      create: {
        enrollmentId,
        partId: req.params.partId,
        status: "COMPLETED",
        completedAt: new Date(),
        responseData: responseData || null,
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date(),
        responseData: responseData || null,
      },
    });

    // Cancel homework reminders if this is a HOMEWORK part
    if (part.type === "HOMEWORK") {
      cancelHomeworkReminders(enrollmentId, req.params.partId).catch(() => {});
    }

    // Check if all required parts in the module are completed
    const moduleParts = await prisma.part.findMany({
      where: { moduleId: part.moduleId, isRequired: true },
      select: { id: true },
    });

    const completedParts = await prisma.partProgress.findMany({
      where: {
        enrollmentId,
        partId: { in: moduleParts.map((p) => p.id) },
        status: "COMPLETED",
      },
    });

    const moduleCompleted = completedParts.length >= moduleParts.length;

    if (moduleCompleted) {
      // Mark module as completed
      await prisma.moduleProgress.update({
        where: {
          enrollmentId_moduleId: {
            enrollmentId,
            moduleId: part.moduleId,
          },
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // Unlock next module (sequential unlock)
      const nextModule = await prisma.module.findFirst({
        where: {
          programId: part.module.programId,
          sortOrder: part.module.sortOrder + 1,
        },
      });

      if (nextModule) {
        await prisma.moduleProgress.upsert({
          where: {
            enrollmentId_moduleId: {
              enrollmentId,
              moduleId: nextModule.id,
            },
          },
          create: {
            enrollmentId,
            moduleId: nextModule.id,
            status: "UNLOCKED",
            unlockedAt: new Date(),
          },
          update: {
            status: "UNLOCKED",
            unlockedAt: new Date(),
          },
        });

        await prisma.enrollment.update({
          where: { id: enrollmentId },
          data: { currentModuleId: nextModule.id },
        });
      }
    }

    res.json({
      success: true,
      data: {
        progress,
        moduleCompleted,
      },
    });
  } catch (err) {
    console.error("Mark part complete error:", err);
    res.status(500).json({ success: false, error: "Failed to update progress" });
  }
});

// ── Homework Instance Endpoints ──────────────────────

// GET /api/participant/homework-instances — List instances for today (or a given date)
router.get("/homework-instances", async (req: Request, res: Response) => {
  try {
    const dateParam = req.query.date as string | undefined;
    const enrollmentId = req.query.enrollmentId as string | undefined;

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    targetDate.setUTCHours(0, 0, 0, 0);

    // Get all active enrollments for this participant
    const enrollmentFilter: Record<string, unknown> = {
      participantId: req.user!.participantProfileId!,
      status: "ACTIVE",
    };
    if (enrollmentId) {
      enrollmentFilter.id = enrollmentId;
    }

    const enrollments = await prisma.enrollment.findMany({
      where: enrollmentFilter,
      select: { id: true },
    });

    const enrollmentIds = enrollments.map((e) => e.id);

    const instances = await prisma.homeworkInstance.findMany({
      where: {
        enrollmentId: { in: enrollmentIds },
        dueDate: targetDate,
      },
      include: {
        part: {
          select: {
            id: true,
            title: true,
            content: true,
            type: true,
          },
        },
        enrollment: {
          select: {
            id: true,
            programId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json({ success: true, data: instances });
  } catch (err) {
    console.error("List homework instances error:", err);
    res.status(500).json({ success: false, error: "Failed to list homework instances" });
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

    if (!instance || instance.enrollment.participantId !== req.user!.participantProfileId!) {
      res.status(404).json({ success: false, error: "Instance not found" });
      return;
    }

    const streak = await getStreakData(instance.partId, instance.enrollmentId);
    res.json({ success: true, data: streak });
  } catch (err) {
    console.error("Get streak error:", err);
    res.status(500).json({ success: false, error: "Failed to get streak data" });
  }
});

// POST /api/participant/homework-instances/:id/complete — Complete an instance
router.post("/homework-instances/:id/complete", async (req: Request, res: Response) => {
  try {
    const instance = await prisma.homeworkInstance.findUnique({
      where: { id: req.params.id },
      include: {
        enrollment: {
          select: { participantId: true },
        },
      },
    });

    if (!instance || instance.enrollment.participantId !== req.user!.participantProfileId!) {
      res.status(404).json({ success: false, error: "Instance not found" });
      return;
    }

    if (instance.status === "COMPLETED") {
      res.status(409).json({ success: false, error: "Instance already completed" });
      return;
    }

    // Allow completion of past instances up to 48h back
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - 2);
    cutoff.setUTCHours(0, 0, 0, 0);

    if (instance.dueDate < cutoff) {
      res.status(400).json({ success: false, error: "Cannot complete instances older than 48 hours" });
      return;
    }

    const parsed = CompleteHomeworkInstanceSchema.safeParse(req.body);
    const response = parsed.success ? parsed.data.response : null;

    const updated = await prisma.homeworkInstance.update({
      where: { id: req.params.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        response: response ?? undefined,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Complete homework instance error:", err);
    res.status(500).json({ success: false, error: "Failed to complete instance" });
  }
});

// POST /api/participant/homework-instances/:id/skip — Skip an instance
router.post("/homework-instances/:id/skip", async (req: Request, res: Response) => {
  try {
    const instance = await prisma.homeworkInstance.findUnique({
      where: { id: req.params.id },
      include: {
        enrollment: {
          select: { participantId: true },
        },
      },
    });

    if (!instance || instance.enrollment.participantId !== req.user!.participantProfileId!) {
      res.status(404).json({ success: false, error: "Instance not found" });
      return;
    }

    if (instance.status !== "PENDING") {
      res.status(409).json({ success: false, error: "Can only skip pending instances" });
      return;
    }

    const updated = await prisma.homeworkInstance.update({
      where: { id: req.params.id },
      data: { status: "SKIPPED" },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Skip homework instance error:", err);
    res.status(500).json({ success: false, error: "Failed to skip instance" });
  }
});

// ── Daily Tracker Endpoints ──────────────────────────

// GET /api/participant/daily-trackers — List assigned trackers
router.get("/daily-trackers", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;

    // Find all active enrollments for this participant
    const enrollments = await prisma.enrollment.findMany({
      where: { participantId, status: "ACTIVE" },
      select: { id: true, programId: true },
    });

    const programIds = enrollments.map((e) => e.programId);
    const enrollmentIds = enrollments.map((e) => e.id);

    // Find trackers assigned via program or directly to enrollment
    const trackers = await prisma.dailyTracker.findMany({
      where: {
        isActive: true,
        OR: [
          { programId: { in: programIds } },
          { enrollmentId: { in: enrollmentIds } },
        ],
      },
      include: {
        fields: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    // Check today's completion status for each tracker
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const todayEntries = await prisma.dailyTrackerEntry.findMany({
      where: {
        trackerId: { in: trackers.map((t) => t.id) },
        userId: req.user!.userId,
        date: today,
      },
      select: { trackerId: true },
    });

    const completedTrackerIds = new Set(todayEntries.map((e) => e.trackerId));

    const data = trackers.map((t) => ({
      ...t,
      completedToday: completedTrackerIds.has(t.id),
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("List participant trackers error:", err);
    res.status(500).json({ success: false, error: "Failed to list trackers" });
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
    console.error("Get today tracker entry error:", err);
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
    const entryDate = new Date(date);
    entryDate.setUTCHours(0, 0, 0, 0);

    const entry = await prisma.dailyTrackerEntry.upsert({
      where: {
        trackerId_userId_date: {
          trackerId: req.params.id,
          userId: req.user!.userId,
          date: entryDate,
        },
      },
      create: {
        trackerId: req.params.id,
        userId: req.user!.userId,
        date: entryDate,
        responses,
        completedAt: new Date(),
      },
      update: {
        responses,
        completedAt: new Date(),
      },
    });

    res.json({ success: true, data: entry });
  } catch (err) {
    console.error("Submit tracker entry error:", err);
    res.status(500).json({ success: false, error: "Failed to submit entry" });
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
    console.error("Get tracker history error:", err);
    res.status(500).json({ success: false, error: "Failed to get history" });
  }
});

// GET /api/participant/daily-trackers/:id/streak — Current streak
router.get("/daily-trackers/:id/streak", async (req: Request, res: Response) => {
  try {
    const entries = await prisma.dailyTrackerEntry.findMany({
      where: {
        trackerId: req.params.id,
        userId: req.user!.userId,
      },
      orderBy: { date: "desc" },
      select: { date: true },
      take: 365, // max 1 year lookback
    });

    let streak = 0;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < entries.length; i++) {
      const expected = new Date(today);
      expected.setUTCDate(expected.getUTCDate() - i);
      const expectedStr = expected.toISOString().split("T")[0];
      const entryStr = entries[i].date.toISOString().split("T")[0];

      if (entryStr === expectedStr) {
        streak++;
      } else {
        break;
      }
    }

    res.json({ success: true, data: { streak, totalEntries: entries.length } });
  } catch (err) {
    console.error("Get tracker streak error:", err);
    res.status(500).json({ success: false, error: "Failed to get streak" });
  }
});

export default router;
