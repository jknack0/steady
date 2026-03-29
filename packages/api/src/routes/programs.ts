import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { CreateProgramSchema, UpdateProgramSchema, AssignProgramSchema, AppendModulesSchema } from "@steady/shared";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import crypto from "crypto";
import { assignProgram, appendModules, AssignmentError } from "../services/assignment";

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
    logger.error("Create program error", err);
    res.status(500).json({ success: false, error: "Failed to create program" });
  }
});

// GET /api/programs/templates — List all available program templates
router.get("/templates", async (_req: Request, res: Response) => {
  try {
    const templates = await prisma.program.findMany({
      where: { isTemplate: true, status: "PUBLISHED" },
      include: {
        _count: { select: { modules: true } },
      },
      orderBy: { title: "asc" },
      take: 100,
    });

    const data = templates.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      durationWeeks: t.durationWeeks,
      cadence: t.cadence,
      sessionType: t.sessionType,
      moduleCount: t._count.modules,
    }));

    res.json({ success: true, data });
  } catch (err) {
    logger.error("List templates error", err);
    res.status(500).json({ success: false, error: "Failed to list templates" });
  }
});

// GET /api/programs — List all programs for the authenticated clinician
router.get("/", async (req: Request, res: Response) => {
  try {
    const { cursor, limit = "50" } = req.query;
    const take = Math.min(parseInt(limit as string) || 50, 100);

    const programs = await prisma.program.findMany({
      where: {
        clinicianId: req.user!.clinicianProfileId!,
        isTemplate: false,
        status: { not: "ARCHIVED" },
      },
      include: {
        _count: {
          select: {
            modules: { where: { deletedAt: null } },
            enrollments: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    });

    const hasMore = programs.length > take;
    const page = hasMore ? programs.slice(0, take) : programs;

    const data = page.map((p) => ({
      ...p,
      moduleCount: p._count.modules,
      activeEnrollmentCount: p._count.enrollments,
      _count: undefined,
    }));

    res.json({ success: true, data, cursor: hasMore ? page[page.length - 1].id : null });
  } catch (err) {
    logger.error("List programs error", err);
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
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            _count: { select: { parts: { where: { deletedAt: null } } } },
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
    logger.error("Get program error", err);
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
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: {
            parts: {
              where: { deletedAt: null },
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
    logger.error("Get program preview error", err);
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
    logger.error("Update program error", err);
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
    logger.error("Delete program error", err);
    res.status(500).json({ success: false, error: "Failed to archive program" });
  }
});

// POST /api/programs/:id/assign — Assign a template to a client with inline customization
router.post("/:id/assign", validate(AssignProgramSchema), async (req: Request, res: Response) => {
  try {
    const { participantId, title, excludedModuleIds, excludedPartIds } = req.body;
    const result = await assignProgram(
      req.user!.clinicianProfileId!,
      req.params.id,
      participantId,
      { excludedModuleIds, excludedPartIds },
      title
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (err instanceof AssignmentError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
        ...(err.data || {}),
      });
      return;
    }
    logger.error("Assign program error", err);
    res.status(500).json({ success: false, error: "Failed to assign program" });
  }
});

// POST /api/programs/:id/assign/append — Re-assign template, appending modules to existing client program
router.post("/:id/assign/append", validate(AppendModulesSchema), async (req: Request, res: Response) => {
  try {
    const { clientProgramId, excludedModuleIds, excludedPartIds } = req.body;
    const result = await appendModules(
      req.user!.clinicianProfileId!,
      clientProgramId,
      req.params.id,
      { excludedModuleIds, excludedPartIds }
    );
    res.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof AssignmentError) {
      res.status(err.statusCode).json({
        success: false,
        error: err.message,
        ...(err.data || {}),
      });
      return;
    }
    logger.error("Append modules error", err);
    res.status(500).json({ success: false, error: "Failed to append modules" });
  }
});

// POST /api/programs/:id/clone — Clone a program (or template) with all content
router.post("/:id/clone", async (req: Request, res: Response) => {
  try {
    // Templates can be cloned by any clinician; own programs require ownership
    const source = await prisma.program.findFirst({
      where: {
        id: req.params.id,
        OR: [
          { isTemplate: true, status: "PUBLISHED" },
          { clinicianId: req.user!.clinicianProfileId! },
        ],
      },
      include: {
        modules: {
          where: { deletedAt: null },
          orderBy: { sortOrder: "asc" },
          include: { parts: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } } },
        },
        dailyTrackers: {
          include: { fields: { orderBy: { sortOrder: "asc" } } },
        },
      },
    });

    if (!source) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const customTitle = typeof req.body.title === "string" && req.body.title.trim()
      ? req.body.title.trim()
      : source.isTemplate
        ? source.title
        : `${source.title} (Copy)`;

    const clone = await prisma.$transaction(async (tx) => {
      const newProgram = await tx.program.create({
        data: {
          clinicianId: req.user!.clinicianProfileId!,
          title: customTitle,
          description: source.description,
          category: source.category,
          durationWeeks: source.durationWeeks,
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

      // Clone daily trackers and their fields
      for (const tracker of source.dailyTrackers) {
        const newTracker = await tx.dailyTracker.create({
          data: {
            programId: newProgram.id,
            createdById: req.user!.clinicianProfileId!,
            name: tracker.name,
            description: tracker.description,
          },
        });

        if (tracker.fields.length > 0) {
          await tx.dailyTrackerField.createMany({
            data: tracker.fields.map((f) => ({
              trackerId: newTracker.id,
              label: f.label,
              fieldType: f.fieldType,
              sortOrder: f.sortOrder,
              isRequired: f.isRequired,
              options: f.options as any,
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
    logger.error("Clone program error", err);
    res.status(500).json({ success: false, error: "Failed to clone program" });
  }
});

export default router;
