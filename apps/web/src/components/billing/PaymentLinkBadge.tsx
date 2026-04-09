"use client";

import { Link2, Clock, CheckCircle } from "lucide-react";

interface PaymentLinkBadgeProps {
  paymentLinkUrl: string | null;
  paymentLinkExpiresAt: string | null;
  status: string;
}

export function PaymentLinkBadge({
  paymentLinkUrl,
  paymentLinkExpiresAt,
  status,
}: PaymentLinkBadgeProps) {
  // Paid via Stripe
  if (status === "PAID" && paymentLinkUrl) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
        aria-label="Paid online"
      >
        <CheckCircle className="h-3 w-3" />
        Paid online
      </span>
    );
  }

  if (!paymentLinkUrl) return null;

  // Check if expired
  const isExpired =
    paymentLinkExpiresAt && new Date(paymentLinkExpiresAt) < new Date();

  if (isExpired) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600"
        aria-label="Payment link expired"
      >
        <Clock className="h-3 w-3" />
        Link expired
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700"
      aria-label="Payment link sent"
    >
      <Link2 className="h-3 w-3" />
      Payment link sent
    </span>
  );
}
