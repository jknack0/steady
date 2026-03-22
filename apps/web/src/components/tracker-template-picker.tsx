"use client";

import { useTrackerTemplates, useCreateTrackerFromTemplate } from "@/hooks/use-daily-trackers";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const TEMPLATE_ICONS: Record<string, string> = {
  "mood-log": "Heart",
  "dbt-diary-card": "Brain",
  "sleep-diary": "Moon",
  "craving-tracker": "AlertTriangle",
  "ocd-exposure-log": "Target",
  "food-log": "UtensilsCrossed",
};

export function TrackerTemplatePicker({
  programId,
  onCreated,
  onClose,
}: {
  programId: string;
  onCreated: (trackerId: string) => void;
  onClose: () => void;
}) {
  const { data: templates, isLoading } = useTrackerTemplates();
  const createFromTemplate = useCreateTrackerFromTemplate();

  const handleSelect = async (templateKey: string) => {
    const result = await createFromTemplate.mutateAsync({
      templateKey,
      programId,
    });
    onCreated(result.id);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Choose a Template</h3>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {(templates || []).map((template) => (
          <button
            key={template.key}
            onClick={() => handleSelect(template.key)}
            disabled={createFromTemplate.isPending}
            className="flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent/50 disabled:opacity-50"
          >
            <span className="text-sm font-medium">{template.name}</span>
            <span className="text-xs text-muted-foreground">
              {template.description}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {template.fields.length} fields
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
