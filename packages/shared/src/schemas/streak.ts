import { z } from "zod";

export const StreakCategoryEnum = z.enum(["JOURNAL", "CHECKIN", "HOMEWORK"]);
export type StreakCategory = z.infer<typeof StreakCategoryEnum>;

export const StreakResponseSchema = z.object({
  category: StreakCategoryEnum,
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  lastActiveDate: z.string().nullable(),
});

export type StreakResponse = z.infer<typeof StreakResponseSchema>;

export const StreakListResponseSchema = z.array(StreakResponseSchema);
export type StreakListResponse = z.infer<typeof StreakListResponseSchema>;
