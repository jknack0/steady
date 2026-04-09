import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import {
  CreateRtmEnrollmentSchema,
  LogRtmTimeSchema,
  UpdateBillingPeriodSchema,
  SaveBillingProfileSchema,
  RtmConsentSchema,
} from "@steady/shared";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  createRtmEnrollment,
  recordRtmConsent,
  endRtmEnrollment,
  logClinicianTime,
  getRtmDashboard,
  getRtmClientDetail,
  recalculateBillingPeriod,
  NotFoundError,
  ConflictError,
} from "../services/rtm";
import { generateSuperbillData } from "../services/superbill";

const router = Router();

// All routes require clinician role
router.use(authenticate, requireRole("CLINICIAN"));

// ── Enrollment Routes ────────────────────────────────────

// POST /api/rtm — Create RTM enrollment
router.post(
  "/",
  validate(CreateRtmEnrollmentSchema),
  async (req: Request, res: Response) => {
    try {
      const enrollment = await createRtmEnrollment({
        clinicianId: req.user!.clinicianProfileId!,
        ...req.body,
      });
      res.status(201).json({ success: true, data: enrollment });
    } catch (err) {
      if (err instanceof ConflictError) {
        res.status(409).json({ success: false, error: err.message });
        return;
      }
      logger.error("Create RTM enrollment error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to create RTM enrollment" });
    }
  }
);

// GET /api/rtm/enrollments — List all RTM enrollments for this clinician
router.get("/enrollments", async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const { cursor, limit = "50" } = req.query;
    const take = Math.min(parseInt(limit as string) || 50, 100);

    const enrollments = await prisma.rtmEnrollment.findMany({
      where: { clinicianId, deletedAt: null },
      include: {
        client: {
          select: { id: true, firstName: true, lastName: true },
        },
        billingPeriods: {
          where: { status: "ACTIVE" },
          take: 1,
          orderBy: { periodStart: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    });

    const hasMore = enrollments.length > take;
    const data = hasMore ? enrollments.slice(0, take) : enrollments;

    res.json({
      success: true,
      data,
      cursor: hasMore ? data[data.length - 1].id : null,
    });
  } catch (err) {
    logger.error("List RTM enrollments error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to list RTM enrollments" });
  }
});

// POST /api/rtm/enrollments/:id/end — End an RTM enrollment
router.post("/enrollments/:id/end", async (req: Request, res: Response) => {
  try {
    const enrollment = await prisma.rtmEnrollment.findFirst({
      where: {
        id: req.params.id,
        clinicianId: req.user!.clinicianProfileId!,
      },
    });

    if (!enrollment) {
      res.status(404).json({ success: false, error: "RTM enrollment not found" });
      return;
    }

    await endRtmEnrollment(req.params.id);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof ConflictError) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    logger.error("End RTM enrollment error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to end RTM enrollment" });
  }
});

// ── Dashboard Routes ─────────────────────────────────────

// GET /api/rtm/dashboard — RTM overview dashboard
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const dashboard = await getRtmDashboard(clinicianId);
    res.json({ success: true, data: dashboard });
  } catch (err) {
    logger.error("Get RTM dashboard error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to get RTM dashboard" });
  }
});

// GET /api/rtm/enrollments/:id/detail — Detailed client RTM view
router.get("/enrollments/:id/detail", async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const detail = await getRtmClientDetail(req.params.id, clinicianId);

    // Look up client name
    const client = await prisma.user.findUnique({
      where: { id: detail.enrollment.clientId },
      select: { firstName: true, lastName: true },
    });

    res.json({
      success: true,
      data: {
        rtmEnrollmentId: detail.enrollment.id,
        clientId: detail.enrollment.clientId,
        clientName: client ? `${client.firstName} ${client.lastName}`.trim() : "Unknown",
        monitoringType: detail.enrollment.monitoringType,
        enrollmentStatus: detail.enrollment.status,
        enrolledAt: detail.enrollment.createdAt,
        currentPeriod: detail.currentPeriod,
        engagementCalendar: detail.engagementCalendar,
        timeLogs: detail.timeLogs,
        previousPeriods: detail.previousPeriods,
      },
    });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    logger.error("Get RTM client detail error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to get RTM client detail" });
  }
});

// ── Time Logging Routes ──────────────────────────────────

// POST /api/rtm/time — Log clinician monitoring time
router.post(
  "/time",
  validate(LogRtmTimeSchema),
  async (req: Request, res: Response) => {
    try {
      let { billingPeriodId, rtmEnrollmentId, activityDate, ...rest } = req.body;

      // Resolve billingPeriodId from rtmEnrollmentId if not provided
      if (!billingPeriodId && rtmEnrollmentId) {
        const period = await prisma.rtmBillingPeriod.findFirst({
          where: {
            rtmEnrollmentId,
            clinicianId: req.user!.clinicianProfileId!,
            status: { in: ["ACTIVE", "THRESHOLD_MET"] },
          },
          orderBy: { periodStart: "desc" },
        });
        if (!period) {
          res.status(404).json({ success: false, error: "No billing period found for this enrollment" });
          return;
        }
        billingPeriodId = period.id;
      }

      if (!billingPeriodId) {
        res.status(400).json({ success: false, error: "billingPeriodId or rtmEnrollmentId is required" });
        return;
      }

      await logClinicianTime({
        billingPeriodId,
        clinicianId: req.user!.clinicianProfileId!,
        activityDate: activityDate || new Date().toISOString().split("T")[0],
        ...rest,
      });
      res.status(201).json({ success: true });
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      logger.error("Log RTM time error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to log RTM time" });
    }
  }
);

// ── Billing Period Routes ────────────────────────────────

