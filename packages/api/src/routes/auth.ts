import { logger } from "../lib/logger";
import { Router, Request, Response, type CookieOptions } from "express";
import jwt from "jsonwebtoken";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { prisma } from "@steady/db";
import { RegisterSchema, LoginSchema, RegisterWithInviteSchema, ForgotPasswordSchema, ConfirmResetPasswordSchema } from "@steady/shared";
import { validate } from "../middleware/validate";
import { authenticate, isCognitoEnabled, type AuthUser } from "../middleware/auth";
import { JWT_SECRET } from "../lib/env";
import { ADMIN_EMAIL } from "../lib/constants";
import {
  cognitoClient,
  userPoolId,
  clientId as cognitoClientId,
  AdminInitiateAuthCommand,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  GlobalSignOutCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
} from "../lib/cognito";

const router = Router();

const isTest = process.env.NODE_ENV === "test";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many login attempts. Please try again in 15 minutes." },
  keyGenerator: (req: any) => req.body?.email?.toLowerCase() || ipKeyGenerator(req.ip ?? "unknown"),
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

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, error: "Too many requests. Please try again later." },
  skip: () => isTest,
});

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

// ── Cookie Helpers (HIPAA: httpOnly cookies prevent XSS token theft) ──

const isProduction = process.env.NODE_ENV === "production";
const COOKIE_OPTIONS_BASE: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  // "none" required for cross-origin cookies (Vercel web -> Railway API)
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

async function getSetupStatus(user: { role: string; clinicianProfile?: { id: string } | null }, clinicianProfileId?: string): Promise<boolean> {
  const profileId = clinicianProfileId || user.clinicianProfile?.id;
  if (user.role !== "CLINICIAN" || !profileId) return false;
  const config = await prisma.clinicianConfig.findUnique({
    where: { clinicianId: profileId },
    select: { setupCompleted: true },
  });
  return config?.setupCompleted === true;
}

// ── Cognito Error Mapping ──

function mapCognitoError(err: any): { status: number; message: string } {
  const name = err?.name || err?.__type || "";
  switch (name) {
    case "NotAuthorizedException":
      return { status: 401, message: "Invalid email or password" };
    case "UserNotFoundException":
      return { status: 401, message: "Invalid email or password" };
    case "UsernameExistsException":
      return { status: 409, message: "Email already registered" };
    case "InvalidPasswordException":
      return { status: 400, message: "Password does not meet requirements" };
    case "TooManyRequestsException":
      return { status: 429, message: "Too many requests. Please try again later." };
    case "UserNotConfirmedException":
      return { status: 403, message: "Account not confirmed" };
    case "CodeMismatchException":
      return { status: 400, message: "Invalid verification code" };
    case "ExpiredCodeException":
      return { status: 400, message: "Verification code has expired. Please request a new one." };
    case "LimitExceededException":
      return { status: 429, message: "Too many attempts. Please try again later." };
    default:
      return { status: 500, message: "Authentication service error" };
  }
}

// ── Cognito Helpers ──

async function cognitoLogin(email: string, password: string) {
  const command = new AdminInitiateAuthCommand({
    UserPoolId: userPoolId,
    ClientId: cognitoClientId,
    AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  });
  return cognitoClient.send(command);
}

async function cognitoCreateUser(email: string, password: string): Promise<string> {
  // Create user with suppressed welcome message
  const createRes = await cognitoClient.send(
    new AdminCreateUserCommand({
      UserPoolId: userPoolId,
      Username: email,
      UserAttributes: [
        { Name: "email", Value: email },
        { Name: "email_verified", Value: "true" },
      ],
      MessageAction: "SUPPRESS",
    })
  );

  // Extract Cognito sub (UUID) from the response
  const cognitoSub = createRes.User?.Username ?? null;
  if (!cognitoSub) {
    throw new Error("Cognito user created but no sub returned");
  }

  // Set permanent password (skips FORCE_CHANGE_PASSWORD state)
  await cognitoClient.send(
    new AdminSetUserPasswordCommand({
      UserPoolId: userPoolId,
      Username: email,
      Password: password,
      Permanent: true,
    })
  );

  return cognitoSub;
}

async function cognitoRefresh(refreshToken: string) {
  const command = new AdminInitiateAuthCommand({
    UserPoolId: userPoolId,
    ClientId: cognitoClientId,
    AuthFlow: "REFRESH_TOKEN_AUTH",
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  });
  return cognitoClient.send(command);
}

