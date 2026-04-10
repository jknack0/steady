import { Request, Response, NextFunction } from "express";
import { prisma } from "@steady/db";

export interface ServiceCtx {
  practiceId: string;
  userId: string;
  clinicianProfileId?: string;
  isAccountOwner: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Locals {
      practiceCtx?: ServiceCtx;
    }
  }
}

export async function requirePracticeCtx(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = req.user;
    if (!user) {
      res.status(401).json({ success: false, error: "Not authenticated" });
      return;
    }
    const clinicianProfileId = user.clinicianProfileId;
    if (!clinicianProfileId) {
      res.status(404).json({ success: false, error: "No practice membership" });
      return;
    }

    // TODO: Single-practice assumption — findFirst returns an arbitrary membership
    // when a clinician belongs to multiple practices. A future fix should accept a
    // practice-selection header (e.g. X-Practice-Id) and validate membership.
    const membership = await prisma.practiceMembership.findFirst({
      where: { clinicianId: clinicianProfileId },
      select: { practiceId: true, role: true },
    });

    if (!membership) {
      res.status(404).json({ success: false, error: "No practice membership" });
      return;
    }

    const isAccountOwner =
      membership.role === "OWNER" || user.role === "ADMIN";

    res.locals.practiceCtx = {
      practiceId: membership.practiceId,
      userId: user.userId,
      clinicianProfileId,
      isAccountOwner,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export const NotFound = Symbol("NotFound");
export type NotFoundSentinel = typeof NotFound;
export function isNotFound<T>(value: T | NotFoundSentinel): value is NotFoundSentinel {
  return value === NotFound;
}
