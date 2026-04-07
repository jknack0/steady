import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { validate } from "../middleware/validate";
import { CreateClaimSchema, ListClaimsQuerySchema } from "@steady/shared";
import {
  createClaim,
  listClaims,
  getClaim,
  refreshClaimStatus,
  resubmitClaim,
} from "../services/claims";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

// POST /api/claims — create claim
router.post("/", validate(CreateClaimSchema), async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await createClaim(ctx, req.body);

    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: result.message || "Appointment not found" });
        return;
      }
      if (result.error === "not_attended") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
      if (result.error === "no_insurance") {
        res.status(404).json({ success: false, error: result.message });
        return;
      }
      if (result.error === "claim_exists") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
      res.status(400).json({ success: false, error: result.message || result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.data });
  } catch (err) {
    logger.error("Create claim error", err);
    res.status(500).json({ success: false, error: "Failed to create claim" });
  }
});

// GET /api/claims — list claims
router.get("/", async (req: Request, res: Response) => {
  try {
    const parsed = ListClaimsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: "Validation failed" });
      return;
    }
    const ctx = res.locals.practiceCtx!;
    const result = await listClaims(ctx, parsed.data);
    res.json({ success: true, data: result.data, cursor: result.cursor });
  } catch (err) {
    logger.error("List claims error", err);
    res.status(500).json({ success: false, error: "Failed to list claims" });
  }
});

// GET /api/claims/:id — get claim detail
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await getClaim(ctx, req.params.id);

    if ("error" in result) {
      res.status(404).json({ success: false, error: "Claim not found" });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error("Get claim error", err);
    res.status(500).json({ success: false, error: "Failed to get claim" });
  }
});

// POST /api/claims/:id/refresh-status — refresh from Stedi
router.post("/:id/refresh-status", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await refreshClaimStatus(ctx, req.params.id);

    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Claim not found" });
        return;
      }
      if (result.error === "invalid_status") {
        res.status(409).json({ success: false, error: (result as any).message });
        return;
      }
      if (result.error === "stedi_error") {
        res.status(502).json({ success: false, error: "Unable to reach Stedi — try again later" });
        return;
      }
      res.status(400).json({ success: false, error: "Request failed" });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error("Refresh claim status error", err);
    res.status(500).json({ success: false, error: "Failed to refresh claim status" });
  }
});

// PUT /api/claims/:id/resubmit — resubmit rejected claim
router.put("/:id/resubmit", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await resubmitClaim(ctx, req.params.id, req.body);

    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Claim not found" });
        return;
      }
      if (result.error === "invalid_status") {
        res.status(409).json({ success: false, error: (result as any).message });
        return;
      }
      res.status(400).json({ success: false, error: (result as any).message || result.error });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error("Resubmit claim error", err);
    res.status(500).json({ success: false, error: "Failed to resubmit claim" });
  }
});

export default router;
