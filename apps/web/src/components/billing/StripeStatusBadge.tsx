"use client";

import { useStripeConnectionStatus } from "@/hooks/use-stripe-payments";
import { Loader2 } from "lucide-react";

export function StripeStatusBadge() {
  const { data, isLoading, error } = useStripeConnectionStatus();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2" aria-busy="true">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking...</span>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-amber-600">
        Unable to check connection status
      </p>
    );
  }

  if (data?.connected) {
    return (
      <div aria-label="Online payments status: Connected">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-sm font-medium">
            Online Payments: Connected
          </span>
        </div>
        {data.accountId && (
          <p className="mt-1 text-xs text-muted-foreground">
            acct_····{data.accountId.slice(-4)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div aria-label="Online payments status: Not connected">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-gray-400" />
        <span className="text-sm font-medium">
          Online Payments: Not connected
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Contact Steady support to enable online payments for your practice.
      </p>
    </div>
  );
}
