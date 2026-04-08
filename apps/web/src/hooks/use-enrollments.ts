"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Enrollment {
  id: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
  participant: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export function useEnrollments(programId: string) {
  return useQuery<Enrollment[]>({
    queryKey: queryKeys.enrollments.byProgram(programId),
    queryFn: () => api.get(`/api/programs/${programId}/enrollments`),
    enabled: !!programId,
  });
}

export function useCreateEnrollment(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { participantEmail: string; firstName?: string; lastName?: string }) =>
      api.post<Enrollment>(`/api/programs/${programId}/enrollments`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.byProgram(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
    },
  });
}

export function useUpdateEnrollment(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/programs/${programId}/enrollments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.byProgram(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
    },
  });
}

export function useDeleteEnrollment(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/programs/${programId}/enrollments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.byProgram(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
    },
  });
}
