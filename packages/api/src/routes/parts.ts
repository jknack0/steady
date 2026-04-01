import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { CreatePartSchema, UpdatePartSchema, ReorderPartsSchema, type HomeworkContent } from "@steady/shared";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { regenerateInstancesForPart } from "../services/homework-instances";

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole("CLINICIAN"));

// Helper: verify clinician owns the program and module exists
async function verifyOwnership(programId: string, moduleId: string, clinicianProfileId: string) {
  const program = await prisma.program.findFirst({
    where: { id: programId, clinicianId: clinicianProfileId },
  });
  if (!program) return null;

  const module = await prisma.module.findFirst({
    where: { id: moduleId, programId },
  });
  return module;
}

// POST .../parts — Create a part
router.post("/", validate(CreatePartSchema), async (req: Request, res: Response) => {
  try {
    const mod = await verifyOwnership(req.params.programId, req.params.moduleId, req.user!.clinicianProfileId!);
    if (!mod) {
      res.status(404).json({ success: false, error: "Program or module not found" });
      return;
    }

    // Validate that content.type matches the part type
    if (req.body.content.type !== req.body.type) {
      res.status(400).json({ success: false, error: "Content type must match part type" });
      return;
    }

    const maxSort = await prisma.part.aggregate({
      where: { moduleId: req.params.moduleId, deletedAt: null },
      _max: { sortOrder: true },
    });
    const nextSortOrder = (maxSort._max.sortOrder ?? -1) + 1;

    const part = await prisma.part.create({
      data: {
        moduleId: req.params.moduleId,
        type: req.body.type,
        title: req.body.title,
        isRequired: req.body.isRequired,
        content: req.body.content,
        sortOrder: nextSortOrder,
      },
    });

    res.status(201).json({ success: true, data: part });
  } catch (err) {
    logger.error("Create part error", err);
    res.status(500).json({ success: false, error: "Failed to create part" });
  }
});

// GET .../parts — List parts for a module
router.get("/", async (req: Request, res: Response) => {
  try {
    const mod = await verifyOwnership(req.params.programId, req.params.moduleId, req.user!.clinicianProfileId!);
    if (!mod) {
      res.status(404).json({ success: false, error: "Program or module not found" });
      return;
    }

    const parts = await prisma.part.findMany({
      where: { moduleId: req.params.moduleId, deletedAt: null },
      orderBy: { sortOrder: "asc" },
      take: 200, // Cap at 200 parts per module
    });

    res.json({ success: true, data: parts });
  } catch (err) {
    logger.error("List parts error", err);
    res.status(500).json({ success: false, error: "Failed to list parts" });
  }
});

// PUT .../parts/reorder — Reorder parts
// NOTE: Must be before /:id to avoid Express matching "reorder" as an ID
router.put("/reorder", validate(ReorderPartsSchema), async (req: Request, res: Response) => {
  try {
    const mod = await verifyOwnership(req.params.programId, req.params.moduleId, req.user!.clinicianProfileId!);
    if (!mod) {
      res.status(404).json({ success: false, error: "Program or module not found" });
      return;
    }

    const { partIds } = req.body as { partIds: string[] };

    const existingParts = await prisma.part.findMany({
      where: { moduleId: req.params.moduleId, deletedAt: null },
      select: { id: true },
    });
    const existingIds = new Set(existingParts.map((p) => p.id));

    for (const id of partIds) {
      if (!existingIds.has(id)) {
        res.status(400).json({ success: false, error: `Part ${id} does not belong to this module` });
        return;
      }
    }

    await prisma.$transaction(
      partIds.map((id, index) =>
        prisma.part.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );

    const parts = await prisma.part.findMany({
      where: { moduleId: req.params.moduleId, deletedAt: null },
      orderBy: { sortOrder: "asc" },
    });

    res.json({ success: true, data: parts });
  } catch (err) {
    logger.error("Reorder parts error", err);
    res.status(500).json({ success: false, error: "Failed to reorder parts" });
  }
});

// PUT .../parts/:id — Update a part
router.put("/:id", validate(UpdatePartSchema), async (req: Request, res: Response) => {
  try {
    const mod = await verifyOwnership(req.params.programId, req.params.moduleId, req.user!.clinicianProfileId!);
    if (!mod) {
      res.status(404).json({ success: false, error: "Program or module not found" });
      return;
    }

    const existing = await prisma.part.findFirst({
      where: { id: req.params.id, moduleId: req.params.moduleId, deletedAt: null },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: "Part not found" });
      return;
    }

    // If content is provided, validate type matches
    if (req.body.content && req.body.content.type !== existing.type) {
      res.status(400).json({ success: false, error: "Cannot change content type" });
      return;
    }

    const part = await prisma.part.update({
      where: { id: req.params.id },
      data: req.body,
    });

    // If homework recurrence changed, regenerate instances
    if (part.type === "HOMEWORK" && req.body.content) {
      const content = req.body.content as HomeworkContent;
      regenerateInstancesForPart(part.id, content).catch((err) => {
        logger.error("Failed to regenerate homework instances", err);
      });
    }

    res.json({ success: true, data: part });
  } catch (err) {
    logger.error("Update part error", err);
    res.status(500).json({ success: false, error: "Failed to update part" });
  }
});

// DELETE .../parts/:id — Smart delete: hard if no progress, soft if progress exists
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const mod = await verifyOwnership(req.params.programId, req.params.moduleId, req.user!.clinicianProfileId!);
    if (!mod) {
      res.status(404).json({ success: false, error: "Program or module not found" });
      return;
    }

    const existing = await prisma.part.findFirst({
      where: { id: req.params.id, moduleId: req.params.moduleId, deletedAt: null },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: "Part not found" });
      return;
    }

    // Check if any enrollment has progress on this part (COND-2)
    const progressCount = await prisma.partProgress.count({
      where: {
        partId: req.params.id,
        status: { not: "NOT_STARTED" },
      },
    });

    const deleteType = progressCount > 0 ? "soft" : "hard";

    await prisma.$transaction(async (tx) => {
      if (deleteType === "soft") {
        await tx.part.update({
          where: { id: req.params.id },
          data: { deletedAt: new Date() },
        });
      } else {
        await tx.part.delete({ where: { id: req.params.id } });
      }

      // Re-number remaining active parts
      const remaining = await tx.part.findMany({
        where: { moduleId: req.params.moduleId, deletedAt: null },
        orderBy: { sortOrder: "asc" },
        select: { id: true, sortOrder: true },
      });

      const updates = remaining
        .map((p, i) => ({ id: p.id, sortOrder: p.sortOrder, newOrder: i }))
        .filter((p) => p.sortOrder !== p.newOrder)
        .map((p) => tx.part.update({ where: { id: p.id }, data: { sortOrder: p.newOrder } }));

      if (updates.length > 0) {
        await Promise.all(updates);
      }
    }, { timeout: 15000 });

    res.json({ success: true, data: { deleted: deleteType } });
  } catch (err) {
    logger.error("Delete part error", err);
    res.status(500).json({ success: false, error: "Failed to delete part" });
  }
});

export default router;
