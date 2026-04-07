"use client";

import { useState } from "react";
import { useResubmitClaim } from "@/hooks/use-claims";
import { ResubmitClaimSchema } from "@steady/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X, Plus } from "lucide-react";

interface ResubmitFormProps {
  claimId: string;
  currentDiagnosisCodes: string[];
  currentServiceCode: string;
  currentModifiers?: string[];
  onCancel: () => void;
  onSuccess: () => void;
}

const COMMON_MODIFIERS = [
  { code: "95", label: "Synchronous Telehealth" },
  { code: "GT", label: "Telehealth" },
  { code: "HO", label: "Master's level" },
  { code: "AH", label: "Clinical psychologist" },
  { code: "AJ", label: "Clinical social worker" },
];

export function ResubmitForm({
  claimId,
  currentDiagnosisCodes,
  currentServiceCode,
  currentModifiers = [],
  onCancel,
  onSuccess,
}: ResubmitFormProps) {
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>(
    currentDiagnosisCodes.length > 0 ? [...currentDiagnosisCodes] : [""],
  );
  const [serviceCode, setServiceCode] = useState(currentServiceCode);
  const [modifiers, setModifiers] = useState<string[]>([...currentModifiers]);
  const [modifierInput, setModifierInput] = useState("");
  const [newCode, setNewCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addModifier = (code: string) => {
    const upper = code.trim().toUpperCase();
    if (!upper || modifiers.includes(upper) || modifiers.length >= 4) return;
    setModifiers((prev) => [...prev, upper]);
    setModifierInput("");
  };

  const removeModifier = (code: string) => {
    setModifiers((prev) => prev.filter((m) => m !== code));
  };

  const resubmit = useResubmitClaim();

  function handleRemoveCode(index: number) {
    setDiagnosisCodes((prev) => prev.filter((_, i) => i !== index));
    setErrors({});
  }

  function handleAddCode() {
    const trimmed = newCode.trim().toUpperCase();
    if (!trimmed) {
      setErrors({ newCode: "Enter a diagnosis code" });
      return;
    }
    if (diagnosisCodes.includes(trimmed)) {
      setErrors({ newCode: "Code already added" });
      return;
    }
    setDiagnosisCodes((prev) => [...prev, trimmed]);
    setNewCode("");
    setErrors({});
  }

  function handleSubmit() {
    const payload: { diagnosisCodes?: string[]; serviceCode?: string; modifiers?: string[] } = {};

    // Only include changed fields
    const codesChanged =
      diagnosisCodes.length !== currentDiagnosisCodes.length ||
      diagnosisCodes.some((c, i) => c !== currentDiagnosisCodes[i]);
    if (codesChanged) {
      payload.diagnosisCodes = diagnosisCodes;
    }
    if (serviceCode !== currentServiceCode) {
      payload.serviceCode = serviceCode;
    }
    const modifiersChanged =
      modifiers.length !== currentModifiers.length ||
      modifiers.some((m, i) => m !== currentModifiers[i]);
    if (modifiersChanged) {
      payload.modifiers = modifiers;
    }

    // Validate
    const result = ResubmitClaimSchema.safeParse(payload);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const path = issue.path.join(".");
        fieldErrors[path] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    resubmit.mutate(
      { claimId, data: result.data },
      {
        onSuccess: () => {
          onSuccess();
        },
      },
    );
  }

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-4">
      <h4 className="text-sm font-semibold">Correction Form</h4>

      {/* Service Code */}
      <div className="space-y-1.5">
        <Label htmlFor="serviceCode">Service Code (CPT)</Label>
        <Input
          id="serviceCode"
          value={serviceCode}
          onChange={(e) => {
            setServiceCode(e.target.value);
            setErrors({});
          }}
          placeholder="e.g. 90834"
          className="font-mono"
        />
        {errors.serviceCode && (
          <p className="text-xs text-destructive">{errors.serviceCode}</p>
        )}
      </div>

      {/* Diagnosis Codes */}
      <div className="space-y-1.5">
        <Label>Diagnosis Codes</Label>
        <div className="flex flex-wrap gap-2">
          {diagnosisCodes.map((code, index) => (
            <span
              key={`${code}-${index}`}
              className="inline-flex items-center gap-1 rounded-md bg-background border px-2.5 py-1 text-xs font-mono"
            >
              {code}
              <button
                type="button"
                onClick={() => handleRemoveCode(index)}
                disabled={diagnosisCodes.length <= 1}
                className="text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={`Remove ${code}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        {errors.diagnosisCodes && (
          <p className="text-xs text-destructive">{errors.diagnosisCodes}</p>
        )}

        {/* Add code input */}
        {diagnosisCodes.length < 4 && (
          <div className="flex gap-2 mt-2">
            <Input
              value={newCode}
              onChange={(e) => {
                setNewCode(e.target.value.toUpperCase());
                setErrors({});
              }}
              placeholder="Add code (e.g. F90.0)"
              className="font-mono text-xs h-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddCode();
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddCode}
              className="h-8 px-2"
              aria-label="Add diagnosis code"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {errors.newCode && (
          <p className="text-xs text-destructive">{errors.newCode}</p>
        )}
      </div>

      {/* Modifiers */}
      <div className="space-y-1.5">
        <Label>Modifiers</Label>
        {/* Selected modifiers */}
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
        {modifiers.length < 4 && (
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
        {modifiers.length < 4 && (
          <div className="flex gap-2 mt-2">
            <Input
              value={modifierInput}
              onChange={(e) => {
                setModifierInput(e.target.value.toUpperCase());
                setErrors({});
              }}
              placeholder="Custom modifier (e.g. 59)"
              maxLength={2}
              className="font-mono text-xs h-8"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addModifier(modifierInput);
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => addModifier(modifierInput)}
              className="h-8 px-2"
              disabled={!modifierInput.trim()}
              aria-label="Add modifier"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          CMS-1500 Box 24D. Max 4 modifiers per service line.
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={resubmit.isPending}
        >
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={resubmit.isPending}
        >
          {resubmit.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              Resubmitting...
            </>
          ) : (
            "Resubmit Claim"
          )}
        </Button>
      </div>
    </div>
  );
}
