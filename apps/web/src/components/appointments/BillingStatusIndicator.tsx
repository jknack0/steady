"use client";

import { cn } from "@/lib/utils";
import { DollarSign, Shield } from "lucide-react";
import type { ClaimStatus } from "@/lib/appointment-types";

interface BillingStatusIndicatorProps {
  invoiceId?: string | null;
  invoiceStatus?: string;
  claimId?: string | null;
  claimStatus?: ClaimStatus | string | null;
  appointmentStatus: string;
}

function getInvoiceIndicator(invoiceId: string | null | undefined, invoiceStatus?: string) {
  if (!invoiceId) return null;
  const status = invoiceStatus ?? "DRAFT";
  if (status === "PAID") {
    return { icon: DollarSign, color: "text-green-600", label: "Invoice paid" };
  }
  if (status === "SENT" || status === "PARTIALLY_PAID" || status === "OVERDUE") {
    return { icon: DollarSign, color: "text-blue-600", label: `Invoice ${status.toLowerCase()}` };
  }
  // DRAFT
  return { icon: DollarSign, color: "text-orange-500", label: "Invoice draft" };
}

function getClaimIndicator(claimId: string | null | undefined, claimStatus?: ClaimStatus | string | null) {
  if (!claimId) return null;
  const status = claimStatus ?? "DRAFT";
  if (status === "PAID" || status === "ACCEPTED") {
    return { icon: Shield, color: "text-green-600", label: `Claim ${status.toLowerCase()}` };
  }
  if (status === "SUBMITTED") {
    return { icon: Shield, color: "text-blue-600", label: "Claim submitted" };
  }
  if (status === "REJECTED" || status === "DENIED") {
    return { icon: Shield, color: "text-red-600", label: `Claim ${status.toLowerCase()}` };
  }
  // DRAFT
  return { icon: Shield, color: "text-orange-500", label: "Claim draft" };
}

export function BillingStatusIndicator({
  invoiceId,
  invoiceStatus,
  claimId,
  claimStatus,
  appointmentStatus,
}: BillingStatusIndicatorProps) {
  if (appointmentStatus !== "ATTENDED") return null;

  const invoiceInd = getInvoiceIndicator(invoiceId, invoiceStatus);
  const claimInd = getClaimIndicator(claimId, claimStatus);

  if (!invoiceInd && !claimInd) {
    return (
      <span className="text-[10px] text-orange-600 font-medium" title="No invoice or claim created">
        Unbilled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5">
      {invoiceInd && (
        <span title={invoiceInd.label}>
          <invoiceInd.icon className={cn("h-3.5 w-3.5", invoiceInd.color)} aria-label={invoiceInd.label} />
        </span>
      )}
      {claimInd && (
        <span title={claimInd.label}>
          <claimInd.icon className={cn("h-3.5 w-3.5", claimInd.color)} aria-label={claimInd.label} />
        </span>
      )}
    </span>
  );
}
