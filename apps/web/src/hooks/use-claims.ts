"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

/**
 * Fetches claims with cursor-based pagination.
 *
 * The `api` helper auto-unwraps `json.data`, but for paginated endpoints we
 * also need the `cursor` field from the top-level response.  Rather than
 * introducing a second fetch helper, this hook manages the cursor client-side
 * with a simple "load more" accumulation pattern backed by a regular
 * `useQuery` that re-fetches whenever the cursor advances.
 */

interface ClaimsPage {
  data: any[];
  cursor: string | null;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function fetchClaimsPage(filters?: { status?: string }, cursor?: string): Promise<ClaimsPage> {
  const params = new URLSearchParams();
  if (filters?.status) params.set("status", filters.status);
  if (cursor) params.set("cursor", cursor);

  const res = await fetch(`${API_BASE}/api/claims?${params}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || `Request failed: ${res.status}`);
  return { data: json.data ?? [], cursor: json.cursor ?? null };
}

export function useClaims(filters?: { status?: string }) {
  const [pages, setPages] = useState<ClaimsPage[]>([]);
  const [currentCursor, setCurrentCursor] = useState<string | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);

  const { isLoading, isFetching } = useQuery({
    queryKey: ["claims", filters, currentCursor],
    queryFn: async () => {
      const page = await fetchClaimsPage(filters, currentCursor);
      setPages((prev) => {
        // If this is the first page (no cursor), replace everything
        if (!currentCursor) return [page];
        // Otherwise append
        return [...prev, page];
      });
      setHasMore(!!page.cursor);
      return page;
    },
  });

  // Reset when filters change
  const resetAndFetch = useCallback(() => {
    setPages([]);
    setCurrentCursor(undefined);
    setHasMore(true);
  }, []);

  // We need to reset pages when filter changes — handled by queryKey including filters
  // but we also need to clear accumulated pages
  const claims = pages.flatMap((p) => p.data);
  const lastCursor = pages.length > 0 ? pages[pages.length - 1].cursor : null;

  const fetchNextPage = useCallback(() => {
    if (lastCursor) {
      setCurrentCursor(lastCursor);
    }
  }, [lastCursor]);

  return {
    claims,
    isLoading: isLoading && pages.length === 0,
    isFetchingNextPage: isFetching && pages.length > 0,
    hasNextPage: hasMore && !!lastCursor,
    fetchNextPage,
  };
}

export function useClaim(claimId: string | undefined) {
  return useQuery({
    queryKey: ["claims", claimId],
    queryFn: () => api.get(`/api/claims/${claimId}`),
    enabled: !!claimId,
  });
}

export function useCreateClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { appointmentId: string; diagnosisCodes: string[]; modifiers?: string[] }) =>
      api.post("/api/claims", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["claims"] });
      qc.invalidateQueries({ queryKey: ["appointments"] });
      qc.invalidateQueries({ queryKey: ["appointment"] });
    },
  });
}

export function useSubmitClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (claimId: string) => api.post(`/api/claims/${claimId}/submit`),
    onSuccess: (_d, claimId) => {
      qc.invalidateQueries({ queryKey: ["claims", claimId] });
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}

export function useRefreshClaimStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (claimId: string) =>
      api.post(`/api/claims/${claimId}/refresh-status`),
    onSuccess: (_d, claimId) => {
      qc.invalidateQueries({ queryKey: ["claims", claimId] });
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}

export function useResubmitClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, data }: { claimId: string; data?: any }) =>
      api.put(`/api/claims/${claimId}/resubmit`, data),
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["claims", vars.claimId] });
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}
