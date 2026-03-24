"use client";

import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/file-upload";
import { useDownloadUrl } from "@/hooks/use-upload";
import { FileText, ExternalLink, Loader2 } from "lucide-react";

interface PdfContent {
  type: "PDF";
  fileKey: string;
  url: string;
  fileName: string;
  description?: string;
  pageCount?: number;
}

interface PdfEditorProps {
  content: PdfContent;
  onChange: (content: PdfContent) => void;
}

export function PdfPartEditor({ content, onChange }: PdfEditorProps) {
  const { getDownloadUrl } = useDownloadUrl();
  const [opening, setOpening] = useState(false);

  const handleOpen = async () => {
    if (!content.fileKey) return;
    setOpening(true);
    try {
      const url = await getDownloadUrl(content.fileKey);
      window.open(url, "_blank");
    } catch {
      // Fall back to stored URL
      window.open(content.url, "_blank");
    } finally {
      setOpening(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>PDF File</Label>
        {content.fileKey ? (
          <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
            <FileText className="h-8 w-8 text-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{content.fileName || "Uploaded PDF"}</p>
              {content.pageCount && (
                <p className="text-xs text-muted-foreground">{content.pageCount} page{content.pageCount > 1 ? "s" : ""}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleOpen}
              disabled={opening}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline disabled:opacity-50"
            >
              {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
              Open
            </button>
            <button
              type="button"
              className="text-sm text-muted-foreground hover:text-foreground underline"
              onClick={() => onChange({ ...content, fileKey: "", url: "", fileName: "" })}
            >
              Remove
            </button>
          </div>
        ) : (
          <FileUpload
            context="pdf"
            value={null}
            onChange={(key, publicUrl) => {
              if (key && publicUrl) {
                const fileName = key.split("/").pop() || "document.pdf";
                onChange({ ...content, fileKey: key, url: publicUrl, fileName });
              }
            }}
          />
        )}
        <p className="text-xs text-muted-foreground">
          Accepts PDF files up to 50 MB
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Description (optional)</Label>
        <Textarea
          placeholder="Brief description of the PDF document..."
          value={content.description || ""}
          onChange={(e) => onChange({ ...content, description: e.target.value || undefined })}
          rows={2}
        />
      </div>
    </div>
  );
}
