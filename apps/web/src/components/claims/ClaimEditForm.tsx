"use client";

import { useState } from "react";
import { useResubmitClaim, useSubmitClaim } from "@/hooks/use-claims";
import { DiagnosisCodePicker } from "./DiagnosisCodePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { showToast } from "@/hooks/use-toast";

interface ClaimEditFormProps {
  claim: {
    id: string;
    diagnosisCodes: string[];
    serviceCode: string;
    participantId: string;
  };
  onCancel: () => void;
  onSuccess: () => void;
}

export function ClaimEditForm({ claim, onCancel, onSuccess }: ClaimEditFormProps) {
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>(claim.diagnosisCodes);
  const [serviceCode, setServiceCode] = useState(claim.serviceCode);
  const resubmitClaim = useResubmitClaim();
  const submitClaim = useSubmitClaim();
  const [isSubmitting, setIsSubmitting] = useState(false);

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
