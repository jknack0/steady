import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import {
  CreateDailyTrackerSchema,
  CreateTrackerFromTemplateSchema,
  UpdateDailyTrackerSchema,
} from "@steady/shared";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  getTrackerTemplates,
  createTrackerFromTemplate,
} from "../services/tracker-templates";

const router = Router();

router.use(authenticate, requireRole("CLINICIAN"));

// Helper: verify clinician owns the program
async function verifyProgramOwnership(programId: string, clinicianProfileId: string) {
  return prisma.program.findFirst({
    where: { id: programId, clinicianId: clinicianProfileId },
  });
}

// GET /api/daily-trackers/templates — List preset templates
router.get("/templates", (_req: Request, res: Response) => {
  res.json({ success: true, data: getTrackerTemplates() });
});

// POST /api/daily-trackers — Create tracker with fields
router.post("/", validate(CreateDailyTrackerSchema), async (req: Request, res: Response) => {
  try {
    const { name, description, programId, enrollmentId, reminderTime, fields } = req.body;

    // Verify ownership if programId provided
    if (programId) {
      const program = await verifyProgramOwnership(programId, req.user!.clinicianProfileId!);
      if (!program) {
        res.status(404).json({ success: false, error: "Program not found" });
        return;
      }
    }

    const tracker = await prisma.dailyTracker.create({
      data: {
        name,
        description: description || null,
        programId: programId || null,
        enrollmentId: enrollmentId || null,
        reminderTime: reminderTime || "20:00",
        createdById: req.user!.userId,
        fields: {
          create: fields.map((f: any, i: number) => ({
            label: f.label,
            fieldType: f.fieldType,
            options: f.options || null,
            sortOrder: f.sortOrder ?? i,
            isRequired: f.isRequired ?? true,
          })),
        },
      },
      include: { fields: { orderBy: { sortOrder: "asc" } } },
    });

    res.status(201).json({ success: true, data: tracker });
  } catch (err) {
    console.error("Create daily tracker error:", err);
    res.status(500).json({ success: false, error: "Failed to create tracker" });
  }
});

// POST /api/daily-trackers/from-template — Clone a template
router.post(
  "/from-template",
  validate(CreateTrackerFromTemplateSchema),
  async (req: Request, res: Response) => {
    try {
      const { templateKey, programId, enrollmentId } = req.body;

      if (programId) {
        const program = await verifyProgramOwnership(programId, req.user!.clinicianProfileId!);
        if (!program) {
          res.status(404).json({ success: false, error: "Program not found" });
          return;
        }
      }

      const trackerId = await createTrackerFromTemplate(
        templateKey,
        req.user!.userId,
        programId,
        enrollmentId
      );

      const tracker = await prisma.dailyTracker.findUnique({
        where: { id: trackerId },
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      });

      res.status(201).json({ success: true, data: tracker });
    } catch (err: any) {
      if (err.message?.includes("Template not found")) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }
      console.error("Create tracker from template error:", err);
      res.status(500).json({ success: false, error: "Failed to create tracker from template" });
    }
  }
);

// GET /api/daily-trackers?programId=X — List trackers for a program
router.get("/", async (req: Request, res: Response) => {
  try {
    const { programId } = req.query;

    if (!programId) {
      res.status(400).json({ success: false, error: "programId is required" });
      return;
    }

    const program = await verifyProgramOwnership(programId as string, req.user!.clinicianProfileId!);
    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const trackers = await prisma.dailyTracker.findMany({
      where: { programId: programId as string },
      include: {
        fields: { orderBy: { sortOrder: "asc" } },
        _count: { select: { entries: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: trackers });
  } catch (err) {
    console.error("List daily trackers error:", err);
    res.status(500).json({ success: false, error: "Failed to list trackers" });
  }
});

// GET /api/daily-trackers/:id — Get tracker with fields
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const tracker = await prisma.dailyTracker.findUnique({
      where: { id: req.params.id },
      include: { fields: { orderBy: { sortOrder: "asc" } } },
    });

    if (!tracker) {
      res.status(404).json({ success: false, error: "Tracker not found" });
      return;
    }

    res.json({ success: true, data: tracker });
  } catch (err) {
    console.error("Get daily tracker error:", err);
    res.status(500).json({ success: false, error: "Failed to get tracker" });
  }
});

