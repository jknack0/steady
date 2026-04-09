import { z } from "zod";

export const CreateCalendarEventSchema = z.object({
  title: z.string().min(1).max(200),
  startTime: z.string().max(100),
  endTime: z.string().max(100),
  eventType: z.string().max(50).optional(),
  color: z.string().max(20).optional().nullable(),
  taskId: z.string().max(200).optional().nullable(),
});
export type CreateCalendarEventInput = z.infer<typeof CreateCalendarEventSchema>;

export const UpdateCalendarEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  startTime: z.string().max(100).optional(),
  endTime: z.string().max(100).optional(),
  eventType: z.string().max(50).optional(),
  color: z.string().max(20).optional().nullable(),
  taskId: z.string().max(200).optional().nullable(),
});
export type UpdateCalendarEventInput = z.infer<typeof UpdateCalendarEventSchema>;
