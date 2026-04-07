import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { validate } from "../middleware/validate";
import { UpsertInsuranceSchema } from "@steady/shared";
import {
  getInsurance,
  upsertInsurance,
  removeInsurance,
  checkEligibility,
} from "../services/patient-insurance";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

// PUT /api/insurance/:participantId — upsert insurance
router.put("/:participantId", validate(UpsertInsuranceSchema), async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const { participantId } = req.params;
    const result = await upsertInsurance(ctx, participantId, req.body);

    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Participant not found or not owned" });
        return;
      }
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error("Upsert insurance error", err);
    res.status(500).json({ success: false, error: "Failed to save insurance" });
  }
});

// GET /api/insurance/:participantId — get insurance
router.get("/:participantId", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const { participantId } = req.params;
    const result = await getInsurance(ctx, participantId);

    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Participant not found or not owned" });
        return;
      }
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error("Get insurance error", err);
    res.status(500).json({ success: false, error: "Failed to get insurance" });
  }
});

// DELETE /api/insurance/:participantId — soft-delete
router.delete("/:participantId", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const { participantId } = req.params;
    const result = await removeInsurance(ctx, participantId);

    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "No active insurance found" });
        return;
      }
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    logger.error("Remove insurance error", err);
    res.status(500).json({ success: false, error: "Failed to remove insurance" });
  }
});

// POST /api/insurance/:participantId/eligibility — check eligibility
router.post("/:participantId/eligibility", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const { participantId } = req.params;
    const serviceCode = req.body?.serviceCode;
    const result = await checkEligibility(ctx, participantId, serviceCode);

    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Participant not found or not owned" });
        return;
      }
      if (result.error === "no_insurance") {
        res.status(404).json({ success: false, error: "No active insurance on file" });
        return;
      }
      if (result.error === "not_configured") {
        res.status(400).json({ success: false, error: "Stedi not configured for this practice" });
        return;
      }
      if (result.error === "stedi_error") {
        res.status(502).json({ success: false, error: (result as any).message || "Stedi unavailable" });
        return;
      }
    }

    res.json({ success: true, data: (result as any).data });
  } catch (err) {
    logger.error("Check eligibility error", err);
    res.status(500).json({ success: false, error: "Failed to check eligibility" });
  }
});

export default router;
