"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface TelehealthTokenResponse {
  token: string;
  url: string;
  roomName: string;
  telehealthSessionId?: string;
  isHost: boolean;
}

export function useTelehealthToken() {
  return useMutation({
    mutationFn: (appointmentId: string) =>
      api.post<TelehealthTokenResponse>("/api/telehealth/token", {
        appointmentId,
      }),
  });
}
