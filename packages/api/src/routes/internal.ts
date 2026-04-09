import { Router } from "express";
import { authenticateInternal } from "../middleware/internal-auth";
import { handleTranscriptResult } from "../services/transcription";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticateInternal);

// POST /internal/transcripts — called by GPU worker after transcription
router.post("/transcripts", async (req, res) => {
  try {
    const { telehealthSessionId, transcript, audioHash } = req.body;

    if (!telehealthSessionId || !transcript) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }

    await handleTranscriptResult(telehealthSessionId, transcript, audioHash);

    res.json({ success: true });
  } catch (err) {
    logger.error("Internal transcript endpoint error", err);
    const message = err instanceof Error ? err.message : "Internal error";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
