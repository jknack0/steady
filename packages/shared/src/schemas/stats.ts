import { z } from "zod";

// ── Request Schemas ─────────────────────────────────────

export const DateRangeSchema = z.object({
  start: z.string().datetime().optional(),
  end: z.string().datetime().optional(),
});

export type DateRangeInput = z.infer<typeof DateRangeSchema>;

// ── Response Schemas ────────────────────────────────────

export const TaskCompletionRateSchema = z.object({
  total: z.number(),
  completed: z.number(),
  rate: z.number().min(0).max(1),
  weeklyBreakdown: z.array(
    z.object({
      weekStart: z.string(),
      total: z.number(),
      completed: z.number(),
      rate: z.number(),
    })
  ),
});

export type TaskCompletionRate = z.infer<typeof TaskCompletionRateSchema>;

export const TimeEstimationAccuracySchema = z.object({
  totalEstimated: z.number(),
  totalActual: z.number(),
  averageAccuracy: z.number(),
  sampleSize: z.number(),
});

export type TimeEstimationAccuracy = z.infer<typeof TimeEstimationAccuracySchema>;

export const JournalingConsistencySchema = z.object({
  totalDays: z.number(),
  journaledDays: z.number(),
  rate: z.number().min(0).max(1),
  streak: z.number(),
  calendar: z.array(
    z.object({
      date: z.string(),
      hasEntry: z.boolean(),
      regulationScore: z.number().nullable(),
    })
  ),
});

export type JournalingConsistency = z.infer<typeof JournalingConsistencySchema>;

export const HomeworkCompletionRateSchema = z.object({
  modules: z.array(
    z.object({
      moduleId: z.string(),
      moduleTitle: z.string(),
      totalParts: z.number(),
      completedParts: z.number(),
      rate: z.number(),
    })
  ),
  overall: z.object({
    totalParts: z.number(),
    completedParts: z.number(),
    rate: z.number(),
  }),
});

export type HomeworkCompletionRate = z.infer<typeof HomeworkCompletionRateSchema>;

export const RegulationTrendSchema = z.object({
  points: z.array(
    z.object({
      date: z.string(),
      score: z.number(),
    })
  ),
  average: z.number().nullable(),
});

export type RegulationTrend = z.infer<typeof RegulationTrendSchema>;

export const SystemCheckinAdherenceSchema = z.object({
  totalExpected: z.number(),
  totalCompleted: z.number(),
  rate: z.number().min(0).max(1),
});

export type SystemCheckinAdherence = z.infer<typeof SystemCheckinAdherenceSchema>;

// ── Combined Participant Stats Response ─────────────────

export const ParticipantStatsSchema = z.object({
  taskCompletion: TaskCompletionRateSchema,
  timeEstimation: TimeEstimationAccuracySchema,
  journaling: JournalingConsistencySchema,
  homeworkCompletion: HomeworkCompletionRateSchema,
  regulationTrend: RegulationTrendSchema,
  systemCheckin: SystemCheckinAdherenceSchema,
});

export type ParticipantStats = z.infer<typeof ParticipantStatsSchema>;
