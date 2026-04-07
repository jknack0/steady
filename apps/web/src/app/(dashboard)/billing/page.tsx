"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInvoices, useDeleteInvoice } from "@/hooks/use-invoices";
import { useBillingSummary } from "@/hooks/use-billing-summary";
import { PaymentLinkBadge } from "@/components/billing/PaymentLinkBadge";
import { BalanceDueIndicator } from "@/components/billing/BalanceDueIndicator";
import { StripeStatusBadge } from "@/components/billing/StripeStatusBadge";
import { Button } from "@/components/ui/button";
import { DollarSign, Plus, AlertTriangle, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnbilledSessionsSection } from "@/components/billing/UnbilledSessionsSection";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  OVERDUE: "bg-red-100 text-red-700",
  VOID: "bg-gray-100 text-gray-400 line-through",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  PARTIALLY_PAID: "Partial",
  OVERDUE: "Overdue",
  VOID: "Void",
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className={cn("h-4 w-4", accent)} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function BillingPage() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const { data: summaryData } = useBillingSummary();
  const { data: invoiceData, isLoading } = useInvoices({ status: statusFilter || undefined });
  const deleteInvoice = useDeleteInvoice();

  const summary = summaryData;
  const invoices = (invoiceData as any)?.data ?? invoiceData ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Billing</h1>
        <div className="flex items-center gap-4">
          <StripeStatusBadge />
          <Button onClick={() => router.push("/billing/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Unbilled sessions queue */}
      <UnbilledSessionsSection />

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Outstanding"
            value={formatCents(summary.totalOutstandingCents)}
            icon={DollarSign}
          />
          <SummaryCard
            label="Received This Month"
            value={formatCents(summary.totalReceivedThisMonthCents)}
            icon={DollarSign}
            accent="text-green-600"
          />
          <SummaryCard
            label="Overdue"
            value={String(summary.overdueCount)}
            icon={AlertTriangle}
            accent="text-red-600"
          />
          <SummaryCard
            label="Total Invoices"
            value={String(
              Object.entries(summary.invoiceCountsByStatus)
                .filter(([k]) => k !== "VOID")
                .reduce((sum, [, v]) => sum + v, 0),
            )}
            icon={FileText}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          className="rounded-md border px-3 py-1.5 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="SENT">Sent</option>
          <option value="PAID">Paid</option>
          <option value="PARTIALLY_PAID">Partial</option>
          <option value="OVERDUE">Overdue</option>
          <option value="VOID">Void</option>
        </select>
        {statusFilter && (
          <button
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setStatusFilter("")}
          >
            Clear
          </button>
        )}
      </div>

      {/* Invoice table */}
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading invoices...</div>
      ) : Array.isArray(invoices) && invoices.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">#</th>
                <th className="px-4 py-3 text-left font-medium">Client</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Paid</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <tr
                  key={inv.id}
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/billing/${inv.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    {inv.participant?.user
                      ? `${inv.participant.user.firstName} ${inv.participant.user.lastName}`.trim()
                      : "Unknown"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCents(inv.totalCents)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCents(inv.paidCents)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatCents(inv.totalCents - inv.paidCents)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-1">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          STATUS_COLORS[inv.status] ?? "bg-gray-100",
                        )}
                      >
                        {STATUS_LABELS[inv.status] ?? inv.status}
                      </span>
                      {inv.paymentLinkUrl && (
                        <PaymentLinkBadge
                          paymentLinkUrl={inv.paymentLinkUrl}
                          paymentLinkExpiresAt={inv.paymentLinkExpiresAt}
                          status={inv.status}
                        />
                      )}
                      {inv.balanceDueSourceInvoiceId && (
                        <BalanceDueIndicator />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {inv.status === "DRAFT" && (
                      <button
                        className="text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this draft invoice?")) {
                            deleteInvoice.mutate(inv.id);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-lg border bg-white p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-medium">No invoices yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first invoice to start tracking billing.
          </p>
          <Button className="mt-4" onClick={() => router.push("/billing/new")}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      )}
    </div>
  );
}
