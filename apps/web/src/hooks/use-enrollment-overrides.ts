"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreateOverrideInput, OverrideType } from "@steady/shared";

export interface EnrollmentOverride {
  id: string;
  enrollmentId: string;
  overrideType: OverrideType;
  moduleId: string | null;
  targetPartId: string | null;
  payload: Record<string, any>;
  createdById: string;
  createdAt: string;
}

export function useOverrides(enrollmentId: string, moduleId?: string) {
  const qs = moduleId ? `?moduleId=${moduleId}` : "";
  return useQuery<EnrollmentOverride[]>({
    queryKey: ["overrides", enrollmentId, moduleId],
    queryFn: () => api.get(`/api/enrollments/${enrollmentId}/overrides${qs}`),
    enabled: !!enrollmentId,
  });
}

export function useCreateOverride(enrollmentId: string) {
  const queryClient = useQueryClient();
  return useMutation<EnrollmentOverride, Error, CreateOverrideInput>({
    mutationFn: (data) => api.post(`/api/enrollments/${enrollmentId}/overrides`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overrides", enrollmentId] });
    },
  });
}

export function useDeleteOverride(enrollmentId: string) {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (overrideId) =>
      api.delete(`/api/enrollments/${enrollmentId}/overrides/${overrideId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["overrides", enrollmentId] });
    },
  });
}
