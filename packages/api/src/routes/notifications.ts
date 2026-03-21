import { Router, Request, Response } from "express";
import { prisma } from "@steady/db";
import { authenticate } from "../middleware/auth";
import { recordDismissal } from "../services/notifications";

const router = Router();

router.use(authenticate);

// POST /api/notifications/push-token — Register/update push token
router.post("/push-token", async (req: Request, res: Response) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken || typeof pushToken !== "string") {
      res.status(400).json({ success: false, error: "pushToken is required" });
      return;
    }

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        pushToken,
        pushTokenUpdatedAt: new Date(),
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Register push token error:", err);
    res.status(500).json({ success: false, error: "Failed to register push token" });
  }
});

// DELETE /api/notifications/push-token — Remove push token (on logout)
router.delete("/push-token", async (req: Request, res: Response) => {
  try {
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: {
        pushToken: null,
        pushTokenUpdatedAt: null,
      },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Remove push token error:", err);
    res.status(500).json({ success: false, error: "Failed to remove push token" });
  }
});

// GET /api/notifications/preferences — Get notification preferences
router.get("/preferences", async (req: Request, res: Response) => {
  try {
    const preferences = await prisma.notificationPreference.findMany({
      where: { userId: req.user!.userId },
    });

    // Return all categories with defaults for any not yet set
    const categories = ["MORNING_CHECKIN", "HOMEWORK", "SESSION", "TASK", "WEEKLY_REVIEW"];
    const prefsMap = new Map(preferences.map((p) => [p.category, p]));

    const result = categories.map((cat) => {
      const existing = prefsMap.get(cat as any);
      return {
        category: cat,
        enabled: existing ? existing.enabled : true,
        preferredTime: existing?.preferredTime || null,
      };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("Get notification preferences error:", err);
    res.status(500).json({ success: false, error: "Failed to get preferences" });
  }
});

// PUT /api/notifications/preferences — Update notification preferences
router.put("/preferences", async (req: Request, res: Response) => {
  try {
    const { preferences } = req.body;

    if (!Array.isArray(preferences)) {
      res.status(400).json({ success: false, error: "preferences array is required" });
      return;
    }

    const validCategories = ["MORNING_CHECKIN", "HOMEWORK", "SESSION", "TASK", "WEEKLY_REVIEW"];

    for (const pref of preferences) {
      if (!validCategories.includes(pref.category)) continue;

      await prisma.notificationPreference.upsert({
        where: {
          userId_category: {
            userId: req.user!.userId,
            category: pref.category,
          },
        },
        create: {
          userId: req.user!.userId,
          category: pref.category,
          enabled: pref.enabled ?? true,
          preferredTime: pref.preferredTime || null,
        },
        update: {
          enabled: pref.enabled ?? true,
          preferredTime: pref.preferredTime ?? undefined,
        },
      });
    }

    // Re-fetch and return
    const updated = await prisma.notificationPreference.findMany({
      where: { userId: req.user!.userId },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("Update notification preferences error:", err);
    res.status(500).json({ success: false, error: "Failed to update preferences" });
  }
});

// POST /api/notifications/dismiss — Record a notification dismissal (for smart escalation)
router.post("/dismiss", async (req: Request, res: Response) => {
  try {
    const { category } = req.body;

    const validCategories = ["MORNING_CHECKIN", "HOMEWORK", "SESSION", "TASK", "WEEKLY_REVIEW"];
    if (!category || !validCategories.includes(category)) {
      res.status(400).json({ success: false, error: "Valid category is required" });
      return;
    }

    await recordDismissal(req.user!.userId, category);
    res.json({ success: true });
  } catch (err) {
    console.error("Record dismissal error:", err);
    res.status(500).json({ success: false, error: "Failed to record dismissal" });
  }
});

export default router;
