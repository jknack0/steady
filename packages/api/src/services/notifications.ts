import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "@steady/db";
import { getQueue } from "./queue";
import {
  getMorningCheckinCopy,
  getHomeworkCopy,
  getSessionReminderCopy,
  getTaskCopy,
  getWeeklyReviewCopy,
  getDiagnosticPromptCopy,
} from "./notification-copy";
import {
  generateAllPendingInstances,
  markMissedInstances,
} from "./homework-instances";

const expo = new Expo();

// ── Job Types ────────────────────────────────────────

interface SendNotificationJob {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  category: string;
}

// ── Core Send Function ───────────────────────────────

async function sendPushNotification(job: SendNotificationJob): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: job.userId },
    select: { pushToken: true, notificationPreferences: true },
  });

  if (!user?.pushToken || !Expo.isExpoPushToken(user.pushToken)) {
    return;
  }

  // Check if user has disabled this category
  const pref = user.notificationPreferences.find(
    (p) => p.category === job.category
  );
  if (pref && !pref.enabled) {
    return;
  }

  // Smart escalation: check dismissal history
  let { title, body } = job;
  const dismissals = await getRecentDismissals(job.userId, 7);
  if (dismissals >= 3) {
    const diagnostic = getDiagnosticPromptCopy(job.category);
    title = diagnostic.title;
    body = diagnostic.body;
  }

  const message: ExpoPushMessage = {
    to: user.pushToken,
    sound: "default",
    title,
    body,
    data: job.data || {},
  };

  try {
    const chunks = expo.chunkPushNotifications([message]);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    console.error("Failed to send push notification:", err);
  }
}

// ── Dismissal Tracking ──────────────────────────────

// Stored in NotificationPreference.customSettings as { dismissals: [{date}] }
async function getRecentDismissals(userId: string, days: number): Promise<number> {
  const prefs = await prisma.notificationPreference.findMany({
    where: { userId },
  });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  let total = 0;
  for (const pref of prefs) {
    const settings = pref.customSettings as any;
    if (settings?.dismissals) {
      total += settings.dismissals.filter(
        (d: any) => new Date(d.date) >= cutoff
      ).length;
    }
  }
  return total;
}

export async function recordDismissal(
  userId: string,
  category: string
): Promise<void> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_category: { userId, category: category as any } },
  });

  const existingSettings = (pref?.customSettings as any) || {};
  const dismissals = existingSettings.dismissals || [];
  dismissals.push({ date: new Date().toISOString() });

  // Keep only last 30 days of dismissals
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const trimmed = dismissals.filter(
    (d: any) => new Date(d.date) >= cutoff
  );

  await prisma.notificationPreference.upsert({
    where: { userId_category: { userId, category: category as any } },
    create: {
      userId,
      category: category as any,
      enabled: true,
      customSettings: { dismissals: trimmed },
    },
    update: {
      customSettings: { ...existingSettings, dismissals: trimmed },
    },
  });
}

// ── Queue Registration ───────────────────────────────

export async function registerNotificationWorkers(): Promise<void> {
  const boss = await getQueue();

  // Create queues before registering workers/schedules (pg-boss v10 requirement)
  await boss.createQueue("send-notification");
  await boss.createQueue("schedule-morning-checkins");
  await boss.createQueue("schedule-weekly-reviews");
  await boss.createQueue("schedule-homework-reminders");
  await boss.createQueue("generate-homework-instances");
  await boss.createQueue("schedule-tracker-reminders");

  await boss.work<SendNotificationJob>("send-notification", async (jobs) => {
    for (const job of jobs) {
      await sendPushNotification(job.data);
    }
  });

  await boss.work("schedule-morning-checkins", async () => {
    await scheduleDailyMorningCheckins();
  });

  await boss.work("schedule-weekly-reviews", async () => {
    await scheduleWeeklyReviews();
  });

  await boss.work("schedule-homework-reminders", async () => {
    await scheduleHomeworkRemindersForAll();
  });

  await boss.work("generate-homework-instances", async () => {
    await generateAllPendingInstances();
    await markMissedInstances();
  });

  await boss.work("schedule-tracker-reminders", async () => {
    await scheduleTrackerRemindersForAll();
  });

  // Schedule recurring jobs
  await boss.schedule("schedule-morning-checkins", "0 5 * * *"); // 5am UTC daily
  await boss.schedule("schedule-weekly-reviews", "0 14 * * 0");  // 2pm UTC Sundays
  await boss.schedule("schedule-homework-reminders", "0 6 * * *"); // 6am UTC daily
  await boss.schedule("generate-homework-instances", "0 3 * * *"); // 3am UTC daily (before reminders)
  await boss.schedule("schedule-tracker-reminders", "0 17 * * *"); // 5pm UTC daily

  console.log("Notification workers registered");
}

