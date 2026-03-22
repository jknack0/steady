"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface ComplianceItem {
  partId: string;
  partTitle: string;
  recurrence: "DAILY" | "WEEKLY" | "CUSTOM";
  recurrenceDays: number[];
  currentStreak: number;
  longestStreak: number;
  totalCompleted: number;
  totalInstances: number;
  completionRate: number;
}

export function useHomeworkCompliance(programId: string, enrollmentId: string) {
  return useQuery<ComplianceItem[]>({
    queryKey: ["homework-compliance", programId, enrollmentId],
    queryFn: () =>
      api.get(
        `/api/programs/${programId}/enrollments/${enrollmentId}/homework-compliance`
      ),
    enabled: !!programId && !!enrollmentId,
  });
}

export function useStopRecurrence(programId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      enrollmentId,
      partId,
    }: {
      enrollmentId: string;
      partId: string;
    }) =>
      api.post(
        `/api/programs/${programId}/enrollments/${enrollmentId}/parts/${partId}/stop-recurrence`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["homework-compliance", programId],
      });
    },
  });
}
