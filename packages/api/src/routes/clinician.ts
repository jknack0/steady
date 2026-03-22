import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import {
  getClinicianParticipants,
  getParticipantDetail,
  pushTaskToParticipant,
  unlockModuleForParticipant,
  manageEnrollment,
  bulkAction,
} from "../services/clinician";

const router = Router();

router.use(authenticate, requireRole("CLINICIAN", "ADMIN"));

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
    console.error("List clinician participants error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to list participants" });
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
    console.error("Get clinician participant detail error:", err);
    res
      .status(500)
      .json({ success: false, error: "Failed to get participant details" });
  }
});

// POST /api/clinician/participants/:id/push-task — Push a task to participant
router.post("/participants/:id/push-task", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, dueDate } = req.body;

    if (!title?.trim()) {
      res.status(400).json({ success: false, error: "Title is required" });
      return;
    }

    const task = await pushTaskToParticipant(id, { title, description, dueDate });
    res.status(201).json({ success: true, data: task });
  } catch (err) {
    console.error("Push task error:", err);
    res.status(500).json({ success: false, error: "Failed to push task" });
  }
});

// POST /api/clinician/participants/:id/unlock-module — Unlock next module
router.post("/participants/:id/unlock-module", async (req: Request, res: Response) => {
  try {
    const { enrollmentId, moduleId } = req.body;

    if (!enrollmentId || !moduleId) {
      res.status(400).json({ success: false, error: "enrollmentId and moduleId are required" });
      return;
    }

    const progress = await unlockModuleForParticipant(enrollmentId, moduleId);
    res.json({ success: true, data: progress });
  } catch (err) {
    console.error("Unlock module error:", err);
    res.status(500).json({ success: false, error: "Failed to unlock module" });
  }
});

// PUT /api/clinician/participants/:id/enrollment/:enrollmentId — Manage enrollment (pause, drop, reset)
router.put("/participants/:id/enrollment/:enrollmentId", async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;
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
    console.error("Manage enrollment error:", err);
    res.status(500).json({ success: false, error: "Failed to manage enrollment" });
  }
});

// ── Bulk Actions ────────────────────────────────────────

// POST /api/clinician/participants/bulk — Bulk action on multiple participants
router.post("/participants/bulk", async (req: Request, res: Response) => {
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

    const data = await bulkAction(clinicianProfileId, action, participantIds, actionData);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Bulk action error:", err);
    res.status(500).json({ success: false, error: "Failed to perform bulk action" });
  }
});

export default router;
