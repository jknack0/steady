"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

interface JournalPromptEditorProps {
  content: {
    type: "JOURNAL_PROMPT";
    prompts: string[];
    spaceSizeHint: "small" | "medium" | "large";
  };
  onChange: (content: any) => void;
}

export function JournalPromptPartEditor({ content, onChange }: JournalPromptEditorProps) {
  const handlePromptChange = (index: number, value: string) => {
    const prompts = [...content.prompts];
    prompts[index] = value;
    onChange({ ...content, prompts });
  };

  const handleAddPrompt = () => {
    onChange({ ...content, prompts: [...content.prompts, ""] });
  };

  const handleDeletePrompt = (index: number) => {
    if (content.prompts.length <= 1) return;
    onChange({ ...content, prompts: content.prompts.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Prompts</Label>
        {content.prompts.map((prompt, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder={`Question ${i + 1}...`}
              value={prompt}
              onChange={(e) => handlePromptChange(i, e.target.value)}
              className="flex-1"
            />
            {content.prompts.length > 1 && (
              <button
                onClick={() => handleDeletePrompt(i)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={handleAddPrompt}>
          <Plus className="mr-2 h-4 w-4" />
          Add Prompt
        </Button>
      </div>

      <div className="grid gap-2 max-w-xs">
        <Label>Response Space Size</Label>
        <Select
          value={content.spaceSizeHint}
          onValueChange={(v) => onChange({ ...content, spaceSizeHint: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="small">Small</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="large">Large</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
