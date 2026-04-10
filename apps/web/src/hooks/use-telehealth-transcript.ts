"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface SessionSummary {
  overview?: string;
  keyThemes?: string[];
  progressNotes?: string;
  actionItems?: string[];
  concerns?: string[];
  mood?: {
    affect?: string;
    engagement?: string;
  };
}

export interface TelehealthTranscriptResponse {
  status: string; // none, pending, transcribing, completed, failed
  transcribedAt: string | null;
  durationSeconds: number | null;
  transcript: unknown;
  summary: SessionSummary | null;
  summaryStatus: string; // none, pending, generating, completed, failed
  summarizedAt: string | null;
}

export function useTelehealthTranscript(appointmentId: string | null | undefined) {
  return useQuery<TelehealthTranscriptResponse | null>({
    queryKey: ["telehealth-transcript", appointmentId],
    queryFn: async () => {
      try {
        return await api.get<TelehealthTranscriptResponse>(
          `/api/telehealth/${appointmentId}/transcript`,
        );
      } catch (err) {
        // 404 means no session yet — treat as null rather than an error
        if (err instanceof Error && /404|not found/i.test(err.message)) {
          return null;
        }
        throw err;
      }
    },
    enabled: !!appointmentId,
    // Poll while generation is in flight
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const inFlight =
        data.status === "pending" ||
        data.status === "transcribing" ||
        data.summaryStatus === "pending" ||
        data.summaryStatus === "generating";
      return inFlight ? 5000 : false;
    },
  });
}
