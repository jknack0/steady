"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DiagnosisCodeSearch } from "./DiagnosisCodeSearch";
import { useCreateClaim } from "@/hooks/use-claims";
import { FileText } from "lucide-react";

interface DiagnosisCode {
  code: string;
  description: string;
}

interface CreateClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  appointmentData: {
    participantId: string;
    participantName: string;
    dateOfService: string;
    serviceCode: string;
    serviceDescription?: string;
    servicePriceCents: number;
    locationTypeName: string;
    placeOfServiceCode: string;
  };
  insuranceData: {
    payerName: string;
  } | null;
  onSuccess?: (claimId: string) => void;
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CreateClaimDialog({
  open,
  onOpenChange,
  appointmentId,
  appointmentData,
  insuranceData,
  onSuccess,
}: CreateClaimDialogProps) {
  const [diagnosisCodes, setDiagnosisCodes] = useState<DiagnosisCode[]>([]);
  const [placeOfService, setPlaceOfService] = useState(appointmentData.placeOfServiceCode);
  const [error, setError] = useState<string | null>(null);
  const createClaim = useCreateClaim();

  async function handleSubmit() {
    setError(null);
    if (diagnosisCodes.length === 0) {
      setError("At least one diagnosis code is required.");
      return;
    }
    if (!insuranceData) {
      setError("No active insurance on file for this client.");
      return;
    }
    try {
      const result = await createClaim.mutateAsync({
        appointmentId,
        diagnosisCodes: diagnosisCodes.map((c) => c.code),
      });
      const claimId = (result as any)?.id ?? (result as any)?.data?.id;
      onOpenChange(false);
      setDiagnosisCodes([]);
      setError(null);
      if (onSuccess && claimId) onSuccess(claimId);
    } catch (e) {
      const msg = (e as Error).message || "Failed to create claim";
      setError(msg);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Insurance Claim
          </DialogTitle>
        </DialogHeader>
        <DialogBody>
          {/* Pre-populated appointment data (read-only) */}
          <div className="space-y-3">
            <div className="rounded-md border bg-gray-50 p-3 space-y-2 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Client:</span>{" "}
                  <span className="font-medium">{appointmentData.participantName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  <span className="font-medium">{formatDate(appointmentData.dateOfService)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Service:</span>{" "}
                  <span className="font-medium font-mono">{appointmentData.serviceCode}</span>
                  {appointmentData.serviceDescription && (
                    <span className="text-muted-foreground ml-1">- {appointmentData.serviceDescription}</span>
                  )}
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>{" "}
                  <span className="font-medium">{formatCents(appointmentData.servicePriceCents)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Payer:</span>{" "}
                  <span className="font-medium">
                    {insuranceData?.payerName ?? "No insurance on file"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Location:</span>{" "}
                  <span className="font-medium">{appointmentData.locationTypeName}</span>
                </div>
              </div>
            </div>

            {/* Place of service */}
            <div>
              <Label htmlFor="pos-code">Place of Service Code</Label>
              <Input
                id="pos-code"
                value={placeOfService}
                onChange={(e) => setPlaceOfService(e.target.value)}
                maxLength={2}
                className="w-24"
                placeholder="02"
              />
              <p className="text-xs text-muted-foreground mt-1">
                02 = Telehealth, 11 = Office
              </p>
            </div>

            {/* Diagnosis codes */}
            <div>
              <Label>Diagnosis Codes (ICD-10) *</Label>
              <div className="mt-1">
                <DiagnosisCodeSearch
                  participantId={appointmentData.participantId}
                  selectedCodes={diagnosisCodes}
                  onChange={setDiagnosisCodes}
                  maxCodes={4}
                />
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div
                role="alert"
                className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-900"
              >
                {error}
              </div>
            )}
          </div>
        </DialogBody>
        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={createClaim.isPending || diagnosisCodes.length === 0 || !insuranceData}
            onClick={handleSubmit}
          >
            {createClaim.isPending ? "Submitting..." : "Submit Claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