// ── Public API ───────────────────────────────────────

export async function queueNotification(
  userId: string,
  title: string,
  body: string,
  category: string,
  data?: Record<string, string>,
  options?: { startAfter?: Date | string; singletonKey?: string }
): Promise<void> {
  const boss = await getQueue();
  await boss.send("send-notification", {
    userId,
    title,
    body,
    category,
    data,
  }, {
    ...(options?.startAfter ? { startAfter: options.startAfter } : {}),
    ...(options?.singletonKey ? { singletonKey: options.singletonKey } : {}),
    retryLimit: 3,
    retryDelay: 60,
  });
}

// ── Cancel Helpers ──────────────────────────────────

export async function cancelNotificationsByKey(keyPrefix: string): Promise<void> {
  const boss = await getQueue();
  // pg-boss: cancel all jobs matching the singleton key prefix
  // We use SQL directly since pg-boss doesn't expose prefix cancel
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE pgboss.job SET state = 'cancelled'
       WHERE name = 'send-notification'
       AND state IN ('created', 'retry')
       AND singleton_key LIKE $1`,
      `${keyPrefix}%`
    );
  } catch {
    // Fallback: if pgboss schema not available, silently skip
    console.warn(`Could not cancel notifications with key prefix: ${keyPrefix}`);
  }
}

// ── Session Reminders ───────────────────────────────

export async function scheduleSessionReminders(
  userId: string,
  sessionId: string,
  sessionTime: Date
): Promise<void> {
  const timings: Array<{ offset: number; key: "24h" | "1h" | "10min" }> = [
    { offset: 24 * 60 * 60 * 1000, key: "24h" },
    { offset: 60 * 60 * 1000, key: "1h" },
    { offset: 10 * 60 * 1000, key: "10min" },
  ];

  for (const { offset, key } of timings) {
    const sendAt = new Date(sessionTime.getTime() - offset);
    if (sendAt > new Date()) {
      const copy = getSessionReminderCopy(key);
      await queueNotification(userId, copy.title, copy.body, "SESSION", {
        type: "session_reminder",
        timing: key,
        sessionId,
      }, {
        startAfter: sendAt,
        singletonKey: `session-${sessionId}-${key}`,
      });
    }
  }
}

export async function cancelSessionReminders(sessionId: string): Promise<void> {
  await cancelNotificationsByKey(`session-${sessionId}`);
}

// ── Homework Reminders ──────────────────────────────

export async function scheduleHomeworkReminder(
  userId: string,
  enrollmentId: string,
  partId: string,
  cadence?: "DAILY" | "EVERY_OTHER_DAY" | "MID_WEEK"
): Promise<void> {
  const copy = getHomeworkCopy();
  const singletonKey = `homework-${enrollmentId}-${partId}`;

  if (!cadence || cadence === "DAILY") {
    // Send now (or next scheduled batch will handle recurring)
    await queueNotification(userId, copy.title, copy.body, "HOMEWORK", {
      type: "homework",
      enrollmentId,
      partId,
    }, { singletonKey });
  } else {
    // For EVERY_OTHER_DAY or MID_WEEK, schedule with appropriate delay
    const delayDays = cadence === "EVERY_OTHER_DAY" ? 2 : 3;
    const sendAt = new Date();
    sendAt.setDate(sendAt.getDate() + delayDays);
    sendAt.setUTCHours(8, 0, 0, 0);

    await queueNotification(userId, copy.title, copy.body, "HOMEWORK", {
      type: "homework",
      enrollmentId,
      partId,
    }, { startAfter: sendAt, singletonKey });
  }
}

export async function cancelHomeworkReminders(
  enrollmentId: string,
  partId: string
): Promise<void> {
  await cancelNotificationsByKey(`homework-${enrollmentId}-${partId}`);
}

/**
 * Batch scheduler: finds all incomplete homework and sends reminders
 * based on each part's reminderCadence. Skips already-completed homework.
 */
async function scheduleHomeworkRemindersForAll(): Promise<void> {
  // Get all active enrollments with homework parts
  const enrollments = await prisma.enrollment.findMany({
    where: { status: "ACTIVE" },
    include: {
      participant: {
        include: {
          user: { select: { id: true, pushToken: true } },
        },
      },
      partProgress: {
        where: { status: "COMPLETED" },
        select: { partId: true },
      },
      program: {
        include: {
          modules: {
            include: {
              parts: {
                where: { type: "HOMEWORK" },
                select: { id: true, content: true },
              },
            },
          },
        },
      },
    },
  });

  for (const enrollment of enrollments) {
    const userId = enrollment.participant.user.id;
    if (!enrollment.participant.user.pushToken) continue;

    const completedPartIds = new Set(
      enrollment.partProgress.map((pp) => pp.partId)
    );

    for (const mod of enrollment.program.modules) {
      for (const part of mod.parts) {
        if (completedPartIds.has(part.id)) continue;

        const content = part.content as any;
        const cadence = content?.reminderCadence || "DAILY";

        // Check cadence: skip if not time to send
        if (cadence === "EVERY_OTHER_DAY") {
          const dayOfYear = Math.floor(Date.now() / 86400000);
          if (dayOfYear % 2 !== 0) continue;
        } else if (cadence === "MID_WEEK") {
          const day = new Date().getDay();
          if (day !== 3) continue; // Wednesday only
        }

        const copy = getHomeworkCopy();
        await queueNotification(userId, copy.title, copy.body, "HOMEWORK", {
          type: "homework",
          enrollmentId: enrollment.id,
          partId: part.id,
        }, {
          singletonKey: `homework-${enrollment.id}-${part.id}-daily`,
        });
      }
    }
  }
}

// ── Task Reminders ──────────────────────────────────

export async function scheduleTaskReminder(
  userId: string,
  taskId: string,
  taskTitle: string,
  dueDate: Date
): Promise<void> {
  // Send reminder morning of due date (8am UTC)
  const sendAt = new Date(dueDate);
  sendAt.setUTCHours(8, 0, 0, 0);

  if (sendAt > new Date()) {
    const copy = getTaskCopy(taskTitle);
    await queueNotification(userId, copy.title, copy.body, "TASK", {
      type: "task_reminder",
      taskId,
    }, {
      startAfter: sendAt,
      singletonKey: `task-${taskId}`,
    });
  }
}

// ── Batch Schedulers (run by cron) ───────────────────

async function scheduleDailyMorningCheckins(): Promise<void> {
  const participants = await prisma.user.findMany({
    where: {
      role: "PARTICIPANT",
      pushToken: { not: null },
    },
    select: {
      id: true,
      notificationPreferences: {
        where: { category: "MORNING_CHECKIN" },
      },
      participantProfile: {
        select: { timezone: true },
      },
    },
  });

  for (const user of participants) {
    const pref = user.notificationPreferences[0];
    if (pref && !pref.enabled) continue;

    // Respect preferred time if set (format "HH:MM")
    let startAfter: Date | undefined;
    if (pref?.preferredTime) {
      const [hours, minutes] = pref.preferredTime.split(":").map(Number);
      const tz = user.participantProfile?.timezone || "America/New_York";
      startAfter = getNextTimeInTimezone(hours, minutes, tz);
    }

    const copy = getMorningCheckinCopy();
    await queueNotification(user.id, copy.title, copy.body, "MORNING_CHECKIN", {
      type: "morning_checkin",
    }, {
      singletonKey: `morning-checkin-${user.id}-${todayKey()}`,
      ...(startAfter ? { startAfter } : {}),
    });
  }
}

async function scheduleWeeklyReviews(): Promise<void> {
  const participants = await prisma.user.findMany({
    where: {
      role: "PARTICIPANT",
      pushToken: { not: null },
    },
    select: {
      id: true,
      notificationPreferences: {
        where: { category: "WEEKLY_REVIEW" },
      },
      participantProfile: {
        select: { timezone: true },
      },
    },
  });

  for (const user of participants) {
    const pref = user.notificationPreferences[0];
    if (pref && !pref.enabled) continue;

    let startAfter: Date | undefined;
    if (pref?.preferredTime) {
      const [hours, minutes] = pref.preferredTime.split(":").map(Number);
      const tz = user.participantProfile?.timezone || "America/New_York";
      startAfter = getNextTimeInTimezone(hours, minutes, tz);
    }

    const copy = getWeeklyReviewCopy();
    await queueNotification(user.id, copy.title, copy.body, "WEEKLY_REVIEW", {
      type: "weekly_review",
    }, {
      singletonKey: `weekly-review-${user.id}-${weekKey()}`,
      ...(startAfter ? { startAfter } : {}),
    });
  }
}

// ── Daily Tracker Reminders ──────────────────────────

async function scheduleTrackerRemindersForAll(): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const dateKey = today.toISOString().split("T")[0];

  // Find all active trackers with their program enrollments
  const trackers = await prisma.dailyTracker.findMany({
    where: { isActive: true },
    include: {
      program: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: {
              participant: {
                include: {
                  user: { select: { id: true, pushToken: true } },
                },
              },
            },
          },
        },
      },
      enrollment: {
        include: {
          participant: {
            include: {
              user: { select: { id: true, pushToken: true } },
            },
          },
        },
      },
    },
  });

  for (const tracker of trackers) {
    // Collect users who should get this tracker
    const users: Array<{ id: string; pushToken: string | null; timezone: string }> = [];

    if (tracker.program) {
      for (const enrollment of tracker.program.enrollments) {
        const user = enrollment.participant.user;
        if (user.pushToken) {
          users.push({
            id: user.id,
            pushToken: user.pushToken,
            timezone: enrollment.participant.timezone,
          });
        }
      }
    } else if (tracker.enrollment) {
      const user = tracker.enrollment.participant.user;
      if (user.pushToken) {
        users.push({
          id: user.id,
          pushToken: user.pushToken,
          timezone: tracker.enrollment.participant.timezone,
        });
      }
    }

    // Check which users have already submitted today
    const submissions = await prisma.dailyTrackerEntry.findMany({
      where: {
        trackerId: tracker.id,
        userId: { in: users.map((u) => u.id) },
        date: today,
      },
      select: { userId: true },
    });
    const submittedUserIds = new Set(submissions.map((s) => s.userId));

    for (const user of users) {
      if (submittedUserIds.has(user.id)) continue;

      // Parse reminder time and schedule with timezone
      const [hours, minutes] = tracker.reminderTime.split(":").map(Number);
      const sendAt = getNextTimeInTimezone(hours, minutes, user.timezone);

      await queueNotification(
        user.id,
        tracker.name,
        "Time for your daily check-in",
        "HOMEWORK", // Reuse HOMEWORK category for tracker reminders
        {
          type: "tracker_reminder",
          trackerId: tracker.id,
        },
        {
          startAfter: sendAt,
          singletonKey: `tracker-${tracker.id}-${user.id}-${dateKey}`,
        }
      );
    }
  }
}

// ── Helpers ──────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function weekKey(): string {
  const d = new Date();
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + yearStart.getDay() + 1) / 7
  );
  return `${d.getFullYear()}-W${weekNum}`;
}

function getNextTimeInTimezone(
  hours: number,
  minutes: number,
  timezone: string
): Date {
  // Create a date for today at the given time in the specified timezone
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const tzYear = parseInt(parts.find((p) => p.type === "year")!.value);
  const tzMonth = parseInt(parts.find((p) => p.type === "month")!.value) - 1;
  const tzDay = parseInt(parts.find((p) => p.type === "day")!.value);

  // Build target time string in the timezone
  const targetStr = `${tzYear}-${String(tzMonth + 1).padStart(2, "0")}-${String(tzDay).padStart(2, "0")}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

  // Use a simple offset calculation
  const targetInTz = new Date(targetStr);
  const nowInTz = new Date(
    now.toLocaleString("en-US", { timeZone: timezone })
  );
  const offset = now.getTime() - nowInTz.getTime();

  const result = new Date(targetInTz.getTime() + offset);

  // If the time has already passed today, it'll be sent immediately by pg-boss
  return result;
}
