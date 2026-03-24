"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/file-upload";
import { FileText } from "lucide-react";

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
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>PDF File</Label>
        {content.fileKey ? (
          <>
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
              <FileText className="h-8 w-8 text-red-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{content.fileName || "Uploaded PDF"}</p>
                {content.pageCount && (
                  <p className="text-xs text-muted-foreground">{content.pageCount} page{content.pageCount > 1 ? "s" : ""}</p>
                )}
              </div>
              <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open
              </a>
              <button
                type="button"
                className="text-sm text-muted-foreground hover:text-foreground underline"
                onClick={() => onChange({ ...content, fileKey: "", url: "", fileName: "" })}
              >
                Remove
              </button>
            </div>
            <iframe
              src={content.url}
              className="w-full rounded-lg border"
              style={{ height: "600px" }}
              title={content.fileName || "PDF Preview"}
            />
          </>
        ) : (
          <FileUpload
            context="pdf"
            value={null}
            onChange={(key, publicUrl) => {
              if (key && publicUrl) {
                // Extract filename from key (last segment after /)
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
