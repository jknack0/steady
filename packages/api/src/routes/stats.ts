import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import { getParticipantStats } from "../services/stats";

const router = Router();

router.use(authenticate);

// GET /api/stats/participant — Own stats (participant)
router.get("/participant", requireRole("PARTICIPANT"), async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;
    const { start, end } = req.query;

    const stats = await getParticipantStats(
      participantId,
      start as string | undefined,
      end as string | undefined
    );

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error("Get participant stats error:", err);
    res.status(500).json({ success: false, error: "Failed to get stats" });
  }
});

// GET /api/stats/participant/:participantId — Clinician views participant stats
router.get(
  "/participant/:participantId",
  requireRole("CLINICIAN", "ADMIN"),
  async (req: Request, res: Response) => {
    try {
      const { participantId } = req.params;
      const { start, end } = req.query;

      // Look up by participantProfile ID or User ID
      let participant = await prisma.participantProfile.findUnique({
        where: { id: participantId },
      });

      if (!participant) {
        // Try looking up by userId (enrollment list returns user IDs)
        participant = await prisma.participantProfile.findUnique({
          where: { userId: participantId },
        });
      }

      if (!participant) {
        res.status(404).json({ success: false, error: "Participant not found" });
        return;
      }

      const stats = await getParticipantStats(
        participant.id,
        start as string | undefined,
        end as string | undefined
      );

      res.json({ success: true, data: stats });
    } catch (err) {
      console.error("Get participant stats error:", err);
      res.status(500).json({ success: false, error: "Failed to get stats" });
    }
  }
);

export default router;
