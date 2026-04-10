import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import {
  AssignHomeworkSchema,
  UpdateParticipantDemographicsSchema,
  AddClientSchema,
  PushTaskSchema,
  UnlockModuleSchema,
  ManageEnrollmentSchema,
  BulkActionSchema,
} from "@steady/shared";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import {
  getDashboardData,
  getClinicianParticipants,
  getClinicianClients,
  getParticipantDetail,
  pushTaskToParticipant,
  unlockModuleForParticipant,
  manageEnrollment,
  bulkAction,
  addClient,
  ConflictError,
} from "../services/clinician";
import { verifyEnrollmentOwnership } from "../lib/ownership";
import { startOfDayUTC } from "../lib/date-utils";

const router = Router();

router.use(authenticate, requireRole("CLINICIAN", "ADMIN"));

// Verify a participant belongs to this clinician via ClinicianClient or enrollment
async function verifyParticipantOwnership(participantUserId: string, clinicianProfileId: string) {
  return prisma.clinicianClient.findFirst({
    where: { clinicianId: clinicianProfileId, clientId: participantUserId },
  });
}

// GET /api/clinician/dashboard — Dashboard summary data
router.get("/dashboard", async (req: Request, res: Response) => {
  try {
    const data = await getDashboardData({
      clinicianProfileId: req.user!.clinicianProfileId!,
      userId: req.user!.userId,
    });
    res.json({ success: true, data });
  } catch (err) {
    logger.error("Dashboard error", err);
    res.status(500).json({ success: false, error: "Failed to load dashboard" });
  }
});

// GET /api/clinician/participants — List all participants across clinician's programs
router.get("/participants", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { search, programId, cursor, limit } = req.query;

    const data = await getClinicianParticipants(clinicianProfileId, {
      search: search as string | undefined,
      programId: programId as string | undefined,
      cursor: cursor as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.json({ success: true, data });
  } catch (err) {
    logger.error("List clinician participants error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to list participants" });
  }
});

// GET /api/clinician/clients — List all direct clients
router.get("/clients", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const data = await getClinicianClients(clinicianProfileId);
    res.json({ success: true, data });
  } catch (err) {
    logger.error("List clinician clients error", err);
    res.status(500).json({ success: false, error: "Failed to list clients" });
  }
});

// POST /api/clinician/clients — Add a new client
router.post("/clients", validate(AddClientSchema), async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { email, firstName, lastName } = req.body;

    const result = await addClient(clinicianProfileId, { email, firstName, lastName });

    res.status(201).json({
      success: true,
      data: {
        clinicianClient: result.clinicianClient,
        isNewUser: result.isNewUser,
      },
    });
  } catch (err) {
    if (err instanceof ConflictError) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    logger.error("Add client error", err);
    res.status(500).json({ success: false, error: "Failed to add client" });
  }
});

// GET /api/clinician/participants/:id — Detailed participant view
router.get("/participants/:id", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { id } = req.params;

    const result = await getParticipantDetail(clinicianProfileId, id);

    if (result === null) {
      res.status(404).json({ success: false, error: "Participant not found" });
      return;
    }

    if ("notFound" in result) {
      res.status(404).json({ success: false, error: result.notFound });
      return;
    }

    res.json({ success: true, data: result });
  } catch (err) {
    logger.error("Get clinician participant detail error", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to get participant details" });
  }
});

// GET /api/clinician/participants/:id/homework — Get homework instances with responses
router.get("/participants/:id/homework", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clinicianProfileId = req.user!.clinicianProfileId!;

    const detail = await getParticipantDetail(clinicianProfileId, id);
    if (!detail || "notFound" in detail) {
      res.status(404).json({ success: false, error: "Participant not found" });
      return;
    }

    const enrollmentIds = detail.enrollments.map((e: any) => e.id);
    const participantProfileId = detail.participantProfileId;

    const instances = await prisma.homeworkInstance.findMany({
      where: {
        OR: [
          { enrollmentId: { in: enrollmentIds } },
          { participantId: participantProfileId },
        ],
        deletedAt: null,
      },
      include: {
        part: {
          select: { id: true, title: true, content: true, moduleId: true },
        },
      },
      orderBy: { dueDate: "desc" },
      take: 100,
    });

    res.json({ success: true, data: instances });
  } catch (err) {
    logger.error("Get participant homework error", err);
    res.status(500).json({ success: false, error: "Failed to get homework data" });
  }
});

// POST /api/clinician/participants/:id/homework — Assign standalone homework
router.post("/participants/:id/homework", validate(AssignHomeworkSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { title, content, dueDate } = req.body;

    const detail = await getParticipantDetail(clinicianProfileId, id);
    if (!detail || "notFound" in detail) {
      res.status(404).json({ success: false, error: "Participant not found" });
      return;
    }

    const due = startOfDayUTC(dueDate ? new Date(dueDate) : new Date());

    const instance = await prisma.homeworkInstance.create({
      data: {
        participantId: detail.participantProfileId,
        title,
        content,
        dueDate: due,
        status: "PENDING",
        createdById: req.user!.userId,
      },
    });

    res.status(201).json({ success: true, data: instance });
  } catch (err) {
    logger.error("Create standalone homework error", err);
    res.status(500).json({ success: false, error: "Failed to create homework" });
  }
});

