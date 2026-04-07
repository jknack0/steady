import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { searchPayers, isStediError } from "../services/stedi-client";
import { getEncryptedKey } from "../services/stedi-config";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

// GET /api/payers?q=:query
router.get("/", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) {
      res.status(400).json({ success: false, error: "Search query must be at least 2 characters" });
      return;
    }

    const ctx = res.locals.practiceCtx!;
    const encryptedKey = await getEncryptedKey(ctx.practiceId);
    if (!encryptedKey) {
      res.status(400).json({ success: false, error: "Stedi not configured for this practice" });
      return;
    }

    const result = await searchPayers(encryptedKey, q);
    if (isStediError(result)) {
      res.status(502).json({ success: false, error: result.message });
      return;
    }

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error("Payer search error", err);
    res.status(500).json({ success: false, error: "Failed to search payers" });
  }
});

export default router;
