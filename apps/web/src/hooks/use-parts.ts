"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CreatePartInput, UpdatePartInput } from "@steady/shared";

export interface Part {
  id: string;
  moduleId: string;
  type: string;
  title: string;
  sortOrder: number;
  isRequired: boolean;
  content: any;
  createdAt: string;
  updatedAt: string;
}

export function useParts(programId: string, moduleId: string) {
  return useQuery<Part[]>({
    queryKey: ["programs", programId, "modules", moduleId, "parts"],
    queryFn: () => api.get(`/api/programs/${programId}/modules/${moduleId}/parts`),
    enabled: !!programId && !!moduleId,
  });
}

export function useCreatePart(programId: string, moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePartInput) =>
      api.post<Part>(`/api/programs/${programId}/modules/${moduleId}/parts`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["programs", programId, "modules", moduleId, "parts"],
      });
      queryClient.invalidateQueries({ queryKey: ["programs", programId] });
    },
  });
}

export function useUpdatePart(programId: string, moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePartInput }) =>
      api.put<Part>(`/api/programs/${programId}/modules/${moduleId}/parts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["programs", programId, "modules", moduleId, "parts"],
      });
    },
  });
}

export function useDeletePart(programId: string, moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/programs/${programId}/modules/${moduleId}/parts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["programs", programId, "modules", moduleId, "parts"],
      });
      queryClient.invalidateQueries({ queryKey: ["programs", programId] });
    },
  });
}

export function useReorderParts(programId: string, moduleId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (partIds: string[]) =>
      api.put(`/api/programs/${programId}/modules/${moduleId}/parts/reorder`, { partIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["programs", programId, "modules", moduleId, "parts"],
      });
    },
  });
}
