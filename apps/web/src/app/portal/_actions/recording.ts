"use server";

import { portalApi } from "@/lib/portal-api-client";

// Recording consent flow for the portal participant view.
// Server-action proxies to the existing /api/telehealth/:id/recording/*
// endpoints so portal cookies stay on the portal subdomain (AD-1).

export interface RecordingState {
  isRecording: boolean;
  consentStatus: string | null;
  pendingConsentId: string | null;
}

export async function fetchRecordingStateAction(
  appointmentId: string
): Promise<{ ok: boolean; data?: RecordingState; error?: string }> {
  const result = await portalApi<RecordingState>(
    `/api/telehealth/${appointmentId}/recording/state`
  );
  return {
    ok: result.ok,
    data: result.data,
    error: result.error,
  };
}

export async function respondToRecordingConsentAction(params: {
  appointmentId: string;
  consentId: string;
  granted: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const result = await portalApi(
    `/api/telehealth/${params.appointmentId}/recording/consent`,
    {
      method: "POST",
      body: JSON.stringify({
        consentId: params.consentId,
        granted: params.granted,
      }),
    }
  );
  return {
    ok: result.ok,
    error: result.error,
  };
}

export async function stopRecordingAction(
  appointmentId: string
): Promise<{ ok: boolean; error?: string }> {
  const result = await portalApi(
    `/api/telehealth/${appointmentId}/recording/stop`,
    {
      method: "POST",
      body: JSON.stringify({}),
    }
  );
  return {
    ok: result.ok,
    error: result.error,
  };
}
