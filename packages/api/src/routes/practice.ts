import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import {
  getPracticeStats,
  getPracticeParticipants,
} from "../services/practice-management";

const router = Router();

router.use(authenticate, requireRole("CLINICIAN", "ADMIN"));

// POST /api/practices — Create a practice
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const clinicianProfileId = req.user!.clinicianProfileId!;

    if (!name?.trim()) {
      res.status(400).json({ success: false, error: "Name is required" });
      return;
    }

    const practice = await prisma.practice.create({
      data: {
        name: name.trim(),
        ownerId: req.user!.userId,
        memberships: {
          create: {
            clinicianId: clinicianProfileId,
            role: "OWNER",
          },
        },
      },
      include: { memberships: true },
    });

    res.status(201).json({ success: true, data: practice });
  } catch (err) {
    logger.error("Create practice error", err);
    res.status(500).json({ success: false, error: "Failed to create practice" });
  }
});

// GET /api/practices — List practices for current clinician
router.get("/", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;

    const memberships = await prisma.practiceMembership.findMany({
      where: { clinicianId: clinicianProfileId },
      include: {
        practice: {
          include: {
            memberships: {
              include: {
                clinician: {
                  include: { user: { select: { firstName: true, lastName: true, email: true } } },
                },
              },
            },
            _count: { select: { programs: true } },
          },
        },
      },
      take: 50, // Cap at 50 practices per clinician
    });

    const practices = memberships.map((m) => ({
      id: m.practice.id,
      name: m.practice.name,
      ownerId: m.practice.ownerId,
      myRole: m.role,
      memberCount: m.practice.memberships.length,
      programCount: m.practice._count.programs,
      members: m.practice.memberships.map((mem) => ({
        id: mem.id,
        clinicianId: mem.clinicianId,
        role: mem.role,
        name: `${mem.clinician.user.firstName} ${mem.clinician.user.lastName}`.trim(),
        email: mem.clinician.user.email,
        joinedAt: mem.joinedAt,
      })),
    }));

    res.json({ success: true, data: practices });
  } catch (err) {
    logger.error("List practices error", err);
    res.status(500).json({ success: false, error: "Failed to list practices" });
  }
});

// PUT /api/practices/:id — Update practice (owner only)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { name } = req.body;

    const membership = await prisma.practiceMembership.findUnique({
      where: {
        practiceId_clinicianId: {
          practiceId: req.params.id,
          clinicianId: clinicianProfileId,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      res.status(403).json({ success: false, error: "Only practice owners can update" });
      return;
    }

    const updated = await prisma.practice.update({
      where: { id: req.params.id },
      data: { name: name?.trim() },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error("Update practice error", err);
    res.status(500).json({ success: false, error: "Failed to update practice" });
  }
});

// POST /api/practices/:id/invite — Invite a clinician by email
router.post("/:id/invite", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { email } = req.body;

    if (!email?.trim()) {
      res.status(400).json({ success: false, error: "Email is required" });
      return;
    }

    // Verify requester is owner
    const membership = await prisma.practiceMembership.findUnique({
      where: {
        practiceId_clinicianId: {
          practiceId: req.params.id,
          clinicianId: clinicianProfileId,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      res.status(403).json({ success: false, error: "Only practice owners can invite" });
      return;
    }

    // Find clinician by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim() },
      include: { clinicianProfile: true },
    });

    if (!user || user.role !== "CLINICIAN" || !user.clinicianProfile) {
      res.status(404).json({ success: false, error: "Clinician not found with that email" });
      return;
    }

    // Check if already a member
    const existing = await prisma.practiceMembership.findUnique({
      where: {
        practiceId_clinicianId: {
          practiceId: req.params.id,
          clinicianId: user.clinicianProfile.id,
        },
      },
    });

    if (existing) {
      res.status(409).json({ success: false, error: "Clinician is already a member" });
      return;
    }

    const newMembership = await prisma.practiceMembership.create({
      data: {
        practiceId: req.params.id,
        clinicianId: user.clinicianProfile.id,
        role: "CLINICIAN",
      },
    });

    res.status(201).json({ success: true, data: newMembership });
  } catch (err) {
    logger.error("Invite to practice error", err);
    res.status(500).json({ success: false, error: "Failed to invite clinician" });
  }
});

// DELETE /api/practices/:id/members/:memberId — Remove a member
router.delete("/:id/members/:memberId", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;

    const myMembership = await prisma.practiceMembership.findUnique({
      where: {
        practiceId_clinicianId: {
          practiceId: req.params.id,
          clinicianId: clinicianProfileId,
        },
      },
    });

    if (!myMembership || myMembership.role !== "OWNER") {
      res.status(403).json({ success: false, error: "Only practice owners can remove members" });
      return;
    }

    const target = await prisma.practiceMembership.findUnique({
      where: { id: req.params.memberId },
    });

    if (!target || target.practiceId !== req.params.id) {
      res.status(404).json({ success: false, error: "Membership not found" });
      return;
    }

    if (target.role === "OWNER") {
      res.status(400).json({ success: false, error: "Cannot remove the practice owner" });
      return;
    }

    await prisma.practiceMembership.delete({ where: { id: req.params.memberId } });
    res.json({ success: true });
  } catch (err) {
    logger.error("Remove member error", err);
    res.status(500).json({ success: false, error: "Failed to remove member" });
  }
});

