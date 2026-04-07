"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { api } from "@/lib/api-client";

interface DiagnosisCode {
  code: string;
  description: string;
}

interface DiagnosisCodeSearchProps {
  participantId?: string;
  selectedCodes: DiagnosisCode[];
  onChange: (codes: DiagnosisCode[]) => void;
  maxCodes?: number;
}

export function DiagnosisCodeSearch({
  participantId,
  selectedCodes,
  onChange,
  maxCodes = 4,
}: DiagnosisCodeSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DiagnosisCode[]>([]);
  const [recentCodes, setRecentCodes] = useState<DiagnosisCode[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(
    async (q: string) => {
      if (q.length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const params = new URLSearchParams({ q });
        if (participantId) params.set("participantId", participantId);
        const data = await api.get<{ results: DiagnosisCode[]; recent: DiagnosisCode[] }>(
          `/api/diagnosis-codes?${params}`,
        );
        setResults(data.results ?? []);
        if (data.recent?.length) setRecentCodes(data.recent);
      } catch {
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [participantId],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, search]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addCode(code: DiagnosisCode) {
    if (selectedCodes.length >= maxCodes) return;
    if (selectedCodes.some((c) => c.code === code.code)) return;
    onChange([...selectedCodes, code]);
    setQuery("");
    setResults([]);
    setShowDropdown(false);
  }

  function removeCode(code: string) {
    onChange(selectedCodes.filter((c) => c.code !== code));
  }

  const displayResults = results.length > 0 ? results : recentCodes.length > 0 && query.length < 2 ? recentCodes : [];

  return (
    <div ref={containerRef} className="relative">
      {/* Selected codes as chips */}
      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedCodes.map((c) => (
            <span
              key={c.code}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 px-2.5 py-0.5 text-xs font-medium"
            >
              {c.code} - {c.description.length > 40 ? c.description.slice(0, 40) + "..." : c.description}
              <button
                type="button"
                onClick={() => removeCode(c.code)}
                className="ml-0.5 hover:text-blue-900"
                aria-label={`Remove ${c.code}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {selectedCodes.length < maxCodes && (
        <Input
          placeholder="Search ICD-10 codes (e.g., F90 or ADHD)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
        />
      )}

      {showDropdown && (query.length >= 2 || recentCodes.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg max-h-48 overflow-y-auto">
          {isSearching ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
          ) : displayResults.length > 0 ? (
            <ul>
              {displayResults.map((code) => {
                const isSelected = selectedCodes.some((c) => c.code === code.code);
                return (
                  <li key={code.code}>
                    <button
                      type="button"
                      disabled={isSelected}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => addCode(code)}
                    >
                      <span className="font-mono font-medium">{code.code}</span>
                      <span className="text-muted-foreground ml-2">{code.description}</span>
                      {isSelected && <span className="ml-1 text-xs text-green-600">(selected)</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : query.length >= 2 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">
              No matching codes found. Try a different search term.
            </div>
          ) : null}
        </div>
      )}

      {selectedCodes.length >= maxCodes && (
        <p className="text-xs text-muted-foreground mt-1">Maximum {maxCodes} diagnosis codes.</p>
      )}
    </div>
  );
}
