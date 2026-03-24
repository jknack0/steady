"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface GeneratePartInput {
  partType: string;
  rawInput: string;
}

interface GeneratePartResult {
  content: any;
  title?: string;
}

export function useGeneratePart() {
  return useMutation({
    mutationFn: (data: GeneratePartInput) =>
      api.post<GeneratePartResult>("/api/ai/generate-part", data),
  });
}
