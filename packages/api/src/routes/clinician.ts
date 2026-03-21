import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireRole("CLINICIAN", "ADMIN"));

// GET /api/clinician/participants — List all participants across clinician's programs
router.get("/participants", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { search, programId } = req.query;

    // Get all programs owned by this clinician
    const programWhere: any = { clinicianId: clinicianProfileId };
    if (programId) {
      programWhere.id = programId as string;
    }

    const programs = await prisma.program.findMany({
      where: programWhere,
      select: { id: true, title: true },
    });

    const programIds = programs.map((p) => p.id);
    const programMap = new Map(programs.map((p) => [p.id, p.title]));

    if (programIds.length === 0) {
      res.json({ success: true, data: { participants: [], programs: [] } });
      return;
    }

    // Fetch all enrollments with participant data, progress, and activity
    const enrollments = await prisma.enrollment.findMany({
      where: {
        programId: { in: programIds },
        status: { in: ["ACTIVE", "PAUSED", "INVITED"] },
      },
      include: {
        participant: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            tasks: {
              where: { status: { not: "ARCHIVED" } },
              orderBy: { updatedAt: "desc" },
              take: 1,
              select: { updatedAt: true },
            },
            journalEntries: {
              orderBy: { updatedAt: "desc" },
              take: 1,
              select: { updatedAt: true },
            },
          },
        },
        moduleProgress: {
          include: {
            module: { select: { id: true, title: true, sortOrder: true } },
          },
        },
        partProgress: {
          include: {
            part: { select: { id: true, type: true, moduleId: true } },
          },
        },
        program: {
          include: {
            modules: {
              orderBy: { sortOrder: "asc" },
              include: {
                parts: {
                  where: { type: "HOMEWORK" },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });

    // Build participant rows
    const participants = enrollments.map((enrollment) => {
      const user = enrollment.participant.user;
      const name = `${user.firstName} ${user.lastName}`.trim();

      // Current module
      const currentModuleProgress = enrollment.moduleProgress
        .filter((mp) => mp.status === "IN_PROGRESS" || mp.status === "UNLOCKED")
        .sort((a, b) => (a.module.sortOrder ?? 0) - (b.module.sortOrder ?? 0));
      const currentModule = currentModuleProgress[0]?.module || null;

      // Homework status
      const allHomeworkPartIds = enrollment.program.modules.flatMap((m) =>
        m.parts.map((p) => p.id)
      );
      const completedHomeworkIds = new Set(
        enrollment.partProgress
          .filter(
            (pp) =>
              pp.status === "COMPLETED" && pp.part.type === "HOMEWORK"
          )
          .map((pp) => pp.partId)
      );
      const totalHomework = allHomeworkPartIds.length;
      const completedHomework = allHomeworkPartIds.filter((id) =>
        completedHomeworkIds.has(id)
      ).length;
      const homeworkRate =
        totalHomework > 0 ? completedHomework / totalHomework : 0;
      const homeworkStatus =
        totalHomework === 0
          ? "NOT_STARTED"
          : homeworkRate >= 1
            ? "COMPLETE"
            : homeworkRate > 0
              ? "PARTIAL"
              : "NOT_STARTED";

      // Last active: most recent of task update, journal update, part progress
      const activityDates: Date[] = [];
      if (enrollment.participant.tasks[0]) {
        activityDates.push(new Date(enrollment.participant.tasks[0].updatedAt));
      }
      if (enrollment.participant.journalEntries[0]) {
        activityDates.push(
          new Date(enrollment.participant.journalEntries[0].updatedAt)
        );
      }
      const latestPartProgress = enrollment.partProgress
        .filter((pp) => pp.completedAt)
        .sort(
          (a, b) =>
            new Date(b.completedAt!).getTime() -
            new Date(a.completedAt!).getTime()
        )[0];
      if (latestPartProgress?.completedAt) {
        activityDates.push(new Date(latestPartProgress.completedAt));
      }
      const lastActive =
        activityDates.length > 0
          ? new Date(Math.max(...activityDates.map((d) => d.getTime())))
          : null;

      // Status indicator
      const now = new Date();
      const daysSinceActive = lastActive
        ? (now.getTime() - lastActive.getTime()) / 86400000
        : Infinity;

      let statusIndicator: "green" | "amber" | "red";
      if (daysSinceActive >= 7) {
        statusIndicator = "red";
      } else if (daysSinceActive >= 3 || homeworkRate < 0.8) {
        statusIndicator = "amber";
      } else {
        statusIndicator = "green";
      }

      return {
        participantId: user.id,
        participantProfileId: enrollment.participant.id,
        enrollmentId: enrollment.id,
        name,
        email: user.email,
        programId: enrollment.programId,
        programTitle: programMap.get(enrollment.programId) || "",
        currentModule: currentModule
          ? { id: currentModule.id, title: currentModule.title }
          : null,
        homeworkStatus,
        homeworkRate: Math.round(homeworkRate * 100),
        completedHomework,
        totalHomework,
        lastActive: lastActive?.toISOString() || null,
        statusIndicator,
        enrollmentStatus: enrollment.status,
      };
    });

    // Apply search filter
    let filtered = participants;
    if (search) {
      const q = (search as string).toLowerCase();
      filtered = participants.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      data: {
        participants: filtered,
        programs: programs.map((p) => ({ id: p.id, title: p.title })),
      },
    });
  } catch (err) {
    console.error("List clinician participants error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to list participants" });
  }
});

