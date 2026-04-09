"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DollarSign, FileText } from "lucide-react";
import { useCreateInvoiceFromAppointment } from "@/hooks/use-invoices";
import { CreateClaimDialog } from "@/components/claims/CreateClaimDialog";
import { useRouter } from "next/navigation";

interface PostSessionBillingPromptProps {
  appointmentId: string;
  participantId: string;
  participantName: string;
  dateOfService: string;
  serviceCode: string;
  serviceDescription?: string;
  servicePriceCents: number;
  locationTypeName: string;
  placeOfServiceCode: string;
  hasInsurance: boolean;
  payerName: string | null;
  existingInvoiceId?: string | null;
  existingClaimId?: string | null;
  onInvoiceCreated?: (invoiceId: string) => void;
  onClaimCreated?: () => void;
  onDismiss: () => void;
  onCloseModal?: () => void;
}

export function PostSessionBillingPrompt({
  appointmentId,
  participantId,
  participantName,
  dateOfService,
  serviceCode,
  serviceDescription,
  servicePriceCents,
  locationTypeName,
  placeOfServiceCode,
  hasInsurance,
  payerName,
  existingInvoiceId,
  existingClaimId,
  onInvoiceCreated,
  onClaimCreated,
  onDismiss,
  onCloseModal,
}: PostSessionBillingPromptProps) {
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createInvoice = useCreateInvoiceFromAppointment();
  const router = useRouter();

  const hasBilling = !!existingInvoiceId || !!existingClaimId;

  async function handleCreateInvoice() {
    setError(null);
    try {
      const result = await createInvoice.mutateAsync(appointmentId);
      const invoiceId = (result as any)?.id ?? (result as any)?.data?.id;
      if (onInvoiceCreated && invoiceId) onInvoiceCreated(invoiceId);
      if (onCloseModal) onCloseModal();
      if (invoiceId) router.push(`/billing/${invoiceId}`);
      else router.push("/billing");
    } catch (e) {
      setError((e as Error).message || "Failed to create invoice");
    }
  }

  function handleClaimSuccess() {
    setShowClaimDialog(false);
    if (onClaimCreated) onClaimCreated();
  }

  if (hasBilling) return null;

  return (
    <>
      <div className="rounded-md border border-blue-200 bg-blue-50 p-3 animate-in slide-in-from-bottom-2 duration-200">
        <p className="text-sm font-medium text-blue-900 mb-2">
          Session marked as attended. How would you like to bill for this session?
        </p>

        {error && (
          <div className="mb-2 rounded border border-red-300 bg-red-50 p-2 text-xs text-red-900">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={handleCreateInvoice}
            disabled={createInvoice.isPending}
          >
            <DollarSign className="mr-1 h-4 w-4" />
            {createInvoice.isPending ? "Creating..." : "Create Invoice"}
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setShowClaimDialog(true)}
            disabled={!hasInsurance}
            title={!hasInsurance ? "No active insurance on file for this client." : undefined}
          >
            <FileText className="mr-1 h-4 w-4" />
            File Insurance Claim
          </Button>

          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="text-muted-foreground"
            onClick={onDismiss}
          >
            Bill Later
          </Button>
        </div>

        {!hasInsurance && (
          <p className="mt-1 text-xs text-muted-foreground">
            Insurance claim unavailable - no active insurance on file.
          </p>
        )}
      </div>

      <CreateClaimDialog
        open={showClaimDialog}
        onOpenChange={setShowClaimDialog}
        appointmentId={appointmentId}
        appointmentData={{
          participantId,
          participantName,
          dateOfService,
          serviceCode,
          serviceDescription,
          servicePriceCents,
          locationTypeName,
          placeOfServiceCode,
        }}
        insuranceData={hasInsurance && payerName ? { payerName } : null}
        onSuccess={handleClaimSuccess}
      />
    </>
  );
}
