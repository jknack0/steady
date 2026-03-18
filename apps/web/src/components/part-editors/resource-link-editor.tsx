"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ResourceLinkEditorProps {
  content: { type: "RESOURCE_LINK"; url: string; description?: string };
  onChange: (content: any) => void;
}

export function ResourceLinkPartEditor({ content, onChange }: ResourceLinkEditorProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>URL</Label>
        <Input
          placeholder="https://..."
          value={content.url || ""}
          onChange={(e) => onChange({ ...content, url: e.target.value })}
        />
      </div>
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
