import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "@steady/db";
import { getQueue } from "./queue";
import {
  getMorningCheckinCopy,
  getHomeworkCopy,
  getSessionReminderCopy,
  getTaskCopy,
  getWeeklyReviewCopy,
} from "./notification-copy";

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

  const message: ExpoPushMessage = {
    to: user.pushToken,
    sound: "default",
    title: job.title,
    body: job.body,
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

// ── Queue Registration ───────────────────────────────

export async function registerNotificationWorkers(): Promise<void> {
  const boss = await getQueue();

  await boss.work("send-notification", async (job) => {
    await sendPushNotification(job.data as SendNotificationJob);
  });

  await boss.work("schedule-morning-checkins", async () => {
    await scheduleDailyMorningCheckins();
  });

  await boss.work("schedule-weekly-reviews", async () => {
    await scheduleWeeklyReviews();
  });

  // Schedule recurring jobs
  await boss.schedule("schedule-morning-checkins", "0 5 * * *"); // 5am UTC daily
  await boss.schedule("schedule-weekly-reviews", "0 14 * * 0");  // 2pm UTC Sundays

  console.log("Notification workers registered");
}

// ── Public API ───────────────────────────────────────

export async function queueNotification(
  userId: string,
  title: string,
  body: string,
  category: string,
  data?: Record<string, string>,
  options?: { startAfter?: Date | string }
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
    retryLimit: 3,
    retryDelay: 60,
  });
}

// ── Scheduled Notification Helpers ───────────────────

export async function scheduleHomeworkReminder(
  userId: string,
  enrollmentId: string,
  partId: string
): Promise<void> {
  const copy = getHomeworkCopy();
  await queueNotification(userId, copy.title, copy.body, "HOMEWORK", {
    type: "homework",
    enrollmentId,
    partId,
  });
}

export async function scheduleSessionReminders(
  userId: string,
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
      }, { startAfter: sendAt });
    }
  }
}

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
    }, { startAfter: sendAt });
  }
}

// ── Batch Schedulers (run by cron) ───────────────────

async function scheduleDailyMorningCheckins(): Promise<void> {
  const participants = await prisma.user.findMany({
    where: {
      role: "PARTICIPANT",
      pushToken: { not: null },
    },
    select: { id: true },
  });

  for (const user of participants) {
    const copy = getMorningCheckinCopy();
    await queueNotification(user.id, copy.title, copy.body, "MORNING_CHECKIN", {
      type: "morning_checkin",
    });
  }
}

async function scheduleWeeklyReviews(): Promise<void> {
  const participants = await prisma.user.findMany({
    where: {
      role: "PARTICIPANT",
      pushToken: { not: null },
    },
    select: { id: true },
  });

  for (const user of participants) {
    const copy = getWeeklyReviewCopy();
    await queueNotification(user.id, copy.title, copy.body, "WEEKLY_REVIEW", {
      type: "weekly_review",
    });
  }
}
