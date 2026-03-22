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
      where: { moduleId: req.params.moduleId },
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
    console.error("Create part error:", err);
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
      where: { moduleId: req.params.moduleId },
      orderBy: { sortOrder: "asc" },
      take: 200, // Cap at 200 parts per module
    });

    res.json({ success: true, data: parts });
  } catch (err) {
    console.error("List parts error:", err);
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
      where: { moduleId: req.params.moduleId },
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
      where: { moduleId: req.params.moduleId },
      orderBy: { sortOrder: "asc" },
    });

    res.json({ success: true, data: parts });
  } catch (err) {
    console.error("Reorder parts error:", err);
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
      where: { id: req.params.id, moduleId: req.params.moduleId },
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
        console.error("Failed to regenerate homework instances:", err);
      });
    }

    res.json({ success: true, data: part });
  } catch (err) {
    console.error("Update part error:", err);
    res.status(500).json({ success: false, error: "Failed to update part" });
  }
});

// DELETE .../parts/:id — Delete a part and re-number sortOrder
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const mod = await verifyOwnership(req.params.programId, req.params.moduleId, req.user!.clinicianProfileId!);
    if (!mod) {
      res.status(404).json({ success: false, error: "Program or module not found" });
      return;
    }

    const existing = await prisma.part.findFirst({
      where: { id: req.params.id, moduleId: req.params.moduleId },
    });
    if (!existing) {
      res.status(404).json({ success: false, error: "Part not found" });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await tx.part.delete({ where: { id: req.params.id } });

      const remaining = await tx.part.findMany({
        where: { moduleId: req.params.moduleId },
        orderBy: { sortOrder: "asc" },
      });

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].sortOrder !== i) {
          await tx.part.update({
            where: { id: remaining[i].id },
            data: { sortOrder: i },
          });
        }
      }
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete part error:", err);
    res.status(500).json({ success: false, error: "Failed to delete part" });
  }
});

export default router;
