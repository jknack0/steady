"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { buildQueryString } from "@/lib/query-utils";
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

export function useAppointments(params: ListAppointmentsParams | null) {
  return useQuery<AppointmentView[]>({
    queryKey: ["appointments", params],
    queryFn: () =>
      api.get(
        `/api/appointments?${buildQueryString(params as unknown as Record<string, string | number | undefined>)}`,
      ),
    enabled: !!params,
  });
}

export function useAppointment(id: string) {
  return useQuery<AppointmentView>({
    queryKey: queryKeys.appointments.detail(id),
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

/**
 * Fetches ATTENDED appointments that do not yet have an insurance claim.
 * Used by the CreateClaimDialog to populate the appointment picker.
 */
export function useBillableAppointments() {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  return useQuery<AppointmentView[]>({
    queryKey: queryKeys.appointments.billable,
    queryFn: () => {
      const qs = new URLSearchParams();
      qs.set("startAt", ninetyDaysAgo.toISOString());
      qs.set("endAt", now.toISOString());
      qs.set("billable", "true");
      qs.set("limit", "100");
      return api.get(`/api/appointments?${qs}`);
    },
  });
}

export function useUnbilledAppointments() {
  return useQuery<AppointmentView[]>({
    queryKey: queryKeys.appointments.unbilled,
    queryFn: () => api.get("/api/appointments/unbilled?limit=20"),
  });
}
