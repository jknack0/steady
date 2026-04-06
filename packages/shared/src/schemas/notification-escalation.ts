import { z } from "zod";

export const NotificationCategoryEnum = z.enum([
  "MORNING_CHECKIN",
  "HOMEWORK",
  "SESSION",
  "TASK",
  "WEEKLY_REVIEW",
]);
export type NotificationCategoryValue = z.infer<typeof NotificationCategoryEnum>;

export const DismissNotificationSchema = z.object({
  category: NotificationCategoryEnum,
});
export type DismissNotificationInput = z.infer<typeof DismissNotificationSchema>;

export const EngageNotificationSchema = z.object({
  category: NotificationCategoryEnum,
});
export type EngageNotificationInput = z.infer<typeof EngageNotificationSchema>;