// ── Legacy JWT Helpers (local dev fallback) ──

function generateAccessToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "30m" });
}

// POST /api/auth/register
router.post("/register", registerLimiter as any, validate(RegisterSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Check if email already exists in DB
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: "Email already registered" });
      return;
    }

    if (isCognitoEnabled()) {
      // Create Cognito user
      let cognitoSub: string;
      try {
        cognitoSub = await cognitoCreateUser(email, password);
      } catch (err: any) {
        const mapped = mapCognitoError(err);
        res.status(mapped.status).json({ success: false, error: mapped.message });
        return;
      }

      // Get tokens from Cognito
      let authResult;
      try {
        const loginRes = await cognitoLogin(email, password);
        authResult = loginRes.AuthenticationResult;
      } catch (err: any) {
        const mapped = mapCognitoError(err);
        res.status(mapped.status).json({ success: false, error: mapped.message });
        return;
      }

      if (!authResult?.AccessToken || !authResult?.RefreshToken) {
        res.status(500).json({ success: false, error: "Registration failed" });
        return;
      }

      // Create user in DB (no passwordHash)
      const user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          role,
          cognitoId: cognitoSub,
          ...(role === "CLINICIAN"
            ? { clinicianProfile: { create: {} } }
            : { participantProfile: { create: {} } }),
        },
        include: {
          clinicianProfile: true,
          participantProfile: true,
        },
      });

      setAuthCookies(res, authResult.AccessToken, authResult.RefreshToken);
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
          accessToken: authResult.AccessToken,
          refreshToken: authResult.RefreshToken,
        },
      });
    } else {
      // Legacy fallback (local dev without Cognito)
      const bcrypt = await import("bcryptjs");
      const passwordHash = await bcrypt.hash(password, 12);

      const user = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          role,
          passwordHash,
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

      setAuthCookies(res, accessToken, "legacy-no-refresh");
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
          refreshToken: "legacy-no-refresh",
        },
      });
    }
  } catch (err) {
    logger.error("Register error", err);
    res.status(500).json({ success: false, error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", loginLimiter as any, validate(LoginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (isCognitoEnabled()) {
      // Authenticate via Cognito
      let authResult;
      try {
        const loginRes = await cognitoLogin(email, password);
        authResult = loginRes.AuthenticationResult;
      } catch (err: any) {
        const mapped = mapCognitoError(err);
        res.status(mapped.status).json({ success: false, error: mapped.message });
        return;
      }

      if (!authResult?.AccessToken || !authResult?.RefreshToken) {
        res.status(500).json({ success: false, error: "Login failed" });
        return;
      }

      // Look up user in DB
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

      // Update cognitoId if not set (links Cognito sub to DB user)
      if (!user.cognitoId && authResult.AccessToken) {
        try {
          const parts = authResult.AccessToken.split(".");
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
          if (payload.sub) {
            await prisma.user.update({
              where: { id: user.id },
              data: { cognitoId: payload.sub },
            });
          }
        } catch {
          // Non-critical — will retry on next login
        }
      }

      const hasCompletedSetup = await getSetupStatus(user);

      // Dev-only: sync kevin -> admin on admin login (fire-and-forget)
      if (email === ADMIN_EMAIL && process.env.NODE_ENV !== "production") {
        import("../services/sync-admin").then(({ syncKevinToAdmin }) => {
          syncKevinToAdmin().catch((e) => logger.warn("Admin sync failed", e));
        }).catch(() => {});
      }

      setAuthCookies(res, authResult.AccessToken, authResult.RefreshToken);
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
          accessToken: authResult.AccessToken,
          refreshToken: authResult.RefreshToken,
        },
      });
    } else {
      // Legacy fallback (local dev without Cognito)
      const bcrypt = await import("bcryptjs");

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

      // For legacy mode, passwordHash is required
      if (!user.passwordHash) {
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

      const hasCompletedSetup = await getSetupStatus(user);

      // Dev-only: sync kevin -> admin on admin login (fire-and-forget)
      if (email === ADMIN_EMAIL && process.env.NODE_ENV !== "production") {
        import("../services/sync-admin").then(({ syncKevinToAdmin }) => {
          syncKevinToAdmin().catch((e) => logger.warn("Admin sync failed", e));
        }).catch(() => {});
      }

      setAuthCookies(res, accessToken, "legacy-no-refresh");
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
          refreshToken: "legacy-no-refresh",
        },
      });
    }
  } catch (err) {
    logger.error("Login error", err);
    res.status(500).json({ success: false, error: "Login failed" });
  }
});

