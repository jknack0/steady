"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// ── Portal invitation hooks (FR-1, FR-10) ─────────────────────────
// Used by the clinician-side invitation UI: the "Invite to portal" button,
// InvitationStatusCard, and "Invite new client" modal.

export type PortalInvitationStatus =
  | "PENDING"
  | "SENT"
  | "ACCEPTED"
  | "BOUNCED"
  | "COMPLAINED"
  | "SEND_FAILED"
  | "EXPIRED"
  | "REVOKED";

export interface PortalInvitationView {
  id: string;
  status: PortalInvitationStatus;
  recipientEmail: string;
  existingUser: boolean;
  firstName: string | null;
  lastName: string | null;
  expiresAt: string;
  sendCount: number;
  lastSentAt: string | null;
  acceptedAt: string | null;
  revokedAt: string | null;
  bounceType: string | null;
  bouncedAt: string | null;
  createdAt: string;
}

interface CreateInvitationBody {
  recipientEmail: string;
  firstName: string;
  lastName: string;
}

export function usePortalInvitations(params: {
  status?: PortalInvitationStatus;
  limit?: number;
} = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.limit) qs.set("limit", String(params.limit));
  const query = qs.toString() ? `?${qs}` : "";

  return useQuery<{ data: PortalInvitationView[]; cursor: string | null }>({
    queryKey: ["portal-invitations", params],
    queryFn: () =>
      api.getRaw<{
        success: boolean;
        data: PortalInvitationView[];
        cursor: string | null;
      }>(`/api/portal-invitations${query}`),
  });
}

/**
 * Look up the active invitation for a specific client by filtering the
 * list. There isn't a dedicated by-client endpoint; the list endpoint is
 * cheap enough for the clinician's own invitations.
 */
export function useClientPortalInvitation(clientEmail?: string | null) {
  return useQuery<PortalInvitationView | null>({
    queryKey: ["portal-invitation", "by-client", clientEmail ?? null],
    enabled: !!clientEmail,
    queryFn: async () => {
      if (!clientEmail) return null;
      const envelope = await api.getRaw<{
        success: boolean;
        data: PortalInvitationView[];
        cursor: string | null;
      }>(`/api/portal-invitations?limit=100`);
      // Match on the (decrypted) recipientEmail returned by the server.
      const canonical = clientEmail.toLowerCase().trim();
      return (
        envelope.data.find(
          (inv) => inv.recipientEmail.toLowerCase().trim() === canonical
        ) ?? null
      );
    },
  });
}

export function useCreatePortalInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateInvitationBody) =>
      api.post<PortalInvitationView>("/api/portal-invitations", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-invitations"] });
      qc.invalidateQueries({ queryKey: ["portal-invitation"] });
    },
  });
}

export function useResendPortalInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.post<PortalInvitationView>(
        `/api/portal-invitations/${invitationId}/resend`
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-invitations"] });
      qc.invalidateQueries({ queryKey: ["portal-invitation"] });
    },
  });
}

export function useRenewPortalInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.post<PortalInvitationView>(
        `/api/portal-invitations/${invitationId}/renew`
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-invitations"] });
      qc.invalidateQueries({ queryKey: ["portal-invitation"] });
    },
  });
}

export function useRevokePortalInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (invitationId: string) =>
      api.post<PortalInvitationView>(
        `/api/portal-invitations/${invitationId}/revoke`
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["portal-invitations"] });
      qc.invalidateQueries({ queryKey: ["portal-invitation"] });
    },
  });
}
