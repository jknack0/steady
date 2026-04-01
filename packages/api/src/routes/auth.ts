import { logger } from "../lib/logger";
import { Router, Request, Response, type CookieOptions } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { prisma } from "@steady/db";
import { RegisterSchema, LoginSchema, RegisterWithInviteSchema } from "@steady/shared";
import { validate } from "../middleware/validate";
import { authenticate, type AuthUser } from "../middleware/auth";
import { JWT_SECRET } from "../lib/env";

const router = Router();

const isTest = process.env.NODE_ENV === "test";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts. Please try again in 15 minutes." },
  keyGenerator: (req: Request) => req.body?.email?.toLowerCase() || ipKeyGenerator(req.ip ?? "unknown"),
  skip: () => isTest,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many registration attempts. Please try again later." },
  skip: () => isTest,
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many refresh attempts. Please try again later." },
  skip: () => isTest,
});

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

// ── Cookie Helpers (HIPAA: httpOnly cookies prevent XSS token theft) ──

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS_BASE: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  // "none" required for cross-origin cookies (Vercel web → Railway API)
  // "lax" is safer but only works same-site
  sameSite: isProduction ? "none" : "lax",
  path: "/",
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie("access_token", accessToken, {
    ...COOKIE_OPTIONS_BASE,
    maxAge: 30 * 60 * 1000, // 30 minutes
  });
  res.cookie("refresh_token", refreshToken, {
    ...COOKIE_OPTIONS_BASE,
    maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    path: "/api/auth",
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie("access_token", { ...COOKIE_OPTIONS_BASE });
  res.clearCookie("refresh_token", { ...COOKIE_OPTIONS_BASE, path: "/api/auth" });
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
router.post("/register", registerLimiter, validate(RegisterSchema), async (req: Request, res: Response) => {
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

    setAuthCookies(res, accessToken, refreshToken);
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
router.post("/login", loginLimiter, validate(LoginSchema), async (req: Request, res: Response) => {
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

    // Dev-only: sync kevin → admin on admin login (fire-and-forget)
    if (email === "admin@admin.com" && process.env.NODE_ENV !== "production") {
      import("../services/sync-admin").then(({ syncKevinToAdmin }) => {
        syncKevinToAdmin().catch((e) => logger.warn("Admin sync failed", e));
      }).catch(() => {});
    }

    setAuthCookies(res, accessToken, refreshToken);
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
router.post("/refresh", refreshLimiter, async (req: Request, res: Response) => {
  try {
    // Read from body (mobile) or cookie (web)
    const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;
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

    setAuthCookies(res, accessToken, newRefreshToken);
    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
  }
});

// POST /api/auth/logout — Revoke refresh token family + clear cookies
router.post("/logout", async (req: Request, res: Response) => {
  try {
    // Read from body (mobile) or cookie (web)
    const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;
    if (!refreshToken) {
      clearAuthCookies(res);
      res.json({ success: true });
      return;
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (storedToken) {
      await prisma.refreshToken.updateMany({
        where: { familyId: storedToken.familyId },
        data: { revoked: true },
      });
    }

    clearAuthCookies(res);
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

// Rate limiter for invite registration
const inviteRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many attempts. Please try again later." },
  skip: () => isTest,
});

// POST /api/auth/register-with-invite
router.post("/register-with-invite", inviteRegisterLimiter, validate(RegisterWithInviteSchema), async (req: Request, res: Response) => {
  try {
    const { redeemInvitation } = await import("../services/invitations");
    const { ExpiredError } = await import("../services/invitations");
    const { ConflictError, NotFoundError } = await import("../services/clinician");

    const result = await redeemInvitation(req.body);

    // Issue tokens
    const authUser: AuthUser = {
      userId: result.user.id,
      role: "PARTICIPANT",
      participantProfileId: result.user.participantProfileId,
    };
    const accessToken = generateAccessToken(authUser);
    const refreshToken = await createRefreshToken(result.user.id);

    setAuthCookies(res, accessToken, refreshToken);
    res.status(201).json({
      success: true,
      data: {
        accessToken,
        refreshToken,
        user: {
          id: result.user.id,
          email: result.user.email,
          role: result.user.role,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
        },
      },
    });
  } catch (err) {
    // Dynamic imports for error classes
    const { ExpiredError } = await import("../services/invitations");
    const { ConflictError, NotFoundError } = await import("../services/clinician");

    if (err instanceof NotFoundError) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof ExpiredError) {
      res.status(410).json({ success: false, error: err.message });
      return;
    }
    if (err instanceof ConflictError) {
      res.status(409).json({ success: false, error: err.message });
      return;
    }
    logger.error("Register with invite error", err);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

export default router;
