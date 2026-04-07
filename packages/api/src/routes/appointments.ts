import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { validate } from "../middleware/validate";
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  StatusChangeSchema,
  ListAppointmentsQuerySchema,
  ListParticipantAppointmentsQuerySchema,
  type AppointmentStatus,
} from "@steady/shared";
import {
  createAppointment,
  listAppointments,
  listUnbilledAppointments,
  listParticipantAppointments,
  getAppointment,
  updateAppointment,
  changeStatus,
  deleteAppointment,
  toClinicianView,
  toParticipantView,
} from "../services/appointments";
import { logger } from "../lib/logger";

const router = Router();

const DEFAULT_PARTICIPANT_STATUSES: AppointmentStatus[] = ["SCHEDULED", "ATTENDED"];
const VALID_PARTICIPANT_STATUSES = new Set<AppointmentStatus>([
  "SCHEDULED",
  "ATTENDED",
  "NO_SHOW",
  "LATE_CANCELED",
  "CLIENT_CANCELED",
  "CLINICIAN_CANCELED",
]);

// Participant-facing endpoint — must NOT pass through clinician/practice middleware.
// Mounted before the clinician-role guard below.
router.get(
  "/mine",
  authenticate,
  requireRole("PARTICIPANT"),
  async (req: Request, res: Response) => {
    try {
      const parsed = ListParticipantAppointmentsQuerySchema.safeParse(req.query);
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

      const participantProfileId = req.user?.participantProfileId;
      if (!participantProfileId) {
        res.status(403).json({ success: false, error: "Participant profile required" });
        return;
      }

      const now = new Date();
      const from = parsed.data.from ? new Date(parsed.data.from) : now;
      // Default window: 60 days forward (fits within 62-day cap per COND-14)
      const to = parsed.data.to
        ? new Date(parsed.data.to)
        : new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

      // 62-day cap (COND-14) — Zod covers explicit from+to, but defaults can exceed.
      const MS = 62 * 24 * 60 * 60 * 1000;
      if (to.getTime() - from.getTime() > MS) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: [{ path: "to", message: "Date range cannot exceed 62 days" }],
        });
        return;
      }
      if (to.getTime() <= from.getTime()) {
        res.status(400).json({
          success: false,
          error: "Validation failed",
          details: [{ path: "to", message: "to must be after from" }],
        });
        return;
      }

      let statusList: AppointmentStatus[] = DEFAULT_PARTICIPANT_STATUSES;
      if (parsed.data.status) {
        const raw = parsed.data.status
          .split(",")
          .map((s) => s.trim())
          .filter((s): s is AppointmentStatus =>
            VALID_PARTICIPANT_STATUSES.has(s as AppointmentStatus),
          );
        if (raw.length > 0) statusList = raw;
      }

      const limit = Math.min(parsed.data.limit ?? 50, 100);

      const result = await listParticipantAppointments({
        participantProfileId,
        from,
        to,
        status: statusList,
        limit,
        cursor: parsed.data.cursor,
      });

      res.json({
        success: true,
        data: result.data.map(toParticipantView),
        cursor: result.cursor,
      });
    } catch (err) {
      logger.error("List participant appointments error", err);
      res.status(500).json({ success: false, error: "Failed to list appointments" });
    }
  },
);

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

// GET /unbilled — attended appointments with no invoice or claim (last 90 days)
// Must be registered before /:id to avoid route collision.
router.get("/unbilled", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const cursor = req.query.cursor as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const result = await listUnbilledAppointments(ctx, { cursor, limit });
    res.json({
      success: true,
      data: result.data.map(toClinicianView),
      cursor: result.cursor,
    });
  } catch (err) {
    logger.error("List unbilled appointments error", err);
    res.status(500).json({ success: false, error: "Failed to list unbilled appointments" });
  }
});

router.post("/", validate(CreateAppointmentSchema), async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await createAppointment(ctx, req.body);
    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (result.error === "validation") {
        res.status(400).json({ success: false, error: result.message });
        return;
      }
    } else {
      res.status(201).json({
        success: true,
        data: {
          appointment: toClinicianView(result.appointment),
          conflicts: result.conflicts,
        },
      });
      return;
    }
  } catch (err) {
    logger.error("Create appointment error", err);
    res.status(500).json({ success: false, error: "Failed to create appointment" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const parsed = ListAppointmentsQuerySchema.safeParse(req.query);
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
    const ctx = res.locals.practiceCtx!;
    const result = await listAppointments(ctx, parsed.data);
    if ("error" in result) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.json({
      success: true,
      data: result.data.map(toClinicianView),
      cursor: result.cursor,
    });
  } catch (err) {
    logger.error("List appointments error", err);
    res.status(500).json({ success: false, error: "Failed to list appointments" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const appt = await getAppointment(ctx, req.params.id);
    if (!appt) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.json({ success: true, data: toClinicianView(appt) });
  } catch (err) {
    logger.error("Get appointment error", err);
    res.status(500).json({ success: false, error: "Failed to get appointment" });
  }
});

router.patch("/:id", validate(UpdateAppointmentSchema), async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await updateAppointment(ctx, req.params.id, req.body);
    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (result.error === "conflict") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
      if (result.error === "validation") {
        res.status(400).json({ success: false, error: result.message });
        return;
      }
    } else {
      res.json({
        success: true,
        data: {
          appointment: toClinicianView(result.appointment),
          conflicts: result.conflicts,
        },
      });
      return;
    }
  } catch (err) {
    logger.error("Update appointment error", err);
    res.status(500).json({ success: false, error: "Failed to update appointment" });
  }
});

router.post("/:id/status", validate(StatusChangeSchema), async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const { status, cancelReason } = req.body;
    const result = await changeStatus(ctx, req.params.id, status, cancelReason);
    if (result && "error" in result) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.json({ success: true, data: toClinicianView(result) });
  } catch (err) {
    logger.error("Change appointment status error", err);
    res.status(500).json({ success: false, error: "Failed to change status" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await deleteAppointment(ctx, req.params.id);
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
    res.status(204).send();
  } catch (err) {
    logger.error("Delete appointment error", err);
    res.status(500).json({ success: false, error: "Failed to delete appointment" });
  }
});

export default router;