// GET /api/clinician/participants/:id — Detailed participant view
router.get("/participants/:id", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { id } = req.params;

    // Look up participant by user ID or profile ID
    let participantProfile = await prisma.participantProfile.findUnique({
      where: { userId: id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!participantProfile) {
      participantProfile = await prisma.participantProfile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    }

    if (!participantProfile) {
      res.status(404).json({ success: false, error: "Participant not found" });
      return;
    }

    // Get enrollments in this clinician's programs only
    const clinicianPrograms = await prisma.program.findMany({
      where: { clinicianId: clinicianProfileId },
      select: { id: true },
    });
    const clinicianProgramIds = clinicianPrograms.map((p) => p.id);

    const enrollments = await prisma.enrollment.findMany({
      where: {
        participantId: participantProfile.id,
        programId: { in: clinicianProgramIds },
      },
      include: {
        program: {
          select: {
            id: true,
            title: true,
            description: true,
            cadence: true,
          },
        },
        moduleProgress: {
          include: {
            module: {
              select: {
                id: true,
                title: true,
                sortOrder: true,
                estimatedMinutes: true,
              },
            },
          },
          orderBy: { module: { sortOrder: "asc" } },
        },
        partProgress: {
          include: {
            part: {
              select: {
                id: true,
                type: true,
                title: true,
                moduleId: true,
                content: true,
              },
            },
          },
        },
        sessions: {
          orderBy: { scheduledAt: "desc" },
          take: 20,
        },
      },
    });

    if (enrollments.length === 0) {
      res
        .status(404)
        .json({
          success: false,
          error: "No enrollments found for this participant in your programs",
        });
      return;
    }

    // Recent shared journal entries
    const journalEntries = await prisma.journalEntry.findMany({
      where: {
        participantId: participantProfile.id,
        isSharedWithClinician: true,
      },
      orderBy: { entryDate: "desc" },
      take: 10,
    });

    // SMART goals: find parts of type SMART_GOALS with responses
    const smartGoalResponses = enrollments.flatMap((e) =>
      e.partProgress
        .filter(
          (pp) =>
            pp.part.type === "SMART_GOALS" &&
            pp.responseData &&
            pp.status === "COMPLETED"
        )
        .map((pp) => ({
          partTitle: pp.part.title,
          goals: pp.responseData,
          completedAt: pp.completedAt,
        }))
    );

    // Tasks pushed by clinician
    const clinicianTasks = await prisma.task.findMany({
      where: {
        participantId: participantProfile.id,
        sourceType: "CLINICIAN_PUSH",
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    // Build enrollment details
    const enrollmentDetails = enrollments.map((e) => {
      // Homework detail for current module
      const currentModuleId = e.currentModuleId;
      const homeworkProgress = e.partProgress
        .filter((pp) => pp.part.type === "HOMEWORK")
        .map((pp) => ({
          partId: pp.part.id,
          partTitle: pp.part.title,
          moduleId: pp.part.moduleId,
          status: pp.status,
          completedAt: pp.completedAt,
        }));

      return {
        id: e.id,
        status: e.status,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        currentModuleId,
        program: e.program,
        moduleProgress: e.moduleProgress.map((mp) => ({
          moduleId: mp.module.id,
          moduleTitle: mp.module.title,
          sortOrder: mp.module.sortOrder,
          estimatedMinutes: mp.module.estimatedMinutes,
          status: mp.status,
          unlockedAt: mp.unlockedAt,
          completedAt: mp.completedAt,
        })),
        homeworkProgress,
        sessions: e.sessions.map((s) => ({
          id: s.id,
          scheduledAt: s.scheduledAt,
          status: s.status,
          clinicianNotes: s.clinicianNotes,
          participantSummary: s.participantSummary,
        })),
      };
    });

    res.json({
      success: true,
      data: {
        participant: participantProfile.user,
        participantProfileId: participantProfile.id,
        enrollments: enrollmentDetails,
        journalEntries,
        smartGoals: smartGoalResponses,
        clinicianTasks,
      },
    });
  } catch (err) {
    console.error("Get clinician participant detail error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to get participant details" });
  }
});

// POST /api/clinician/participants/:id/push-task — Push a task to participant
router.post("/participants/:id/push-task", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { id } = req.params;
    const { title, description, dueDate } = req.body;

    if (!title?.trim()) {
      res.status(400).json({ success: false, error: "Title is required" });
      return;
    }

    // Resolve participant profile
    let profileId = id;
    const profileByUser = await prisma.participantProfile.findUnique({
      where: { userId: id },
    });
    if (profileByUser) profileId = profileByUser.id;

    const task = await prisma.task.create({
      data: {
        participantId: profileId,
        title: title.trim(),
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        sourceType: "CLINICIAN_PUSH",
      },
    });

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error("Push task error:", err);
    res.status(500).json({ success: false, error: "Failed to push task" });
  }
});

