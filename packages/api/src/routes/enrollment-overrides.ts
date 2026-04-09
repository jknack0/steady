import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { CreateOverrideSchema } from "@steady/shared";
import {
  createOverride,
  listOverrides,
  deleteOverride,
} from "../services/enrollment-overrides";
import { logger } from "../lib/logger";

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));

router.post(
  "/:id/overrides",
  validate(CreateOverrideSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianProfileId = req.user?.clinicianProfileId;
      if (!clinicianProfileId) {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }

      const result = await createOverride(clinicianProfileId, req.params.id, req.body);
      if (result && "error" in result) {
        if (result.error === "not_found") {
          res.status(404).json({ success: false, error: "Not found" });
          return;
        }
        if (result.error === "validation") {
          res.status(400).json({ success: false, error: result.message });
          return;
        }
      }
      res.status(201).json({ success: true, data: result });
    } catch (err) {
      logger.error("Create override error", err);
      res.status(500).json({ success: false, error: "Failed to create override" });
    }
  },
);

router.get("/:id/overrides", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user?.clinicianProfileId;
    if (!clinicianProfileId) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    const result = await listOverrides(
      clinicianProfileId,
      req.params.id,
      req.query.moduleId as string | undefined,
    );
    if ("error" in result) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error("List overrides error", err);
    res.status(500).json({ success: false, error: "Failed to list overrides" });
  }
});

router.delete("/:id/overrides/:overrideId", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user?.clinicianProfileId;
    if (!clinicianProfileId) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    const result = await deleteOverride(
      clinicianProfileId,
      req.params.id,
      req.params.overrideId,
    );
    if ("error" in result) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logger.error("Delete override error", err);
    res.status(500).json({ success: false, error: "Failed to delete override" });
  }
});

export default router;
