import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export type ParticipantAppointmentStatus =
  | "SCHEDULED"
  | "ATTENDED"
  | "NO_SHOW"
  | "LATE_CANCELED"
  | "CLIENT_CANCELED"
  | "CLINICIAN_CANCELED";

// Shape returned by the API's `toParticipantView` serializer (COND-7 compliant).
// Never includes internalNote, cancelReason, createdById, statusChangedAt, updatedAt.
export interface ParticipantAppointment {
  id: string;
  clinicianId: string;
  clinician: {
    firstName: string | null;
    lastName: string | null;
  } | null;
  serviceCode: {
    code: string;
    description: string;
  } | null;
  location: {
    name: string;
    type: "IN_PERSON" | "VIRTUAL" | string;
    addressLine1: string | null;
    city: string | null;
    state: string | null;
  } | null;
  startAt: string;
  endAt: string;
  status: ParticipantAppointmentStatus;
  appointmentType: "INDIVIDUAL" | "COUPLE" | "GROUP";
}

export interface UseMyAppointmentsParams {
  from?: string;
  to?: string;
  status?: string;
}

export function useMyAppointments(params?: UseMyAppointmentsParams) {
  const query = useQuery({
    queryKey: ["my-appointments", params ?? {}],
    queryFn: async () => {
      const res = await api.getMyAppointments(params);
      if (!res.success) {
        throw new Error(res.error || "Failed to load appointments");
      }
      return {
        data: (res.data as ParticipantAppointment[]) || [],
        cursor: ((res as unknown) as { cursor: string | null }).cursor ?? null,
      };
    },
    staleTime: 60_000,
  });

  return {
    data: query.data?.data ?? [],
    cursor: query.data?.cursor ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
