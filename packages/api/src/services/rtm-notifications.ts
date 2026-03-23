import { logger } from "../lib/logger";
import { prisma } from "@steady/db";
import { getQueue } from "./queue";
import { queueNotification } from "./notifications";
import {
  rolloverBillingPeriods,
  recalculateAllActivePeriods,
} from "./rtm";

// ── CPT Reimbursement Rates (mirrored from rtm.ts) ───
const CPT_RATES: Record<string, number> = {
  "98975": 19.65,
  "98978": 55,
  "98986": 50,
  "98979": 26,
  "98980": 54,
  "98981": 41,
};

// ── Helpers ──────────────────────────────────────────

function todayKey(): string {
  return new Date().toISOString().split("T")[0];
}

function todayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function yesterdayStart(): Date {
  const d = todayStart();
  d.setDate(d.getDate() - 1);
  return d;
}

/**
 * Count how many push notifications were sent to this user today
 * by checking pgboss jobs with a singleton key prefix.
 */
async function getClientNotificationCountToday(userId: string): Promise<number> {
  try {
    const today = todayStart();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM pgboss.job
       WHERE name = 'send-notification'
       AND data->>'userId' = $1
       AND data->>'category' = 'RTM_CLIENT'
       AND created_on >= $2
       AND created_on < $3
       AND state NOT IN ('cancelled', 'failed')`,
      userId,
      today,
      tomorrow
    );
    return Number(result[0]?.count ?? 0);
  } catch {
    return 0;
  }
}

/**
 * Check if a specific RTM nudge notification was already sent today.
 */
async function wasNudgeSentToday(userId: string, nudgeType: string): Promise<boolean> {
  try {
    const today = todayStart();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM pgboss.job
       WHERE name = 'send-notification'
       AND singleton_key LIKE $1
       AND created_on >= $2
       AND created_on < $3
       AND state NOT IN ('cancelled', 'failed')`,
      `rtm-${nudgeType}-${userId}-${todayKey()}%`,
      today,
      tomorrow
    );
    return Number(result[0]?.count ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * Queue a client-facing RTM notification, respecting the 2-per-day rate limit.
 */
async function queueClientNotification(
  userId: string,
  title: string,
  body: string,
  singletonKey: string,
  data?: Record<string, string>
): Promise<void> {
  const sentToday = await getClientNotificationCountToday(userId);
  if (sentToday >= 2) return;

  await queueNotification(userId, title, body, "RTM_CLIENT", data, { singletonKey });
}

/**
 * Get all active RTM enrollments with consent signed, including client info.
 */
async function getActiveRtmEnrollments() {
  return prisma.rtmEnrollment.findMany({
    where: {
      status: "ACTIVE",
      consentSignedAt: { not: null },
    },
    include: {
      client: {
        select: { id: true, firstName: true, pushToken: true },
      },
      clinician: {
        select: {
          id: true,
          user: { select: { id: true, pushToken: true } },
        },
      },
      billingPeriods: {
        where: { status: { in: ["ACTIVE", "THRESHOLD_MET"] } },
        orderBy: { periodStart: "desc" },
        take: 1,
      },
    },
  });
}

/**
 * Count consecutive engagement days ending on a given date (inclusive).
 */
async function getConsecutiveEngagementDays(
  userId: string,
  endDate: Date,
  maxLookback: number = 30
): Promise<number> {
  const startLookback = new Date(endDate);
  startLookback.setDate(startLookback.getDate() - maxLookback);

  const events = await prisma.rtmEngagementEvent.findMany({
    where: {
      userId,
      eventDate: {
        gte: startLookback,
        lte: endDate,
      },
    },
    select: { eventDate: true },
    orderBy: { eventDate: "desc" },
  });

  const uniqueDates = [
    ...new Set(events.map((e) => e.eventDate.toISOString().split("T")[0])),
  ].sort().reverse();

  if (uniqueDates.length === 0) return 0;

  // Check the most recent date matches endDate
  const endDateStr = endDate.toISOString().split("T")[0];
  if (uniqueDates[0] !== endDateStr) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]);
    const currDate = new Date(uniqueDates[i]);
    const diffMs = prevDate.getTime() - currDate.getTime();
    const diffDays = Math.round(diffMs / 86400000);

    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Count consecutive missed days (no engagement events) ending yesterday.
 */
async function getConsecutiveMissedDays(
  userId: string,
  maxLookback: number = 10
): Promise<number> {
  const yesterday = yesterdayStart();

  const events = await prisma.rtmEngagementEvent.findMany({
    where: {
      userId,
      eventDate: {
        gte: (() => {
          const d = new Date(yesterday);
          d.setDate(d.getDate() - maxLookback);
          return d;
        })(),
        lte: yesterday,
      },
    },
    select: { eventDate: true },
  });

  const eventDates = new Set(
    events.map((e) => e.eventDate.toISOString().split("T")[0])
  );

  let missed = 0;
  for (let i = 0; i < maxLookback; i++) {
    const checkDate = new Date(yesterday);
    checkDate.setDate(checkDate.getDate() - i);
    const key = checkDate.toISOString().split("T")[0];

    if (!eventDates.has(key)) {
      missed++;
    } else {
      break;
    }
  }

  return missed;
}

// ── 1. Daily Engagement Check (8PM UTC) ──────────────

async function rtmDailyEngagementCheck(): Promise<void> {
  const enrollments = await getActiveRtmEnrollments();
  const today = todayStart();

  for (const enrollment of enrollments) {
    try {
      const clientId = enrollment.client.id;
      if (!enrollment.client.pushToken) continue;

      // Check if client has any engagement event today
      const todayEvents = await prisma.rtmEngagementEvent.findFirst({
        where: {
          userId: clientId,
          eventDate: today,
        },
      });

      if (!todayEvents) {
        await queueClientNotification(
          clientId,
          "Time for your daily check-in",
          "A quick check-in helps track your progress",
          `rtm-engagement-${clientId}-${todayKey()}`
        );
      }
    } catch (err) {
      logger.error("RTM daily engagement check failed for enrollment", err);
    }
  }
}

// ── 2. Streak Notifications (9AM UTC) ────────────────

async function rtmStreakNotifications(): Promise<void> {
  const enrollments = await getActiveRtmEnrollments();
  const yesterday = yesterdayStart();

  const STREAK_MESSAGES: Record<number, string> = {
    7: "7-day streak! Your consistency is building real progress.",
    14: "Two weeks strong! Your therapist can see the difference.",
    21: "21 days of check-ins \u2014 that's real commitment to your growth.",
  };

  for (const enrollment of enrollments) {
    try {
      const clientId = enrollment.client.id;
      if (!enrollment.client.pushToken) continue;

      const streak = await getConsecutiveEngagementDays(clientId, yesterday);

      const message = STREAK_MESSAGES[streak];
      if (message) {
        await queueClientNotification(
          clientId,
          `${streak}-day streak!`,
          message,
          `rtm-streak-${clientId}-${streak}-${todayKey()}`
        );
      }
    } catch (err) {
      logger.error("RTM streak notification failed for enrollment", err);
    }
  }
}

// ── 3. Missed Day Nudge (6PM UTC) ────────────────────

async function rtmMissedDayNudge(): Promise<void> {
  const enrollments = await getActiveRtmEnrollments();

  const NUDGE_MESSAGES: Record<number, string> = {
    2: "Your therapist is tracking your progress \u2014 a quick check-in helps them support you better.",
    3: "It only takes 60 seconds. Your check-in is ready.",
  };

  for (const enrollment of enrollments) {
    try {
      const clientId = enrollment.client.id;
      if (!enrollment.client.pushToken) continue;

      // Don't send if already nudged today
      const alreadySent = await wasNudgeSentToday(clientId, "nudge");
      if (alreadySent) continue;

      const missedDays = await getConsecutiveMissedDays(clientId);

      let message: string | undefined;
      if (missedDays >= 3) {
        message = NUDGE_MESSAGES[3];
      } else if (missedDays === 2) {
        message = NUDGE_MESSAGES[2];
      }

      if (message) {
        await queueClientNotification(
          clientId,
          "Check-in reminder",
          message,
          `rtm-nudge-${clientId}-${todayKey()}`
        );
      }
    } catch (err) {
      logger.error("RTM missed day nudge failed for enrollment", err);
    }
  }
}

// ── 4. Clinician Threshold Alerts (8AM UTC) ──────────

async function rtmClinicianThresholdAlerts(): Promise<void> {
  const activePeriods = await prisma.rtmBillingPeriod.findMany({
    where: {
      status: { in: ["ACTIVE", "THRESHOLD_MET"] },
    },
    include: {
      client: {
        select: { id: true, firstName: true },
      },
      clinician: {
        select: {
          id: true,
          user: { select: { id: true, pushToken: true } },
        },
      },
    },
  });

  const today = todayStart();

  for (const period of activePeriods) {
    try {
      const clinicianUserId = period.clinician.user.id;
      if (!period.clinician.user.pushToken) continue;

      const daysRemaining = Math.max(
        0,
        Math.ceil(
          (period.periodEnd.getTime() - today.getTime()) / 86400000
        )
      );
      const clientName = period.client.firstName;
      const engDays = period.engagementDays;

      if (engDays === 16) {
        await queueNotification(
          clinicianUserId,
          "\ud83c\udfaf RTM threshold met",
          `${clientName} hit 16 days \u2014 RTM is billable! Log your monitoring time.`,
          "RTM_CLINICIAN",
          { type: "rtm_threshold_met", billingPeriodId: period.id },
          { singletonKey: `rtm-threshold-${period.id}-16` }
        );
      } else if (engDays >= 12 && engDays <= 15 && daysRemaining >= 7) {
        const needed = 16 - engDays;
        await queueNotification(
          clinicianUserId,
          "RTM threshold approaching",
          `${clientName} is close to RTM threshold \u2014 ${needed} more days needed.`,
          "RTM_CLINICIAN",
          { type: "rtm_approaching", billingPeriodId: period.id },
          { singletonKey: `rtm-approaching-${period.id}-${todayKey()}` }
        );
      } else if (engDays < 10 && daysRemaining < 10) {
        await queueNotification(
          clinicianUserId,
          "\u26a0\ufe0f RTM at risk",
          `${clientName} may miss RTM threshold this month. ${engDays} engagement days with ${daysRemaining} days remaining.`,
          "RTM_CLINICIAN",
          { type: "rtm_at_risk", billingPeriodId: period.id },
          { singletonKey: `rtm-atrisk-${period.id}-${todayKey()}` }
        );
      }
    } catch (err) {
      logger.error("RTM clinician threshold alert failed for period", err);
    }
  }
}

// ── 5. Time Logging Reminder (9AM UTC) ───────────────

async function rtmTimeLoggingReminder(): Promise<void> {
  const today = todayStart();
  const fiveDaysFromNow = new Date(today);
  fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

  // Find periods ending within 5 days where clinicianMinutes < 20
  const periodsNeedingTime = await prisma.rtmBillingPeriod.findMany({
    where: {
      status: { in: ["ACTIVE", "THRESHOLD_MET"] },
      periodEnd: {
        gte: today,
        lte: fiveDaysFromNow,
      },
      clinicianMinutes: { lt: 20 },
    },
    include: {
      clinician: {
        select: {
          id: true,
          user: { select: { id: true, pushToken: true } },
        },
      },
    },
  });

  // Group by clinician
  const clinicianPeriods = new Map<
    string,
    { clinicianUserId: string; count: number }
  >();

  for (const period of periodsNeedingTime) {
    const clinicianUserId = period.clinician.user.id;
    if (!period.clinician.user.pushToken) continue;

    const existing = clinicianPeriods.get(period.clinicianId);
    if (existing) {
      existing.count++;
    } else {
      clinicianPeriods.set(period.clinicianId, {
        clinicianUserId,
        count: 1,
      });
    }
  }

  for (const [clinicianId, data] of clinicianPeriods) {
    try {
      await queueNotification(
        data.clinicianUserId,
        "RTM time logging needed",
        `RTM billing periods closing soon \u2014 ${data.count} client${data.count === 1 ? "" : "s"} need${data.count === 1 ? "s" : ""} monitoring time logged.`,
        "RTM_CLINICIAN",
        { type: "rtm_time_reminder" },
        { singletonKey: `rtm-timereminder-${clinicianId}-${todayKey()}` }
      );
    } catch (err) {
      logger.error("RTM time logging reminder failed for clinician", err);
    }
  }
}

// ── 6. Interactive Communication Reminder (Weekly Monday 9AM UTC) ──

async function rtmInteractiveReminder(): Promise<void> {
  const today = todayStart();
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  // Find periods with logged time but no interactive communication, ending within 7 days
  const periodsNeedingInteraction = await prisma.rtmBillingPeriod.findMany({
    where: {
      status: { in: ["ACTIVE", "THRESHOLD_MET"] },
      clinicianMinutes: { gt: 0 },
      hasInteractiveCommunication: false,
      periodEnd: {
        gte: today,
        lte: sevenDaysFromNow,
      },
    },
    include: {
      clinician: {
        select: {
          id: true,
          user: { select: { id: true, pushToken: true } },
        },
      },
    },
  });

  // Group by clinician
  const clinicianCounts = new Map<
    string,
    { clinicianUserId: string; count: number }
  >();

  for (const period of periodsNeedingInteraction) {
    const clinicianUserId = period.clinician.user.id;
    if (!period.clinician.user.pushToken) continue;

    const existing = clinicianCounts.get(period.clinicianId);
    if (existing) {
      existing.count++;
    } else {
      clinicianCounts.set(period.clinicianId, {
        clinicianUserId,
        count: 1,
      });
    }
  }

  for (const [clinicianId, data] of clinicianCounts) {
    try {
      await queueNotification(
        data.clinicianUserId,
        "RTM interactive communication needed",
        `Reminder: RTM requires at least one live interaction per billing period. ${data.count} client${data.count === 1 ? "" : "s"} need${data.count === 1 ? "s" : ""} this.`,
        "RTM_CLINICIAN",
        { type: "rtm_interactive_reminder" },
        { singletonKey: `rtm-interactive-${clinicianId}-${todayKey()}` }
      );
    } catch (err) {
      logger.error("RTM interactive reminder failed for clinician", err);
    }
  }
}

// ── 7. Period Rollover (1AM UTC) ─────────────────────

async function rtmPeriodRollover(): Promise<void> {
  await rolloverBillingPeriods();
  await recalculateAllActivePeriods();
}

// ── 8. Monthly Summary (1st of month, 10AM UTC) ─────

async function rtmMonthlySummary(): Promise<void> {
  // Determine last month's date range
  const now = new Date();
  const lastMonthEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)
  );
  const lastMonthStart = new Date(
    Date.UTC(lastMonthEnd.getUTCFullYear(), lastMonthEnd.getUTCMonth(), 1)
  );

  const monthName = lastMonthStart.toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  // Find all billing periods that ended last month with THRESHOLD_MET or BILLED status
  const completedPeriods = await prisma.rtmBillingPeriod.findMany({
    where: {
      periodEnd: {
        gte: lastMonthStart,
        lte: lastMonthEnd,
      },
      status: { in: ["THRESHOLD_MET", "BILLED"] },
    },
    include: {
      clinician: {
        select: {
          id: true,
          user: { select: { id: true, pushToken: true } },
        },
      },
    },
  });

  // Group by clinician
  const clinicianSummaries = new Map<
    string,
    {
      clinicianUserId: string;
      billableClients: number;
      estimatedRevenue: number;
    }
  >();

  for (const period of completedPeriods) {
    const clinicianUserId = period.clinician.user.id;
    if (!period.clinician.user.pushToken) continue;

    const existing = clinicianSummaries.get(period.clinicianId);
    const codes = (period.eligibleCodes as string[]) || [];
    const revenue = codes.reduce(
      (sum, code) => sum + (CPT_RATES[code] || 0),
      0
    );

    if (existing) {
      existing.billableClients++;
      existing.estimatedRevenue += revenue;
    } else {
      clinicianSummaries.set(period.clinicianId, {
        clinicianUserId,
        billableClients: 1,
        estimatedRevenue: revenue,
      });
    }
  }

  for (const [clinicianId, data] of clinicianSummaries) {
    try {
      const revenueStr = Math.round(data.estimatedRevenue * 100) / 100;
      await queueNotification(
        data.clinicianUserId,
        `RTM Summary for ${monthName}`,
        `${data.billableClients} client${data.billableClients === 1 ? "" : "s"} billable, estimated revenue $${revenueStr}. Generate your superbills now.`,
        "RTM_CLINICIAN",
        { type: "rtm_monthly_summary" },
        { singletonKey: `rtm-summary-${clinicianId}-${monthName}` }
      );
    } catch (err) {
      logger.error("RTM monthly summary failed for clinician", err);
    }
  }
}

