import { prisma } from "@steady/db";
import type {
  TaskCompletionRate,
  TimeEstimationAccuracy,
  JournalingConsistency,
  HomeworkCompletionRate,
  RegulationTrend,
  SystemCheckinAdherence,
  ParticipantStats,
  StreakResponse,
} from "@steady/shared";
import { MS_PER_DAY } from "../lib/constants";
import { toDateKey } from "../lib/date-utils";

interface DateRange {
  start: Date;
  end: Date;
}

function defaultDateRange(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 28); // 4 weeks
  return { start, end };
}

function parseDateRange(startStr?: string, endStr?: string): DateRange {
  const defaults = defaultDateRange();
  return {
    start: startStr ? new Date(startStr) : defaults.start,
    end: endStr ? new Date(endStr) : defaults.end,
  };
}

function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return toDateKey(d);
}

export async function getTaskCompletionRate(
  participantId: string,
  range: DateRange
): Promise<TaskCompletionRate> {
  const tasks = await prisma.task.findMany({
    where: {
      participantId,
      createdAt: { gte: range.start, lte: range.end },
      status: { not: "ARCHIVED" },
    },
    orderBy: { createdAt: "asc" },
  });

  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "DONE").length;
  const rate = total > 0 ? completed / total : 0;

  // Weekly breakdown
  const weekMap = new Map<string, { total: number; completed: number }>();
  for (const task of tasks) {
    const week = getWeekStart(task.createdAt);
    const entry = weekMap.get(week) || { total: 0, completed: 0 };
    entry.total++;
    if (task.status === "DONE") entry.completed++;
    weekMap.set(week, entry);
  }

  const weeklyBreakdown = Array.from(weekMap.entries()).map(([weekStart, data]) => ({
    weekStart,
    total: data.total,
    completed: data.completed,
    rate: data.total > 0 ? data.completed / data.total : 0,
  }));

  return { total, completed, rate, weeklyBreakdown };
}

export async function getTimeEstimationAccuracy(
  participantId: string,
  range: DateRange
): Promise<TimeEstimationAccuracy> {
  const tasks = await prisma.task.findMany({
    where: {
      participantId,
      status: "DONE",
      estimatedMinutes: { not: null },
      completedAt: { not: null },
      createdAt: { gte: range.start, lte: range.end },
    },
  });

  // Filter defensively in case the DB mock doesn't apply WHERE clauses
  const validTasks = tasks.filter(
    (t) => t.estimatedMinutes != null && t.completedAt != null
  );

  if (validTasks.length === 0) {
    return { totalEstimated: 0, totalActual: 0, averageAccuracy: 0, sampleSize: 0 };
  }

  let totalEstimated = 0;
  let totalActual = 0;

  for (const task of validTasks) {
    const estimated = task.estimatedMinutes!;
    totalEstimated += estimated;

    // Actual time = time from creation to completion
    const actual = Math.round(
      (task.completedAt!.getTime() - task.createdAt.getTime()) / 60000
    );
    totalActual += actual;
  }

  // Accuracy: ratio of estimated to actual (1.0 = perfect)
  const averageAccuracy = totalActual > 0 ? totalEstimated / totalActual : 0;

  return {
    totalEstimated,
    totalActual,
    averageAccuracy: Math.round(averageAccuracy * 100) / 100,
    sampleSize: validTasks.length,
  };
}

export async function getJournalingConsistency(
  participantId: string,
  range: DateRange
): Promise<JournalingConsistency> {
  const entries = await prisma.journalEntry.findMany({
    where: {
      participantId,
      entryDate: { gte: range.start, lte: range.end },
    },
    orderBy: { entryDate: "asc" },
  });

  // Total possible days in range
  const msPerDay = MS_PER_DAY;
  const totalDays = Math.max(
    1,
    Math.ceil((range.end.getTime() - range.start.getTime()) / msPerDay)
  );
  const journaledDays = entries.length;
  const rate = journaledDays / totalDays;

  // Calculate streak (consecutive days from most recent going back)
  let streak = 0;
  if (entries.length > 0) {
    const entryDates = new Set(
      entries.map((e) => toDateKey(new Date(e.entryDate)))
    );
    const today = new Date();
    for (let d = new Date(today); d >= range.start; d.setDate(d.getDate() - 1)) {
      const dateStr = toDateKey(d);
      if (entryDates.has(dateStr)) {
        streak++;
      } else {
        break;
      }
    }
  }

  // Calendar heatmap data
  const calendar = entries.map((e) => ({
    date: toDateKey(new Date(e.entryDate)),
    hasEntry: true,
    regulationScore: e.regulationScore,
  }));

  return { totalDays, journaledDays, rate: Math.round(rate * 100) / 100, streak, calendar };
}

