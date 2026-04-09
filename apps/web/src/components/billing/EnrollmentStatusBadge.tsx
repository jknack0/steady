"use client";

import { cn } from "@/lib/utils";
import { ENROLLMENT_STATUS_COLORS } from "@/lib/billing-constants";

export function EnrollmentStatusBadge({ status }: { status: string }) {
  const config = ENROLLMENT_STATUS_COLORS[status] || {
    bg: "bg-gray-100",
    text: "text-gray-700",
    label: status,
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.bg,
        config.text,
      )}
      aria-label={`Enrollment status: ${config.label}`}
    >
      {config.label}
    </span>
  );
}
