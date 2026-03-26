import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { runWithAuditUser } from "@steady/db";
import { JWT_SECRET } from "../lib/env";

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

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing authorization token" });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AuthUser;
    req.user = payload;
    // Attach userId to audit context for HIPAA audit trail
    runWithAuditUser(payload.userId, () => next());
  } catch {
    res.status(401).json({ success: false, error: "Invalid or expired token" });
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

export function generateToken(user: AuthUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "30m" });
}
