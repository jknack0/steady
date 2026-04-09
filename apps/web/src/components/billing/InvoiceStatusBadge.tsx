"use client";

import { cn } from "@/lib/utils";
import { INVOICE_STATUS_COLORS } from "@/lib/billing-constants";

export function InvoiceStatusBadge({ status }: { status: string }) {
  const config = INVOICE_STATUS_COLORS[status] || INVOICE_STATUS_COLORS.DRAFT;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
        status === "VOID" && "line-through",
      )}
      aria-label={`Invoice status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
