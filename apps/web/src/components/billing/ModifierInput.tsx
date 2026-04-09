"use client";

import { useState, useRef, useCallback } from "react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { COMMON_MODIFIERS } from "@/lib/billing-constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Plus } from "lucide-react";

interface ModifierInputProps {
  modifiers: string[];
  onChange: (mods: string[]) => void;
  maxModifiers?: number;
}

/**
 * Shared modifier input for CMS-1500 Box 24D modifiers.
 *
 * Includes:
 * - Chip display for selected modifiers
 * - Suggested modifier chips from COMMON_MODIFIERS
 * - Free-text input for custom modifiers
 *
 * Replaces 4 duplicate implementations across CreateClaimDialog,
 * NewClaimFlow, ClaimEditForm, ResubmitForm, and billing/new/page.
 */
export function ModifierInput({
  modifiers,
  onChange,
  maxModifiers = 4,
}: ModifierInputProps) {
  const [inputVal, setInputVal] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const closeDropdown = useCallback(() => setIsOpen(false), []);
  useClickOutside(ref, closeDropdown);

  function addModifier(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || modifiers.length >= maxModifiers || modifiers.includes(trimmed)) return;
    onChange([...modifiers, trimmed]);
    setInputVal("");
    setIsOpen(false);
  }

  function removeModifier(code: string) {
    onChange(modifiers.filter((m) => m !== code));
  }

  const filteredSuggestions = COMMON_MODIFIERS.filter(
    (m) =>
      !modifiers.includes(m.code) &&
      (inputVal === "" ||
        m.code.toLowerCase().includes(inputVal.toLowerCase()) ||
        m.label.toLowerCase().includes(inputVal.toLowerCase())),
  );

  return (
    <div ref={ref} className="space-y-2">
      {/* Selected modifier chips */}
      {modifiers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {modifiers.map((mod) => {
            const common = COMMON_MODIFIERS.find((c) => c.code === mod);
            return (
              <span
                key={mod}
                className="inline-flex items-center gap-1 rounded-md border bg-primary/5 px-2 py-1 text-xs font-mono"
              >
                {mod}
                {common && (
                  <span className="font-sans text-muted-foreground">
                    ({common.label})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeModifier(mod)}
                  className="text-muted-foreground hover:text-destructive ml-0.5"
                  aria-label={`Remove modifier ${mod}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Suggested modifier chips */}
      {modifiers.length < maxModifiers && (
        <div className="flex flex-wrap gap-1.5">
          {COMMON_MODIFIERS.filter((c) => !modifiers.includes(c.code)).map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => addModifier(c.code)}
              className="inline-flex items-center gap-1 rounded-md border border-dashed px-2 py-1 text-xs hover:bg-muted/50 transition-colors"
            >
              <span className="font-mono font-medium">{c.code}</span>
              <span className="text-muted-foreground">{c.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Free-text modifier input */}
      {modifiers.length < maxModifiers && (
        <div className="flex gap-2">
          <Input
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value.toUpperCase());
              setIsOpen(true);
            }}
            placeholder="Custom modifier (e.g. 59)"
            maxLength={2}
            className="font-mono w-40 h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addModifier(inputVal);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => addModifier(inputVal)}
            disabled={!inputVal.trim()}
            aria-label="Add modifier"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        CMS-1500 Box 24D. Max {maxModifiers} modifiers per service line.
      </p>
    </div>
  );
}
