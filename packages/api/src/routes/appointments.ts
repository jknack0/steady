import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { validate } from "../middleware/validate";
import {
  CreateAppointmentSchema,
  UpdateAppointmentSchema,
  StatusChangeSchema,
  ListAppointmentsQuerySchema,
} from "@steady/shared";
import {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  changeStatus,
  deleteAppointment,
  toClinicianView,
} from "../services/appointments";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

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
