"use client";

import { useState } from "react";
import { api } from "@/lib/api-client";

type UploadContext = "program-cover" | "handout" | "attachment" | "audio";

interface PresignResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
  maxSize: number;
}

interface UploadResult {
  key: string;
  publicUrl: string;
}

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(
    file: File,
    context: UploadContext
  ): Promise<UploadResult | null> {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // 1. Get pre-signed URL from API
      const presign = await api.post<PresignResponse>("/api/uploads/presign", {
        fileName: file.name,
        fileType: file.type,
        context,
      });

      if (file.size > presign.maxSize) {
        const maxMB = Math.round(presign.maxSize / (1024 * 1024));
        throw new Error(`File too large. Maximum size is ${maxMB} MB.`);
      }

      // 2. Upload directly to S3 via pre-signed URL
      setProgress(10);
      const uploadRes = await fetch(presign.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload to storage failed");
      }

      setProgress(100);
      return { key: presign.key, publicUrl: presign.publicUrl };
    } catch (err: any) {
      setError(err.message || "Upload failed");
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  function reset() {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }

  return { upload, isUploading, progress, error, reset };
}

export function useDownloadUrl() {
  async function getDownloadUrl(key: string): Promise<string> {
    const result = await api.get<{ downloadUrl: string }>(
      `/api/uploads/presign-download?key=${encodeURIComponent(key)}`
    );
    return result.downloadUrl;
  }

  return { getDownloadUrl };
}