// GET /api/rtm/periods/:id — Get billing period detail
router.get("/periods/:id", async (req: Request, res: Response) => {
  try {
    const period = await prisma.rtmBillingPeriod.findUnique({
      where: { id: req.params.id },
      include: {
        timeLogs: {
          orderBy: { activityDate: "desc" },
        },
      },
    });

    if (!period) {
      res.status(404).json({ success: false, error: "Billing period not found" });
      return;
    }

    if (period.clinicianId !== req.user!.clinicianProfileId!) {
      res.status(403).json({ success: false, error: "Access denied" });
      return;
    }

    res.json({ success: true, data: period });
  } catch (err) {
    logger.error("Get billing period error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to get billing period" });
  }
});

// PATCH /api/rtm/periods/:id — Update billing period
router.patch(
  "/periods/:id",
  validate(UpdateBillingPeriodSchema),
  async (req: Request, res: Response) => {
    try {
      const period = await prisma.rtmBillingPeriod.findUnique({
        where: { id: req.params.id },
      });

      if (!period) {
        res
          .status(404)
          .json({ success: false, error: "Billing period not found" });
        return;
      }

      if (period.clinicianId !== req.user!.clinicianProfileId!) {
        res.status(403).json({ success: false, error: "Access denied" });
        return;
      }

      const updated = await prisma.rtmBillingPeriod.update({
        where: { id: req.params.id },
        data: req.body,
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      logger.error("Update billing period error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to update billing period" });
    }
  }
);

// POST /api/rtm/periods/:id/recalculate — Force recalculation
router.post(
  "/periods/:id/recalculate",
  async (req: Request, res: Response) => {
    try {
      const period = await prisma.rtmBillingPeriod.findUnique({
        where: { id: req.params.id },
        select: { clinicianId: true },
      });

      if (!period) {
        res
          .status(404)
          .json({ success: false, error: "Billing period not found" });
        return;
      }

      if (period.clinicianId !== req.user!.clinicianProfileId!) {
        res.status(403).json({ success: false, error: "Access denied" });
        return;
      }

      const updated = await recalculateBillingPeriod(req.params.id);
      res.json({ success: true, data: updated });
    } catch (err) {
      if (err instanceof NotFoundError) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }
      logger.error("Recalculate billing period error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to recalculate billing period" });
    }
  }
);

// GET /api/rtm/periods/:id/superbill — Generate superbill data
router.get("/periods/:id/superbill", async (req: Request, res: Response) => {
  try {
    const data = await generateSuperbillData(
      req.params.id,
      req.user!.clinicianProfileId!
    );
    res.json({ success: true, data });
  } catch (err) {
    if (err instanceof NotFoundError) {
      res.status(404).json({ success: false, error: err.message });
      return;
    }
    logger.error("Generate superbill error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to generate superbill" });
  }
});

// ── Billing Profile Routes ───────────────────────────────

// GET /api/rtm/billing-profile — Get clinician's billing profile
router.get("/billing-profile", async (req: Request, res: Response) => {
  try {
    const clinicianId = req.user!.clinicianProfileId!;
    const profile = await prisma.clinicianBillingProfile.findUnique({
      where: { clinicianId },
    });

    if (!profile) {
      res
        .status(404)
        .json({ success: false, error: "Billing profile not found" });
      return;
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    logger.error("Get billing profile error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to get billing profile" });
  }
});

// PUT /api/rtm/billing-profile — Save/update billing profile
router.put(
  "/billing-profile",
  validate(SaveBillingProfileSchema),
  async (req: Request, res: Response) => {
    try {
      const clinicianId = req.user!.clinicianProfileId!;
      const profile = await prisma.clinicianBillingProfile.upsert({
        where: { clinicianId },
        create: {
          clinicianId,
          ...req.body,
        },
        update: req.body,
      });

      res.json({ success: true, data: profile });
    } catch (err) {
      logger.error("Save billing profile error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to save billing profile" });
    }
  }
);

export default router;

// ── Participant-facing consent route ─────────────────────

const participantRouter = Router();
participantRouter.use(authenticate, requireRole("PARTICIPANT"));

// GET /api/participant/rtm/pending — Check for pending RTM consent
participantRouter.get("/pending", async (req: Request, res: Response) => {
  try {
    const pending = await prisma.rtmEnrollment.findFirst({
      where: {
        clientId: req.user!.userId,
        status: "PENDING_CONSENT",
      },
      select: {
        id: true,
        monitoringType: true,
        startDate: true,
        clinician: {
          select: {
            user: { select: { firstName: true, lastName: true } },
            practiceName: true,
          },
        },
      },
    });

    res.json({ success: true, data: pending });
  } catch (err) {
    logger.error("Check pending RTM consent error", err);
    res.status(500).json({ success: false, error: "Failed to check RTM status" });
  }
});

// POST /api/participant/rtm/consent — Record RTM consent
participantRouter.post(
  "/consent",
  validate(RtmConsentSchema),
  async (req: Request, res: Response) => {
    try {
      const { rtmEnrollmentId, signatureName } = req.body;

      // Verify the enrollment's clientId matches the participant's userId
      const enrollment = await prisma.rtmEnrollment.findUnique({
        where: { id: rtmEnrollmentId },
      });

      if (!enrollment) {
        res
          .status(404)
          .json({ success: false, error: "RTM enrollment not found" });
        return;
      }

      if (enrollment.clientId !== req.user!.userId) {
        res.status(403).json({ success: false, error: "Access denied" });
        return;
      }

      await recordRtmConsent(rtmEnrollmentId, signatureName);
      res.json({ success: true });
    } catch (err) {
      logger.error("Record RTM consent error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to record RTM consent" });
    }
  }
);

export { participantRouter as rtmParticipantRouter };
