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
  onCancel: () => void;
  onSuccess: () => void;
}

export function ResubmitForm({
  claimId,
  currentDiagnosisCodes,
  currentServiceCode,
  onCancel,
  onSuccess,
}: ResubmitFormProps) {
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>(
    currentDiagnosisCodes.length > 0 ? [...currentDiagnosisCodes] : [""],
  );
  const [serviceCode, setServiceCode] = useState(currentServiceCode);
  const [newCode, setNewCode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    const payload: { diagnosisCodes?: string[]; serviceCode?: string } = {};

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
