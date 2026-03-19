import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireRole("PARTICIPANT"));

// GET /api/participant/calendar — List events in a date range
router.get("/", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;
    const { start, end } = req.query;

    if (!start || !end) {
      res.status(400).json({ success: false, error: "start and end query params are required" });
      return;
    }

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      res.status(400).json({ success: false, error: "Invalid date format" });
      return;
    }

    const events = await prisma.calendarEvent.findMany({
      where: {
        participantId,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: {
        task: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    res.json({ success: true, data: events });
  } catch (err) {
    console.error("List calendar events error:", err);
    res.status(500).json({ success: false, error: "Failed to list events" });
  }
});

// POST /api/participant/calendar — Create a calendar event
router.post("/", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;
    const { title, startTime, endTime, eventType, color, taskId } = req.body;

    if (!title?.trim()) {
      res.status(400).json({ success: false, error: "Title is required" });
      return;
    }
    if (!startTime || !endTime) {
      res.status(400).json({ success: false, error: "startTime and endTime are required" });
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({ success: false, error: "Invalid date format" });
      return;
    }

    if (end <= start) {
      res.status(400).json({ success: false, error: "endTime must be after startTime" });
      return;
    }

    // Verify task ownership if linking
    if (taskId) {
      const task = await prisma.task.findFirst({
        where: { id: taskId, participantId },
      });
      if (!task) {
        res.status(404).json({ success: false, error: "Task not found" });
        return;
      }
    }

    const event = await prisma.calendarEvent.create({
      data: {
        participantId,
        title: title.trim(),
        startTime: start,
        endTime: end,
        eventType: eventType || "TIME_BLOCK",
        color: color || null,
        taskId: taskId || null,
      },
      include: {
        task: { select: { id: true, title: true, status: true } },
      },
    });

    res.status(201).json({ success: true, data: event });
  } catch (err) {
    console.error("Create calendar event error:", err);
    res.status(500).json({ success: false, error: "Failed to create event" });
  }
});

// PATCH /api/participant/calendar/:id — Update a calendar event
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: req.params.id, participantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }

    const { title, startTime, endTime, eventType, color, taskId } = req.body;
    const data: any = {};

    if (title !== undefined) data.title = title.trim();
    if (startTime !== undefined) data.startTime = new Date(startTime);
    if (endTime !== undefined) data.endTime = new Date(endTime);
    if (eventType !== undefined) data.eventType = eventType;
    if (color !== undefined) data.color = color;
    if (taskId !== undefined) data.taskId = taskId;

    const event = await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data,
      include: {
        task: { select: { id: true, title: true, status: true } },
      },
    });

    res.json({ success: true, data: event });
  } catch (err) {
    console.error("Update calendar event error:", err);
    res.status(500).json({ success: false, error: "Failed to update event" });
  }
});

// DELETE /api/participant/calendar/:id — Delete a calendar event
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: req.params.id, participantId },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }

    await prisma.calendarEvent.delete({
      where: { id: req.params.id },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Delete calendar event error:", err);
    res.status(500).json({ success: false, error: "Failed to delete event" });
  }
});

export default router;
