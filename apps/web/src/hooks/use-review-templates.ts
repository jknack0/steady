"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { UpsertReviewTemplateInput, ReviewQuestion, ReviewBarrier } from "@steady/shared";

export interface ReviewTemplateData {
  id: string | null;
  programId: string;
  questions: ReviewQuestion[];
  barriers: ReviewBarrier[];
  createdAt: string | null;
  updatedAt: string | null;
}

export function useReviewTemplate(programId: string) {
  return useQuery<ReviewTemplateData>({
    queryKey: ["review-template", programId],
    queryFn: () => api.get(`/api/programs/${programId}/review-template`),
    enabled: !!programId,
  });
}

export function useUpdateReviewTemplate(programId: string) {
  const queryClient = useQueryClient();
  return useMutation<ReviewTemplateData, Error, UpsertReviewTemplateInput>({
    mutationFn: (data) => api.put(`/api/programs/${programId}/review-template`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-template", programId] });
    },
  });
}