// ── Worker Registration ──────────────────────────────

export async function registerRtmWorkers(): Promise<void> {
  const boss = await getQueue();

  // Create queues (pg-boss v10 requirement)
  await boss.createQueue("rtm-daily-engagement-check");
  await boss.createQueue("rtm-streak-notifications");
  await boss.createQueue("rtm-missed-day-nudge");
  await boss.createQueue("rtm-clinician-threshold-alerts");
  await boss.createQueue("rtm-time-logging-reminder");
  await boss.createQueue("rtm-interactive-reminder");
  await boss.createQueue("rtm-period-rollover");
  await boss.createQueue("rtm-monthly-summary");

  // Register workers
  await boss.work("rtm-daily-engagement-check", async () => {
    await rtmDailyEngagementCheck();
  });

  await boss.work("rtm-streak-notifications", async () => {
    await rtmStreakNotifications();
  });

  await boss.work("rtm-missed-day-nudge", async () => {
    await rtmMissedDayNudge();
  });

  await boss.work("rtm-clinician-threshold-alerts", async () => {
    await rtmClinicianThresholdAlerts();
  });

  await boss.work("rtm-time-logging-reminder", async () => {
    await rtmTimeLoggingReminder();
  });

  await boss.work("rtm-interactive-reminder", async () => {
    await rtmInteractiveReminder();
  });

  await boss.work("rtm-period-rollover", async () => {
    await rtmPeriodRollover();
  });

  await boss.work("rtm-monthly-summary", async () => {
    await rtmMonthlySummary();
  });

  // Schedule recurring cron jobs
  await boss.schedule("rtm-daily-engagement-check", "0 20 * * *");        // 8PM UTC daily
  await boss.schedule("rtm-streak-notifications", "0 9 * * *");           // 9AM UTC daily
  await boss.schedule("rtm-missed-day-nudge", "0 18 * * *");              // 6PM UTC daily
  await boss.schedule("rtm-clinician-threshold-alerts", "0 8 * * *");     // 8AM UTC daily
  await boss.schedule("rtm-time-logging-reminder", "0 9 * * *");          // 9AM UTC daily
  await boss.schedule("rtm-interactive-reminder", "0 9 * * 1");           // Monday 9AM UTC
  await boss.schedule("rtm-period-rollover", "0 1 * * *");                // 1AM UTC daily
  await boss.schedule("rtm-monthly-summary", "0 10 1 * *");               // 1st of month 10AM UTC

  logger.info("RTM notification workers registered");
}