export async function getHomeworkCompletionRate(
  enrollments: any[]
): Promise<HomeworkCompletionRate> {
  const modules: HomeworkCompletionRate["modules"] = [];
  let overallTotal = 0;
  let overallCompleted = 0;

  for (const enrollment of enrollments) {
    const program = enrollment.program;
    if (!program?.modules) continue;

    for (const mod of program.modules) {
      const homeworkParts = mod.parts.filter((p: any) => p.type === "HOMEWORK");
      const totalParts = homeworkParts.length;
      if (totalParts === 0) continue;

      const completedPartIds = new Set(
        (enrollment.partProgress || [])
          .filter((pp: any) => pp.status === "COMPLETED")
          .map((pp: any) => pp.partId)
      );

      const completedParts = homeworkParts.filter((p: any) => completedPartIds.has(p.id)).length;
      const rate = totalParts > 0 ? completedParts / totalParts : 0;

      modules.push({
        moduleId: mod.id,
        moduleTitle: mod.title,
        totalParts,
        completedParts,
        rate: Math.round(rate * 100) / 100,
      });

      overallTotal += totalParts;
      overallCompleted += completedParts;
    }
  }

  return {
    modules,
    overall: {
      totalParts: overallTotal,
      completedParts: overallCompleted,
      rate: overallTotal > 0 ? Math.round((overallCompleted / overallTotal) * 100) / 100 : 0,
    },
  };
}

export async function getRegulationTrend(
  participantId: string,
  range: DateRange
): Promise<RegulationTrend> {
  const entries = await prisma.journalEntry.findMany({
    where: {
      participantId,
      regulationScore: { not: null },
      entryDate: { gte: range.start, lte: range.end },
    },
    orderBy: { entryDate: "asc" },
  });

  const points = entries.map((e) => ({
    date: toDateKey(new Date(e.entryDate)),
    score: e.regulationScore!,
  }));

  const average =
    points.length > 0
      ? Math.round((points.reduce((sum, p) => sum + p.score, 0) / points.length) * 10) / 10
      : null;

  return { points, average };
}

export async function getSystemCheckinAdherence(
  participantId: string,
  range: DateRange
): Promise<SystemCheckinAdherence> {
  // System checkin = calendar time blocks + tasks completed in the range
  const events = await prisma.calendarEvent.findMany({
    where: {
      participantId,
      eventType: "TIME_BLOCK",
      startTime: { gte: range.start, lte: range.end },
    },
  });

  const msPerDay = MS_PER_DAY;
  const totalDays = Math.max(
    1,
    Math.ceil((range.end.getTime() - range.start.getTime()) / msPerDay)
  );

  // Each day the participant used the system (created a time block) counts
  const uniqueDays = new Set(
    events.map((e) => toDateKey(new Date(e.startTime)))
  );

  const totalExpected = totalDays;
  const totalCompleted = uniqueDays.size;
  const rate = totalExpected > 0 ? Math.round((totalCompleted / totalExpected) * 100) / 100 : 0;

  return { totalExpected, totalCompleted, rate };
}

export async function getParticipantStats(
  participantId: string,
  startStr?: string,
  endStr?: string
): Promise<ParticipantStats> {
  const range = parseDateRange(startStr, endStr);

  // Fetch enrollments with full program/progress data for homework stats
  const enrollments = await prisma.enrollment.findMany({
    where: { participantId },
    include: {
      partProgress: {
        include: { part: { select: { type: true, moduleId: true } } },
      },
      program: {
        include: {
          modules: {
            include: {
              parts: { select: { id: true, type: true } },
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });

  const [taskCompletion, timeEstimation, journaling, regulationTrend, systemCheckin] =
    await Promise.all([
      getTaskCompletionRate(participantId, range),
      getTimeEstimationAccuracy(participantId, range),
      getJournalingConsistency(participantId, range),
      getRegulationTrend(participantId, range),
      getSystemCheckinAdherence(participantId, range),
    ]);

  const homeworkCompletion = await getHomeworkCompletionRate(enrollments);

  // Fetch streaks for this participant via their userId
  let streaks: StreakResponse[] = [];
  try {
    const profile = await prisma.participantProfile.findUnique({
      where: { id: participantId },
      select: { userId: true },
    });

    if (profile) {
      const records = await prisma.streakRecord.findMany({
        where: { userId: profile.userId },
        select: {
          category: true,
          currentStreak: true,
          longestStreak: true,
          lastActiveDate: true,
        },
      });
      streaks = (records || []).map((s) => ({
        category: s.category as StreakResponse["category"],
        currentStreak: s.currentStreak,
        longestStreak: s.longestStreak,
        lastActiveDate: s.lastActiveDate ? toDateKey(s.lastActiveDate) : null,
      }));
    }
  } catch {
    // Streaks are non-critical; don't fail the entire stats response
  }

  return {
    taskCompletion,
    timeEstimation,
    journaling,
    homeworkCompletion,
    regulationTrend,
    systemCheckin,
    streaks,
  };
}
