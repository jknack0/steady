import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "@steady/db";
import { RegisterSchema, LoginSchema } from "@steady/shared";
import { validate } from "../middleware/validate";
import { authenticate, type AuthUser } from "../middleware/auth";
import { JWT_SECRET } from "../lib/env";

const router = Router();

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function generateAccessToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "30m" });
}

/**
 * Create a DB-backed refresh token. Each login starts a new "family".
 * Each refresh rotates within the same family.
 */
async function createRefreshToken(userId: string, familyId?: string): Promise<string> {
  const token = crypto.randomBytes(48).toString("base64url");
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      familyId: familyId ?? crypto.randomUUID(),
      expiresAt,
    },
  });

  return token;
}

function buildAuthUser(user: {
  id: string;
  role: string;
  clinicianProfile?: { id: string } | null;
  participantProfile?: { id: string } | null;
}): AuthUser {
  return {
    userId: user.id,
    role: user.role as AuthUser["role"],
    clinicianProfileId: user.clinicianProfile?.id,
    participantProfileId: user.participantProfile?.id,
  };
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

    const authUser = buildAuthUser(user);
    const accessToken = generateAccessToken(authUser);
    const refreshToken = await createRefreshToken(user.id);

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
        accessToken,
        refreshToken,
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

    const authUser = buildAuthUser(user);
    const accessToken = generateAccessToken(authUser);
    const refreshToken = await createRefreshToken(user.id);

    // Check setup status for clinicians
    let hasCompletedSetup = false;
    if (user.role === "CLINICIAN" && user.clinicianProfile?.id) {
      const config = await prisma.clinicianConfig.findUnique({
        where: { clinicianId: user.clinicianProfile.id },
        select: { setupCompleted: true },
      });
      hasCompletedSetup = config?.setupCompleted === true;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          hasCompletedSetup,
        },
        accessToken,
        refreshToken,
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

    // Look up the token in the database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
      return;
    }

    // Token reuse detection: if the token was already revoked, an attacker
    // is replaying a stolen token. Revoke the entire family to force re-login.
    if (storedToken.revoked) {
      await prisma.refreshToken.updateMany({
        where: { familyId: storedToken.familyId },
        data: { revoked: true },
      });
      logger.warn("Refresh token reuse detected", `familyId=${storedToken.familyId}`);
      res.status(401).json({ success: false, error: "Token reuse detected. Please log in again." });
      return;
    }

    // Revoke the current token (single use)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    const user = await prisma.user.findUnique({
      where: { id: storedToken.userId },
      include: {
        clinicianProfile: true,
        participantProfile: true,
      },
    });

    if (!user) {
      res.status(401).json({ success: false, error: "User not found" });
      return;
    }

    const authUser = buildAuthUser(user);
    const accessToken = generateAccessToken(authUser);
    // Issue new refresh token in the same family (rotation)
    const newRefreshToken = await createRefreshToken(user.id, storedToken.familyId);

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
  }
});

// POST /api/auth/logout — Revoke refresh token family
router.post("/logout", async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      // No token to revoke — still a successful logout from client perspective
      res.json({ success: true });
      return;
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (storedToken) {
      // Revoke entire family so no rotated tokens remain valid
      await prisma.refreshToken.updateMany({
        where: { familyId: storedToken.familyId },
        data: { revoked: true },
      });
    }

    res.json({ success: true });
  } catch (err) {
    logger.error("Logout error", err);
    res.status(500).json({ success: false, error: "Logout failed" });
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

    // Check if clinician has completed setup
    let hasCompletedSetup = false;
    if (user.role === "CLINICIAN" && req.user!.clinicianProfileId) {
      const config = await prisma.clinicianConfig.findUnique({
        where: { clinicianId: req.user!.clinicianProfileId },
        select: { setupCompleted: true },
      });
      hasCompletedSetup = config?.setupCompleted === true;
    }

    res.json({ success: true, data: { ...user, hasCompletedSetup } });
  } catch (err) {
    logger.error("Get me error", err);
    res.status(500).json({ success: false, error: "Failed to get user" });
  }
});

export default router;
