"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
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
  partCount?: number;
  createdAt: string;
  updatedAt: string;
}

export function usePrograms() {
  return useQuery<Program[]>({
    queryKey: ["programs"],
    queryFn: () => api.get("/api/programs"),
  });
}

export function useProgram(id: string) {
  return useQuery<Program>({
    queryKey: ["programs", id],
    queryFn: () => api.get(`/api/programs/${id}`),
    enabled: !!id,
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProgramInput) => api.post<Program>("/api/programs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
}

export function useUpdateProgram(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateProgramInput) => api.put<Program>(`/api/programs/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
      queryClient.invalidateQueries({ queryKey: ["programs", id] });
    },
  });
}

export function useDeleteProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/programs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
}

export function useCloneProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Program>(`/api/programs/${id}/clone`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["programs"] });
    },
  });
}