// GET /api/practices/:id/templates — Practice-scoped templates
router.get("/:id/templates", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;

    // Verify membership
    const membership = await prisma.practiceMembership.findUnique({
      where: {
        practiceId_clinicianId: {
          practiceId: req.params.id,
          clinicianId: clinicianProfileId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ success: false, error: "Not a member of this practice" });
      return;
    }

    const templates = await prisma.program.findMany({
      where: {
        practiceId: req.params.id,
        isTemplate: true,
      },
      include: {
        clinician: {
          include: { user: { select: { firstName: true, lastName: true } } },
        },
        _count: { select: { modules: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    res.json({
      success: true,
      data: templates.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        cadence: t.cadence,
        moduleCount: t._count.modules,
        createdBy: `${t.clinician.user.firstName} ${t.clinician.user.lastName}`.trim(),
        updatedAt: t.updatedAt,
      })),
    });
  } catch (err) {
    logger.error("List practice templates error", err);
    res.status(500).json({ success: false, error: "Failed to list templates" });
  }
});

// POST /api/practices/:id/share-program — Share a program as practice template
router.post("/:id/share-program", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;
    const { programId } = req.body;

    if (!programId) {
      res.status(400).json({ success: false, error: "programId is required" });
      return;
    }

    // Verify membership
    const membership = await prisma.practiceMembership.findUnique({
      where: {
        practiceId_clinicianId: {
          practiceId: req.params.id,
          clinicianId: clinicianProfileId,
        },
      },
    });

    if (!membership) {
      res.status(403).json({ success: false, error: "Not a member of this practice" });
      return;
    }

    // Verify program ownership
    const program = await prisma.program.findFirst({
      where: { id: programId, clinicianId: clinicianProfileId },
    });

    if (!program) {
      res.status(404).json({ success: false, error: "Program not found" });
      return;
    }

    const updated = await prisma.program.update({
      where: { id: programId },
      data: {
        practiceId: req.params.id,
        isTemplate: true,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    logger.error("Share program error", err);
    res.status(500).json({ success: false, error: "Failed to share program" });
  }
});

// GET /api/practices/:id/dashboard — Owner dashboard with aggregate stats
router.get("/:id/dashboard", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;

    const membership = await prisma.practiceMembership.findUnique({
      where: {
        practiceId_clinicianId: {
          practiceId: req.params.id,
          clinicianId: clinicianProfileId,
        },
      },
    });

    if (!membership || membership.role !== "OWNER") {
      res.status(403).json({ success: false, error: "Only practice owners can view the dashboard" });
      return;
    }

    // Get all clinicians in practice
    const members = await prisma.practiceMembership.findMany({
      where: { practiceId: req.params.id },
      include: {
        clinician: {
          include: {
            user: { select: { firstName: true, lastName: true } },
            programs: {
              include: {
                _count: { select: { enrollments: true, modules: true } },
              },
            },
          },
        },
      },
    });

    // Aggregate stats per clinician
    const clinicianStats = members.map((m) => {
      const programs = m.clinician.programs;
      const totalPrograms = programs.length;
      const totalEnrollments = programs.reduce((sum, p) => sum + p._count.enrollments, 0);
      const publishedPrograms = programs.filter((p) => p.status === "PUBLISHED").length;

      return {
        clinicianId: m.clinicianId,
        name: `${m.clinician.user.firstName} ${m.clinician.user.lastName}`.trim(),
        role: m.role,
        totalPrograms,
        publishedPrograms,
        totalEnrollments,
      };
    });

    // Practice-wide totals
    const totals = {
      clinicians: members.length,
      programs: clinicianStats.reduce((s, c) => s + c.totalPrograms, 0),
      publishedPrograms: clinicianStats.reduce((s, c) => s + c.publishedPrograms, 0),
      enrollments: clinicianStats.reduce((s, c) => s + c.totalEnrollments, 0),
    };

    res.json({
      success: true,
      data: { totals, clinicianStats },
    });
  } catch (err) {
    logger.error("Practice dashboard error", err);
    res.status(500).json({ success: false, error: "Failed to load dashboard" });
  }
});

// GET /api/practices/:id/stats — Owner-only aggregate stats (Sprint 17)
router.get("/:id/stats", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;

    const membership = await prisma.practiceMembership.findUnique({
      where: {
        practiceId_clinicianId: {
          practiceId: req.params.id,
          clinicianId: clinicianProfileId,
        },
      },
    });

    if (!membership) {
      res.status(404).json({ success: false, error: "Practice not found" });
      return;
    }

    if (membership.role !== "OWNER") {
      res.status(403).json({ success: false, error: "Only practice owners can view stats" });
      return;
    }

    const stats = await getPracticeStats(req.params.id);
    res.json({ success: true, data: stats });
  } catch (err) {
    logger.error("Practice stats error", err);
    res.status(500).json({ success: false, error: "Failed to load practice stats" });
  }
});

// GET /api/practices/:id/participants — Owner-only practice-wide participant list (Sprint 17)
router.get("/:id/participants", async (req: Request, res: Response) => {
  try {
    const clinicianProfileId = req.user!.clinicianProfileId!;

    const membership = await prisma.practiceMembership.findUnique({
      where: {
        practiceId_clinicianId: {
          practiceId: req.params.id,
          clinicianId: clinicianProfileId,
        },
      },
    });

    if (!membership) {
      res.status(404).json({ success: false, error: "Practice not found" });
      return;
    }

    if (membership.role !== "OWNER") {
      res.status(403).json({ success: false, error: "Only practice owners can view all participants" });
      return;
    }

    const { cursor, search, limit } = req.query;
    const result = await getPracticeParticipants(req.params.id, {
      cursor: cursor as string | undefined,
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({ success: true, data: result.data, cursor: result.cursor });
  } catch (err) {
    logger.error("Practice participants error", err);
    res.status(500).json({ success: false, error: "Failed to load practice participants" });
  }
});

export default router;