// POST /api/auth/refresh
router.post("/refresh", refreshLimiter as any, async (req: Request, res: Response) => {
  try {
    // Read from body (mobile) or cookie (web)
    const refreshToken = req.body.refreshToken || req.cookies?.refresh_token;
    if (!refreshToken) {
      res.status(400).json({ success: false, error: "Refresh token required" });
      return;
    }

    if (isCognitoEnabled()) {
      let authResult;
      try {
        const refreshRes = await cognitoRefresh(refreshToken);
        authResult = refreshRes.AuthenticationResult;
      } catch (err: any) {
        const mapped = mapCognitoError(err);
        res.status(mapped.status).json({ success: false, error: mapped.message });
        return;
      }

      if (!authResult?.AccessToken) {
        res.status(401).json({ success: false, error: "Token refresh failed" });
        return;
      }

      // Cognito refresh does not rotate the refresh token, so reuse the same one
      const newRefreshToken = authResult.RefreshToken || refreshToken;
      setAuthCookies(res, authResult.AccessToken, newRefreshToken);
      res.json({ success: true, data: { accessToken: authResult.AccessToken, refreshToken: newRefreshToken } });
    } else {
      // Legacy fallback — no real refresh, just validate the token exists
      res.status(401).json({ success: false, error: "Token refresh not available in legacy mode" });
    }
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired refresh token" });
  }
});

