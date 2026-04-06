import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { SubmitReviewInput, ReviewQuestion, ReviewBarrier } from "@steady/shared";

export interface ReviewWithTemplate {
  review: {
    id: string;
    responses: Array<{ questionId: string; question: string; answer: string }>;
    barriers: string[];
    submittedAt: string;
  } | null;
  template: {
    id: string | null;
    questions: ReviewQuestion[];
    barriers: ReviewBarrier[];
  };
}

export function useMyReviewForAppointment(appointmentId: string) {
  return useQuery<ReviewWithTemplate>({
    queryKey: ["my-review", appointmentId],
    queryFn: async () => {
      const res = await api.getParticipantReview(appointmentId);
      if (!res.success) throw new Error(res.error || "Failed to load review");
      return res.data as ReviewWithTemplate;
    },
    enabled: !!appointmentId,
  });
}

export function useSubmitReview(appointmentId: string) {
  const queryClient = useQueryClient();
  return useMutation<any, Error, SubmitReviewInput>({
    mutationFn: async (data) => {
      const res = await api.submitReview(appointmentId, data);
      if (!res.success) throw new Error(res.error || "Failed to submit review");
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-review", appointmentId] });
    },
  });
}
