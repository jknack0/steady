"use client";

import { useState, useMemo } from "react";
import { usePrograms, useTemplates, type Program, type ProgramTemplate } from "@/hooks/use-programs";
import { Input } from "@/components/ui/input";
import { Search, Check, BookOpen } from "lucide-react";

type Tab = "my-programs" | "templates";

interface ProgramPickerProps {
  onSelect: (programId: string, title: string) => void;
  selectedId?: string;
}

export function ProgramPicker({ onSelect, selectedId }: ProgramPickerProps) {
  const [tab, setTab] = useState<Tab>("my-programs");
  const [search, setSearch] = useState("");
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const { data: templates, isLoading: templatesLoading } = useTemplates();

  const isLoading = tab === "my-programs" ? programsLoading : templatesLoading;
  const items = tab === "my-programs" ? programs : templates;

  const filtered = useMemo(() => {
    if (!items) return [];
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((t) => t.title.toLowerCase().includes(q));
  }, [items, search]);

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { key: "my-programs" as Tab, label: "My Programs" },
          { key: "templates" as Tab, label: "Template Library" },
        ]).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setTab(t.key); setSearch(""); }}
            className={`px-3 py-1.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={tab === "my-programs" ? "Search my programs..." : "Search templates..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          disabled={isLoading}
        />
      </div>

      {/* List */}
      <div className="space-y-1 max-h-[40vh] overflow-y-auto">
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
            ))}
          </>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="py-8 text-center">
            <BookOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {search
                ? `No matches for "${search}"`
                : tab === "my-programs"
                  ? "No programs yet. Browse the Template Library."
                  : "No templates available."}
            </p>
          </div>
        )}

        {filtered.map((item) => {
          const isSelected = selectedId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-left transition-colors ${
                isSelected ? "bg-primary/10 border border-primary" : "hover:bg-accent/50 border border-transparent"
              }`}
              onClick={() => onSelect(item.id, item.title)}
            >
              <div>
                <p className="text-sm font-medium">{item.title}</p>
                {item.description && (
                  <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {item.moduleCount ?? 0} modules
                </span>
                {isSelected && <Check className="h-4 w-4 text-primary" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
