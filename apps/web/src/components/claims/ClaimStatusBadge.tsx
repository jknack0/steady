"use client";

import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  DRAFT: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft" },
  SUBMITTED: { bg: "bg-blue-100", text: "text-blue-700", label: "Submitted" },
  ACCEPTED: { bg: "bg-teal-100", text: "text-teal-700", label: "Accepted" },
  REJECTED: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  DENIED: { bg: "bg-red-900", text: "text-white", label: "Denied" },
  PAID: { bg: "bg-green-100", text: "text-green-700", label: "Paid" },
};

export function ClaimStatusBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.DRAFT;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
      )}
      aria-label={`Claim status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
