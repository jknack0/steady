"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface InsuranceData {
  id: string;
  payerName: string;
  payerId: string;
  subscriberId: string;
  isActive: boolean;
  [key: string]: unknown;
}

export function useParticipantInsurance(participantId: string | undefined) {
  const query = useQuery<InsuranceData | null>({
    queryKey: ["participant-insurance", participantId],
    queryFn: async () => {
      try {
        return await api.get<InsuranceData>(`/api/insurance/${participantId}`);
      } catch {
        // 404 means no insurance on file - not an error
        return null;
      }
    },
    enabled: !!participantId,
  });

  return {
    insurance: query.data ?? null,
    hasInsurance: !!query.data && query.data.isActive !== false,
    payerName: query.data?.payerName ?? null,
    isLoading: query.isLoading,
  };
}
