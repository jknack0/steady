"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface DividerEditorProps {
  content: { type: "DIVIDER"; label: string };
  onChange: (content: any) => void;
}

export function DividerPartEditor({ content, onChange }: DividerEditorProps) {
  return (
    <div className="grid gap-2">
      <Label>Section Label</Label>
      <Input
        placeholder="Section Header Text"
        value={content.label || ""}
        onChange={(e) => onChange({ ...content, label: e.target.value })}
      />
      <div className="flex items-center gap-3 mt-2">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          {content.label || "Preview"}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
    </div>
  );
}
