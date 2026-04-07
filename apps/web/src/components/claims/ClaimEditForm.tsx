"use client";

import { useState } from "react";
import { useResubmitClaim, useSubmitClaim } from "@/hooks/use-claims";
import { DiagnosisCodePicker } from "./DiagnosisCodePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, X, Plus } from "lucide-react";
import { showToast } from "@/hooks/use-toast";

const COMMON_MODIFIERS = [
  { code: "95", label: "Synchronous Telehealth" },
  { code: "GT", label: "Telehealth" },
  { code: "HO", label: "Master's level" },
  { code: "AH", label: "Clinical psychologist" },
  { code: "AJ", label: "Clinical social worker" },
];

interface ClaimEditFormProps {
  claim: {
    id: string;
    diagnosisCodes: string[];
    serviceCode: string;
    modifiers?: string[];
    participantId: string;
  };
  onCancel: () => void;
  onSuccess: () => void;
}

export function ClaimEditForm({ claim, onCancel, onSuccess }: ClaimEditFormProps) {
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>(claim.diagnosisCodes);
  const [serviceCode, setServiceCode] = useState(claim.serviceCode);
  const [modifiers, setModifiers] = useState<string[]>(claim.modifiers ?? []);
  const [modifierInput, setModifierInput] = useState("");
  const resubmitClaim = useResubmitClaim();
  const submitClaim = useSubmitClaim();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addModifier = (code: string) => {
    const upper = code.trim().toUpperCase();
    if (!upper || modifiers.includes(upper) || modifiers.length >= 4) return;
    setModifiers((prev) => [...prev, upper]);
    setModifierInput("");
  };

  const removeModifier = (code: string) => {
    setModifiers((prev) => prev.filter((m) => m !== code));
  };

  const handleResubmit = async () => {
    setIsSubmitting(true);
    try {
      // First resubmit with corrections (resets to DRAFT)
      const updated: any = await resubmitClaim.mutateAsync({
        claimId: claim.id,
        data: {
          diagnosisCodes:
            JSON.stringify(diagnosisCodes) !== JSON.stringify(claim.diagnosisCodes)
              ? diagnosisCodes
              : undefined,
          serviceCode: serviceCode !== claim.serviceCode ? serviceCode : undefined,
          modifiers:
            JSON.stringify(modifiers) !== JSON.stringify(claim.modifiers ?? [])
              ? modifiers
              : undefined,
        },
      });

      // Then immediately submit the corrected claim
      await submitClaim.mutateAsync(claim.id);

      showToast("Claim resubmitted with corrections", "success");
      onSuccess();
    } catch (err: any) {
      showToast(err?.message || "Failed to resubmit claim", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = diagnosisCodes.length >= 1 && serviceCode.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3">
        <p className="text-sm text-yellow-800">
          Correct the claim data below, then click &quot;Resubmit&quot; to send the corrected claim to the payer.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Diagnosis Codes (ICD-10)</Label>
        <DiagnosisCodePicker
          selectedCodes={diagnosisCodes}
          onCodesChange={setDiagnosisCodes}
          participantId={claim.participantId}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="serviceCode">CPT / Service Code</Label>
        <Input
          id="serviceCode"
          value={serviceCode}
          onChange={(e) => setServiceCode(e.target.value)}
          placeholder="e.g., 90834"
        />
      </div>

      {/* Modifiers */}
      <div className="space-y-2">
        <Label>Modifiers</Label>
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
                    <span className="font-sans text-muted-foreground">({common.label})</span>
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
        {modifiers.length < 4 && (
          <div className="flex gap-2">
            <Input
              value={modifierInput}
              onChange={(e) => setModifierInput(e.target.value.toUpperCase())}
              placeholder="Custom modifier (e.g. 59)"
              maxLength={2}
              className="font-mono w-40 h-8 text-xs"
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
              className="h-8 px-2"
              onClick={() => addModifier(modifierInput)}
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

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleResubmit} disabled={!isValid || isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Resubmitting...
            </>
          ) : (
            "Resubmit"
          )}
        </Button>
      </div>
    </div>
  );
}
