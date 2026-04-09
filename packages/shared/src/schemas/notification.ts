import { z } from "zod";

export const PushTokenSchema = z.object({
  pushToken: z.string().min(1).max(500),
});
export type PushTokenInput = z.infer<typeof PushTokenSchema>;

export const UpdateNotificationPreferencesSchema = z.object({
  preferences: z.array(
    z.object({
      category: z.string().max(50),
      enabled: z.boolean(),
      preferredTime: z.string().max(20).optional().nullable(),
    })
  ).max(20),
});
export type UpdateNotificationPreferencesInput = z.infer<typeof UpdateNotificationPreferencesSchema>;
