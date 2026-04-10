import { Request, Response, NextFunction } from "express";
import { INTERNAL_API_KEY } from "../lib/env";

/**
 * Authenticates internal service-to-service calls with a shared secret.
 * Used for the transcription worker -> API callback.
 */
export function authenticateInternal(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, error: "Missing authorization" });
    return;
  }

  const token = header.slice(7);
  if (token !== INTERNAL_API_KEY) {
    res.status(403).json({ success: false, error: "Invalid credentials" });
    return;
  }

  next();
}
