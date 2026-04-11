import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { CreateEnrollmentSchema, UpdateEnrollmentSchema, type HomeworkContent } from "@steady/shared";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { getStreakData, cancelFutureInstances } from "../services/homework-instances";
import { verifyProgramOwnership } from "../lib/ownership";
import { toDateKey } from "../lib/date-utils";

const router = Router({ mergeParams: true });

router.use(authenticate, requireRole("CLINICIAN"));

// GET /api/programs/:programId/enrollments — List enrollments
router.get("/", async (req: Request, res: Response) => {
  try {
    const program = await verifyProgramOwnership(req.params.programId, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const { cursor, limit = "50" } = req.query;
    const take = Math.min(parseInt(limit as string) || 50, 100);

    const enrollments = await prisma.enrollment.findMany({
      where: { programId: req.params.programId, deletedAt: null },
      include: {
        participant: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    });

    const hasMore = enrollments.length > take;
    const page = hasMore ? enrollments.slice(0, take) : enrollments;

    const data = page.map((e) => ({
      id: e.id,
      status: e.status,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      participant: e.participant.user,
    }));

    res.json({ success: true, data, cursor: hasMore ? page[page.length - 1].id : null });
  } catch (err) {
    logger.error("List enrollments error", err);
    res.status(500).json({ success: false, error: "Failed to list enrollments" });
  }
});

// POST /api/programs/:programId/enrollments — Invite a participant
router.post("/", validate(CreateEnrollmentSchema), async (req: Request, res: Response) => {
  try {
    const program = await verifyProgramOwnership(req.params.programId, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    if (program.status !== "PUBLISHED") {
      res.status(400).json({ success: false, error: "Program must be published before enrolling participants" });
      return;
    }

    const { participantEmail, firstName, lastName } = req.body;

    // Find or create participant user
    let user = await prisma.user.findUnique({
      where: { email: participantEmail },
      include: { participantProfile: true },
    });

    if (user && user.role !== "PARTICIPANT") {
      res.status(400).json({ success: false, error: "This email belongs to a clinician account" });
      return;
    }

    if (!user) {
      // Create a placeholder participant account (no password — Cognito handles auth)
      user = await prisma.user.create({
        data: {
          email: participantEmail,
          firstName: firstName || "Participant",
          lastName: lastName || "",
          role: "PARTICIPANT",
          participantProfile: { create: {} },
        },
        include: { participantProfile: true },
      });
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.enrollment.findFirst({
      where: {
        participantId: user.participantProfile!.id,
        programId: req.params.programId,
        status: { in: ["INVITED", "ACTIVE"] },
      },
    });

    if (existingEnrollment) {
      res.status(409).json({ success: false, error: "Participant is already enrolled in this program" });
      return;
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        participantId: user.participantProfile!.id,
        programId: req.params.programId,
        status: "INVITED",
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: enrollment.id,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        participant: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      },
    });
  } catch (err) {
    logger.error("Create enrollment error", err);
    res.status(500).json({ success: false, error: "Failed to create enrollment" });
  }
});

// PUT /api/programs/:programId/enrollments/:id — Update enrollment status
router.put("/:id", validate(UpdateEnrollmentSchema), async (req: Request, res: Response) => {
  try {
    const program = await verifyProgramOwnership(req.params.programId, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { id: req.params.id, programId: req.params.programId },
    });

    if (!enrollment) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    const updated = await prisma.enrollment.update({
      where: { id: req.params.id },
      data: {
        status: req.body.status,
        ...(req.body.status === "COMPLETED" ? { completedAt: new Date() } : {}),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error("Update enrollment error", err);
    res.status(500).json({ success: false, error: "Failed to update enrollment" });
  }
});

// GET /api/programs/:programId/enrollments/:id/homework-compliance — Compliance data
router.get("/:id/homework-compliance", async (req: Request, res: Response) => {
  try {
    const program = await verifyProgramOwnership(req.params.programId, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { id: req.params.id, programId: req.params.programId },
    });

    if (!enrollment) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    // Find all recurring homework parts in this program
    const parts = await prisma.part.findMany({
      where: {
        type: "HOMEWORK",
        deletedAt: null,
        module: { programId: req.params.programId },
      },
      select: { id: true, title: true, content: true },
    });

    const recurringParts = parts.filter((p) => {
      const content = p.content as unknown as HomeworkContent;
      return content?.recurrence && content.recurrence !== "NONE";
    });

    const compliance = await Promise.all(
      recurringParts.map(async (part) => {
        const content = part.content as unknown as HomeworkContent;
        const streak = await getStreakData(part.id, enrollment.id);
        return {
          partId: part.id,
          partTitle: part.title,
          recurrence: content.recurrence,
          recurrenceDays: content.recurrenceDays,
          ...streak,
        };
      })
    );

    res.json({ success: true, data: compliance });
  } catch (err) {
    logger.error("Get homework compliance error", err);
    res.status(500).json({ success: false, error: "Failed to get compliance data" });
  }
});

// POST /api/programs/:programId/enrollments/:enrollmentId/parts/:partId/stop-recurrence
router.post("/:enrollmentId/parts/:partId/stop-recurrence", async (req: Request, res: Response) => {
  try {
    const program = await verifyProgramOwnership(req.params.programId, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const part = await prisma.part.findFirst({
      where: {
        id: req.params.partId,
        type: "HOMEWORK",
        module: { programId: req.params.programId },
      },
    });

    if (!part) {
      res.status(404).json({ success: false, error: "Homework part not found" });
      return;
    }

    // Update content and cancel instances atomically
    const content = part.content as Record<string, unknown>;
    const today = toDateKey(new Date());
    content.recurrenceEndDate = today;

    await prisma.$transaction(async (tx) => {
      await tx.part.update({
        where: { id: part.id },
        data: { content: content as any },
      });

      // Cancel future PENDING instances for this enrollment
      await tx.homeworkInstance.updateMany({
        where: {
          partId: part.id,
          enrollmentId: req.params.enrollmentId,
          status: "PENDING",
          dueDate: { gte: new Date() },
          deletedAt: null,
        },
        data: { deletedAt: new Date() },
      });
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Stop recurrence error", err);
    res.status(500).json({ success: false, error: "Failed to stop recurrence" });
  }
});

// DELETE /api/programs/:programId/enrollments/:id — Remove enrollment
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const program = await verifyProgramOwnership(req.params.programId, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { id: req.params.id, programId: req.params.programId },
    });

    if (!enrollment) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    // Soft-delete: HIPAA requires 6-year minimum data retention
    await prisma.enrollment.update({
      where: { id: req.params.id },
      data: { status: "DROPPED" },
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Delete enrollment error", err);
    res.status(500).json({ success: false, error: "Failed to delete enrollment" });
  }
});

export default router;
