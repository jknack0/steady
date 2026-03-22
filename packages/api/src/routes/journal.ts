import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireRole("PARTICIPANT"));

// GET /api/participant/journal — List journal entries with optional date range
router.get("/", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;
    const { start, end, cursor, limit = "30" } = req.query;
    const take = Math.min(parseInt(limit as string) || 30, 100);

    const where: any = { participantId };

    if (start || end) {
      where.entryDate = {};
      if (start) where.entryDate.gte = new Date(start as string);
      if (end) where.entryDate.lte = new Date(end as string);
    }

    const entries = await prisma.journalEntry.findMany({
      where,
      orderBy: { entryDate: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    });

    const hasMore = entries.length > take;
    const data = hasMore ? entries.slice(0, take) : entries;

    res.json({
      success: true,
      data,
      cursor: hasMore ? data[data.length - 1].id : null,
    });
  } catch (err) {
    logger.error("List journal entries error", err);
    res.status(500).json({ success: false, error: "Failed to list journal entries" });
  }
});

// GET /api/participant/journal/:date — Get entry for a specific date (YYYY-MM-DD)
router.get("/:date", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;
    const entryDate = new Date(req.params.date);

    if (isNaN(entryDate.getTime())) {
      res.status(400).json({ success: false, error: "Invalid date format. Use YYYY-MM-DD" });
      return;
    }

    const entry = await prisma.journalEntry.findUnique({
      where: {
        participantId_entryDate: {
          participantId,
          entryDate,
        },
      },
    });

    res.json({ success: true, data: entry });
  } catch (err) {
    logger.error("Get journal entry error", err);
    res.status(500).json({ success: false, error: "Failed to get journal entry" });
  }
});

// POST /api/participant/journal — Create or update a journal entry
router.post("/", async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;
    const { entryDate, freeformContent, responses, regulationScore, isSharedWithClinician, promptPartId } = req.body;

    if (!entryDate) {
      res.status(400).json({ success: false, error: "entryDate is required" });
      return;
    }

    const date = new Date(entryDate);
    if (isNaN(date.getTime())) {
      res.status(400).json({ success: false, error: "Invalid date format" });
      return;
    }

    // Validate regulation score if provided
    if (regulationScore !== undefined && regulationScore !== null) {
      if (regulationScore < 1 || regulationScore > 10) {
        res.status(400).json({ success: false, error: "regulationScore must be between 1 and 10" });
        return;
      }
    }

    const entry = await prisma.journalEntry.upsert({
      where: {
        participantId_entryDate: {
          participantId,
          entryDate: date,
        },
      },
      create: {
        participantId,
        entryDate: date,
        freeformContent: freeformContent || null,
        responses: responses || null,
        regulationScore: regulationScore ?? null,
        isSharedWithClinician: isSharedWithClinician ?? false,
        promptPartId: promptPartId || null,
      },
      update: {
        freeformContent: freeformContent ?? undefined,
        responses: responses ?? undefined,
        regulationScore: regulationScore ?? undefined,
        isSharedWithClinician: isSharedWithClinician ?? undefined,
        promptPartId: promptPartId ?? undefined,
      },
    });

    res.json({ success: true, data: entry });
  } catch (err) {
    logger.error("Upsert journal entry error", err);
    res.status(500).json({ success: false, error: "Failed to save journal entry" });
  }
});

export default router;
