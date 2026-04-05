import { Router, Request, Response, NextFunction } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { validate } from "../middleware/validate";
import { CreateLocationSchema, UpdateLocationSchema } from "@steady/shared";
import {
  listLocations,
  createLocation,
  updateLocation,
  softDeleteLocation,
  seedDefaultLocationsForPractice,
} from "../services/locations";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

function requireAccountOwner(req: Request, res: Response, next: NextFunction): void {
  if (!res.locals.practiceCtx?.isAccountOwner) {
    res.status(403).json({ success: false, error: "Account owner required" });
    return;
  }
  next();
}

router.get("/", async (_req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    await seedDefaultLocationsForPractice(ctx.practiceId);
    const data = await listLocations(ctx);
    res.json({ success: true, data });
  } catch (err) {
    logger.error("List locations error", err);
    res.status(500).json({ success: false, error: "Failed to list locations" });
  }
});

router.post(
  "/",
  requireAccountOwner,
  validate(CreateLocationSchema),
  async (req: Request, res: Response) => {
    try {
      const ctx = res.locals.practiceCtx!;
      const data = await createLocation(ctx, req.body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      logger.error("Create location error", err);
      res.status(500).json({ success: false, error: "Failed to create location" });
    }
  },
);

router.patch(
  "/:id",
  requireAccountOwner,
  validate(UpdateLocationSchema),
  async (req: Request, res: Response) => {
    try {
      const ctx = res.locals.practiceCtx!;
      const result = await updateLocation(ctx, req.params.id, req.body);
      if (result && "error" in result) {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error("Update location error", err);
      res.status(500).json({ success: false, error: "Failed to update location" });
    }
  },
);

router.delete("/:id", requireAccountOwner, async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await softDeleteLocation(ctx, req.params.id);
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
    res.status(204).send();
  } catch (err) {
    logger.error("Delete location error", err);
    res.status(500).json({ success: false, error: "Failed to delete location" });
  }
});

export default router;
