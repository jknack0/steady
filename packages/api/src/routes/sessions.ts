import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import {
  scheduleSessionReminders,
  cancelSessionReminders,
  scheduleTaskReminder,
} from "../services/notifications";

const router = Router();

router.use(authenticate);

// ── Clinician Endpoints ─────────────────────────────

// POST /api/sessions — Create session + CalendarEvent for participant
router.post("/", requireRole("CLINICIAN", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const { enrollmentId, scheduledAt, videoCallUrl, durationMinutes = 60 } = req.body;

    if (!enrollmentId || !scheduledAt) {
      res.status(400).json({
        success: false,
        error: "enrollmentId and scheduledAt are required",
      });
      return;
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        participant: {
          include: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        program: { select: { title: true } },
      },
    });

    if (!enrollment) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    const startTime = new Date(scheduledAt);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

    // Create session + calendar event atomically
    const [session] = await prisma.$transaction([
      prisma.session.create({
        data: {
          enrollmentId,
          scheduledAt: startTime,
          videoCallUrl: videoCallUrl || null,
          status: "SCHEDULED",
        },
      }),
      prisma.calendarEvent.create({
        data: {
          participantId: enrollment.participant.id,
          title: `Session: ${enrollment.program.title}`,
          startTime,
          endTime,
          eventType: "SESSION",
        },
      }),
    ]);

    // Auto-schedule 3 reminders (24h, 1h, 10min before)
    const participantUserId = enrollment.participant.user.id;
    scheduleSessionReminders(participantUserId, session.id, startTime).catch(
      (err) => console.error("Failed to schedule session reminders:", err)
    );

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    console.error("Create session error:", err);
    res.status(500).json({ success: false, error: "Failed to create session" });
  }
});

