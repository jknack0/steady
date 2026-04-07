"use client";

import { useState } from "react";
import { useDiagnosisCodeSearch } from "@/hooks/use-diagnosis-codes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, Search, Loader2 } from "lucide-react";

interface DiagnosisCode {
  code: string;
  description: string;
  category?: string;
  isCommon?: boolean;
}

interface DiagnosisCodePickerProps {
  selectedCodes: string[];
  onCodesChange: (codes: string[]) => void;
  participantId?: string;
  maxCodes?: number;
}

export function DiagnosisCodePicker({
  selectedCodes,
  onCodesChange,
  participantId,
  maxCodes = 4,
}: DiagnosisCodePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading } = useDiagnosisCodeSearch(searchQuery, participantId);

  const searchResults: DiagnosisCode[] = (data as any)?.results ?? [];
  const recentCodes: DiagnosisCode[] = (data as any)?.recent ?? [];

  const addCode = (code: string) => {
    if (selectedCodes.length >= maxCodes) return;
    if (selectedCodes.includes(code)) return;
    onCodesChange([...selectedCodes, code]);
    setSearchQuery("");
  };

  const removeCode = (code: string) => {
    onCodesChange(selectedCodes.filter((c) => c !== code));
  };

  const getDescription = (code: string): string => {
    const found =
      searchResults.find((r) => r.code === code) ??
      recentCodes.find((r) => r.code === code);
    return found?.description ?? code;
  };

  return (
    <div className="space-y-3">
      {/* Selected codes */}
      {selectedCodes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCodes.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
            >
              {code}
              <button
                type="button"
                onClick={() => removeCode(code)}
                className="ml-0.5 rounded-sm hover:bg-primary/20"
                aria-label={`Remove diagnosis code ${code}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {selectedCodes.length < maxCodes && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ICD-10 codes (e.g., F90, ADHD)..."
            className="pl-9"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      )}

      {/* Recent codes (shown when no search query) */}
      {!searchQuery && recentCodes.length > 0 && selectedCodes.length < maxCodes && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Recently used</p>
          <div className="max-h-32 overflow-y-auto rounded-md border">
            {recentCodes
              .filter((c) => !selectedCodes.includes(c.code))
              .map((code) => (
                <button
                  key={code.code}
                  type="button"
                  onClick={() => addCode(code.code)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 text-left"
                >
                  <span className="font-mono text-xs font-medium">{code.code}</span>
                  <span className="text-muted-foreground truncate">{code.description}</span>
                </button>
              ))}
          </div>
        </div>
      )}

      {/* Search results */}
      {searchQuery.length >= 2 && searchResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded-md border">
          {searchResults
            .filter((r) => !selectedCodes.includes(r.code))
            .map((result) => (
              <button
                key={result.code}
                type="button"
                onClick={() => addCode(result.code)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/50 text-left border-b last:border-b-0"
              >
                <span className="font-mono text-xs font-medium shrink-0">{result.code}</span>
                <span className="text-muted-foreground truncate">{result.description}</span>
                {result.isCommon && (
                  <span className="ml-auto shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">
                    Common
                  </span>
                )}
              </button>
            ))}
        </div>
      )}

      {searchQuery.length >= 2 && searchResults.length === 0 && !isLoading && (
        <p className="text-xs text-muted-foreground text-center py-2">
          No diagnosis codes found for &quot;{searchQuery}&quot;
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        {selectedCodes.length} of {maxCodes} codes selected
      </p>
    </div>
  );
}
