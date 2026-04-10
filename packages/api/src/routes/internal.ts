import { Router } from "express";
import { prisma } from "@steady/db";
import { authenticateInternal } from "../middleware/internal-auth";
import { logger } from "../lib/logger";
import { queueSummarization } from "../services/session-summary";

const router = Router();

router.use(authenticateInternal);

/**
 * POST /internal/transcripts
 *
 * Called by the transcription worker after transcription completes.
 * Internal only — authenticated via INTERNAL_API_KEY shared secret.
 */
router.post("/transcripts", async (req, res) => {
  try {
    const { sessionId, transcript, audioHash } = req.body;

    if (!sessionId || !transcript) {
      res.status(400).json({ success: false, error: "Missing required fields" });
      return;
    }

    const session = await prisma.telehealthSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    // Only accept transcripts for sessions in pending/transcribing state
    if (!["pending", "transcribing"].includes(session.transcriptStatus)) {
      res.status(409).json({
        success: false,
        error: `Invalid session state: ${session.transcriptStatus}`,
      });
      return;
    }

    await prisma.telehealthSession.update({
      where: { id: sessionId },
      data: {
        transcript: transcript as any,
        transcriptStatus: "completed",
        transcribedAt: new Date(),
      },
    });

    // HIPAA: log only the ID and audio hash, never transcript content
    logger.info("Transcript stored", `sessionId=${sessionId} hash=${audioHash || "none"}`);

    // Queue AI summarization (fire-and-forget)
    queueSummarization(sessionId).catch((err) => {
      logger.error("Failed to queue summarization", err);
    });

    res.json({ success: true });
  } catch (err) {
    logger.error("Transcript callback error", err);
    res.status(500).json({ success: false, error: "Internal error" });
  }
});

export default router;
