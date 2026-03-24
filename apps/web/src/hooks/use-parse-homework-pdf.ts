"use client";

import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { HomeworkItem } from "@steady/shared";

interface ParseHomeworkPdfResult {
  items: HomeworkItem[];
}

export function useParseHomeworkPdf() {
  return useMutation({
    mutationFn: (fileKey: string) =>
      api.post<ParseHomeworkPdfResult>("/api/ai/parse-homework-pdf", { fileKey }),
  });
}
