import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { CreateCalendarEventSchema, UpdateCalendarEventSchema } from "@steady/shared";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { queueNotification } from "../services/notifications";

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
        deletedAt: null,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      include: {
        task: {
          select: { id: true, title: true, status: true },
        },
      },
      orderBy: { startTime: "asc" },
      take: 500, // Cap at 500 events per date range query
    });

    res.json({ success: true, data: events });
  } catch (err) {
    logger.error("List calendar events error", err);
    res.status(500).json({ success: false, error: "Failed to list events" });
  }
});

// POST /api/participant/calendar — Create a calendar event
router.post("/", validate(CreateCalendarEventSchema), async (req: Request, res: Response) => {
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

    const validColor = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;

    const event = await prisma.calendarEvent.create({
      data: {
        participantId,
        title: title.trim(),
        startTime: start,
        endTime: end,
        eventType: eventType || "TIME_BLOCK",
        color: validColor,
        taskId: taskId || null,
      },
      include: {
        task: { select: { id: true, title: true, status: true } },
      },
    });

    // Schedule a reminder 10 minutes before the event
    const reminderTime = new Date(start.getTime() - 10 * 60 * 1000);
    if (reminderTime > new Date()) {
      queueNotification(
        req.user!.userId,
        "Coming up ⏰",
        `"${event.title}" starts in 10 minutes`,
        "TASK",
        { type: "calendar_reminder", eventId: event.id },
        { startAfter: reminderTime }
      ).catch((err) => logger.error("Failed to queue calendar reminder", err));
    }

    res.status(201).json({ success: true, data: event });
  } catch (err) {
    logger.error("Create calendar event error", err);
    res.status(500).json({ success: false, error: "Failed to create event" });
  }
});

// PATCH /api/participant/calendar/:id — Update a calendar event
router.patch("/:id", validate(UpdateCalendarEventSchema), async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: req.params.id, participantId, deletedAt: null },
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
    if (color !== undefined) data.color = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
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
    logger.error("Update calendar event error", err);
    res.status(500).json({ success: false, error: "Failed to update event" });
  }
});

// DELETE /api/participant/calendar/:id — Delete a calendar event
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;

    const existing = await prisma.calendarEvent.findFirst({
      where: { id: req.params.id, participantId, deletedAt: null },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }

    await prisma.calendarEvent.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Delete calendar event error", err);
    res.status(500).json({ success: false, error: "Failed to delete event" });
  }
});

export default router;
