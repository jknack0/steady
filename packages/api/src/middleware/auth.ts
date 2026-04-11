import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { prisma, runWithAuditUser } from "@steady/db";
import { JWT_SECRET, COGNITO_USER_POOL_ID, COGNITO_CLIENT_ID } from "../lib/env";

export interface AuthUser {
  userId: string;
  role: "CLINICIAN" | "PARTICIPANT" | "ADMIN";
  clinicianProfileId?: string;
  participantProfileId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Lazy-init Cognito verifier — only created when COGNITO_USER_POOL_ID is set
let _cognitoVerifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;

function getCognitoVerifier(): ReturnType<typeof CognitoJwtVerifier.create> | null {
  if (!COGNITO_USER_POOL_ID || !COGNITO_CLIENT_ID) return null;
  if (!_cognitoVerifier) {
    _cognitoVerifier = CognitoJwtVerifier.create({
      userPoolId: COGNITO_USER_POOL_ID,
      clientId: COGNITO_CLIENT_ID,
      tokenUse: "access",
    });
  }
  return _cognitoVerifier;
}

/** Is Cognito configured? */
export function isCognitoEnabled(): boolean {
  return !!COGNITO_USER_POOL_ID && !!COGNITO_CLIENT_ID;
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  // 1. Try httpOnly cookie (web clients)
  let token = req.cookies?.access_token;

  // 2. Fall back to Authorization header (mobile clients)
  if (!token) {
    const header = req.headers.authorization;
    if (header?.startsWith("Bearer ")) {
      token = header.slice(7);
    }
  }

  if (!token) {
    res.status(401).json({ success: false, error: "Missing authorization token" });
    return;
  }

  const verifier = getCognitoVerifier();

  if (verifier) {
    // Cognito JWT verification
    verifier
      .verify(token)
      .then(async (payload) => {
        // Cognito access token has `sub` (UUID) as identity, not email
        const cognitoSub = (payload.sub || payload.username || "") as string;
        if (!cognitoSub) {
          res.status(401).json({ success: false, error: "Invalid token: missing user identity" });
          return;
        }

        // Look up user by cognitoId first, fall back to email
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { cognitoId: cognitoSub },
              { email: cognitoSub.toLowerCase() },
            ],
          },
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

        req.user = authUser;
        // Attach userId to audit context for HIPAA audit trail
        runWithAuditUser(authUser.userId, () => next());
      })
      .catch(() => {
        res.status(401).json({ success: false, error: "Invalid or expired token" });
      });
  } else {
    // Legacy JWT verification (local dev without Cognito)
    try {
      const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
      req.user = payload;
      // Attach userId to audit context for HIPAA audit trail
      runWithAuditUser(payload.userId, () => next());
    } catch {
      res.status(401).json({ success: false, error: "Invalid or expired token" });
    }
  }
}

export function requireRole(...roles: AuthUser["role"][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

/** @deprecated Use Cognito tokens instead. Kept for demo provisioning fallback. */
export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "30m" });
}
