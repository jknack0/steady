"use client";

import { useRef, useState } from "react";
import { useUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText, Image, Loader2, CheckCircle, Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  context: "program-cover" | "handout" | "attachment" | "audio" | "pdf";
  accept?: string;
  value?: string | null;
  onChange: (key: string | null, publicUrl: string | null) => void;
  label?: string;
  className?: string;
}

const ACCEPT_MAP: Record<string, string> = {
  "program-cover": "image/png,image/jpeg,image/webp",
  handout: "application/pdf,image/png,image/jpeg",
  attachment: "application/pdf,image/png,image/jpeg,image/webp",
  audio: "audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,audio/ogg,.mp3,.m4a,.wav,.aac,.ogg",
  pdf: "application/pdf",
};

function isImage(url: string): boolean {
  return /\.(png|jpe?g|webp)(\?|$)/i.test(url);
}

function isAudio(url: string): boolean {
  return /\.(mp3|m4a|wav|aac|ogg)(\?|$)/i.test(url);
}

export function FileUpload({
  context,
  accept,
  value,
  onChange,
  label,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading, progress, error, reset } = useUpload();
  const [dragOver, setDragOver] = useState(false);

  const acceptTypes = accept || ACCEPT_MAP[context];

  async function handleFile(file: File) {
    reset();
    const result = await upload(file, context);
    if (result) {
      onChange(result.key, result.publicUrl);
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleRemove() {
    onChange(null, null);
    reset();
  }

  // Show preview if value exists
  if (value) {
    return (
      <div className={cn("relative", className)}>
        {label && (
          <p className="text-sm font-medium mb-1.5">{label}</p>
        )}
        <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30 min-w-0">
          {isImage(value) ? (
            <img
              src={value}
              alt="Uploaded file"
              className="h-12 w-12 rounded object-cover"
            />
          ) : isAudio(value) ? (
            <Music className="h-8 w-8 text-muted-foreground" />
          ) : (
            <FileText className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-sm text-muted-foreground truncate flex-1 min-w-0">
            {value.split("/").pop()?.split("?")[0] || "Uploaded file"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="h-8 w-8 shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <p className="text-sm font-medium mb-1.5">{label}</p>
      )}
      <div
        className={cn(
          "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          isUploading && "pointer-events-none opacity-70"
        )}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptTypes}
          onChange={handleInputChange}
          className="hidden"
        />

        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Uploading... {progress}%
            </p>
          </>
        ) : (
          <>
            {context === "program-cover" ? (
              <Image className="h-8 w-8 text-muted-foreground mb-2" />
            ) : context === "audio" ? (
              <Music className="h-8 w-8 text-muted-foreground mb-2" />
            ) : (
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
            )}
            <p className="text-sm text-muted-foreground">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {acceptTypes.replace(/,/g, ", ")}
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive mt-1.5">{error}</p>
      )}
    </div>
  );
}
