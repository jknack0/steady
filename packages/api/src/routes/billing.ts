import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { getBillingSummary } from "../services/billing";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

router.get("/summary", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const summary = await getBillingSummary(ctx);
    res.json({ success: true, data: summary });
  } catch (err) {
    logger.error("Billing summary error", err);
    res.status(500).json({ success: false, error: "Failed to get billing summary" });
  }
});

export default router;