// PUT /api/clinician/participants/:id/demographics — Update patient demographics
router.put("/participants/:id/demographics", validate(UpdateParticipantDemographicsSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clinicianProfileId = req.user!.clinicianProfileId!;

    const detail = await getParticipantDetail(clinicianProfileId, id);
    if (!detail || "notFound" in detail) {
      res.status(404).json({ success: false, error: "Participant not found" });
      return;
    }

    const { dateOfBirth, gender, addressStreet, addressCity, addressState, addressZip } = req.body;

    const updated = await prisma.participantProfile.update({
      where: { id: detail.participantProfileId },
      data: {
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : dateOfBirth === null ? null : undefined,
        gender: gender !== undefined ? gender : undefined,
        addressStreet: addressStreet !== undefined ? addressStreet : undefined,
        addressCity: addressCity !== undefined ? addressCity : undefined,
        addressState: addressState !== undefined ? addressState : undefined,
        addressZip: addressZip !== undefined ? addressZip : undefined,
      },
      select: {
        dateOfBirth: true,
        gender: true,
        addressStreet: true,
        addressCity: true,
        addressState: true,
        addressZip: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error("Update participant demographics error", err);
    res.status(500).json({ success: false, error: "Failed to update demographics" });
  }
});

// POST /api/clinician/participants/:id/push-task — Push a task to participant
router.post("/participants/:id/push-task", validate(PushTaskSchema), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const owned = await verifyParticipantOwnership(id, req.user!.clinicianProfileId!);
    if (!owned) {
      res.status(404).json({ success: false, error: "Participant not found" });
      return;
    }

    const { title, description, dueDate } = req.body;

    if (!title?.trim()) {
      res.status(400).json({ success: false, error: "Title is required" });
      return;
    }

    const task = await pushTaskToParticipant(id, { title, description, dueDate });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    logger.error("Push task error", err);
    res.status(500).json({ success: false, error: "Failed to push task" });
  }
});

// POST /api/clinician/participants/:id/unlock-module — Unlock next module
router.post("/participants/:id/unlock-module", validate(UnlockModuleSchema), async (req: Request, res: Response) => {
  try {
    const owned = await verifyParticipantOwnership(req.params.id, req.user!.clinicianProfileId!);
    if (!owned) {
      res.status(404).json({ success: false, error: "Participant not found" });
      return;
    }

    const { enrollmentId, moduleId } = req.body;

    if (!enrollmentId || !moduleId) {
      res.status(400).json({ success: false, error: "enrollmentId and moduleId are required" });
      return;
    }

    const enrollmentOwned = await verifyEnrollmentOwnership(enrollmentId, req.user!.clinicianProfileId!);
    if (!enrollmentOwned) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    const progress = await unlockModuleForParticipant(enrollmentId, moduleId);
    res.json({ success: true, data: progress });
  } catch (err) {
    logger.error("Unlock module error", err);
    res.status(500).json({ success: false, error: "Failed to unlock module" });
  }
});

// PUT /api/clinician/participants/:id/enrollment/:enrollmentId — Manage enrollment (pause, drop, reset)
router.put("/participants/:id/enrollment/:enrollmentId", validate(ManageEnrollmentSchema), async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;

    const enrollmentOwned = await verifyEnrollmentOwnership(enrollmentId, req.user!.clinicianProfileId!);
    if (!enrollmentOwned) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    const { action } = req.body;

    if (!["pause", "resume", "drop", "reset-progress"].includes(action)) {
      res.status(400).json({ success: false, error: "Invalid action. Use: pause, resume, drop, reset-progress" });
      return;
    }

    const updated = await manageEnrollment(enrollmentId, action);

    if (!updated) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error("Manage enrollment error", err);
    res.status(500).json({ success: false, error: "Failed to manage enrollment" });
  }
});

// ── Bulk Actions ────────────────────────────────────────

// POST /api/clinician/participants/bulk — Bulk action on multiple participants
router.post("/participants/bulk", validate(BulkActionSchema), async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { action, participantIds, data: actionData } = req.body;

    if (!action || !Array.isArray(participantIds) || participantIds.length === 0) {
      res.status(400).json({
        success: false,
        error: "action and participantIds[] are required",
      });
      return;
    }

    if (participantIds.length > 50) {
      res.status(400).json({
        success: false,
        error: "Maximum 50 participants per bulk action",
      });
      return;
    }

    const data = await bulkAction(clinicianProfileId, req.user!.userId, action, participantIds, actionData);
    res.json({ success: true, data });
  } catch (err) {
    logger.error("Bulk action error", err);
    res.status(500).json({ success: false, error: "Failed to perform bulk action" });
  }
});

export default router;
