import { prisma } from "@steady/db";
import { logger } from "../lib/logger";

type StreakCategory = "JOURNAL" | "CHECKIN" | "HOMEWORK";

interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  gapDaysUsed: number;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toDateStr(d);
}

/**
 * Core streak calculation. Walks backward from today through sorted active dates.
 * Gap-day forgiveness: 1 missed day per rolling 7-day window within the streak.
 * A gap day is only forgiven if the day BEFORE the gap is also active (i.e., activity
 * exists on both sides of the gap).
 */
export function calculateStreak(
  activeDates: string[],
  today: string,
  existingLongest: number = 0
): StreakResult {
  if (activeDates.length === 0) {
    return { currentStreak: 0, longestStreak: existingLongest, lastActiveDate: null, gapDaysUsed: 0 };
  }

  const dateSet = new Set(activeDates);
  const sortedDesc = [...activeDates].sort().reverse();
  const lastActiveDate = sortedDesc[0];

  let streak = 0;
  let gapDaysUsed = 0;
  let windowGapsUsed = 0;
  let activeDaysInWindow = 0;

  let currentDay = today;

  while (true) {
    if (dateSet.has(currentDay)) {
      streak++;
      activeDaysInWindow++;
    } else {
      // Can only use a gap day if:
      // 1. We already have active days in the streak (streak > 0)
      // 2. We haven't used a gap in this 7-day window yet
      // 3. The day BEFORE this gap has activity (peek ahead)
      const prevDay = addDays(currentDay, -1);
      if (windowGapsUsed < 1 && streak > 0 && dateSet.has(prevDay)) {
        windowGapsUsed++;
        gapDaysUsed++;
        streak++;
        activeDaysInWindow++;
      } else {
        break;
      }
    }

    // Reset window gap allowance every 7 days of streak
    if (activeDaysInWindow >= 7) {
      activeDaysInWindow = 0;
      windowGapsUsed = 0;
    }

    currentDay = addDays(currentDay, -1);

    // Safety: don't look back more than 365 days
    if (streak > 365) break;
  }

  const longestStreak = Math.max(existingLongest, streak);

  return { currentStreak: streak, longestStreak, lastActiveDate, gapDaysUsed };
}

export async function getStreaks(userId: string) {
  const streaks = await prisma.streakRecord.findMany({
    where: { userId },
    select: {
      category: true,
      currentStreak: true,
      longestStreak: true,
      lastActiveDate: true,
    },
  });

  return streaks.map((s) => ({
    ...s,
    lastActiveDate: s.lastActiveDate ? toDateStr(s.lastActiveDate) : null,
  }));
}

async function getActivityDates(
  userId: string,
  category: StreakCategory,
  lookbackDays: number = 60
): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - lookbackDays);

  if (category === "JOURNAL") {
    // Need to find participantProfileId for this user
    const profile = await prisma.participantProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return [];

    const entries = await prisma.journalEntry.findMany({
      where: {
        participantId: profile.id,
        entryDate: { gte: cutoff },
      },
      select: { entryDate: true },
    });
    return entries.map((e) => toDateStr(e.entryDate));
  }

  if (category === "CHECKIN") {
    const entries = await prisma.dailyTrackerEntry.findMany({
      where: {
        userId,
        date: { gte: cutoff },
      },
      select: { date: true },
    });
    return [...new Set(entries.map((e) => toDateStr(e.date)))];
  }

  if (category === "HOMEWORK") {
    const profile = await prisma.participantProfile.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!profile) return [];

    const instances = await prisma.homeworkInstance.findMany({
      where: {
        participantId: profile.id,
        status: "COMPLETED",
        completedAt: { gte: cutoff },
      },
      select: { completedAt: true },
    });
    return [...new Set(
      instances
        .filter((i) => i.completedAt != null)
        .map((i) => toDateStr(i.completedAt!))
    )];
  }

  return [];
}

export async function calculateAllStreaks(): Promise<void> {
  const today = toDateStr(new Date());
  const categories: StreakCategory[] = ["JOURNAL", "CHECKIN", "HOMEWORK"];

  // Get all active participants (those with at least one active enrollment)
  const participants = await prisma.user.findMany({
    where: {
      role: "PARTICIPANT",
      participantProfile: {
        enrollments: { some: { status: "ACTIVE" } },
      },
    },
    select: { id: true },
    take: 10000,
  });

  // Process in batches of 100
  const BATCH_SIZE = 100;
  for (let i = 0; i < participants.length; i += BATCH_SIZE) {
    const batch = participants.slice(i, i + BATCH_SIZE);

    for (const user of batch) {
      for (const category of categories) {
        try {
          const activeDates = await getActivityDates(user.id, category);
          const existing = await prisma.streakRecord.findUnique({
            where: { userId_category: { userId: user.id, category } },
          });

          const result = calculateStreak(
            activeDates,
            today,
            existing?.longestStreak ?? 0
          );

          await prisma.streakRecord.upsert({
            where: { userId_category: { userId: user.id, category } },
            create: {
              userId: user.id,
              category,
              currentStreak: result.currentStreak,
              longestStreak: result.longestStreak,
              lastActiveDate: result.lastActiveDate ? new Date(result.lastActiveDate + "T00:00:00Z") : null,
              gapDaysUsed: result.gapDaysUsed,
            },
            update: {
              currentStreak: result.currentStreak,
              longestStreak: result.longestStreak,
              lastActiveDate: result.lastActiveDate ? new Date(result.lastActiveDate + "T00:00:00Z") : null,
              gapDaysUsed: result.gapDaysUsed,
            },
          });
        } catch (err) {
          logger.error("Streak calculation failed for user", err);
        }
      }
    }
  }

  logger.info("Streak calculation complete");
}
