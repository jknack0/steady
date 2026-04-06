"use client";

import { useState, useMemo } from "react";
import { useTemplates, type ProgramTemplate } from "@/hooks/use-programs";
import { Input } from "@/components/ui/input";
import { Search, Check } from "lucide-react";

interface TemplatePickerProps {
  onSelect: (templateId: string, title: string) => void;
  selectedId?: string;
}

export function TemplatePicker({ onSelect, selectedId }: TemplatePickerProps) {
  const [search, setSearch] = useState("");
  const { data: templates, isLoading } = useTemplates();

  const filtered = useMemo(() => {
    if (!templates) return [];
    if (!search) return templates;
    const q = search.toLowerCase();
    return templates.filter((t) => t.title.toLowerCase().includes(q));
  }, [templates, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1 max-h-[40vh] overflow-y-auto">
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </>
        )}

        {!isLoading && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {search ? `No matches for "${search}"` : "No published templates available."}
          </p>
        )}

        {filtered.map((t) => {
          const isSelected = selectedId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors ${
                isSelected ? "bg-primary/10 border border-primary" : "hover:bg-accent/50 border border-transparent"
              }`}
              onClick={() => onSelect(t.id, t.title)}
            >
              <div>
                <p className="text-sm font-medium">{t.title}</p>
                {t.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{t.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{t.moduleCount} modules</span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
