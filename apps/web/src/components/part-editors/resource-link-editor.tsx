"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUpload } from "@/components/file-upload";

interface ResourceLinkContent {
  type: "RESOURCE_LINK";
  url: string;
  fileKey?: string;
  description?: string;
  resourceType?: "file" | "link" | "audio";
  audioDurationSecs?: number;
}

interface ResourceLinkEditorProps {
  content: ResourceLinkContent;
  onChange: (content: ResourceLinkContent) => void;
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function parseDuration(str: string): number | undefined {
  const parts = str.split(":").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  return undefined;
}

export function ResourceLinkPartEditor({ content, onChange }: ResourceLinkEditorProps) {
  const mode = content.resourceType || "file";

  return (
    <div className="space-y-4">
      {/* Resource type selector */}
      <div className="grid gap-2">
        <Label>Resource Type</Label>
        <select
          value={mode}
          onChange={(e) => {
            const newType = e.target.value as ResourceLinkContent["resourceType"];
            if (newType === "audio") {
              onChange({ ...content, resourceType: "audio", fileKey: undefined, url: "" });
            } else if (newType === "link") {
              onChange({ ...content, resourceType: "link", fileKey: undefined, audioDurationSecs: undefined });
            } else {
              onChange({ ...content, resourceType: "file", audioDurationSecs: undefined });
            }
          }}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="file">File (PDF, Image)</option>
          <option value="link">Link (URL)</option>
          <option value="audio">Audio</option>
        </select>
      </div>

      {mode === "audio" ? (
        <>
          <div className="grid gap-2">
            <Label>Audio File</Label>
            <FileUpload
              context="audio"
              value={content.fileKey || null}
              onChange={(key, publicUrl) => {
                if (key && publicUrl) {
                  onChange({ ...content, fileKey: key, url: publicUrl });
                } else {
                  onChange({ ...content, fileKey: undefined, url: "" });
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Accepts .mp3, .m4a, .wav, .aac, .ogg (max 500 MB)
            </p>
          </div>
          <div className="grid gap-2">
            <Label>Duration (MM:SS)</Label>
            <Input
              value={content.audioDurationSecs ? formatDuration(content.audioDurationSecs) : ""}
              onChange={(e) => {
                const secs = parseDuration(e.target.value);
                onChange({ ...content, audioDurationSecs: secs });
              }}
              placeholder="45:00"
              className="w-32"
            />
          </div>
        </>
      ) : mode === "link" ? (
        <div className="grid gap-2">
          <Label>URL</Label>
          <Input
            placeholder="https://..."
            value={content.url || ""}
            onChange={(e) => onChange({ ...content, url: e.target.value })}
          />
        </div>
      ) : (
        <>
          <div className="grid gap-2">
            <Label>Upload File</Label>
            <FileUpload
              context="handout"
              value={content.fileKey || null}
              onChange={(key, publicUrl) => {
                if (key && publicUrl) {
                  onChange({ ...content, fileKey: key, url: publicUrl });
                } else {
                  onChange({ ...content, fileKey: undefined });
                }
              }}
            />
          </div>
          <div className="grid gap-2">
            <Label>Or enter URL directly</Label>
            <Input
              placeholder="https://..."
              value={content.url || ""}
              onChange={(e) => onChange({ ...content, url: e.target.value })}
            />
          </div>
        </>
      )}

      <div className="grid gap-2">
        <Label>Description (optional)</Label>
        <Textarea
          placeholder="Brief description of the resource..."
          value={content.description || ""}
          onChange={(e) => onChange({ ...content, description: e.target.value || undefined })}
          rows={2}
        />
      </div>
    </div>
  );
}
