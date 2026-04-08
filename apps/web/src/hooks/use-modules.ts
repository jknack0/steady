"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { CreateModuleInput, UpdateModuleInput } from "@steady/shared";
import type { Module } from "./use-programs";

export function useModules(programId: string) {
  return useQuery<Module[]>({
    queryKey: queryKeys.programs.modules(programId),
    queryFn: () => api.get(`/api/programs/${programId}/modules`),
    enabled: !!programId,
  });
}

export function useCreateModule(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateModuleInput) =>
      api.post<Module>(`/api/programs/${programId}/modules`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.modules(programId) });
    },
  });
}

export function useUpdateModule(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateModuleInput }) =>
      api.put<Module>(`/api/programs/${programId}/modules/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.modules(programId) });
    },
  });
}

export function useDeleteModule(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/programs/${programId}/modules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.modules(programId) });
    },
  });
}

export function useReorderModules(programId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moduleIds: string[]) =>
      api.put(`/api/programs/${programId}/modules/reorder`, { moduleIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(programId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.modules(programId) });
    },
  });
}
