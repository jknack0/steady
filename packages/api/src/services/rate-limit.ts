import { prisma } from "@steady/db";
import { logger } from "../lib/logger";

// ── DB-backed rate limiter ─────────────────────────────────────────
// COND-3 / NFR-2.8: rate limit state MUST NOT live in memory per
// CLAUDE.md "no in-memory state" rule. This uses a simple fixed-window
// counter keyed on (bucket, identifier).
//
// Tradeoffs:
// - Fixed window (not sliding) — allows bursts at window boundaries.
//   Acceptable for portal traffic; upgrade to sliding log if abused.
// - One DB round-trip per check. pg can handle thousands/sec; we're
//   serving a portal with low concurrent volume.
// - Janitor cleans stale rows periodically (see workers/rate-limit-janitor).
//
// Usage:
//   const result = await checkRateLimit({
//     bucket: "portal-redeem-invite",
//     identifier: ip,
//     limit: 10,
//     windowMs: 60 * 60 * 1000, // 1 hour
//   });
//   if (result.exceeded) return res.status(429).json({ ... });

export interface RateLimitCheck {
  bucket: string;
  identifier: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  exceeded: boolean;
  count: number;
  limit: number;
  resetAt: Date;
}

/**
 * Atomically increment the counter for a (bucket, identifier) pair and
 * check whether the limit is exceeded. If the previous window has
 * elapsed, start a new window.
 *
 * Returns `exceeded: true` when the operation should be blocked. The
 * count is NOT incremented further after the limit is reached (the row
 * stays at `limit` until the window resets).
 */
export async function checkRateLimit(
  params: RateLimitCheck
): Promise<RateLimitResult> {
  const { bucket, identifier, limit, windowMs } = params;
  const now = new Date();
  const windowExpiresAfter = new Date(now.getTime() - windowMs);

  // Fetch or create the counter row and decide whether we reset the window.
  const existing = await prisma.rateLimit.findUnique({
    where: { bucket_identifier: { bucket, identifier } },
  });

  if (!existing) {
    await prisma.rateLimit.create({
      data: {
        bucket,
        identifier,
        count: 1,
        windowStart: now,
      },
    });
    return {
      exceeded: false,
      count: 1,
      limit,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }

  // Window expired → reset
  if (existing.windowStart < windowExpiresAfter) {
    await prisma.rateLimit.update({
      where: { id: existing.id },
      data: { count: 1, windowStart: now },
    });
    return {
      exceeded: false,
      count: 1,
      limit,
      resetAt: new Date(now.getTime() + windowMs),
    };
  }

  // Within current window
  if (existing.count >= limit) {
    return {
      exceeded: true,
      count: existing.count,
      limit,
      resetAt: new Date(existing.windowStart.getTime() + windowMs),
    };
  }

  const updated = await prisma.rateLimit.update({
    where: { id: existing.id },
    data: { count: { increment: 1 } },
  });

  return {
    exceeded: false,
    count: updated.count,
    limit,
    resetAt: new Date(existing.windowStart.getTime() + windowMs),
  };
}

/**
 * Clean up stale rate-limit rows. Called by the janitor worker.
 * Deletes any row whose window ended more than 24 hours ago.
 */
export async function cleanupStaleRateLimits(): Promise<number> {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const result = await prisma.rateLimit.deleteMany({
    where: { windowStart: { lt: cutoff } },
  });
  logger.info(
    "Rate limit janitor completed",
    `deleted=${result.count}`
  );
  return result.count;
}
