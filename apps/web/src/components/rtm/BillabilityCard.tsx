"use client";

import { CPT_CODES } from "@steady/shared";
import type { BillabilityResult } from "@/lib/rtm-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

const CPT_INFO: Record<string, { description: string; rate: number }> = CPT_CODES;

interface BillabilityCardProps {
  billability: BillabilityResult;
  isLogging: boolean;
  onLogAction: (action: { minutes?: number; interactive?: boolean }) => void;
}

export function BillabilityCard({
  billability,
  isLogging,
  onLogAction,
}: BillabilityCardProps) {
  return (
    <Card className="border-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">
          Billability Checklist
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {billability.items.map((item) => {
            const StatusIcon =
              item.status === "done"
                ? CheckCircle2
                : item.status === "warning"
                  ? AlertCircle
                  : X;
            const statusColor =
              item.status === "done"
                ? "text-green-600"
                : item.status === "warning"
                  ? "text-amber-500"
                  : "text-red-500";

            return (
              <div
                key={item.label}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <StatusIcon
                    className={cn("h-5 w-5 shrink-0", statusColor)}
                  />
                  <span className="text-sm font-medium">
                    {item.label}:
                  </span>
                  <span className="text-sm text-muted-foreground truncate">
                    {item.detail}
                  </span>
                </div>
                <div className="flex items-center gap-2 ml-7 sm:ml-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs whitespace-nowrap",
                      item.status === "done"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : item.status === "warning"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-red-50 text-red-700 border-red-200"
                    )}
                  >
                    {item.shortDetail}
                  </Badge>
                  {item.action && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={isLogging}
                      onClick={() => onLogAction(item.action!)}
                    >
                      {item.action.label}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1 text-sm">
          {billability.eligibleCodes.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground whitespace-nowrap">
                Eligible Codes:
              </span>
              <span className="font-medium">
                {(() => {
                  const counts = new Map<string, number>();
                  for (const code of billability.eligibleCodes) {
                    counts.set(code, (counts.get(code) || 0) + 1);
                  }
                  return Array.from(counts.entries()).map(([code, count]) => {
                    const info = CPT_INFO[code];
                    const unitLabel = count > 1 ? ` x${count}` : "";
                    return `${code}${unitLabel}${info ? ` (${formatMoney(info.rate * count)})` : ""}`;
                  }).join(", ");
                })()}
              </span>
            </div>
          )}

          {billability.missingCodes.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground whitespace-nowrap">
                Missing:
              </span>
              <span className="text-sm">
                {billability.missingCodes.map((m) => {
                  const info = CPT_INFO[m.code];
                  return `${m.code}${info ? ` (${formatMoney(info.rate)})` : ""} — ${m.reason}`;
                }).join("; ")}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <span className="text-muted-foreground">
              Potential revenue this period:
            </span>
            <span className="font-bold text-lg">
              {formatMoney(billability.potentialRevenue)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
