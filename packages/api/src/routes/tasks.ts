import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import { scheduleTaskReminder } from "../services/notifications";

const router = Router();

router.use(authenticate, requireRole("PARTICIPANT"));

// GET /api/participant/tasks — List tasks with optional filters
router.get("/", async (req: Request, res: Response) => {
  try {
    const { status, category, cursor, limit = "50" } = req.query;
    const participantId = req.user!.participantProfileId!;
    const take = Math.min(parseInt(limit as string) || 50, 100);

    const where: any = { participantId, deletedAt: null };
    if (status && status !== "ALL") {
      where.status = status;
    } else {
      where.status = { not: "ARCHIVED" };
    }
    if (category) {
      where.category = category;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ dueDate: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    });

    const hasMore = tasks.length > take;
    const data = hasMore ? tasks.slice(0, take) : tasks;

    res.json({
      success: true,
      data,
      cursor: hasMore ? data[data.length - 1].id : null,
    });
  } catch (err) {
    logger.error("List tasks error", err);
    res.status(500).json({ success: false, error: "Failed to list tasks" });
  }
});

// POST /api/participant/tasks — Create a task
router.post("/", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;
    const { title, description, estimatedMinutes, dueDate, energyLevel, category, isRecurring, recurrenceRule } = req.body;

    if (!title?.trim()) {
      res.status(400).json({ success: false, error: "Title is required" });
      return;
    }

    const task = await prisma.task.create({
      data: {
        participantId,
        title: title.trim(),
        description: description || null,
        estimatedMinutes: estimatedMinutes || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        energyLevel: energyLevel || null,
        category: category || null,
        isRecurring: isRecurring || false,
        recurrenceRule: recurrenceRule || null,
        sourceType: "MANUAL",
      },
    });

    // Schedule reminder if task has a due date
    if (task.dueDate) {
      scheduleTaskReminder(req.user!.userId, task.id, task.title, task.dueDate).catch(() => {});
    }

    res.status(201).json({ success: true, data: task });
  } catch (err) {
    logger.error("Create task error", err);
    res.status(500).json({ success: false, error: "Failed to create task" });
  }
});

// PATCH /api/participant/tasks/:id — Update a task
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;

    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, participantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "Task not found" });
      return;
    }

    const { title, description, estimatedMinutes, dueDate, energyLevel, category, status, sortOrder } = req.body;

    const data: any = {};
    if (title !== undefined) data.title = title.trim();
    if (description !== undefined) data.description = description;
    if (estimatedMinutes !== undefined) data.estimatedMinutes = estimatedMinutes;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (energyLevel !== undefined) data.energyLevel = energyLevel;
    if (category !== undefined) data.category = category;
    if (sortOrder !== undefined) data.sortOrder = sortOrder;

    if (status !== undefined) {
      data.status = status;
      if (status === "DONE" && !existing.completedAt) {
        data.completedAt = new Date();
      } else if (status === "TODO") {
        data.completedAt = null;
      }
    }

    const task = await prisma.task.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, data: task });
  } catch (err) {
    logger.error("Update task error", err);
    res.status(500).json({ success: false, error: "Failed to update task" });
  }
});

// DELETE /api/participant/tasks/:id — Archive a task
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;

    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, participantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "Task not found" });
      return;
    }

    await prisma.task.update({
      where: { id: req.params.id },
      data: { status: "ARCHIVED" },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Archive task error", err);
    res.status(500).json({ success: false, error: "Failed to archive task" });
  }
});

export default router;
