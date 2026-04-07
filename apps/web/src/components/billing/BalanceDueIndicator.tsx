"use client";

import { Info } from "lucide-react";

interface BalanceDueIndicatorProps {
  sourceInvoiceNumber?: string;
}

export function BalanceDueIndicator({
  sourceInvoiceNumber,
}: BalanceDueIndicatorProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
      aria-label={
        sourceInvoiceNumber
          ? `Auto-generated balance-due invoice from invoice number ${sourceInvoiceNumber}`
          : "Auto-generated balance-due invoice after insurance payment"
      }
      title={
        sourceInvoiceNumber
          ? `Auto-generated from invoice #${sourceInvoiceNumber} after insurance payment`
          : "Auto-generated after insurance payment"
      }
    >
      <Info className="h-3 w-3" />
      Balance due
    </span>
  );
}
