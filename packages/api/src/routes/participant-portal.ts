import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  ParticipantCancelAppointmentSchema,
  ParticipantInvoiceListQuerySchema,
  ParticipantAppointmentListQuerySchema,
  ParticipantProfileTimezonePatchSchema,
  ParticipantTelehealthEventSchema,
  isAppointmentJoinable,
} from "@steady/shared";
import {
  getParticipantInvoices,
  getParticipantInvoice,
  participantCancelAppointment,
  getParticipantOutstandingInvoiceCount,
} from "../services/participant-portal";
import { toParticipantView } from "../services/appointments";
import { prisma } from "@steady/db";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("PARTICIPANT"));

// ── Invoices ──────────────────────────────────────────────

// GET /api/participant/invoices
router.get("/invoices", async (req: Request, res: Response) => {
  try {
    const participantProfileId = req.user?.participantProfileId;
    if (!participantProfileId) {
      res.status(403).json({ success: false, error: "Participant profile required" });
      return;
    }

    const parsed = ParticipantInvoiceListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }

    const result = await getParticipantInvoices(participantProfileId, parsed.data);
    res.json({ success: true, data: result.data, cursor: result.cursor });
  } catch (err) {
    logger.error("List participant invoices error", err);
    res.status(500).json({ success: false, error: "Failed to list invoices" });
  }
});

// GET /api/participant/invoices/count
router.get("/invoices/count", async (req: Request, res: Response) => {
  try {
    const participantProfileId = req.user?.participantProfileId;
    if (!participantProfileId) {
      res.status(403).json({ success: false, error: "Participant profile required" });
      return;
    }

    const count = await getParticipantOutstandingInvoiceCount(participantProfileId);
    res.json({ success: true, data: { count } });
  } catch (err) {
    logger.error("Count participant invoices error", err);
    res.status(500).json({ success: false, error: "Failed to count invoices" });
  }
});

// GET /api/participant/invoices/:id
router.get("/invoices/:id", async (req: Request, res: Response) => {
  try {
    const participantProfileId = req.user?.participantProfileId;
    if (!participantProfileId) {
      res.status(403).json({ success: false, error: "Participant profile required" });
      return;
    }

    const invoice = await getParticipantInvoice(participantProfileId, req.params.id);
    if (!invoice) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    res.json({ success: true, data: invoice });
  } catch (err) {
    logger.error("Get participant invoice error", err);
    res.status(500).json({ success: false, error: "Failed to get invoice" });
  }
});

// ── Appointment Cancellation ──────────────────────────────

// POST /api/participant/appointments/:id/cancel
router.post(
  "/appointments/:id/cancel",
  validate(ParticipantCancelAppointmentSchema),
  async (req: Request, res: Response) => {
    try {
      const participantProfileId = req.user?.participantProfileId;
      const userId = req.user?.userId;
      if (!participantProfileId || !userId) {
        res.status(403).json({ success: false, error: "Participant profile required" });
        return;
      }

      const result = await participantCancelAppointment(
        participantProfileId,
        userId,
        req.params.id,
        req.body.cancelReason,
      );

      if ("error" in result) {
        if (result.error === "not_found") {
          res.status(404).json({ success: false, error: "Not found" });
          return;
        }
        if (result.error === "conflict") {
          res.status(409).json({ success: false, error: result.message });
          return;
        }
      }

      res.json({ success: true, data: toParticipantView((result as any).appointment) });
    } catch (err) {
      logger.error("Participant cancel appointment error", err);
      res.status(500).json({ success: false, error: "Failed to cancel appointment" });
    }
  },
);

// ── Client Web Portal extensions (FR-6, FR-7, AC-7.10, COND-7) ────

