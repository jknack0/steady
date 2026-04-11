import type { Response } from "express";
import { logger } from "./logger";

export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class ValidationError extends Error {
  details?: Array<{ path: string; message: string }>;
  constructor(message: string, details?: Array<{ path: string; message: string }>) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

/**
 * Shared error handler for route catch blocks.
 * Maps service-layer errors to the appropriate HTTP status.
 */
export function handleServiceError(
  res: Response,
  err: unknown,
  context: string,
): void {
  if (err instanceof NotFoundError) {
    res.status(404).json({ success: false, error: err.message });
    return;
  }
  if (err instanceof ConflictError) {
    res.status(409).json({ success: false, error: err.message });
    return;
  }
  if (err instanceof ValidationError) {
    if (err.details) {
      res.status(400).json({ success: false, error: err.message, details: err.details });
    } else {
      res.status(400).json({ success: false, error: err.message });
    }
    return;
  }
  logger.error(`${context} error`, err);
  res.status(500).json({ success: false, error: `Failed to ${context}` });
}
