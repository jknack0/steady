"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { LocationRef, CreateLocationInput, UpdateLocationInput } from "@/lib/appointment-types";

export function useLocations() {
  return useQuery<LocationRef[]>({
    queryKey: ["locations"],
    queryFn: () => api.get("/api/locations"),
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation<LocationRef, Error, CreateLocationInput>({
    mutationFn: (data) => api.post("/api/locations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useUpdateLocation(id: string) {
  const queryClient = useQueryClient();
  return useMutation<LocationRef, Error, UpdateLocationInput>({
    mutationFn: (data) => api.patch(`/api/locations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useSoftDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete(`/api/locations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}
