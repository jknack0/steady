"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface Invitation {
  id: string;
  code: string;
  patientName: string;
  patientEmail: string;
  programId: string | null;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  emailSent: boolean;
  emailSendCount: number;
  expiresAt: string;
  acceptedAt: string | null;
  acceptedByUserId: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  program?: { id: string; title: string } | null;
}

interface InvitationListResponse {
  id: string;
  code: string;
  patientName: string;
  patientEmail: string;
  programId: string | null;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  emailSent: boolean;
  emailSendCount: number;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  program?: { id: string; title: string } | null;
}

export function useInvitations(params?: { status?: string }) {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  const query = qs.toString();

  return useQuery<InvitationListResponse[]>({
    queryKey: queryKeys.invitations.all(params),
    queryFn: () =>
      api.get<InvitationListResponse[]>(
        `/api/invitations${query ? `?${query}` : ""}`,
      ),
  });
}

export function useInvitation(id: string) {
  return useQuery<Invitation>({
    queryKey: queryKeys.invitations.detail(id),
    queryFn: () => api.get<Invitation>(`/api/invitations/${id}`),
    enabled: !!id,
  });
}

export function useCreateInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      patientName: string;
      patientEmail: string;
      programId?: string;
      sendEmail?: boolean;
    }) => api.post<Invitation>("/api/invitations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["clinician-participants"] });
    },
  });
}

export function useResendInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Invitation>(`/api/invitations/${id}/resend`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["invitation"] });
    },
  });
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<Invitation>(`/api/invitations/${id}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invitations"] });
      queryClient.invalidateQueries({ queryKey: ["invitation"] });
      queryClient.invalidateQueries({ queryKey: ["clinician-participants"] });
    },
  });
}
