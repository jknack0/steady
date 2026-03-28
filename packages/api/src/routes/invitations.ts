import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { CreateInvitationSchema } from "@steady/shared";
import {
  createInvitation,
  revokeInvitation,
  resendEmail,
  getInvitationsByClinicianId,
  ExpiredError,
} from "../services/invitations";
import { ConflictError, NotFoundError } from "../services/clinician";
import { prisma } from "@steady/db";

const router = Router();

router.use(authenticate, requireRole("CLINICIAN"));

// POST /api/invitations — Create a new patient invitation
router.post("/", validate(CreateInvitationSchema), async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const invitation = await createInvitation(clinicianProfileId, req.body);

    res.status(201).json({ success: true, data: invitation });
  } catch (err) {
    if (err instanceof ConflictError) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof NotFoundError) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    logger.error("Create invitation error", err);
    res.status(500).json({ success: false, error: "Failed to create invitation" });
  }
});

// GET /api/invitations — List clinician's invitations with cursor pagination
router.get("/", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { status, cursor, limit } = req.query;

    const result = await getInvitationsByClinicianId(clinicianProfileId, {
      status: status as string | undefined,
      cursor: cursor as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, data: result.data, cursor: result.cursor });
  } catch (err) {
    logger.error("List invitations error", err);
    res.status(500).json({ success: false, error: "Failed to list invitations" });
  }
});

// GET /api/invitations/:id — Get single invitation (ownership check)
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { id } = req.params;

    const invitation = await prisma.patientInvitation.findFirst({
      where: { id, clinicianId: clinicianProfileId },
    });

    if (!invitation) {
      res.status(404).json({ success: false, error: "Invitation not found" });
      return;
    }

    res.json({ success: true, data: invitation });
  } catch (err) {
    logger.error("Get invitation error", err);
    res.status(500).json({ success: false, error: "Failed to get invitation" });
  }
});

// POST /api/invitations/:id/resend — Resend invitation email
router.post("/:id/resend", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { id } = req.params;

    const updated = await resendEmail(id, clinicianProfileId);
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof ConflictError) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof ExpiredError) {
      res.status(410).json({ success: false, error: err.message });
      return;
    }
    logger.error("Resend invitation email error", err);
    res.status(500).json({ success: false, error: "Failed to resend email" });
  }
});

// POST /api/invitations/:id/revoke — Revoke an invitation
router.post("/:id/revoke", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { id } = req.params;

    const updated = await revokeInvitation(id, clinicianProfileId);
    res.json({ success: true, data: updated });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof ConflictError) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    logger.error("Revoke invitation error", err);
    res.status(500).json({ success: false, error: "Failed to revoke invitation" });
  }
});

export default router;
