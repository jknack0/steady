import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { CreateProgramSchema, UpdateProgramSchema } from "@steady/shared";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import crypto from "crypto";

const router = Router();

// All program routes require clinician role
router.use(authenticate, requireRole("CLINICIAN"));

// POST /api/programs — Create a new program
router.post("/", validate(CreateProgramSchema), async (req: Request, res: Response) => {
  try {
    const program = await prisma.program.create({
      data: {
        ...req.body,
        clinicianId: req.user!.clinicianProfileId!,
      },
    });
    res.status(201).json({ success: true, data: program });
  } catch (err) {
    console.error("Create program error:", err);
    res.status(500).json({ success: false, error: "Failed to create program" });
  }
});

// GET /api/programs — List all programs for the authenticated clinician
router.get("/", async (req: Request, res: Response) => {
  try {
    const programs = await prisma.program.findMany({
      where: {
        clinicianId: req.user!.clinicianProfileId!,
        status: { not: "ARCHIVED" },
      },
      include: {
        _count: {
          select: {
            modules: true,
            enrollments: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const data = programs.map((p) => ({
      ...p,
      moduleCount: p._count.modules,
      activeEnrollmentCount: p._count.enrollments,
      _count: undefined,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error("List programs error:", err);
    res.status(500).json({ success: false, error: "Failed to list programs" });
  }
});

// GET /api/programs/:id — Get a single program with modules and enrollment stats
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const program = await prisma.program.findFirst({
      where: {
        id: req.params.id,
        clinicianId: req.user!.clinicianProfileId!,
      },
      include: {
        modules: {
          orderBy: { sortOrder: "asc" },
          include: {
            _count: { select: { parts: true } },
          },
        },
        _count: {
          select: {
            enrollments: { where: { status: "ACTIVE" } },
          },
        },
      },
    });

    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const completedCount = await prisma.enrollment.count({
      where: { programId: program.id, status: "COMPLETED" },
    });

    res.json({
      success: true,
      data: {
        ...program,
        activeEnrollmentCount: program._count.enrollments,
        completedEnrollmentCount: completedCount,
        modules: program.modules.map((m) => ({
          ...m,
          partCount: m._count.parts,
          _count: undefined,
        })),
        _count: undefined,
      },
    });
  } catch (err) {
    console.error("Get program error:", err);
    res.status(500).json({ success: false, error: "Failed to get program" });
  }
});

// GET /api/programs/:id/preview — Get full program with all modules and parts for preview
router.get("/:id/preview", async (req: Request, res: Response) => {
  try {
    const program = await prisma.program.findFirst({
      where: {
        id: req.params.id,
        clinicianId: req.user!.clinicianProfileId!,
      },
      include: {
        modules: {
          orderBy: { sortOrder: "asc" },
          include: {
            parts: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    res.json({ success: true, data: program });
  } catch (err) {
    console.error("Get program preview error:", err);
    res.status(500).json({ success: false, error: "Failed to get program preview" });
  }
});

// PUT /api/programs/:id — Update program settings
router.put("/:id", validate(UpdateProgramSchema), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.program.findFirst({
      where: { id: req.params.id, clinicianId: req.user!.clinicianProfileId! },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const program = await prisma.program.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({ success: true, data: program });
  } catch (err) {
    console.error("Update program error:", err);
    res.status(500).json({ success: false, error: "Failed to update program" });
  }
});

// DELETE /api/programs/:id — Soft-delete (archive). Only if no active enrollments
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const program = await prisma.program.findFirst({
      where: { id: req.params.id, clinicianId: req.user!.clinicianProfileId! },
      include: {
        _count: { select: { enrollments: { where: { status: "ACTIVE" } } } },
      },
    });

    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    if (program._count.enrollments > 0) {
      res.status(409).json({ success: false, error: "Cannot archive a program with active enrollments" });
      return;
    }

    await prisma.program.update({
      where: { id: req.params.id },
      data: { status: "ARCHIVED" },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete program error:", err);
    res.status(500).json({ success: false, error: "Failed to archive program" });
  }
});

// POST /api/programs/:id/clone — Clone a program (template functionality)
router.post("/:id/clone", async (req: Request, res: Response) => {
  try {
    const source = await prisma.program.findFirst({
      where: { id: req.params.id, clinicianId: req.user!.clinicianProfileId! },
      include: {
        modules: {
          orderBy: { sortOrder: "asc" },
          include: { parts: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!source) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const clone = await prisma.$transaction(async (tx) => {
      const newProgram = await tx.program.create({
        data: {
          clinicianId: req.user!.clinicianProfileId!,
          title: `${source.title} (Copy)`,
          description: source.description,
          coverImageUrl: source.coverImageUrl,
          cadence: source.cadence,
          enrollmentMethod: source.enrollmentMethod,
          sessionType: source.sessionType,
          followUpCount: source.followUpCount,
          isTemplate: false,
          templateSourceId: source.id,
          status: "DRAFT",
        },
      });

      for (const mod of source.modules) {
        const newModule = await tx.module.create({
          data: {
            programId: newProgram.id,
            title: mod.title,
            subtitle: mod.subtitle,
            summary: mod.summary,
            estimatedMinutes: mod.estimatedMinutes,
            sortOrder: mod.sortOrder,
            unlockRule: mod.unlockRule,
            unlockDelayDays: mod.unlockDelayDays,
          },
        });

        if (mod.parts.length > 0) {
          await tx.part.createMany({
            data: mod.parts.map((p) => ({
              moduleId: newModule.id,
              type: p.type,
              title: p.title,
              sortOrder: p.sortOrder,
              isRequired: p.isRequired,
              content: p.content as any,
            })),
          });
        }
      }

      return newProgram;
    });

    const result = await prisma.program.findUnique({
      where: { id: clone.id },
      include: { modules: { orderBy: { sortOrder: "asc" } } },
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    console.error("Clone program error:", err);
    res.status(500).json({ success: false, error: "Failed to clone program" });
  }
});

export default router;
