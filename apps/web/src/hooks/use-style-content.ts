"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface StyleContentInput {
  rawContent: string;
}

interface StyleContentResult {
  styledHtml: string;
}

export function useStyleContent() {
  return useMutation({
    mutationFn: (data: StyleContentInput) =>
      api.post<StyleContentResult>("/api/ai/style-content", data),
  });
}
