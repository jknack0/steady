import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { searchDiagnosisCodes, getRecentForParticipant } from "../services/diagnosis-codes";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));

// GET /api/diagnosis-codes?q=:query&participantId=:id
router.get("/", async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string)?.trim();
    if (!q || q.length < 2) {
      res.status(400).json({ success: false, error: "Search query must be at least 2 characters" });
      return;
    }

    const participantId = req.query.participantId as string | undefined;
    const clinicianProfileId = req.user!.clinicianProfileId!;

    const [results, recent] = await Promise.all([
      searchDiagnosisCodes(q),
      participantId ? getRecentForParticipant(clinicianProfileId, participantId) : Promise.resolve([]),
    ]);

    res.json({ success: true, data: { results, recent } });
  } catch (err) {
    logger.error("Diagnosis code search error", err);
    res.status(500).json({ success: false, error: "Failed to search diagnosis codes" });
  }
});

export default router;
