"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { AssignProgramInput, AppendModulesInput } from "@steady/shared";

interface AssignResult {
  program: { id: string; title: string; status: string; templateSourceId: string };
  enrollment: { id: string; status: string; participantId: string };
}

interface AppendResult {
  program: { id: string; title: string; moduleCount: number };
  appendedModules: number;
}

export function useAssignProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, ...data }: AssignProgramInput & { templateId: string }) =>
      api.post<AssignResult>(`/api/programs/${templateId}/assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
      queryClient.invalidateQueries({ queryKey: ["clinician-participant"] });
      queryClient.invalidateQueries({ queryKey: ["clinician-participants"] });
    },
  });
}

export function useAppendModules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, ...data }: AppendModulesInput & { templateId: string }) =>
      api.post<AppendResult>(`/api/programs/${templateId}/assign/append`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
      queryClient.invalidateQueries({ queryKey: ["clinician-participant"] });
      queryClient.invalidateQueries({ queryKey: ["clinician-participants"] });
    },
  });
}

/**
 * Delete a module from a client program (assignment context).
 *
 * This variant accepts `{ programId, moduleId }` as a single object and
 * invalidates both program and participant caches. For the simpler
 * per-program version that takes a bare moduleId string, see
 * `useDeleteModule` in `use-modules.ts`.
 */
export function useDeleteModule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, moduleId }: { programId: string; moduleId: string }) =>
      api.delete<{ deleted: "hard" | "soft" }>(`/api/programs/${programId}/modules/${moduleId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
      queryClient.invalidateQueries({ queryKey: ["clinician-participant"] });
    },
  });
}

export function usePromoteProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, title }: { programId: string; title?: string }) =>
      api.post<{ id: string; title: string }>(`/api/programs/${programId}/promote`, title ? { title } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
    },
  });
}

/**
 * Delete a part from a client program (assignment context).
 *
 * This variant accepts `{ programId, moduleId, partId }` as a single object
 * and invalidates both program and participant caches. For the simpler
 * per-module version that takes a bare partId string, see `useDeletePart`
 * in `use-parts.ts`.
 */
export function useDeletePart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ programId, moduleId, partId }: { programId: string; moduleId: string; partId: string }) =>
      api.delete<{ deleted: "hard" | "soft" }>(`/api/programs/${programId}/modules/${moduleId}/parts/${partId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
      queryClient.invalidateQueries({ queryKey: ["clinician-participant"] });
    },
  });
}
