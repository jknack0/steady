"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUnbilledAppointments } from "@/hooks/use-appointments";
import { useCreateInvoiceFromAppointment } from "@/hooks/use-invoices";
import { CreateClaimDialog } from "@/components/claims/CreateClaimDialog";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, CheckCircle2, DollarSign, FileText } from "lucide-react";
import type { AppointmentView } from "@/lib/appointment-types";

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

function getParticipantName(appt: AppointmentView): string {
  if (!appt.participant) return "Unknown";
  const first = appt.participant.firstName ?? "";
  const last = appt.participant.lastName ?? "";
  return `${first} ${last}`.trim() || "Unknown";
}

function getPlaceOfServiceCode(appt: AppointmentView): string {
  const locType = appt.location?.type;
  if (locType === "VIRTUAL") return "02";
  return "11";
}

export function UnbilledSessionsSection() {
  const router = useRouter();
  const { data: appointments, isLoading } = useUnbilledAppointments();
  const createInvoice = useCreateInvoiceFromAppointment();
  const [collapsed, setCollapsed] = useState(false);
  const [claimDialogAppt, setClaimDialogAppt] = useState<AppointmentView | null>(null);
  const [creatingInvoiceFor, setCreatingInvoiceFor] = useState<string | null>(null);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);

  const unbilled = appointments ?? [];
  const count = unbilled.length;

  async function handleCreateInvoice(appt: AppointmentView) {
    setInvoiceError(null);
    setCreatingInvoiceFor(appt.id);
    try {
      const result = await createInvoice.mutateAsync(appt.id);
      const invoiceId = (result as any)?.id ?? (result as any)?.data?.id;
      if (invoiceId) router.push(`/billing/${invoiceId}`);
    } catch (e) {
      setInvoiceError((e as Error).message || "Failed to create invoice");
    } finally {
      setCreatingInvoiceFor(null);
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <div className="text-sm text-muted-foreground">Loading unbilled sessions...</div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-white">
        {/* Header */}
        <button
          type="button"
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
          onClick={() => setCollapsed(!collapsed)}
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Unbilled Sessions</span>
            {count > 0 ? (
              <span className="inline-flex items-center rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-xs font-medium">
                {count}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                All sessions billed
              </span>
            )}
          </div>
          {collapsed ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Body */}
        {!collapsed && count > 0 && (
          <div className="border-t">
            {invoiceError && (
              <div className="px-4 py-2 text-xs text-red-600 bg-red-50 border-b">
                {invoiceError}
              </div>
            )}
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Client</th>
                  <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Date</th>
                  <th className="px-4 py-2 text-left font-medium text-xs text-muted-foreground">Service</th>
                  <th className="px-4 py-2 text-right font-medium text-xs text-muted-foreground">Price</th>
                  <th className="px-4 py-2 text-right font-medium text-xs text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unbilled.map((appt) => (
                  <tr key={appt.id} className="border-b last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium">{getParticipantName(appt)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatDate(appt.startAt)}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{appt.serviceCode?.code ?? "-"}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {appt.serviceCode?.defaultPriceCents
                        ? formatCents(appt.serviceCode.defaultPriceCents)
                        : "-"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={creatingInvoiceFor === appt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCreateInvoice(appt);
                          }}
                        >
                          <DollarSign className="mr-1 h-3 w-3" />
                          {creatingInvoiceFor === appt.id ? "Creating..." : "Invoice"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setClaimDialogAppt(appt);
                          }}
                        >
                          <FileText className="mr-1 h-3 w-3" />
                          Claim
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Claim dialog for selected appointment */}
      {claimDialogAppt && (
        <CreateClaimDialog
          open={!!claimDialogAppt}
          onOpenChange={(open) => {
            if (!open) setClaimDialogAppt(null);
          }}
          appointmentId={claimDialogAppt.id}
          appointmentData={{
            participantId: claimDialogAppt.participantId,
            participantName: getParticipantName(claimDialogAppt),
            dateOfService: claimDialogAppt.startAt,
            serviceCode: claimDialogAppt.serviceCode?.code ?? "",
            serviceDescription: claimDialogAppt.serviceCode?.description,
            servicePriceCents: claimDialogAppt.serviceCode?.defaultPriceCents ?? 0,
            locationTypeName: claimDialogAppt.location?.name ?? "",
            placeOfServiceCode: getPlaceOfServiceCode(claimDialogAppt),
          }}
          onSuccess={() => setClaimDialogAppt(null)}
        />
      )}
    </>
  );
}
