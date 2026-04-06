import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { getRemindersForAppointment } from "../services/appointment-reminders";
import { getAppointment } from "../services/appointments";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

// GET /api/appointments/:id/reminders
router.get("/:id/reminders", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;

    // Verify appointment ownership
    const appt = await getAppointment(ctx, req.params.id);
    if (!appt) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    const reminders = await getRemindersForAppointment(req.params.id);
    res.json({ success: true, data: reminders });
  } catch (err) {
    logger.error("Get appointment reminders error", err);
    res.status(500).json({ success: false, error: "Failed to get reminders" });
  }
});

export default router;
