"use client";

import { useState, useMemo, useCallback } from "react";
import { ChevronDown, ChevronRight, Minus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Part {
  id: string;
  title: string;
  type: string;
  sortOrder: number;
}

interface Module {
  id: string;
  title: string;
  sortOrder: number;
  parts: Part[];
}

interface ProgramTreeSelectProps {
  modules: Module[];
  onChange: (excludedModuleIds: string[], excludedPartIds: string[]) => void;
  disabled?: boolean;
}

export function ProgramTreeSelect({ modules, onChange, disabled }: ProgramTreeSelectProps) {
  const [excludedModuleIds, setExcludedModuleIds] = useState<Set<string>>(new Set());
  const [excludedPartIds, setExcludedPartIds] = useState<Set<string>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const toggleModuleExpand = useCallback((moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }, []);

  const toggleModule = useCallback((moduleId: string, parts: Part[]) => {
    setExcludedModuleIds((prev) => {
      const next = new Set(prev);
      const newExcludedParts = new Set(excludedPartIds);

      if (next.has(moduleId)) {
        // Re-include module + all parts
        next.delete(moduleId);
        parts.forEach((p) => newExcludedParts.delete(p.id));
      } else {
        // Exclude module + all parts
        next.add(moduleId);
        parts.forEach((p) => newExcludedParts.add(p.id));
      }

      setExcludedPartIds(newExcludedParts);
      onChange(Array.from(next), Array.from(newExcludedParts));
      return next;
    });
  }, [excludedPartIds, onChange]);

  const togglePart = useCallback((partId: string, moduleId: string, moduleParts: Part[]) => {
    setExcludedPartIds((prev) => {
      const next = new Set(prev);
      if (next.has(partId)) next.delete(partId);
      else next.add(partId);

      // Check if all parts in module are excluded → exclude module too
      const allPartsExcluded = moduleParts.every((p) => next.has(p.id));
      const newExcludedModules = new Set(excludedModuleIds);
      if (allPartsExcluded) {
        newExcludedModules.add(moduleId);
      } else {
        newExcludedModules.delete(moduleId);
      }
      setExcludedModuleIds(newExcludedModules);

      onChange(Array.from(newExcludedModules), Array.from(next));
      return next;
    });
  }, [excludedModuleIds, onChange]);

  const { moduleCount, partCount } = useMemo(() => {
    let mc = 0;
    let pc = 0;
    for (const mod of modules) {
      if (!excludedModuleIds.has(mod.id)) {
        mc++;
        pc += mod.parts.filter((p) => !excludedPartIds.has(p.id)).length;
      }
    }
    return { moduleCount: mc, partCount: pc };
  }, [modules, excludedModuleIds, excludedPartIds]);

  return (
    <div className="space-y-1">
      {modules.map((mod) => {
        const isModuleExcluded = excludedModuleIds.has(mod.id);
        const includedParts = mod.parts.filter((p) => !excludedPartIds.has(p.id));
        const isIndeterminate = !isModuleExcluded && includedParts.length > 0 && includedParts.length < mod.parts.length;
        const isExpanded = expandedModules.has(mod.id);

        return (
          <div key={mod.id} className={`rounded-lg border ${isModuleExcluded ? "opacity-50" : ""}`}>
            <div className="flex items-center gap-3 px-3 py-2">
              <Checkbox
                checked={isIndeterminate ? "indeterminate" : !isModuleExcluded}
                onCheckedChange={() => toggleModule(mod.id, mod.parts)}
                disabled={disabled}
                aria-label={`Include ${mod.title}`}
              />
              <button
                type="button"
                className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
                onClick={() => toggleModuleExpand(mod.id)}
                disabled={disabled}
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span>{mod.title}</span>
                <span className="text-xs text-muted-foreground">
                  {isModuleExcluded
                    ? `${mod.parts.length} parts`
                    : `${includedParts.length}/${mod.parts.length} parts`}
                </span>
              </button>
            </div>

            {isExpanded && !isModuleExcluded && (
              <div className="border-t px-3 py-2 pl-10 space-y-1">
                {mod.parts.map((part) => {
                  const isPartExcluded = excludedPartIds.has(part.id);
                  return (
                    <div
                      key={part.id}
                      className={`flex items-center gap-3 py-1 ${isPartExcluded ? "opacity-50" : ""}`}
                    >
                      <Checkbox
                        checked={!isPartExcluded}
                        onCheckedChange={() => togglePart(part.id, mod.id, mod.parts)}
                        disabled={disabled}
                        aria-label={`Include ${part.title}`}
                      />
                      <span className="text-sm">{part.title}</span>
                      <span className="text-xs text-muted-foreground capitalize">
                        {part.type.toLowerCase().replace(/_/g, " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <p className="text-sm text-muted-foreground pt-2" aria-live="polite">
        {moduleCount} modules, {partCount} parts selected
      </p>
    </div>
  );
}
