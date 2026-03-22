import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import {
  createSession,
  listClinicianSessions,
  getUpcomingSession,
  getSessionHistory,
  updateSession,
  completeSession,
  getSessionPrepData,
} from "../services/sessions";

const router = Router();

router.use(authenticate);

// ── Clinician Endpoints ─────────────────────────────

// POST /api/sessions — Create session + CalendarEvent for participant
router.post("/", requireRole("CLINICIAN", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const { enrollmentId, scheduledAt, videoCallUrl, durationMinutes } = req.body;

    if (!enrollmentId || !scheduledAt) {
      res.status(400).json({
        success: false,
        error: "enrollmentId and scheduledAt are required",
      });
      return;
    }

    const session = await createSession(enrollmentId, scheduledAt, videoCallUrl, durationMinutes);

    if (!session) {
      res.status(404).json({ success: false, error: "Enrollment not found" });
      return;
    }

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    console.error("Create session error:", err);
    res.status(500).json({ success: false, error: "Failed to create session" });
  }
});

// GET /api/sessions — List sessions for clinician (filterable)
router.get("/", requireRole("CLINICIAN", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { status, enrollmentId, startDate, endDate, cursor, limit } = req.query;

    const result = await listClinicianSessions(clinicianProfileId, {
      status: status as string | undefined,
      enrollmentId: enrollmentId as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      cursor: cursor as string | undefined,
      limit: parseInt(limit as string) || undefined,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("List sessions error:", err);
    res.status(500).json({ success: false, error: "Failed to list sessions" });
  }
});

// ── Participant Endpoints (must be before /:id routes) ──

// GET /api/sessions/upcoming — Next scheduled session for participant
router.get("/upcoming", requireRole("PARTICIPANT"), async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;
    const data = await getUpcomingSession(participantId);
    res.json({ success: true, data });
  } catch (err) {
    console.error("Get upcoming session error:", err);
    res.status(500).json({ success: false, error: "Failed to get upcoming session" });
  }
});

// GET /api/sessions/history — Past sessions for participant
router.get("/history", requireRole("PARTICIPANT"), async (req: Request, res: Response) => {
  try {
    const participantId = req.user!.participantProfileId!;
    const { cursor, limit } = req.query;

    const result = await getSessionHistory(
      participantId,
      cursor as string | undefined,
      parseInt(limit as string) || undefined
    );

    res.json({ success: true, ...result });
  } catch (err) {
    console.error("Get session history error:", err);
    res.status(500).json({ success: false, error: "Failed to get session history" });
  }
});

// ── Clinician /:id Routes ────────────────────────────

// PUT /api/sessions/:id — Update (reschedule, change video link)
router.put("/:id", requireRole("CLINICIAN", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const updated = await updateSession(req.params.id, req.body);

    if (!updated) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update session error:", err);
    res.status(500).json({ success: false, error: "Failed to update session" });
  }
});

// PUT /api/sessions/:id/complete — Mark completed with notes + module unlock + task push
router.put("/:id/complete", requireRole("CLINICIAN", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const result = await completeSession(req.params.id, req.body);

    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Session not found" });
        return;
      }
      if (result.error === "conflict") {
        res.status(409).json({ success: false, error: "Session is not in SCHEDULED state" });
        return;
      }
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    console.error("Complete session error:", err);
    res.status(500).json({ success: false, error: "Failed to complete session" });
  }
});

// GET /api/sessions/:id/prepare — Pre-session view data for clinician
router.get("/:id/prepare", requireRole("CLINICIAN", "ADMIN"), async (req: Request, res: Response) => {
  try {
    const data = await getSessionPrepData(req.params.id);

    if (!data) {
      res.status(404).json({ success: false, error: "Session not found" });
      return;
    }

    res.json({ success: true, data });
  } catch (err) {
    console.error("Prepare session error:", err);
    res.status(500).json({ success: false, error: "Failed to prepare session data" });
  }
});

export default router;