// PUT /api/daily-trackers/:id — Update tracker config
router.put("/:id", validate(UpdateDailyTrackerSchema), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.dailyTracker.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "Tracker not found" });
      return;
    }

    const { fields, ...updateData } = req.body;

    // If fields are provided, replace all fields
    if (fields) {
      await prisma.$transaction(async (tx) => {
        // Delete existing fields
        await tx.dailyTrackerField.deleteMany({
          where: { trackerId: req.params.id },
        });

        // Create new fields
        await tx.dailyTrackerField.createMany({
          data: fields.map((f: any, i: number) => ({
            trackerId: req.params.id,
            label: f.label,
            fieldType: f.fieldType,
            options: f.options || null,
            sortOrder: f.sortOrder ?? i,
            isRequired: f.isRequired ?? true,
          })),
        });

        // Update tracker metadata
        if (Object.keys(updateData).length > 0) {
          await tx.dailyTracker.update({
            where: { id: req.params.id },
            data: updateData,
          });
        }
      });
    } else if (Object.keys(updateData).length > 0) {
      await prisma.dailyTracker.update({
        where: { id: req.params.id },
        data: updateData,
      });
    }

    const tracker = await prisma.dailyTracker.findUnique({
      where: { id: req.params.id },
      include: { fields: { orderBy: { sortOrder: "asc" } } },
    });

    res.json({ success: true, data: tracker });
  } catch (err) {
    console.error("Update daily tracker error:", err);
    res.status(500).json({ success: false, error: "Failed to update tracker" });
  }
});

// DELETE /api/daily-trackers/:id — Delete tracker
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const existing = await prisma.dailyTracker.findUnique({
      where: { id: req.params.id },
    });

    if (!existing) {
      res.status(404).json({ success: false, error: "Tracker not found" });
      return;
    }

    await prisma.dailyTracker.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) {
    console.error("Delete daily tracker error:", err);
    res.status(500).json({ success: false, error: "Failed to delete tracker" });
  }
});

// GET /api/daily-trackers/:id/entries?userId=X&startDate=Y&endDate=Z — Get entries
router.get("/:id/entries", async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate, cursor, limit } = req.query;

    if (!userId) {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }

    const take = Math.min(parseInt(limit as string) || 30, 100);

    const where: any = {
      trackerId: req.params.id,
      userId: userId as string,
    };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const entries = await prisma.dailyTrackerEntry.findMany({
      where,
      orderBy: { date: "desc" },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor as string }, skip: 1 } : {}),
    });

    const hasMore = entries.length > take;
    const data = hasMore ? entries.slice(0, take) : entries;

    res.json({
      success: true,
      data,
      cursor: hasMore ? data[data.length - 1].id : null,
    });
  } catch (err) {
    console.error("Get tracker entries error:", err);
    res.status(500).json({ success: false, error: "Failed to get entries" });
  }
});

// GET /api/daily-trackers/:id/trends?userId=X — Trend data for charts
router.get("/:id/trends", async (req: Request, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query;

    if (!userId) {
      res.status(400).json({ success: false, error: "userId is required" });
      return;
    }

    // Default to last 30 days
    const end = endDate ? new Date(endDate as string) : new Date();
    const start = startDate
      ? new Date(startDate as string)
      : new Date(end.getTime() - 30 * 86400000);

    const [tracker, entries] = await Promise.all([
      prisma.dailyTracker.findUnique({
        where: { id: req.params.id },
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      }),
      prisma.dailyTrackerEntry.findMany({
        where: {
          trackerId: req.params.id,
          userId: userId as string,
          date: { gte: start, lte: end },
        },
        orderBy: { date: "asc" },
      }),
    ]);

    if (!tracker) {
      res.status(404).json({ success: false, error: "Tracker not found" });
      return;
    }

    // Build per-field time series for SCALE and NUMBER fields
    const chartableFields = tracker.fields.filter(
      (f) => f.fieldType === "SCALE" || f.fieldType === "NUMBER"
    );

    const fieldTrends: Record<string, Array<{ date: string; value: number }>> = {};
    for (const field of chartableFields) {
      fieldTrends[field.id] = [];
    }

    for (const entry of entries) {
      const responses = entry.responses as Record<string, unknown>;
      for (const field of chartableFields) {
        const value = responses[field.id];
        if (typeof value === "number") {
          fieldTrends[field.id].push({
            date: entry.date.toISOString().split("T")[0],
            value,
          });
        }
      }
    }

    // Completion rate
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1;
    const completedDays = entries.length;

    // Current streak
    let streak = 0;
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const sortedDates = entries
      .map((e) => e.date.toISOString().split("T")[0])
      .reverse();

    for (let i = 0; i < sortedDates.length; i++) {
      const expected = new Date(today);
      expected.setUTCDate(expected.getUTCDate() - i);
      const expectedStr = expected.toISOString().split("T")[0];
      if (sortedDates[i] === expectedStr) {
        streak++;
      } else {
        break;
      }
    }

    res.json({
      success: true,
      data: {
        fields: tracker.fields.map((f) => ({
          id: f.id,
          label: f.label,
          fieldType: f.fieldType,
          options: f.options,
        })),
        fieldTrends,
        completionRate: totalDays > 0 ? completedDays / totalDays : 0,
        totalDays,
        completedDays,
        streak,
      },
    });
  } catch (err) {
    console.error("Get tracker trends error:", err);
    res.status(500).json({ success: false, error: "Failed to get trends" });
  }
});

export default router;