// GET /api/sessions — List sessions for clinician (filterable)
router.get("/", requireRole("CLINICIAN", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { status, enrollmentId, startDate, endDate, cursor, limit = "50" } = req.query;
    const take = Math.min(parseInt(limit as string) || 50, 100);

    const programs = await prisma.program.findMany({
      where: { clinicianId: clinicianProfileId },
      select: { id: true },
    });
    const programIds = programs.map((p) => p.id);

    const where: any = {
      enrollment: { programId: { in: programIds } },
    };
    if (status) where.status = status;
    if (enrollmentId) where.enrollmentId = enrollmentId as string;
    if (startDate || endDate) {
      where.scheduledAt = {};
      if (startDate) where.scheduledAt.gte = new Date(startDate as string);
      if (endDate) where.scheduledAt.lte = new Date(endDate as string);
    }

    const sessions = await prisma.session.findMany({
      where,
      include: {
        enrollment: {
          include: {
            participant: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
            program: { select: { id: true, title: true } },
          },
        },
        moduleCompleted: { select: { id: true, title: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    });

    const hasMore = sessions.length > take;
    const data = hasMore ? sessions.slice(0, take) : sessions;

    res.json({
      success: true,
      data: data.map((s) => ({
        id: s.id,
        scheduledAt: s.scheduledAt,
        status: s.status,
        videoCallUrl: s.videoCallUrl,
        clinicianNotes: s.clinicianNotes,
        participantSummary: s.participantSummary,
        participantId: s.enrollment.participant.user.id,
        participantName: `${s.enrollment.participant.user.firstName} ${s.enrollment.participant.user.lastName}`.trim(),
        participantEmail: s.enrollment.participant.user.email,
        programId: s.enrollment.program.id,
        programTitle: s.enrollment.program.title,
        enrollmentId: s.enrollmentId,
        moduleCompleted: s.moduleCompleted,
      })),
      cursor: hasMore ? data[data.length - 1].id : null,
    });
  } catch (err) {
    console.error("List sessions error:", err);
    res.status(500).json({ success: false, error: "Failed to list sessions" });
  }
});

// ── Participant Endpoints (must be before /:id routes) ──

// GET /api/sessions/upcoming — Next scheduled session for participant
router.get("/upcoming", requireRole("PARTICIPANT"), async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;

    const enrollment = await prisma.enrollment.findFirst({
      where: { participantId, status: "ACTIVE" },
      select: { id: true },
    });

    if (!enrollment) {
      res.json({ success: true, data: null });
      return;
    }

    const session = await prisma.session.findFirst({
      where: {
        enrollmentId: enrollment.id,
        status: "SCHEDULED",
        scheduledAt: { gte: new Date() },
      },
      include: {
        enrollment: {
          include: {
            program: { select: { title: true, clinicianId: true } },
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    });

    if (!session) {
      res.json({ success: true, data: null });
      return;
    }

    const clinician = await prisma.clinicianProfile.findUnique({
      where: { id: session.enrollment.program.clinicianId },
      include: { user: { select: { firstName: true, lastName: true } } },
    });

    res.json({
      success: true,
      data: {
        id: session.id,
        scheduledAt: session.scheduledAt,
        videoCallUrl: session.videoCallUrl,
        programTitle: session.enrollment.program.title,
        clinicianName: clinician
          ? `${clinician.user.firstName} ${clinician.user.lastName}`.trim()
          : null,
      },
    });
  } catch (err) {
    console.error("Get upcoming session error:", err);
    res.status(500).json({ success: false, error: "Failed to get upcoming session" });
  }
});

// GET /api/sessions/history — Past sessions for participant
router.get("/history", requireRole("PARTICIPANT"), async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;
    const { cursor, limit = "20" } = req.query;
    const take = Math.min(parseInt(limit as string) || 20, 50);

    const enrollments = await prisma.enrollment.findMany({
      where: { participantId },
      select: { id: true },
    });
    const enrollmentIds = enrollments.map((e) => e.id);

    if (enrollmentIds.length === 0) {
      res.json({ success: true, data: [], cursor: null });
      return;
    }

    const sessions = await prisma.session.findMany({
      where: {
        enrollmentId: { in: enrollmentIds },
        status: { in: ["COMPLETED", "NO_SHOW"] },
      },
      include: {
        enrollment: {
          include: {
            program: { select: { title: true, clinicianId: true } },
          },
        },
        moduleCompleted: { select: { title: true } },
      },
      orderBy: { scheduledAt: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    });

    const hasMore = sessions.length > take;
    const data = hasMore ? sessions.slice(0, take) : sessions;

    res.json({
      success: true,
      data: data.map((s) => ({
        id: s.id,
        scheduledAt: s.scheduledAt,
        status: s.status,
        participantSummary: s.participantSummary,
        programTitle: s.enrollment.program.title,
        moduleCompleted: s.moduleCompleted?.title || null,
      })),
      cursor: hasMore ? data[data.length - 1].id : null,
    });
  } catch (err) {
    console.error("Get session history error:", err);
    res.status(500).json({ success: false, error: "Failed to get session history" });
  }
});

// ── Clinician /:id Routes ────────────────────────────

// PUT /api/sessions/:id — Update (reschedule, change video link)
router.put("/:id", requireRole("CLINICIAN", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        enrollment: {
          include: {
            participant: {
              include: { user: { select: { id: true } } },
            },
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    const { scheduledAt, status, videoCallUrl, clinicianNotes, participantSummary } = req.body;

    const data: any = {};
    if (scheduledAt !== undefined) data.scheduledAt = new Date(scheduledAt);
    if (status !== undefined) data.status = status;
    if (videoCallUrl !== undefined) data.videoCallUrl = videoCallUrl;
    if (clinicianNotes !== undefined) data.clinicianNotes = clinicianNotes;
    if (participantSummary !== undefined) data.participantSummary = participantSummary;

    const updated = await prisma.session.update({
      where: { id: req.params.id },
      data,
    });

    if (status === "CANCELLED") {
      cancelSessionReminders(session.id).catch(() => {});
    }

    if (scheduledAt && scheduledAt !== session.scheduledAt.toISOString()) {
      const participantUserId = session.enrollment.participant.user.id;
      await cancelSessionReminders(session.id);
      scheduleSessionReminders(participantUserId, session.id, new Date(scheduledAt)).catch(() => {});
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update session error:", err);
    res.status(500).json({ success: false, error: "Failed to update session" });
  }
});

// PUT /api/sessions/:id/complete — Mark completed with notes + module unlock + task push
router.put("/:id/complete", requireRole("CLINICIAN", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const { clinicianNotes, participantSummary, moduleCompletedId, tasksToAssign } = req.body;

    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        enrollment: {
          include: {
            participant: {
              include: { user: { select: { id: true } } },
            },
            program: {
              include: {
                modules: { orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true } },
              },
            },
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    if (session.status !== "SCHEDULED") {
      res.status(409).json({ success: false, error: "Session is not in SCHEDULED state" });
      return;
    }

    // Mark session completed
    const updated = await prisma.session.update({
      where: { id: req.params.id },
      data: {
        status: "COMPLETED",
        clinicianNotes: clinicianNotes || null,
        participantSummary: participantSummary || null,
        moduleCompletedId: moduleCompletedId || null,
      },
    });

    // Cancel pending reminders
    cancelSessionReminders(session.id).catch(() => {});

    const participantProfileId = session.enrollment.participant.id;
    const participantUserId = session.enrollment.participant.user.id;
    const enrollmentId = session.enrollmentId;

    // If a module was completed, mark it and unlock next
    if (moduleCompletedId) {
      await prisma.moduleProgress.upsert({
        where: {
          enrollmentId_moduleId: { enrollmentId, moduleId: moduleCompletedId },
        },
        create: {
          enrollmentId,
          moduleId: moduleCompletedId,
          status: "COMPLETED",
          completedAt: new Date(),
        },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      // Find and unlock next module
      const modules = session.enrollment.program.modules;
      const currentIdx = modules.findIndex((m) => m.id === moduleCompletedId);
      const nextModule = modules[currentIdx + 1];

      if (nextModule) {
        await prisma.moduleProgress.upsert({
          where: {
            enrollmentId_moduleId: { enrollmentId, moduleId: nextModule.id },
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

    // Push tasks to participant
    if (Array.isArray(tasksToAssign) && tasksToAssign.length > 0) {
      for (const task of tasksToAssign) {
        if (!task.title?.trim()) continue;

        const created = await prisma.task.create({
          data: {
            participantId: participantProfileId,
            title: task.title.trim(),
            description: task.description || null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            sourceType: "SESSION",
            sourceId: session.id,
          },
        });

        if (created.dueDate) {
          scheduleTaskReminder(participantUserId, created.id, created.title, created.dueDate).catch(() => {});
        }
      }
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Complete session error:", err);
    res.status(500).json({ success: false, error: "Failed to complete session" });
  }
});

// GET /api/sessions/:id/prepare — Pre-session view data for clinician
router.get("/:id/prepare", requireRole("CLINICIAN", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        enrollment: {
          include: {
            participant: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true } },
                tasks: {
                  where: { status: { not: "ARCHIVED" } },
                  orderBy: { createdAt: "desc" },
                  take: 10,
                },
                journalEntries: {
                  where: { isSharedWithClinician: true },
                  orderBy: { entryDate: "desc" },
                  take: 5,
                },
              },
            },
            program: {
              include: {
                modules: {
                  orderBy: { sortOrder: "asc" },
                  include: {
                    parts: {
                      where: { type: "HOMEWORK" },
                      select: { id: true, title: true },
                    },
                  },
                },
              },
            },
            moduleProgress: {
              include: { module: { select: { id: true, title: true, sortOrder: true } } },
            },
            partProgress: {
              where: { part: { type: "HOMEWORK" } },
              include: { part: { select: { id: true, title: true, moduleId: true } } },
            },
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    // Last completed session notes
    const lastSession = await prisma.session.findFirst({
      where: {
        enrollmentId: session.enrollmentId,
        status: "COMPLETED",
        id: { not: session.id },
      },
      orderBy: { scheduledAt: "desc" },
      select: { clinicianNotes: true, scheduledAt: true, moduleCompletedId: true },
    });

    // Quick stats
    const participantId = session.enrollment.participant.id;
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    const [taskCount, completedTaskCount, journalCount] = await Promise.all([
      prisma.task.count({
        where: { participantId, createdAt: { gte: fourWeeksAgo }, status: { not: "ARCHIVED" } },
      }),
      prisma.task.count({
        where: { participantId, status: "DONE", createdAt: { gte: fourWeeksAgo } },
      }),
      prisma.journalEntry.count({
        where: { participantId, entryDate: { gte: fourWeeksAgo } },
      }),
    ]);

    // Homework status for current module
    const enrollment = session.enrollment;
    const currentModuleId = enrollment.currentModuleId;
    const completedPartIds = new Set(
      enrollment.partProgress
        .filter((pp) => pp.status === "COMPLETED")
        .map((pp) => pp.partId)
    );

    const homeworkByModule = enrollment.program.modules.map((mod) => ({
      moduleId: mod.id,
      moduleTitle: mod.title,
      homework: mod.parts.map((p) => ({
        partId: p.id,
        title: p.title,
        completed: completedPartIds.has(p.id),
      })),
    }));

    res.json({
      success: true,
      data: {
        session: {
          id: session.id,
          scheduledAt: session.scheduledAt,
          status: session.status,
        },
        participant: {
          id: session.enrollment.participant.user.id,
          name: `${session.enrollment.participant.user.firstName} ${session.enrollment.participant.user.lastName}`.trim(),
        },
        program: { title: enrollment.program.title },
        currentModuleId,
        moduleProgress: enrollment.moduleProgress.map((mp) => ({
          moduleId: mp.module.id,
          title: mp.module.title,
          status: mp.status,
        })),
        homeworkByModule,
        recentTasks: enrollment.participant.tasks,
        recentJournal: enrollment.participant.journalEntries,
        lastSession: lastSession
          ? {
              notes: lastSession.clinicianNotes,
              date: lastSession.scheduledAt,
              moduleCompletedId: lastSession.moduleCompletedId,
            }
          : null,
        quickStats: {
          tasksCompleted: completedTaskCount,
          tasksTotal: taskCount,
          journalEntries: journalCount,
          taskCompletionRate: taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0,
        },
      },
    });
  } catch (err) {
    console.error("Prepare session error:", err);
    res.status(500).json({ success: false, error: "Failed to prepare session data" });
  }
});

export default router;
