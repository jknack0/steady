import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import {
  SaveClinicianConfigSchema,
  SaveClientConfigSchema,
  SaveDashboardLayoutSchema,
  SaveClientOverviewLayoutSchema,
  SaveHomeworkLabelsSchema,
  UpdateReminderSettingsSchema,
} from "@steady/shared";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  getClinicianConfig,
  saveClinicianConfig,
  saveDashboardLayout,
  saveHomeworkLabels,
  saveClientOverviewLayout,
  getClientConfig,
  saveClientConfig,
  createDefaultConfig,
  resolveClientConfig,
  NotFoundError,
} from "../services/config";
import {
  getReminderSettings,
  saveReminderSettings,
} from "../services/appointment-reminders";
import { z } from "zod";

const router = Router();

// All clinician routes require clinician role
router.use(authenticate, requireRole("CLINICIAN"));

// ── Clinician Config Routes ───────────────────────────────

// GET /api/config — Get the clinician's config
router.get("/", async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const config = await getClinicianConfig(clinicianId);
    res.json({ success: true, data: config });
  } catch (err) {
    logger.error("Get clinician config error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to get clinician config" });
  }
});

// PUT /api/config — Save/update clinician config
router.put(
  "/",
  validate(SaveClinicianConfigSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianId = req.user!.clinicianProfileId!;
      const config = await saveClinicianConfig(clinicianId, req.body);
      res.json({ success: true, data: config });
    } catch (err) {
      logger.error("Save clinician config error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to save clinician config" });
    }
  }
);

// PATCH /api/config/dashboard-layout — Save layout only
router.patch(
  "/dashboard-layout",
  validate(SaveDashboardLayoutSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianId = req.user!.clinicianProfileId!;
      const config = await saveDashboardLayout(clinicianId, req.body);
      res.json({ success: true, data: config });
    } catch (err) {
      logger.error("Save dashboard layout error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to save dashboard layout" });
    }
  }
);

// PATCH /api/config/homework-labels — Save homework label overrides
router.patch(
  "/homework-labels",
  validate(SaveHomeworkLabelsSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianId = req.user!.clinicianProfileId!;
      const config = await saveHomeworkLabels(clinicianId, req.body.homeworkLabels);
      res.json({ success: true, data: config });
    } catch (err) {
      logger.error("Save homework labels error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to save homework labels" });
    }
  }
);

// POST /api/config/from-preset — Create config from a preset
const FromPresetSchema = z.object({
  presetId: z.string().max(100),
});

router.post(
  "/from-preset",
  validate(FromPresetSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianId = req.user!.clinicianProfileId!;
      const config = await createDefaultConfig(clinicianId, req.body.presetId);
      res.json({ success: true, data: config });
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      logger.error("Create config from preset error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to create config from preset" });
    }
  }
);

// ── Reminder Settings ────────────────────────────────────

// GET /api/config/reminders
router.get("/reminders", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user?.clinicianProfileId;
    if (!clinicianProfileId) {
      res.status(403).json({ success: false, error: "Clinician profile required" });
      return;
    }
    const settings = await getReminderSettings(clinicianProfileId);
    res.json({ success: true, data: settings });
  } catch (err) {
    logger.error("Get reminder settings error", err);
    res.status(500).json({ success: false, error: "Failed to get reminder settings" });
  }
});

// PUT /api/config/reminders
router.put(
  "/reminders",
  validate(UpdateReminderSettingsSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianProfileId = req.user?.clinicianProfileId;
      if (!clinicianProfileId) {
        res.status(403).json({ success: false, error: "Clinician profile required" });
        return;
      }
      await saveReminderSettings(clinicianProfileId, req.body);
      res.json({ success: true, data: req.body });
    } catch (err) {
      logger.error("Update reminder settings error", err);
      res.status(500).json({ success: false, error: "Failed to update reminder settings" });
    }
  },
);

// ── Client Config Routes (clinician-facing) ───────────────

// GET /api/config/clients/:clientId — Get a client's config
router.get("/clients/:clientId", async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const { clientId } = req.params;

    // Verify clinician has a relationship with this client
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        participant: { userId: clientId },
        program: { clinicianId },
      },
      select: { id: true },
    });

    if (!enrollment) {
      res
        .status(404)
        .json({ success: false, error: "Client not found" });
      return;
    }

    const config = await getClientConfig(clientId, clinicianId);
    res.json({ success: true, data: config });
  } catch (err) {
    logger.error("Get client config error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to get client config" });
  }
});

// PUT /api/config/clients/:clientId — Save/update client config
router.put(
  "/clients/:clientId",
  validate(SaveClientConfigSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianId = req.user!.clinicianProfileId!;
      const { clientId } = req.params;

      // Verify clinician has a relationship with this client
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          participant: { userId: clientId },
          program: { clinicianId },
        },
        select: { id: true },
      });

      if (!enrollment) {
        res
          .status(404)
          .json({ success: false, error: "Client not found" });
        return;
      }

      const config = await saveClientConfig(clientId, clinicianId, req.body);
      res.json({ success: true, data: config });
    } catch (err) {
      logger.error("Save client config error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to save client config" });
    }
  }
);

// PATCH /api/config/clients/:clientId/overview-layout — Save client overview layout
router.patch(
  "/clients/:clientId/overview-layout",
  validate(SaveClientOverviewLayoutSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianId = req.user!.clinicianProfileId!;
      const { clientId } = req.params;

      const enrollment = await prisma.enrollment.findFirst({
        where: {
          participant: { userId: clientId },
          program: { clinicianId },
        },
        select: { id: true },
      });

      if (!enrollment) {
        res.status(404).json({ success: false, error: "Client not found" });
        return;
      }

      const config = await saveClientOverviewLayout(
        clientId, clinicianId, req.body.clientOverviewLayout
      );
      res.json({ success: true, data: config });
    } catch (err) {
      logger.error("Save client overview layout error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to save client overview layout" });
    }
  }
);

export default router;

// ── Participant-facing config route ───────────────────────

const participantRouter = Router();
participantRouter.use(authenticate, requireRole("PARTICIPANT"));

// GET /api/participant/config — Get resolved config for participant
participantRouter.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Find the clinician this participant is enrolled with (most recent active enrollment)
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        participant: { userId },
        status: "ACTIVE",
      },
      orderBy: { enrolledAt: "desc" },
      select: {
        program: {
          select: { clinicianId: true },
        },
      },
    });

    if (!enrollment) {
      res
        .status(404)
        .json({ success: false, error: "No active enrollment found" });
      return;
    }

    const clinicianId = enrollment.program.clinicianId;
    const config = await resolveClientConfig(userId, clinicianId);
    res.json({ success: true, data: config });
  } catch (err) {
    logger.error("Get participant config error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to get participant config" });
  }
});

export { participantRouter as configParticipantRouter };
