import { Request, Response, NextFunction } from "express";

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

export function rateLimit({ max, windowMs }: { max: number; windowMs: number }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.user?.userId || req.ip || "anonymous";
    const now = Date.now();
    const cutoff = now - windowMs;
    const bucket = buckets.get(key) || { timestamps: [] };
    bucket.timestamps = bucket.timestamps.filter((t) => t > cutoff);
    if (bucket.timestamps.length >= max) {
      res.status(429).json({ success: false, error: "Rate limit exceeded" });
      return;
    }
    bucket.timestamps.push(now);
    buckets.set(key, bucket);
    next();
  };
}

export function __resetRateLimit(): void {
  buckets.clear();
}
