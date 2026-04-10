import { Router, Request, Response } from "express";
import { createHash } from "crypto";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { rateLimit } from "../middleware/rate-limit";
import { validate } from "../middleware/validate";
import {
  ParticipantSearchQuerySchema,
  CreateParticipantSchema,
} from "@steady/shared";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

const searchRateLimit = rateLimit({ max: 30, windowMs: 60_000 });

// GET /api/participants/search?q=<string>
router.get("/search", searchRateLimit, async (req: Request, res: Response) => {
  try {
    const parsed = ParticipantSearchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }

    const ctx = res.locals.practiceCtx!;
    const q = parsed.data.q;
    const term = q.trim();

    const profiles = await prisma.participantProfile.findMany({
      where: {
        user: {
          OR: [
            { firstName: { contains: term, mode: "insensitive" } },
            { lastName: { contains: term, mode: "insensitive" } },
            { email: { contains: term, mode: "insensitive" } },
          ],
          clinicianClients: {
            some: {
              clinician: {
                memberships: { some: { practiceId: ctx.practiceId } },
              },
            },
          },
        },
      },
      include: { user: true },
      take: 20,
    });

    const data = profiles.map((p) => ({
      id: p.id,
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      email: p.user.email,
    }));

    // Fire-and-forget audit row — never log plaintext query (COND-9)
    const queryHash = createHash("sha256").update(term).digest("hex");
    try {
      await prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          action: "CREATE",
          resourceType: "ParticipantSearch",
          resourceId: "search",
          metadata: { kind: "search", queryHash },
        },
      });
    } catch {
      // non-blocking
    }

    res.json({ success: true, data });
  } catch (err) {
    logger.error("Participant search error", err);
    res.status(500).json({ success: false, error: "Failed to search participants" });
  }
});

// POST /api/participants — create a client without any enrollment
router.post("/", validate(CreateParticipantSchema), async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    if (!ctx.clinicianProfileId) {
      res.status(404).json({ success: false, error: "No clinician profile" });
      return;
    }

    const { firstName, lastName, email } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: "A user with this email already exists" });
      return;
    }

    // No passwordHash needed — Cognito handles password storage.
    // Clinician-initiated clients don't log in until they accept the invite.
    const user = await prisma.user.create({
      data: {
        email,
        role: "PARTICIPANT",
        firstName,
        lastName,
        participantProfile: { create: {} },
      },
      include: { participantProfile: true },
    });

    if (!user.participantProfile) {
      res.status(500).json({ success: false, error: "Failed to create participant profile" });
      return;
    }

    await prisma.clinicianClient.create({
      data: {
        clinicianId: ctx.clinicianProfileId,
        clientId: user.id,
        status: "ACTIVE",
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: user.participantProfile.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    });
  } catch (err) {
    logger.error("Create participant error", err);
    res.status(500).json({ success: false, error: "Failed to create participant" });
  }
});

export default router;