// POST /api/auth/logout
router.post("/logout", async (req: Request, res: Response) => {
  try {
    if (isCognitoEnabled()) {
      // Try to get the access token to revoke all Cognito sessions
      const accessToken = req.cookies?.access_token || req.headers.authorization?.replace("Bearer ", "");
      if (accessToken) {
        try {
          await cognitoClient.send(
            new GlobalSignOutCommand({ AccessToken: accessToken })
          );
        } catch {
          // Best-effort — token may already be expired
        }
      }
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

    const hasCompletedSetup = await getSetupStatus(user, req.user!.clinicianProfileId);

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
router.post("/register-with-invite", inviteRegisterLimiter as any, validate(RegisterWithInviteSchema), async (req: Request, res: Response) => {
  try {
    const { redeemInvitation } = await import("../services/invitations");
    const { ExpiredError } = await import("../services/invitations");
    const { ConflictError, NotFoundError } = await import("../services/clinician");

    // If Cognito is enabled, create Cognito user first, then redeem invitation
    if (isCognitoEnabled()) {
      const { email, password } = req.body;

      // Create Cognito user
      let cognitoSub: string;
      try {
        cognitoSub = await cognitoCreateUser(email, password);
      } catch (err: any) {
        const mapped = mapCognitoError(err);
        res.status(mapped.status).json({ success: false, error: mapped.message });
        return;
      }

      // Redeem invitation (creates DB user, enrollment, etc.)
      let result;
      try {
        result = await redeemInvitation({ ...req.body, cognitoId: cognitoSub });
      } catch (err) {
        // Clean up Cognito user on invitation redemption failure
        try {
          const { AdminDeleteUserCommand } = await import("../lib/cognito");
          await cognitoClient.send(
            new AdminDeleteUserCommand({ UserPoolId: userPoolId, Username: email })
          );
        } catch {
          // Best-effort cleanup
        }
        throw err;
      }

      // Get tokens from Cognito
      let authResult;
      try {
        const loginRes = await cognitoLogin(email, password);
        authResult = loginRes.AuthenticationResult;
      } catch (err: any) {
        const mapped = mapCognitoError(err);
        res.status(mapped.status).json({ success: false, error: mapped.message });
        return;
      }

      if (!authResult?.AccessToken || !authResult?.RefreshToken) {
        res.status(500).json({ success: false, error: "Registration failed" });
        return;
      }

      setAuthCookies(res, authResult.AccessToken, authResult.RefreshToken);
      res.status(201).json({
        success: true,
        data: {
          accessToken: authResult.AccessToken,
          refreshToken: authResult.RefreshToken,
          user: {
            id: result.user.id,
            email: result.user.email,
            role: result.user.role,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
          },
        },
      });
    } else {
      // Legacy fallback
      const result = await redeemInvitation(req.body);

      const authUser: AuthUser = {
        userId: result.user.id,
        role: "PARTICIPANT",
        participantProfileId: result.user.participantProfileId,
      };
      const accessToken = generateAccessToken(authUser);

      setAuthCookies(res, accessToken, "legacy-no-refresh");
      res.status(201).json({
        success: true,
        data: {
          accessToken,
          refreshToken: "legacy-no-refresh",
          user: {
            id: result.user.id,
            email: result.user.email,
            role: result.user.role,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
          },
        },
      });
    }
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

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPasswordLimiter as any, validate(ForgotPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: "Email is required" });
      return;
    }

    if (!isCognitoEnabled()) {
      // In legacy mode, just return success without revealing anything
      res.json({ success: true, message: "If an account exists with that email, a reset code has been sent." });
      return;
    }

    try {
      await cognitoClient.send(
        new ForgotPasswordCommand({
          ClientId: cognitoClientId,
          Username: email.toLowerCase().trim(),
        })
      );
    } catch {
      // Don't reveal whether the email exists — always return success
    }

    res.json({ success: true, message: "If an account exists with that email, a reset code has been sent." });
  } catch (err) {
    logger.error("Forgot password error", err);
    res.status(500).json({ success: false, error: "Failed to process request" });
  }
});

// POST /api/auth/confirm-reset-password
router.post("/confirm-reset-password", forgotPasswordLimiter as any, validate(ConfirmResetPasswordSchema), async (req: Request, res: Response) => {
  try {
    const { email, code, newPassword } = req.body;
    if (!email || !code || !newPassword) {
      res.status(400).json({ success: false, error: "Email, code, and new password are required" });
      return;
    }

    if (!isCognitoEnabled()) {
      res.status(503).json({ success: false, error: "Password reset not available" });
      return;
    }

    try {
      await cognitoClient.send(
        new ConfirmForgotPasswordCommand({
          ClientId: cognitoClientId,
          Username: email.toLowerCase().trim(),
          ConfirmationCode: code,
          Password: newPassword,
        })
      );
    } catch (err: any) {
      const mapped = mapCognitoError(err);
      res.status(mapped.status).json({ success: false, error: mapped.message });
      return;
    }

    res.json({ success: true, message: "Password has been reset successfully." });
  } catch (err) {
    logger.error("Confirm reset password error", err);
    res.status(500).json({ success: false, error: "Failed to reset password" });
  }
});

// ── Client Web Portal — Token-based invitation redemption ─────────
// FR-3, AC-3.* — replaces /api/auth/register-with-invite

import {
  RedeemPortalInvitationSchema,
  PortalInvitationStatusQuerySchema,
} from "@steady/shared";
import {
  lookupPortalInvitationStatus,
  redeemPortalInvitation,
  InvitationExpiredError,
  InvitationUsedError,
  InvitationRevokedError,
  InvitationBindingMismatchError,
  InvitationNoLongerValidError,
} from "../services/portal-invitations";
import { checkRateLimit } from "../services/rate-limit";

const portalRedeemLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many attempts. Please try again later.",
  },
  skip: () => isTest,
});

// GET /api/auth/portal-invite-status?t=<token>
// Public, no auth. Returns invitation state without leaking info.
router.get("/portal-invite-status", async (req: Request, res: Response) => {
  try {
    const parsed = PortalInvitationStatusQuerySchema.safeParse({
      token: typeof req.query.t === "string" ? req.query.t : "",
    });
    if (!parsed.success) {
      res.json({ success: true, data: { status: "INVALID" } });
      return;
    }
    const status = await lookupPortalInvitationStatus(parsed.data.token);
    res.json({ success: true, data: status });
  } catch (err) {
    logger.error("Portal invite status lookup error", err);
    res.json({ success: true, data: { status: "INVALID" } });
  }
});

