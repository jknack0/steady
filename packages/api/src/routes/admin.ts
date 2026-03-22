import { logger } from "../lib/logger";
import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

router.use(authenticate, requireRole("ADMIN"));

// GET /api/admin/audit-logs — Query audit trail with filters + cursor pagination
router.get("/audit-logs", async (req: Request, res: Response) => {
  try {
    const {
      userId,
      resourceType,
      action,
      startDate,
      endDate,
      resourceId,
      cursor,
      limit = "50",
    } = req.query;

    const take = Math.min(parseInt(limit as string) || 50, 200);

    const where: any = {};

    if (userId) where.userId = userId as string;
    if (resourceType) where.resourceType = resourceType as string;
    if (action) where.action = action as string;
    if (resourceId) where.resourceId = resourceId as string;

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: take + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor as string } } : {}),
    });

    const hasMore = logs.length > take;
    const data = hasMore ? logs.slice(0, take) : logs;

    res.json({
      success: true,
      data,
      cursor: hasMore ? data[data.length - 1].id : null,
    });
  } catch (err) {
    logger.error("List audit logs error", err);
    res.status(500).json({ success: false, error: "Failed to list audit logs" });
  }
});

// GET /api/admin/audit-logs/stats — Summary counts by resource type and action
router.get("/audit-logs/stats", async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    const where: any = {};
    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) where.timestamp.gte = new Date(startDate as string);
      if (endDate) where.timestamp.lte = new Date(endDate as string);
    }

    const [total, byAction, byResource] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.groupBy({
        by: ["action"],
        where,
        _count: true,
      }),
      prisma.auditLog.groupBy({
        by: ["resourceType"],
        where,
        _count: true,
        orderBy: { _count: { resourceType: "desc" } },
        take: 20,
      }),
    ]);

    res.json({
      success: true,
      data: {
        total,
        byAction: byAction.map((r) => ({ action: r.action, count: r._count })),
        byResource: byResource.map((r) => ({
          resourceType: r.resourceType,
          count: r._count,
        })),
      },
    });
  } catch (err) {
    logger.error("Audit logs stats error", err);
    res.status(500).json({ success: false, error: "Failed to get audit stats" });
  }
});

export default router;
