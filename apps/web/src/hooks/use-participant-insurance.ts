"use client";

import { useInsurance } from "./use-insurance";
import type { InsuranceData } from "./use-insurance";

export type { InsuranceData };

/**
 * @deprecated Use `useInsurance(participantId, { suppress404: true })` instead.
 *
 * Thin wrapper retained for backward compatibility. Delegates to the
 * consolidated `useInsurance` hook with 404 suppression enabled.
 */
export function useParticipantInsurance(participantId: string | undefined) {
  const result = useInsurance(participantId, { suppress404: true });
  // The suppress404 overload enriches the result with convenience fields
  const enriched = result as typeof result & {
    insurance: InsuranceData | null;
    hasInsurance: boolean;
    payerName: string | null;
  };
  return {
    insurance: enriched.insurance ?? null,
    hasInsurance: enriched.hasInsurance ?? false,
    payerName: enriched.payerName ?? null,
    isLoading: result.isLoading,
  };
}
