import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  CreatePortalInvitationSchema,
  PortalInvitationListQuerySchema,
} from "@steady/shared";
import {
  createPortalInvitation,
  listPortalInvitations,
  resendPortalInvitation,
  renewPortalInvitation,
  revokePortalInvitation,
  toPortalInvitationView,
} from "../services/portal-invitations";
import { ConflictError, NotFoundError } from "../services/clinician";
import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { checkRateLimit } from "../services/rate-limit";

const router = Router();

router.use(authenticate, requireRole("CLINICIAN"));

// ── POST /api/portal-invitations ──────────────────────────────────
// FR-1: Create a new portal invitation (AC-1.1 through AC-1.9)
router.post(
  "/",
  validate(CreatePortalInvitationSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianId = req.user!.clinicianProfileId!;

      // NFR-2.8: 20/hour per clinician
      const limit = await checkRateLimit({
        bucket: "create-portal-invite",
        identifier: clinicianId,
        limit: 20,
        windowMs: 60 * 60 * 1000,
      });
      if (limit.exceeded) {
        res.status(429).json({
          success: false,
          error: "Too many invitations created. Please try again later.",
        });
        return;
      }

      const { invitation } = await createPortalInvitation(clinicianId, req.body);

      res.status(201).json({
        success: true,
        data: toPortalInvitationView(invitation),
      });
    } catch (err) {
      if (err instanceof ConflictError) {
        res.status(409).json({ success: false, error: err.message });
        return;
      }
      if (err instanceof NotFoundError) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      logger.error("Create portal invitation error", err);
      // In non-production, surface the underlying error message to speed
      // up local debugging. In production, keep the generic message.
      const isDev = process.env.NODE_ENV !== "production";
      res.status(500).json({
        success: false,
        error: "Failed to create invitation",
        ...(isDev && err instanceof Error
          ? { devError: err.message }
          : {}),
      });
    }
  }
);

// ── GET /api/portal-invitations ───────────────────────────────────
router.get("/", async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const parsed = PortalInvitationListQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid query parameters",
      });
      return;
    }

    const result = await listPortalInvitations(clinicianId, parsed.data);
    res.json({
      success: true,
      data: result.data,
      cursor: result.cursor,
    });
  } catch (err) {
    logger.error("List portal invitations error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to list invitations" });
  }
});

// ── GET /api/portal-invitations/:id ───────────────────────────────
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const invitation = await prisma.portalInvitation.findFirst({
      where: {
        id: req.params.id,
        clinicianId,
        deletedAt: null,
      },
    });
    if (!invitation) {
      res.status(404).json({ success: false, error: "Invitation not found" });
      return;
    }
    res.json({ success: true, data: toPortalInvitationView(invitation) });
  } catch (err) {
    logger.error("Get portal invitation error", err);
    res.status(500).json({ success: false, error: "Failed to get invitation" });
  }
});

// ── POST /api/portal-invitations/:id/resend ───────────────────────
router.post("/:id/resend", async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const updated = await resendPortalInvitation(req.params.id, clinicianId);
    res.json({ success: true, data: toPortalInvitationView(updated) });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof ConflictError) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    logger.error("Resend portal invitation error", err);
    res.status(500).json({ success: false, error: "Failed to resend" });
  }
});

// ── POST /api/portal-invitations/:id/renew ────────────────────────
router.post("/:id/renew", async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const updated = await renewPortalInvitation(req.params.id, clinicianId);
    res.json({ success: true, data: toPortalInvitationView(updated) });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    if ((err as { code?: string }).code === "InvalidStateForRenew") {
      res.status(422).json({ success: false, error: (err as Error).message });
      return;
    }
    logger.error("Renew portal invitation error", err);
    res.status(500).json({ success: false, error: "Failed to renew" });
  }
});

// ── POST /api/portal-invitations/:id/revoke ───────────────────────
router.post("/:id/revoke", async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const updated = await revokePortalInvitation(req.params.id, clinicianId);
    res.json({ success: true, data: toPortalInvitationView(updated) });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof ConflictError) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    logger.error("Revoke portal invitation error", err);
    res.status(500).json({ success: false, error: "Failed to revoke" });
  }
});

export default router;
