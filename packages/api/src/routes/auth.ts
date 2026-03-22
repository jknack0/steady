import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@steady/db";
import { RegisterSchema, LoginSchema } from "@steady/shared";
import { validate } from "../middleware/validate";
import { authenticate, type AuthUser } from "../middleware/auth";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "dev-refresh-secret-change-in-production";

function generateTokens(user: AuthUser) {
  const accessToken = jwt.sign(user, JWT_SECRET, { expiresIn: "30m" });
  const refreshToken = jwt.sign({ userId: user.userId }, REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

// POST /api/auth/register
router.post("/register", validate(RegisterSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName,
        role,
        ...(role === "CLINICIAN"
          ? { clinicianProfile: { create: {} } }
          : { participantProfile: { create: {} } }),
      },
      include: {
        clinicianProfile: true,
        participantProfile: true,
      },
    });

    const authUser: AuthUser = {
      userId: user.id,
      role: user.role as AuthUser["role"],
      clinicianProfileId: user.clinicianProfile?.id,
      participantProfileId: user.participantProfile?.id,
    };

    const tokens = generateTokens(authUser);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        ...tokens,
      },
    });
  } catch (err) {
    logger.error("Register error", err);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", validate(LoginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        clinicianProfile: true,
        participantProfile: true,
      },
    });

    if (!user) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ success: false, error: "Invalid email or password" });
      return;
    }

    const authUser: AuthUser = {
      userId: user.id,
      role: user.role as AuthUser["role"],
      clinicianProfileId: user.clinicianProfile?.id,
      participantProfileId: user.participantProfile?.id,
    };

    const tokens = generateTokens(authUser);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        ...tokens,
      },
    });
  } catch (err) {
    logger.error("Login error", err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: "Refresh token required" });
      return;
    }

    const payload = jwt.verify(refreshToken, REFRESH_SECRET) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        clinicianProfile: true,
        participantProfile: true,
      },
    });

    if (!user) {
      res.status(401).json({ success: false, error: "User not found" });
      return;
    }

    const authUser: AuthUser = {
      userId: user.id,
      role: user.role as AuthUser["role"],
      clinicianProfileId: user.clinicianProfile?.id,
      participantProfileId: user.participantProfile?.id,
    };

    const tokens = generateTokens(authUser);

    res.json({ success: true, data: tokens });
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
  }
});

// GET /api/auth/me — Get current user
router.get("/me", authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: "User not found" });
      return;
    }

    res.json({ success: true, data: user });
  } catch (err) {
    logger.error("Get me error", err);
    res.status(500).json({ success: false, error: "Failed to get user" });
  }
});

export default router;
