"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { DiagnosisCodePicker } from "./DiagnosisCodePicker";
import { ModifierInput } from "@/components/billing/ModifierInput";
import { AlertBanner } from "@/components/ui/alert-banner";
import { useCreateClaim, useSubmitClaim } from "@/hooks/use-claims";
import { useBillableAppointments } from "@/hooks/use-appointments";
import { Loader2, FileText, CalendarCheck } from "lucide-react";
import { showToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";

interface DiagnosisCode {
  code: string;
  description: string;
}

interface NewClaimFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewClaimFlow({ open, onOpenChange }: NewClaimFlowProps) {
  const { data: appointments, isLoading: appointmentsLoading } = useBillableAppointments();
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);
  const [diagnosisCodes, setDiagnosisCodes] = useState<DiagnosisCode[]>([]);
  const [modifiers, setModifiers] = useState<string[]>([]);
  const [placeOfService, setPlaceOfService] = useState("");
  const [error, setError] = useState<string | null>(null);
  const createClaim = useCreateClaim();
  const submitClaim = useSubmitClaim();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const billable = appointments ?? [];
  const selectedAppointment = billable.find((a: any) => a.id === selectedAppointmentId) as any;

  // Auto-populate place of service when appointment is selected
  const effectivePOS = placeOfService || (selectedAppointment?.location?.type === "VIRTUAL" ? "02" : "11");

  const resetState = () => {
    setSelectedAppointmentId(null);
    setDiagnosisCodes([]);
    setModifiers([]);
    setPlaceOfService("");
    setError(null);
    setIsSubmitting(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  const handleCreateDraft = async () => {
    setError(null);
    if (!selectedAppointmentId) {
      setError("Please select an appointment.");
      return;
    }
    if (diagnosisCodes.length === 0) {
      setError("At least one diagnosis code is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      await createClaim.mutateAsync({
        appointmentId: selectedAppointmentId,
        diagnosisCodes: diagnosisCodes.map((c) => c.code),
        modifiers,
      });
      showToast("Claim created as draft", "success");
      handleOpenChange(false);
    } catch (e) {
      setError((e as Error).message || "Failed to create claim");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAndSubmit = async () => {
    setError(null);
    if (!selectedAppointmentId) {
      setError("Please select an appointment.");
      return;
    }
    if (diagnosisCodes.length === 0) {
      setError("At least one diagnosis code is required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const result: any = await createClaim.mutateAsync({
        appointmentId: selectedAppointmentId,
        diagnosisCodes: diagnosisCodes.map((c) => c.code),
        modifiers,
      });
      const claimId = result?.id ?? result?.data?.id;
      if (claimId) {
        await submitClaim.mutateAsync(claimId);
      }
      showToast("Claim submitted to payer", "success");
      handleOpenChange(false);
    } catch (e) {
      setError((e as Error).message || "Failed to create and submit claim");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent size="md">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            New Insurance Claim
          </DialogTitle>
          <DialogDescription>
            Select a billable appointment and add diagnosis codes to create a claim.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Appointment picker */}
            <div className="space-y-2">
              <Label>Appointment</Label>
              {appointmentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading appointments...
                </div>
              ) : billable.length === 0 ? (
                <div className="rounded-md border border-dashed p-4 text-center">
                  <CalendarCheck className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No billable appointments.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Mark an appointment as ATTENDED to create a claim.
                  </p>
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto rounded-md border divide-y">
                  {billable.map((appt: any) => {
                    const isSelected = selectedAppointmentId === appt.id;
                    return (
                      <button
                        key={appt.id}
                        type="button"
                        onClick={() => {
                          setSelectedAppointmentId(appt.id);
                          const pos = appt.location?.type === "VIRTUAL" ? "02" : "11";
                          setPlaceOfService(pos);
                          // Auto-suggest modifier 95 for telehealth
                          if (pos === "02" && !modifiers.includes("95")) {
                            setModifiers((prev) => prev.length < 4 ? [...prev, "95"] : prev);
                          } else if (pos !== "02") {
                            setModifiers((prev) => prev.filter((m) => m !== "95"));
                          }
                        }}
                        className={`w-full px-3 py-2.5 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-primary/5 border-l-2 border-l-primary"
                            : "hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {appt.participant?.firstName ?? "Unknown"}{" "}
                            {appt.participant?.lastName ?? ""}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(appt.startAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                          <span className="font-mono">{appt.serviceCode?.code ?? "N/A"}</span>
                          {appt.serviceCode?.description && (
                            <span className="truncate">{appt.serviceCode.description}</span>
                          )}
                          {appt.location && (
                            <span>{appt.location.name}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Auto-populated details */}
            {selectedAppointment && (
              <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Client:</span>{" "}
                    <span className="font-medium">
                      {selectedAppointment.participant?.firstName}{" "}
                      {selectedAppointment.participant?.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>{" "}
                    <span className="font-medium">{formatDate(selectedAppointment.startAt)}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">CPT:</span>{" "}
                    <span className="font-mono font-medium">{selectedAppointment.serviceCode?.code ?? "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Place of Service:</span>{" "}
                    <span className="font-mono font-medium">{effectivePOS}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Diagnosis codes */}
            {selectedAppointment && (
              <div className="space-y-2">
                <Label>Diagnosis Codes (ICD-10) *</Label>
                <DiagnosisCodePicker
                  selectedCodes={diagnosisCodes.map((c) => c.code)}
                  onCodesChange={(codes) =>
                    setDiagnosisCodes(codes.map((code) => {
                      const existing = diagnosisCodes.find((d) => d.code === code);
                      return existing ?? { code, description: "" };
                    }))
                  }
                  participantId={selectedAppointment.participantId}
                  maxCodes={4}
                />
              </div>
            )}

            {/* Modifiers */}
            {selectedAppointment && (
              <div className="space-y-2">
                <Label>Modifiers</Label>
                <ModifierInput modifiers={modifiers} onChange={setModifiers} />
              </div>
            )}

            {/* Error display */}
            {error && <AlertBanner variant="error">{error}</AlertBanner>}
          </div>
        </DialogBody>

        <DialogFooter className="px-6 py-4 border-t">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={isSubmitting || diagnosisCodes.length === 0 || !selectedAppointmentId}
            onClick={handleCreateDraft}
          >
            {isSubmitting ? "Creating..." : "Create Draft"}
          </Button>
          <Button
            type="button"
            disabled={isSubmitting || diagnosisCodes.length === 0 || !selectedAppointmentId}
            onClick={handleCreateAndSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Submitting...
              </>
            ) : (
              "Create & Submit"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
