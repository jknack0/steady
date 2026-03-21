import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import {
  scheduleSessionReminders,
  cancelSessionReminders,
} from "../services/notifications";

const router = Router();

router.use(authenticate, requireRole("CLINICIAN", "ADMIN"));

// POST /api/sessions — Create a session (auto-schedules reminders)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { enrollmentId, scheduledAt, videoCallUrl } = req.body;

    if (!enrollmentId || !scheduledAt) {
      res.status(400).json({
        success: false,
        error: "enrollmentId and scheduledAt are required",
      });
      return;
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        participant: {
          include: { user: { select: { id: true } } },
        },
      },
    });

    if (!enrollment) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    const session = await prisma.session.create({
      data: {
        enrollmentId,
        scheduledAt: new Date(scheduledAt),
        videoCallUrl: videoCallUrl || null,
        status: "SCHEDULED",
      },
    });

    // Auto-schedule 3 reminders (24h, 1h, 10min before)
    const participantUserId = enrollment.participant.user.id;
    scheduleSessionReminders(
      participantUserId,
      session.id,
      new Date(scheduledAt)
    ).catch((err) => console.error("Failed to schedule session reminders:", err));

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    console.error("Create session error:", err);
    res.status(500).json({ success: false, error: "Failed to create session" });
  }
});

// PUT /api/sessions/:id — Update a session
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        enrollment: {
          include: {
            participant: {
              include: { user: { select: { id: true } } },
            },
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    const { scheduledAt, status, videoCallUrl, clinicianNotes, participantSummary, moduleCompletedId } = req.body;

    const data: any = {};
    if (scheduledAt !== undefined) data.scheduledAt = new Date(scheduledAt);
    if (status !== undefined) data.status = status;
    if (videoCallUrl !== undefined) data.videoCallUrl = videoCallUrl;
    if (clinicianNotes !== undefined) data.clinicianNotes = clinicianNotes;
    if (participantSummary !== undefined) data.participantSummary = participantSummary;
    if (moduleCompletedId !== undefined) data.moduleCompletedId = moduleCompletedId;

    const updated = await prisma.session.update({
      where: { id: req.params.id },
      data,
    });

    // If cancelled, cancel all pending reminders
    if (status === "CANCELLED") {
      cancelSessionReminders(session.id).catch((err) =>
        console.error("Failed to cancel session reminders:", err)
      );
    }

    // If rescheduled, cancel old reminders and schedule new ones
    if (scheduledAt && scheduledAt !== session.scheduledAt.toISOString()) {
      const participantUserId = session.enrollment.participant.user.id;
      await cancelSessionReminders(session.id);
      scheduleSessionReminders(
        participantUserId,
        session.id,
        new Date(scheduledAt)
      ).catch((err) => console.error("Failed to reschedule session reminders:", err));
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update session error:", err);
    res.status(500).json({ success: false, error: "Failed to update session" });
  }
});

// GET /api/sessions — List sessions for clinician's programs
router.get("/", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { status, cursor, limit = "50" } = req.query;
    const take = Math.min(parseInt(limit as string) || 50, 100);

    const programs = await prisma.program.findMany({
      where: { clinicianId: clinicianProfileId },
      select: { id: true },
    });

    const programIds = programs.map((p) => p.id);

    const where: any = {
      enrollment: { programId: { in: programIds } },
    };
    if (status) where.status = status;

    const sessions = await prisma.session.findMany({
      where,
      include: {
        enrollment: {
          include: {
            participant: {
              include: {
                user: {
                  select: { firstName: true, lastName: true, email: true },
                },
              },
            },
            program: { select: { title: true } },
          },
        },
      },
      orderBy: { scheduledAt: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    });

    const hasMore = sessions.length > take;
    const data = hasMore ? sessions.slice(0, take) : sessions;

    res.json({
      success: true,
      data: data.map((s) => ({
        id: s.id,
        scheduledAt: s.scheduledAt,
        status: s.status,
        videoCallUrl: s.videoCallUrl,
        clinicianNotes: s.clinicianNotes,
        participantName: `${s.enrollment.participant.user.firstName} ${s.enrollment.participant.user.lastName}`.trim(),
        participantEmail: s.enrollment.participant.user.email,
        programTitle: s.enrollment.program.title,
        enrollmentId: s.enrollmentId,
      })),
      cursor: hasMore ? data[data.length - 1].id : null,
    });
  } catch (err) {
    console.error("List sessions error:", err);
    res.status(500).json({ success: false, error: "Failed to list sessions" });
  }
});

export default router;
