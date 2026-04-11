import { prisma } from "@steady/db";
import type { HomeworkContent } from "@steady/shared";

// ── Helpers ─────────────────────────────────────────

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function eachDayBetween(from: Date, to: Date): Date[] {
  const dates: Date[] = [];
  let current = startOfDay(from);
  const end = startOfDay(to);
  while (current <= end) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }
  return dates;
}

/**
 * Returns whether the given date falls on a recurrence day for the homework.
 */
function isDueOnDate(content: HomeworkContent, date: Date): boolean {
  if (content.recurrence === "NONE") return false;
  if (content.recurrence === "DAILY") return true;

  const dayOfWeek = date.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat

  if (content.recurrence === "WEEKLY") {
    // recurrenceDays should have exactly one day for WEEKLY
    return content.recurrenceDays.length > 0
      ? content.recurrenceDays.includes(dayOfWeek)
      : dayOfWeek === 1; // default to Monday if not set
  }

  if (content.recurrence === "CUSTOM") {
    return content.recurrenceDays.includes(dayOfWeek);
  }

  return false;
}

// ── Core Generation ─────────────────────────────────

/**
 * Generate homework instances for a specific part+enrollment between two dates.
 * Uses createMany with skipDuplicates to avoid conflicts.
 */
export async function generateInstances(
  partId: string,
  enrollmentId: string,
  content: HomeworkContent,
  fromDate: Date,
  toDate: Date
): Promise<number> {
  // Respect recurrenceEndDate
  let effectiveEnd = toDate;
  if (content.recurrenceEndDate) {
    const endDate = new Date(content.recurrenceEndDate);
    if (endDate < effectiveEnd) {
      effectiveEnd = endDate;
    }
  }

  const days = eachDayBetween(fromDate, effectiveEnd);
  const dueDates = days.filter((d) => isDueOnDate(content, d));

  if (dueDates.length === 0) return 0;

  const result = await prisma.homeworkInstance.createMany({
    data: dueDates.map((dueDate) => ({
      partId,
      enrollmentId,
      dueDate,
    })),
    skipDuplicates: true,
  });

  return result.count;
}

/**
 * Generate instances for all recurring homework parts in a given enrollment.
 * Called on enrollment acceptance and by the daily cron.
 */
export async function generateInstancesForEnrollment(
  enrollmentId: string
): Promise<void> {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
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

  if (!enrollment || enrollment.status !== "ACTIVE") return;

  const today = startOfDay(new Date());
  const horizon = addDays(today, 7);

  for (const mod of enrollment.program.modules) {
    for (const part of mod.parts) {
      const content = part.content as unknown as HomeworkContent;
      if (!content?.recurrence || content.recurrence === "NONE") continue;

      await generateInstances(part.id, enrollmentId, content, today, horizon);
    }
  }
}

/**
 * Daily cron job: generate instances 7 days ahead for all active enrollments.
 */
export async function generateAllPendingInstances(): Promise<void> {
  const enrollments = await prisma.enrollment.findMany({
    where: { status: "ACTIVE" },
    select: { id: true },
  });

  for (const enrollment of enrollments) {
    await generateInstancesForEnrollment(enrollment.id);
  }
}

/**
 * Daily cron job: mark PENDING instances older than 48h as MISSED.
 */
export async function markMissedInstances(): Promise<void> {
  const cutoff = addDays(new Date(), -2);
  cutoff.setUTCHours(0, 0, 0, 0);

  await prisma.homeworkInstance.updateMany({
    where: {
      status: "PENDING",
      dueDate: { lt: cutoff },
    },
    data: { status: "MISSED" },
  });
}

/**
 * Cancel future PENDING instances for a part+enrollment (or all enrollments).
 * Called when clinician stops recurrence.
 */
export async function cancelFutureInstances(
  partId: string,
  enrollmentId?: string
): Promise<void> {
  const today = startOfDay(new Date());

  await prisma.homeworkInstance.updateMany({
    where: {
      partId,
      ...(enrollmentId ? { enrollmentId } : {}),
      status: "PENDING",
      dueDate: { gte: today },
      deletedAt: null,
    },
    data: { deletedAt: new Date() },
  });
}

/**
 * Regenerate future instances for a part across all active enrollments.
 * Called when homework recurrence settings change.
 */
export async function regenerateInstancesForPart(
  partId: string,
  content: HomeworkContent
): Promise<void> {
  // Delete future pending instances
  await cancelFutureInstances(partId);

  if (content.recurrence === "NONE") return;

  // Find all active enrollments for this part's program
  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: {
      module: {
        include: {
          program: {
            include: {
              enrollments: {
                where: { status: "ACTIVE" },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });

  if (!part) return;

  const today = startOfDay(new Date());
  const horizon = addDays(today, 7);

  for (const enrollment of part.module.program.enrollments) {
    await generateInstances(partId, enrollment.id, content, today, horizon);
  }
}

// ── Streak Calculation ───────────────────────────────

interface StreakResult {
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalInstances: number;
  completionRate: number;
}

/**
 * Calculate streak and compliance data for a part+enrollment.
 */
export async function getStreakData(
  partId: string,
  enrollmentId: string
): Promise<StreakResult> {
  const instances = await prisma.homeworkInstance.findMany({
    where: { partId, enrollmentId, deletedAt: null },
    orderBy: { dueDate: "desc" },
  });

  const pastInstances = instances.filter(
    (i) => i.dueDate <= startOfDay(new Date())
  );

  const totalInstances = pastInstances.length;
  const totalCompleted = pastInstances.filter(
    (i) => i.status === "COMPLETED"
  ).length;

  // Calculate current streak (consecutive completed from most recent)
  let currentStreak = 0;
  for (const instance of pastInstances) {
    if (instance.status === "COMPLETED") {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let runningStreak = 0;
  // Iterate oldest-first for longest streak calc
  for (const instance of [...pastInstances].reverse()) {
    if (instance.status === "COMPLETED") {
      runningStreak++;
      if (runningStreak > longestStreak) longestStreak = runningStreak;
    } else {
      runningStreak = 0;
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalCompleted,
    totalInstances,
    completionRate: totalInstances > 0 ? totalCompleted / totalInstances : 0,
  };
}
