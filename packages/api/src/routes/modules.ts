import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { CreateModuleSchema, UpdateModuleSchema, ReorderModulesSchema } from "@steady/shared";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";

const router = Router({ mergeParams: true });

// All module routes require clinician role
router.use(authenticate, requireRole("CLINICIAN"));

// Helper: verify clinician owns the parent program
async function verifyProgramOwnership(programId: string, clinicianProfileId: string) {
  return prisma.program.findFirst({
    where: { id: programId, clinicianId: clinicianProfileId },
  });
}

// POST /api/programs/:programId/modules — Create a module
router.post("/", validate(CreateModuleSchema), async (req: Request, res: Response) => {
  try {
    const program = await verifyProgramOwnership(req.params.programId, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    // Get next sort order
    const maxSort = await prisma.module.aggregate({
      where: { programId: req.params.programId },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const module = await prisma.module.create({
      data: {
        ...req.body,
        programId: req.params.programId,
        sortOrder: nextSortOrder,
      },
    });

    res.status(201).json({ success: true, data: module });
  } catch (err) {
    logger.error("Create module error", err);
    res.status(500).json({ success: false, error: "Failed to create module" });
  }
});

// GET /api/programs/:programId/modules — List modules for a program
router.get("/", async (req: Request, res: Response) => {
  try {
    const program = await verifyProgramOwnership(req.params.programId, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const modules = await prisma.module.findMany({
      where: { programId: req.params.programId },
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { parts: { where: { deletedAt: null } } } },
      },
      take: 200, // Cap at 200 modules per program
    });

    const data = modules.map((m) => ({
      ...m,
      partCount: m._count.parts,
      _count: undefined,
    }));

    res.json({ success: true, data });
  } catch (err) {
    logger.error("List modules error", err);
    res.status(500).json({ success: false, error: "Failed to list modules" });
  }
});

// PUT /api/programs/:programId/modules/reorder — Reorder modules
// NOTE: Must be before /:id to avoid Express matching "reorder" as an ID
router.put("/reorder", validate(ReorderModulesSchema), async (req: Request, res: Response) => {
  try {
    const program = await verifyProgramOwnership(req.params.programId, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const { moduleIds } = req.body as { moduleIds: string[] };

    // Verify all module IDs belong to this program
    const existingModules = await prisma.module.findMany({
      where: { programId: req.params.programId },
      select: { id: true },
    });
    const existingIds = new Set(existingModules.map((m) => m.id));

    for (const id of moduleIds) {
      if (!existingIds.has(id)) {
        res.status(400).json({ success: false, error: `Module ${id} does not belong to this program` });
        return;
      }
    }

    await prisma.$transaction(
      moduleIds.map((id, index) =>
        prisma.module.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    const modules = await prisma.module.findMany({
      where: { programId: req.params.programId },
      orderBy: { sortOrder: "asc" },
    });

    res.json({ success: true, data: modules });
  } catch (err) {
    logger.error("Reorder modules error", err);
    res.status(500).json({ success: false, error: "Failed to reorder modules" });
  }
});

// PUT /api/programs/:programId/modules/:id — Update module fields
router.put("/:id", validate(UpdateModuleSchema), async (req: Request, res: Response) => {
  try {
    const program = await verifyProgramOwnership(req.params.programId, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const existing = await prisma.module.findFirst({
      where: { id: req.params.id, programId: req.params.programId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: "Module not found" });
      return;
    }

    const module = await prisma.module.update({
      where: { id: req.params.id },
      data: req.body,
    });

    res.json({ success: true, data: module });
  } catch (err) {
    logger.error("Update module error", err);
    res.status(500).json({ success: false, error: "Failed to update module" });
  }
});

// DELETE /api/programs/:programId/modules/:id — Delete module and re-number sortOrder
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const program = await verifyProgramOwnership(req.params.programId, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const existing = await prisma.module.findFirst({
      where: { id: req.params.id, programId: req.params.programId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: "Module not found" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Delete module (parts cascade via onDelete: Cascade)
      await tx.module.delete({ where: { id: req.params.id } });

      // Re-number remaining modules
      const remaining = await tx.module.findMany({
        where: { programId: req.params.programId },
        orderBy: { sortOrder: "asc" },
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].sortOrder !== i) {
          await tx.module.update({
            where: { id: remaining[i].id },
            data: { sortOrder: i },
          });
        }
      }
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Delete module error", err);
    res.status(500).json({ success: false, error: "Failed to delete module" });
  }
});

export default router;
