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
import { useParticipantInsurance } from "@/hooks/use-participant-insurance";
import { FileText, X } from "lucide-react";

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
  insuranceData?: {
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
  const [modifiers, setModifiers] = useState<string[]>(
    appointmentData.placeOfServiceCode === "02" ? ["95"] : [],
  );
  const [modifierInput, setModifierInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createClaim = useCreateClaim();

  const COMMON_MODIFIERS = [
    { code: "95", label: "Synchronous Telehealth" },
    { code: "GT", label: "Telehealth" },
    { code: "HO", label: "Master's level" },
    { code: "AH", label: "Clinical psychologist" },
    { code: "AJ", label: "Clinical social worker" },
  ];

  const addModifier = (code: string) => {
    const upper = code.trim().toUpperCase();
    if (!upper || modifiers.includes(upper) || modifiers.length >= 4) return;
    setModifiers((prev) => [...prev, upper]);
    setModifierInput("");
  };

  const removeModifier = (code: string) => {
    setModifiers((prev) => prev.filter((m) => m !== code));
  };

  // Fetch insurance from API when not provided via props
  const fetchParticipantId = insuranceData === undefined ? appointmentData.participantId : undefined;
  const { insurance: fetchedInsurance, isLoading: insuranceLoading } =
    useParticipantInsurance(fetchParticipantId);

  // Use prop if explicitly provided (including null), otherwise use fetched data
  const resolvedInsurance =
    insuranceData !== undefined
      ? insuranceData
      : fetchedInsurance
        ? { payerName: fetchedInsurance.payerName }
        : null;

  async function handleSubmit() {
    setError(null);
    if (diagnosisCodes.length === 0) {
      setError("At least one diagnosis code is required.");
      return;
    }
    if (!resolvedInsurance) {
      setError("No active insurance on file for this client.");
      return;
    }
    try {
      const result = await createClaim.mutateAsync({
        appointmentId,
        diagnosisCodes: diagnosisCodes.map((c) => c.code),
        modifiers,
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
                    {insuranceLoading ? "Loading..." : (resolvedInsurance?.payerName ?? "No insurance on file")}
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

            {/* Modifiers */}
            <div className="space-y-2">
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
                    className="h-8 px-3 text-xs"
                    onClick={() => addModifier(modifierInput)}
                    disabled={!modifierInput.trim()}
                  >
                    Add
                  </Button>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                CMS-1500 Box 24D. Max 4 modifiers per service line.
              </p>
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
            disabled={createClaim.isPending || diagnosisCodes.length === 0 || !resolvedInsurance || insuranceLoading}
            onClick={handleSubmit}
          >
            {createClaim.isPending ? "Submitting..." : "Submit Claim"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