// POST /api/clinician/participants/:id/unlock-module — Unlock next module
router.post("/participants/:id/unlock-module", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { enrollmentId, moduleId } = req.body;

    if (!enrollmentId || !moduleId) {
      res.status(400).json({ success: false, error: "enrollmentId and moduleId are required" });
      return;
    }

    const progress = await prisma.moduleProgress.upsert({
      where: {
        enrollmentId_moduleId: { enrollmentId, moduleId },
      },
      create: {
        enrollmentId,
        moduleId,
        status: "UNLOCKED",
        unlockedAt: new Date(),
        customUnlock: true,
      },
      update: {
        status: "UNLOCKED",
        unlockedAt: new Date(),
        customUnlock: true,
      },
    });

    // Update current module on enrollment
    await prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { currentModuleId: moduleId },
    });

    res.json({ success: true, data: progress });
  } catch (err) {
    console.error("Unlock module error:", err);
    res.status(500).json({ success: false, error: "Failed to unlock module" });
  }
});

// PUT /api/clinician/participants/:id/enrollment/:enrollmentId — Manage enrollment (pause, drop, reset)
router.put("/participants/:id/enrollment/:enrollmentId", async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;
    const { action } = req.body;

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
    });

    if (!enrollment) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    if (action === "pause") {
      const updated = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: "PAUSED" },
      });
      res.json({ success: true, data: updated });
    } else if (action === "resume") {
      const updated = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: "ACTIVE" },
      });
      res.json({ success: true, data: updated });
    } else if (action === "drop") {
      const updated = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: { status: "DROPPED" },
      });
      res.json({ success: true, data: updated });
    } else if (action === "reset-progress") {
      // Delete all progress and reset to first module
      await prisma.$transaction([
        prisma.partProgress.deleteMany({ where: { enrollmentId } }),
        prisma.moduleProgress.deleteMany({ where: { enrollmentId } }),
      ]);

      // Re-initialize first module
      const program = await prisma.program.findUnique({
        where: { id: enrollment.programId },
        include: {
          modules: { orderBy: { sortOrder: "asc" }, select: { id: true } },
        },
      });

      const firstModuleId = program?.modules[0]?.id || null;

      if (firstModuleId) {
        await prisma.moduleProgress.create({
          data: {
            enrollmentId,
            moduleId: firstModuleId,
            status: "UNLOCKED",
            unlockedAt: new Date(),
          },
        });
      }

      const updated = await prisma.enrollment.update({
        where: { id: enrollmentId },
        data: {
          currentModuleId: firstModuleId,
          status: "ACTIVE",
          completedAt: null,
        },
      });

      res.json({ success: true, data: updated });
    } else {
      res.status(400).json({ success: false, error: "Invalid action. Use: pause, resume, drop, reset-progress" });
    }
  } catch (err) {
    console.error("Manage enrollment error:", err);
    res.status(500).json({ success: false, error: "Failed to manage enrollment" });
  }
});

export default router;