// GET /api/participant-portal/appointments?from=&to=&cursor=&limit=
// FR-6: Returns appointments for the participant across ALL clinicians
// (no practice scope), filtered by date range and visible statuses,
// with isJoinable pre-computed via the shared util.
router.get("/appointments", async (req: Request, res: Response) => {
  try {
    const participantProfileId = req.user!.participantProfileId!;
    const parsed = ParticipantAppointmentListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }

    const { from, to, cursor, limit } = parsed.data;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const take = Math.min(limit ?? 100, 100);

    // COND-5: explicit select — minimum necessary.
    // NOTE: Prisma model uses startAt/endAt; the view schema exposes
    // them as startTime/endTime.
    const items = await prisma.appointment.findMany({
      where: {
        participantId: participantProfileId,
        deletedAt: null,
        status: {
          in: [
            "SCHEDULED",
            "ATTENDED",
            "CLIENT_CANCELED",
            "CLINICIAN_CANCELED",
            "LATE_CANCELED",
          ],
        },
        startAt: { gte: fromDate, lte: toDate },
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        appointmentType: true,
        cancelReason: true,
        clinician: {
          select: {
            timezone: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
        location: { select: { name: true, type: true } },
      },
      orderBy: [{ startAt: "asc" }, { id: "asc" }],
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    });

    const hasMore = items.length > take;
    const data = (hasMore ? items.slice(0, take) : items).map((apt) => ({
      id: apt.id,
      startTime: apt.startAt.toISOString(),
      endTime: apt.endAt.toISOString(),
      status: apt.status,
      appointmentType: apt.appointmentType ?? null,
      cancelReason: apt.cancelReason ?? null,
      clinician: {
        firstName: apt.clinician?.user?.firstName ?? null,
        lastName: apt.clinician?.user?.lastName ?? null,
        timezone: apt.clinician?.timezone ?? null,
      },
      location: apt.location
        ? { name: apt.location.name ?? null, type: apt.location.type ?? null }
        : null,
      isJoinable: isAppointmentJoinable({
        startTime: apt.startAt,
        endTime: apt.endAt,
        status: apt.status,
      }),
    }));

    res.json({
      success: true,
      data,
      cursor: hasMore ? data[data.length - 1].id : null,
    });
  } catch (err) {
    logger.error("List participant appointments error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to list appointments" });
  }
});

// PATCH /api/participant-portal/profile
// FR-6 (AC-6.7, AC-6.8): Update participant timezone on first calendar load
router.patch(
  "/profile",
  validate(ParticipantProfileTimezonePatchSchema),
  async (req: Request, res: Response) => {
    try {
      const participantProfileId = req.user!.participantProfileId!;
      const { timezone } = req.body;
      await prisma.participantProfile.update({
        where: { id: participantProfileId },
        data: { timezone },
      });
      res.json({ success: true });
    } catch (err) {
      logger.error("Update participant profile error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to update profile" });
    }
  }
);

// POST /api/participant-portal/telehealth-events
// COND-7: HIPAA-required audit logging for room.connected and room.disconnected
router.post(
  "/telehealth-events",
  validate(ParticipantTelehealthEventSchema),
  async (req: Request, res: Response) => {
    try {
      const participantProfileId = req.user!.participantProfileId!;
      const userId = req.user!.userId;
      const { appointmentId, event } = req.body;

      // Verify ownership before logging
      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, participantId: participantProfileId },
        select: { id: true },
      });
      if (!appointment) {
        res.status(404).json({ success: false, error: "Appointment not found" });
        return;
      }

      // Audit log entry — COND-7
      await prisma.auditLog.create({
        data: {
          userId,
          action: "UPDATE", // AuditAction enum has CREATE/UPDATE/DELETE only
          resourceType: "Appointment",
          resourceId: appointmentId,
          metadata: {
            event:
              event === "connected"
                ? "telehealth_connected"
                : "telehealth_disconnected",
            participantInitiated: true,
          },
        },
      });

      res.json({ success: true });
    } catch (err) {
      logger.error("Telehealth event log error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to log event" });
    }
  }
);

export default router;
