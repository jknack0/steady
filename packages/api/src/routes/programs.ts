import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { CreateProgramSchema, UpdateProgramSchema, AssignProgramSchema, AppendModulesSchema, CreateProgramForClientSchema } from "@steady/shared";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import crypto from "crypto";
import { assignProgram, appendModules, AssignmentError } from "../services/assignment";
import { deepCopyModules, deepCopyTrackers } from "../lib/deep-copy";

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
        isTemplate: true,
        status: "PUBLISHED",
      },
    });
    res.status(201).json({ success: true, data: program });
  } catch (err) {
    logger.error("Create program error", err);
    res.status(500).json({ success: false, error: "Failed to create program" });
  }
});

// GET /api/programs/templates — List seeded templates (owned by system user)
router.get("/templates", async (req: Request, res: Response) => {
  try {
    // Find the system user that owns seeded templates
    const systemProfile = await prisma.clinicianProfile.findFirst({
      where: { user: { email: "system@steady.app" } },
    });

    const templates = await prisma.program.findMany({
      where: {
        isTemplate: true,
        status: { not: "ARCHIVED" },
        deletedAt: null,
        ...(systemProfile ? { clinicianId: systemProfile.id } : { clinicianId: "none" }),
      },
      include: {
        _count: { select: { modules: { where: { deletedAt: null } } } },
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

// GET /api/programs — List all program templates for the authenticated clinician
router.get("/", async (req: Request, res: Response) => {
  try {
    const { cursor, limit = "50" } = req.query;
    const take = Math.min(parseInt(limit as string) || 50, 100);

    const programs = await prisma.program.findMany({
      where: {
        clinicianId: req.user!.clinicianProfileId!,
        status: { not: "ARCHIVED" },
        deletedAt: null,
        NOT: {
          isTemplate: false,
          templateSourceId: { not: null },
        },
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

// GET /api/programs/client-programs — List programs assigned to clients
router.get("/client-programs", async (req: Request, res: Response) => {
  try {
    const programs = await prisma.program.findMany({
      where: {
        clinicianId: req.user!.clinicianProfileId!,
        isTemplate: false,
        templateSourceId: { not: null },
        status: { not: "ARCHIVED" },
        deletedAt: null,
      },
      include: {
        _count: {
          select: {
            modules: { where: { deletedAt: null } },
          },
        },
        enrollments: {
          where: { status: { in: ["ACTIVE", "PAUSED", "INVITED"] } },
          include: {
            participant: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });

    const data = programs.map((p) => {
      const enrollment = p.enrollments[0];
      const client = enrollment?.participant?.user;
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        status: p.status,
        moduleCount: p._count.modules,
        clientName: client ? `${client.firstName} ${client.lastName}` : null,
        enrollmentStatus: enrollment?.status ?? null,
      };
    });

    res.json({ success: true, data });
  } catch (err) {
    logger.error("List client programs error", err);
    res.status(500).json({ success: false, error: "Failed to list client programs" });
  }
});

// POST /api/programs/for-client — Create a blank program for a specific client
router.post("/for-client", validate(CreateProgramForClientSchema), async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const { title, clientId } = req.body;

    // Verify client belongs to this clinician
    const clientRelation = await prisma.clinicianClient.findFirst({
      where: {
        clinicianId,
        clientId,
        status: { not: "DISCHARGED" },
      },
      include: {
        client: {
          include: { participantProfile: true },
        },
      },
    });

    if (!clientRelation) {
      res.status(403).json({ success: false, error: "This client is not in your client list" });
      return;
    }

    const participantProfileId = clientRelation.client.participantProfile?.id;
    if (!participantProfileId) {
      res.status(400).json({ success: false, error: "Client does not have a participant profile" });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create blank program
      const program = await tx.program.create({
        data: {
          clinicianId,
          title,
          isTemplate: false,
          status: "PUBLISHED",
          cadence: "WEEKLY",
          enrollmentMethod: "INVITE",
          sessionType: "ONE_ON_ONE",
        },
      });

      // Self-reference templateSourceId to mark as client program
      await tx.program.update({
        where: { id: program.id },
        data: { templateSourceId: program.id },
      });

      // Create one empty module
      await tx.module.create({
        data: {
          programId: program.id,
          title: "Module 1",
          sortOrder: 0,
        },
      });

      // Create active enrollment
      const enrollment = await tx.enrollment.create({
        data: {
          participantId: participantProfileId,
          programId: program.id,
          status: "ACTIVE",
        },
      });

      return {
        program: { ...program, templateSourceId: program.id },
        enrollment,
      };
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error("Create program for client error", err);
    res.status(500).json({ success: false, error: "Failed to create program for client" });
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

    const isClientProgram = !program.isTemplate && program.templateSourceId !== null;

    if (program._count.enrollments > 0 && !isClientProgram) {
      res.status(409).json({ success: false, error: "Cannot archive a program with active enrollments" });
      return;
    }

    // For client programs, drop active enrollments before archiving
    if (isClientProgram && program._count.enrollments > 0) {
      await prisma.enrollment.updateMany({
        where: { programId: req.params.id, status: "ACTIVE" },
        data: { status: "DROPPED" },
      });
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

// POST /api/programs/:id/promote — Save a client program as My Program (structure only, no progress)
router.post("/:id/promote", async (req: Request, res: Response) => {
  try {
    const source = await prisma.program.findFirst({
      where: {
        id: req.params.id,
        clinicianId: req.user!.clinicianProfileId!,
        isTemplate: false, // Must be a client copy
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

    const customTitle = typeof req.body?.title === "string" && req.body.title.trim()
      ? req.body.title.trim()
      : source.title;

    const promoted = await prisma.$transaction(async (tx) => {
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
          isTemplate: true,
          templateSourceId: source.templateSourceId, // Preserve original lineage
          status: "PUBLISHED",
        },
      });

      await deepCopyModules(tx, source.modules, newProgram.id);
      await deepCopyTrackers(tx, source.dailyTrackers, newProgram.id, req.user!.clinicianProfileId!);

      return newProgram;
    });

    const result = await prisma.program.findUnique({
      where: { id: promoted.id },
      include: { modules: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } } },
    });

    res.status(201).json({ success: true, data: result });
  } catch (err) {
    logger.error("Promote program error", err);
    res.status(500).json({ success: false, error: "Failed to save as my program" });
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
          { isTemplate: true, status: { not: "ARCHIVED" } },
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
          isTemplate: true,
          templateSourceId: source.id,
          status: "DRAFT",
        },
      });

      await deepCopyModules(tx, source.modules, newProgram.id);
      await deepCopyTrackers(tx, source.dailyTrackers, newProgram.id, req.user!.clinicianProfileId!);

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
