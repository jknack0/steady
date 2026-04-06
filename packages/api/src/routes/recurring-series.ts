import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { validate } from "../middleware/validate";
import {
  CreateSeriesSchema,
  UpdateSeriesSchema,
  ListSeriesQuerySchema,
} from "@steady/shared";
import {
  createSeries,
  listSeries,
  getSeries,
  updateSeries,
  pauseSeries,
  resumeSeries,
  deleteSeries,
  toSeriesView,
} from "../services/recurring-series";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

// POST / — Create series + generate first 4 weeks
router.post(
  "/",
  validate(CreateSeriesSchema),
  async (req: Request, res: Response) => {
    try {
      const ctx = res.locals.practiceCtx!;
      const result = await createSeries(ctx, req.body);
      if ("error" in result) {
        if (result.error === "not_found") {
          res.status(404).json({ success: false, error: "Not found" });
          return;
        }
        if (result.error === "conflict") {
          res.status(409).json({ success: false, error: result.message });
          return;
        }
      }
      if (!("error" in result)) {
        res.status(201).json({
          success: true,
          data: {
            series: toSeriesView(result.series),
            appointmentsCreated: result.appointmentsCreated,
            conflicts: result.conflicts,
          },
        });
      }
    } catch (err) {
      logger.error("Create recurring series error", err);
      res.status(500).json({ success: false, error: "Failed to create recurring series" });
    }
  },
);

// GET / — List series
router.get("/", async (req: Request, res: Response) => {
  try {
    const parsed = ListSeriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }
    const ctx = res.locals.practiceCtx!;
    const result = await listSeries(ctx, parsed.data);
    res.json({
      success: true,
      data: result.data.map(toSeriesView),
      cursor: result.cursor,
    });
  } catch (err) {
    logger.error("List recurring series error", err);
    res.status(500).json({ success: false, error: "Failed to list recurring series" });
  }
});

// GET /:id — Get single series with upcoming appointments
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const series = await getSeries(ctx, req.params.id);
    if (!series) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.json({ success: true, data: toSeriesView(series) });
  } catch (err) {
    logger.error("Get recurring series error", err);
    res.status(500).json({ success: false, error: "Failed to get recurring series" });
  }
});

// PATCH /:id — Update series; regenerate future appointments
router.patch(
  "/:id",
  validate(UpdateSeriesSchema),
  async (req: Request, res: Response) => {
    try {
      const ctx = res.locals.practiceCtx!;
      const result = await updateSeries(ctx, req.params.id, req.body);
      if ("error" in result) {
        if (result.error === "not_found") {
          res.status(404).json({ success: false, error: "Not found" });
          return;
        }
        if (result.error === "conflict") {
          res.status(409).json({ success: false, error: result.message });
          return;
        }
      }
      if (!("error" in result)) {
        res.json({
          success: true,
          data: {
            series: toSeriesView(result.series),
            appointmentsRegenerated: result.appointmentsRegenerated,
          },
        });
      }
    } catch (err) {
      logger.error("Update recurring series error", err);
      res.status(500).json({ success: false, error: "Failed to update recurring series" });
    }
  },
);

// POST /:id/pause — Pause series
router.post("/:id/pause", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await pauseSeries(ctx, req.params.id);
    if (result && "error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (result.error === "conflict") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
    }
    res.json({ success: true, data: toSeriesView(result) });
  } catch (err) {
    logger.error("Pause recurring series error", err);
    res.status(500).json({ success: false, error: "Failed to pause recurring series" });
  }
});

// POST /:id/resume — Resume series
router.post("/:id/resume", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await resumeSeries(ctx, req.params.id);
    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (result.error === "conflict") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
    }
    if (!("error" in result)) {
      res.json({
        success: true,
        data: {
          series: toSeriesView(result.series),
          appointmentsCreated: result.appointmentsCreated,
        },
      });
    }
  } catch (err) {
    logger.error("Resume recurring series error", err);
    res.status(500).json({ success: false, error: "Failed to resume recurring series" });
  }
});

// DELETE /:id — Delete series + future SCHEDULED appointments
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await deleteSeries(ctx, req.params.id);
    if ("error" in result) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logger.error("Delete recurring series error", err);
    res.status(500).json({ success: false, error: "Failed to delete recurring series" });
  }
});

export default router;
