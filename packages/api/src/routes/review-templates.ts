import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { UpsertReviewTemplateSchema } from "@steady/shared";
import { getOrDefaultTemplate, upsertTemplate } from "../services/review-templates";
import { logger } from "../lib/logger";

const router = Router({ mergeParams: true });

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));

router.get("/:id/review-template", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user?.clinicianProfileId;
    if (!clinicianProfileId) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    const program = await prisma.program.findFirst({
      where: { id: req.params.id, clinicianId: clinicianProfileId },
    });
    if (!program) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }

    const template = await getOrDefaultTemplate(req.params.id);
    res.json({ success: true, data: template });
  } catch (err) {
    logger.error("Get review template error", err);
    res.status(500).json({ success: false, error: "Failed to get review template" });
  }
});

router.put(
  "/:id/review-template",
  validate(UpsertReviewTemplateSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianProfileId = req.user?.clinicianProfileId;
      if (!clinicianProfileId) {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }

      const result = await upsertTemplate(clinicianProfileId, req.params.id, req.body);
      if (result && "error" in result) {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      res.json({ success: true, data: result });
    } catch (err) {
      logger.error("Upsert review template error", err);
      res.status(500).json({ success: false, error: "Failed to update review template" });
    }
  },
);

export default router;
