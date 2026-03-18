"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

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
    queryKey: ["enrollments", programId],
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
      queryClient.invalidateQueries({ queryKey: ["enrollments", programId] });
      queryClient.invalidateQueries({ queryKey: ["programs", programId] });
    },
  });
}

export function useUpdateEnrollment(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/programs/${programId}/enrollments/${id}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments", programId] });
      queryClient.invalidateQueries({ queryKey: ["programs", programId] });
    },
  });
}

export function useDeleteEnrollment(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/programs/${programId}/enrollments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["enrollments", programId] });
      queryClient.invalidateQueries({ queryKey: ["programs", programId] });
    },
  });
}
