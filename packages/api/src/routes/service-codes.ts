import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { listServiceCodes, seedServiceCodesForPractice } from "../services/service-codes";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

router.get("/", async (_req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    await seedServiceCodesForPractice(ctx.practiceId);
    const data = await listServiceCodes(ctx);
    res.json({ success: true, data });
  } catch (err) {
    logger.error("List service codes error", err);
    res.status(500).json({ success: false, error: "Failed to list service codes" });
  }
});

function methodNotAllowed(_req: Request, res: Response): void {
  res.status(405).json({
    success: false,
    error: "Service code editing is not yet available",
  });
}

router.post("/", methodNotAllowed);
router.patch("/:id", methodNotAllowed);
router.put("/:id", methodNotAllowed);
router.delete("/:id", methodNotAllowed);

export default router;
