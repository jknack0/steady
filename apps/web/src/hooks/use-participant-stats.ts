"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { ParticipantStats } from "@steady/shared";

export function useParticipantStats(
  participantId: string,
  dateRange?: { start?: string; end?: string },
) {
  const params = new URLSearchParams();
  if (dateRange?.start) params.set("start", dateRange.start);
  if (dateRange?.end) params.set("end", dateRange.end);
  const qs = params.toString();

  return useQuery<ParticipantStats>({
    queryKey: queryKeys.participants.stats(participantId, dateRange),
    queryFn: () =>
      api.get(`/api/stats/participant/${participantId}${qs ? `?${qs}` : ""}`),
    enabled: !!participantId,
  });
}
