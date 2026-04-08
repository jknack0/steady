"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { CreateProgramInput, UpdateProgramInput } from "@steady/shared";

export interface Program {
  id: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  cadence: string;
  enrollmentMethod: string;
  sessionType: string;
  followUpCount: number;
  status: string;
  isTemplate: boolean;
  templateSourceId: string | null;
  moduleCount?: number;
  activeEnrollmentCount?: number;
  completedEnrollmentCount?: number;
  createdAt: string;
  updatedAt: string;
  modules?: Module[];
}

export interface Module {
  id: string;
  programId: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  estimatedMinutes: number | null;
  sortOrder: number;
  unlockRule: string;
  unlockDelayDays: number | null;
  partCount?: number;
  createdAt: string;
  updatedAt: string;
}

export function usePrograms() {
  return useQuery<Program[]>({
    queryKey: queryKeys.programs.all,
    queryFn: () => api.get("/api/programs"),
  });
}

export function useProgram(id: string) {
  return useQuery<Program>({
    queryKey: queryKeys.programs.detail(id),
    queryFn: () => api.get(`/api/programs/${id}`),
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProgramInput) => api.post<Program>("/api/programs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
    },
  });
}

export function useUpdateProgram(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProgramInput) => api.put<Program>(`/api/programs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.detail(id) });
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/programs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
    },
  });
}

export function useCloneProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title?: string }) =>
      api.post<Program>(`/api/programs/${id}/clone`, title ? { title } : {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
    },
  });
}

export interface ProgramTemplate {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  durationWeeks: number | null;
  cadence: string;
  sessionType: string;
  moduleCount: number;
}

export function useTemplates() {
  return useQuery<ProgramTemplate[]>({
    queryKey: queryKeys.programs.templates,
    queryFn: () => api.get("/api/programs/templates"),
  });
}

export interface ClientProgram {
  id: string;
  title: string;
  description: string | null;
  status: string;
  moduleCount: number;
  clientName: string | null;
  enrollmentStatus: string | null;
}

export function useClientPrograms() {
  return useQuery<ClientProgram[]>({
    queryKey: queryKeys.programs.clientPrograms,
    queryFn: () => api.get("/api/programs/client-programs"),
  });
}

export function useCreateProgramForClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; clientId: string }) =>
      api.post<{ program: Program; enrollment: { id: string } }>("/api/programs/for-client", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.clientPrograms });
      queryClient.invalidateQueries({ queryKey: queryKeys.programs.all });
    },
  });
}
