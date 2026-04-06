import { z } from "zod";

export const ReviewQuestionSchema = z.object({
  id: z.string().max(50),
  text: z.string().min(1).max(500),
  enabled: z.boolean().default(true),
});

export const ReviewBarrierSchema = z.object({
  id: z.string().max(50),
  label: z.string().min(1).max(200),
  enabled: z.boolean().default(true),
});

export const UpsertReviewTemplateSchema = z.object({
  questions: z.array(ReviewQuestionSchema).min(1).max(10),
  barriers: z.array(ReviewBarrierSchema).min(1).max(20),
});

export const SubmitReviewSchema = z.object({
  responses: z
    .array(
      z.object({
        questionId: z.string().max(50),
        question: z.string().max(500),
        answer: z.string().max(2000),
      }),
    )
    .min(1)
    .max(10),
  barriers: z.array(z.string().max(200)).max(20),
});

export const DEFAULT_REVIEW_QUESTIONS = [
  { id: "q1", text: "What Steady Work did you complete this week?", enabled: true },
  { id: "q2", text: "What strategies or skills did you practice?", enabled: true },
  { id: "q3", text: "What went well? What are you proud of?", enabled: true },
  { id: "q4", text: "What would you like to discuss in your upcoming session?", enabled: true },
];

export const DEFAULT_REVIEW_BARRIERS = [
  { id: "b1", label: "Forgot to do it", enabled: true },
  { id: "b2", label: "Too overwhelmed", enabled: true },
  { id: "b3", label: "Didn't understand the task", enabled: true },
  { id: "b4", label: "Ran out of time", enabled: true },
  { id: "b5", label: "Didn't feel motivated", enabled: true },
  { id: "b6", label: "Life got in the way", enabled: true },
  { id: "b7", label: "Too anxious or stressed", enabled: true },
  { id: "b8", label: "Felt it wasn't helpful", enabled: true },
  { id: "b9", label: "Technical issues with the app", enabled: true },
];

export const DEFAULT_REVIEW_TEMPLATE = {
  questions: DEFAULT_REVIEW_QUESTIONS,
  barriers: DEFAULT_REVIEW_BARRIERS,
};

export type UpsertReviewTemplateInput = z.infer<typeof UpsertReviewTemplateSchema>;
export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;
export type ReviewQuestion = z.infer<typeof ReviewQuestionSchema>;
export type ReviewBarrier = z.infer<typeof ReviewBarrierSchema>;
