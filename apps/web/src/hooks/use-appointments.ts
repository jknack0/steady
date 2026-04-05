"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  AppointmentView,
  AppointmentWithConflicts,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentStatus,
} from "@/lib/appointment-types";

export interface ListAppointmentsParams {
  startAt: string;
  endAt: string;
  locationId?: string;
  status?: string;
  clinicianId?: string;
  cursor?: string;
  limit?: number;
}

function toQueryString(params: ListAppointmentsParams): string {
  const qs = new URLSearchParams();
  qs.set("startAt", params.startAt);
  qs.set("endAt", params.endAt);
  if (params.locationId) qs.set("locationId", params.locationId);
  if (params.status) qs.set("status", params.status);
  if (params.clinicianId) qs.set("clinicianId", params.clinicianId);
  if (params.cursor) qs.set("cursor", params.cursor);
  if (params.limit) qs.set("limit", String(params.limit));
  return qs.toString();
}

export function useAppointments(params: ListAppointmentsParams | null) {
  return useQuery<AppointmentView[]>({
    queryKey: ["appointments", params],
    queryFn: () => api.get(`/api/appointments?${toQueryString(params!)}`),
    enabled: !!params,
  });
}

export function useAppointment(id: string) {
  return useQuery<AppointmentView>({
    queryKey: ["appointment", id],
    queryFn: () => api.get(`/api/appointments/${id}`),
    enabled: !!id,
  });
}

export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation<AppointmentWithConflicts, Error, CreateAppointmentInput>({
    mutationFn: (data) => api.post("/api/appointments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}

export function useUpdateAppointment(id: string) {
  const queryClient = useQueryClient();
  return useMutation<AppointmentWithConflicts, Error, UpdateAppointmentInput>({
    mutationFn: (data) => api.patch(`/api/appointments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointment", id] });
    },
  });
}

interface StatusChangeArgs {
  status: AppointmentStatus;
  cancelReason?: string;
}

export function useChangeAppointmentStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation<AppointmentView, Error, StatusChangeArgs, { previousLists: Array<[readonly unknown[], AppointmentView[] | undefined]>; previousSingle: AppointmentView | undefined }>({
    mutationFn: ({ status, cancelReason }) =>
      api.post(`/api/appointments/${id}/status`, { status, cancelReason }),
    onMutate: async ({ status }) => {
      await queryClient.cancelQueries({ queryKey: ["appointments"] });
      await queryClient.cancelQueries({ queryKey: ["appointment", id] });

      const previousLists = queryClient.getQueriesData<AppointmentView[]>({
        queryKey: ["appointments"],
      });
      const previousSingle = queryClient.getQueryData<AppointmentView>(["appointment", id]);

      queryClient.setQueriesData<AppointmentView[]>({ queryKey: ["appointments"] }, (old) =>
        old?.map((a) => (a.id === id ? { ...a, status } : a)),
      );
      if (previousSingle) {
        queryClient.setQueryData<AppointmentView>(["appointment", id], { ...previousSingle, status });
      }

      return { previousLists, previousSingle };
    },
    onError: (_err, _vars, context) => {
      if (!context) return;
      for (const [key, data] of context.previousLists) {
        queryClient.setQueryData(key, data);
      }
      if (context.previousSingle) {
        queryClient.setQueryData(["appointment", id], context.previousSingle);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      queryClient.invalidateQueries({ queryKey: ["appointment", id] });
    },
  });
}

export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/api/appointments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
    },
  });
}