// POST /api/auth/redeem-portal-invite
// Public, rate-limited. Token-bound, email-verified, single-use.
router.post(
  "/redeem-portal-invite",
  portalRedeemLimiter as any,
  validate(RedeemPortalInvitationSchema),
  async (req: Request, res: Response) => {
    try {
      // Additional DB-backed IP rate limit (COND-3, NFR-2.8)
      const ip =
        (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
        req.ip ||
        "unknown";
      const limit = await checkRateLimit({
        bucket: "redeem-portal-invite",
        identifier: ip,
        limit: 10,
        windowMs: 60 * 60 * 1000,
      });
      if (limit.exceeded) {
        res.status(429).json({
          success: false,
          error: "Too many attempts. Please try again later.",
        });
        return;
      }

      const { token, email, firstName, lastName, password } = req.body;

      let cognitoSub: string | null = null;

      if (isCognitoEnabled()) {
        // Try to create the Cognito user. On UsernameExistsException,
        // treat as idempotent resume (AC-3.3).
        try {
          cognitoSub = await cognitoCreateUser(email, password);
        } catch (err: any) {
          if (err?.name === "UsernameExistsException") {
            // Resume path — Cognito user already exists. Fetch the sub
            // by logging in (which also returns tokens for us to set).
            try {
              const loginRes = await cognitoLogin(email, password);
              const accessToken = loginRes.AuthenticationResult?.AccessToken;
              if (accessToken) {
                const parts = accessToken.split(".");
                const payload = JSON.parse(
                  Buffer.from(parts[1], "base64url").toString()
                );
                cognitoSub = payload.sub;
              }
            } catch (loginErr: any) {
              const mapped = mapCognitoError(loginErr);
              res
                .status(mapped.status)
                .json({ success: false, error: mapped.message });
              return;
            }
          } else {
            const mapped = mapCognitoError(err);
            res
              .status(mapped.status)
              .json({ success: false, error: mapped.message });
            return;
          }
        }
      }

      // In legacy (non-Cognito) mode, hash the password with bcrypt so
      // the user can log in later via /api/auth/login. Cognito stores
      // the password itself, so we skip this when Cognito is enabled.
      let passwordHashForDb: string | null = null;
      if (!isCognitoEnabled()) {
        const bcrypt = await import("bcryptjs");
        passwordHashForDb = await bcrypt.hash(password, 12);
      }

      let result;
      try {
        result = await redeemPortalInvitation({
          token,
          email,
          firstName,
          lastName,
          password,
          cognitoId: cognitoSub,
          passwordHash: passwordHashForDb,
        });
      } catch (err) {
        // Clean up Cognito user on redemption failure (AC-3.*)
        if (cognitoSub && isCognitoEnabled()) {
          try {
            const { AdminDeleteUserCommand } = await import("../lib/cognito");
            await cognitoClient.send(
              new AdminDeleteUserCommand({
                UserPoolId: userPoolId,
                Username: email,
              })
            );
          } catch {
            // best-effort
          }
        }
        throw err;
      }

      // Get tokens from Cognito (real login)
      let authResult;
      if (isCognitoEnabled()) {
        try {
          const loginRes = await cognitoLogin(email, password);
          authResult = loginRes.AuthenticationResult;
        } catch (err: any) {
          const mapped = mapCognitoError(err);
          res
            .status(mapped.status)
            .json({ success: false, error: mapped.message });
          return;
        }
        if (!authResult?.AccessToken || !authResult?.RefreshToken) {
          res.status(500).json({ success: false, error: "Login failed" });
          return;
        }
        setAuthCookies(res, authResult.AccessToken, authResult.RefreshToken);
      } else {
        // Legacy JWT fallback
        const authUser: AuthUser = {
          userId: result.user.id,
          role: "PARTICIPANT",
          participantProfileId: result.user.participantProfileId,
        };
        const accessToken = generateAccessToken(authUser);
        setAuthCookies(res, accessToken, "legacy-no-refresh");
        authResult = { AccessToken: accessToken, RefreshToken: "legacy-no-refresh" };
      }

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
            role: result.user.role,
          },
          accessToken: authResult.AccessToken,
          refreshToken: authResult.RefreshToken,
        },
      });
    } catch (err) {
      if (err instanceof InvitationExpiredError) {
        res
          .status(409)
          .json({ success: false, error: err.message, code: err.code });
        return;
      }
      if (err instanceof InvitationUsedError) {
        res
          .status(409)
          .json({ success: false, error: err.message, code: err.code });
        return;
      }
      if (err instanceof InvitationRevokedError) {
        res
          .status(409)
          .json({ success: false, error: err.message, code: err.code });
        return;
      }
      if (err instanceof InvitationBindingMismatchError) {
        res
          .status(403)
          .json({ success: false, error: err.message, code: err.code });
        return;
      }
      if (err instanceof InvitationNoLongerValidError) {
        res
          .status(410)
          .json({ success: false, error: err.message, code: err.code });
        return;
      }
      logger.error("Redeem portal invite error", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to redeem invitation" });
    }
  }
);

export default router;
