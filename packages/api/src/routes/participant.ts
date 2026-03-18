import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";

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

export default router;
