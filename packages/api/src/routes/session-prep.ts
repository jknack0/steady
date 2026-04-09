import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { getSessionPrep } from "../services/session-prep";
import { logger } from "../lib/logger";

const router = Router({ mergeParams: true });

router.get(
  "/:id/prep",
  authenticate,
  requireRole("CLINICIAN", "ADMIN"),
  requirePracticeCtx,
  async (req: Request, res: Response) => {
    try {
      const ctx = res.locals.practiceCtx!;
      const result = await getSessionPrep(ctx, req.params.id);
      if ("error" in result) {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error("Get session prep error", err);
      res.status(500).json({ success: false, error: "Failed to get session prep" });
    }
  },
);

export default router;
