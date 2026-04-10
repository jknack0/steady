"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useInvoice, useSendInvoice, useVoidInvoice, useDeleteInvoice } from "@/hooks/use-invoices";
import { usePayments, useRecordPayment, useDeletePayment } from "@/hooks/use-payments";
import { useStripeConnectionStatus } from "@/hooks/use-stripe-payments";
import { useSavedCards } from "@/hooks/use-saved-cards";
import { PaymentLinkBadge } from "@/components/billing/PaymentLinkBadge";
import { BalanceDueIndicator } from "@/components/billing/BalanceDueIndicator";
import { ChargeCardDialog } from "@/components/billing/ChargeCardDialog";
import { InvoiceStatusBadge } from "@/components/billing/InvoiceStatusBadge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Ban, Trash2, Plus, Download, CreditCard } from "lucide-react";
import { formatCents } from "@/lib/format";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  const { data: invoiceData, isLoading } = useInvoice(invoiceId);
  const { data: paymentsData } = usePayments(invoiceId);
  const sendInvoice = useSendInvoice(invoiceId);
  const voidInvoice = useVoidInvoice(invoiceId);
  const deleteInvoice = useDeleteInvoice();
  const recordPayment = useRecordPayment(invoiceId);
  const deletePaymentMut = useDeletePayment(invoiceId);

  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"OTHER" | "CASH" | "CHECK" | "CREDIT_CARD" | "INSURANCE">("CREDIT_CARD");
  const [paymentRef, setPaymentRef] = useState("");
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const { confirm, dialog: confirmDialog } = useConfirmDialog();

  const invoice = invoiceData as any;

  const { data: stripeStatus } = useStripeConnectionStatus();
  const { data: savedCardsData } = useSavedCards(invoice?.participantId as string | undefined);
  const savedCards = ((savedCardsData ?? []) as Array<{
    id: string;
    cardBrand: string;
    cardLastFour: string;
    expiryMonth: number;
    expiryYear: number;
  }>);
  const payments = ((paymentsData as any)?.data ?? paymentsData ?? []) as any[];

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!invoice) {
    return <div className="text-sm text-muted-foreground">Invoice not found.</div>;
  }

  const balanceCents = invoice.totalCents - invoice.paidCents;
  const canSend = invoice.status === "DRAFT";
  const canVoid = invoice.status !== "VOID";
  const canDelete = invoice.status === "DRAFT";
  const canPay = ["SENT", "PARTIALLY_PAID", "OVERDUE"].includes(invoice.status);
  const hasLineItemDetails = invoice.lineItems?.some(
    (li: any) =>
      li.dateOfService ||
      li.placeOfServiceCode ||
      (li.modifiers && li.modifiers.length > 0),
  );

  function handleRecordPayment() {
    const amountCents = Math.round(parseFloat(paymentAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) return;
    recordPayment.mutate(
      { amountCents, method: paymentMethod, reference: paymentRef || undefined },
      {
        onSuccess: () => {
          setShowPaymentForm(false);
          setPaymentAmount("");
          setPaymentRef("");
        },
      },
    );
  }

  return (
    <div className="space-y-6">
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/billing")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Billing
      </button>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{invoice.invoiceNumber}</h1>
          <p className="text-sm text-muted-foreground">
            Client:{" "}
            {invoice.participant?.user
              ? `${invoice.participant.user.firstName} ${invoice.participant.user.lastName}`.trim()
              : "Unknown"}
          </p>
          {(invoice.issuedAt || invoice.dueAt) && (
            <p className="text-sm text-muted-foreground">
              {invoice.issuedAt && `Issued: ${new Date(invoice.issuedAt).toLocaleDateString()}`}
              {invoice.dueAt && `${invoice.issuedAt ? " | " : ""}Due: ${new Date(invoice.dueAt).toLocaleDateString()}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <InvoiceStatusBadge status={invoice.status} />
          {invoice.paymentLinkUrl && (
            <PaymentLinkBadge
              paymentLinkUrl={invoice.paymentLinkUrl}
              paymentLinkExpiresAt={invoice.paymentLinkExpiresAt}
              status={invoice.status}
            />
          )}
          {invoice.balanceDueSourceInvoiceId && (
            <BalanceDueIndicator
              sourceInvoiceNumber={invoice.balanceDueSourceInvoice?.invoiceNumber}
            />
          )}
        </div>
      </div>

      {/* Diagnosis Codes */}
      {invoice.diagnosisCodes && invoice.diagnosisCodes.length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <div className="font-medium mb-2">Diagnosis Codes (ICD-10)</div>
          <div className="flex flex-wrap gap-1.5">
            {invoice.diagnosisCodes.map((code: string) => (
              <span
                key={code}
                className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 font-mono"
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Line items */}
      <div className="rounded-lg border bg-white">
        <div className="border-b px-4 py-3 font-medium">Line Items</div>
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Service</th>
              <th className="px-4 py-2 text-left">Description</th>
              {hasLineItemDetails && (
                <>
                  <th className="px-3 py-2 text-left">DOS</th>
                  <th className="px-3 py-2 text-left">POS</th>
                  <th className="px-3 py-2 text-left">Mod</th>
                </>
              )}
              <th className="px-4 py-2 text-right">Price</th>
              <th className="px-4 py-2 text-right">Qty</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lineItems?.map((li: any) => (
              <tr key={li.id} className="border-b">
                <td className="px-4 py-2 font-mono text-xs">
                  {li.serviceCode?.code ?? "-"}
                </td>
                <td className="px-4 py-2">{li.description}</td>
                {hasLineItemDetails && (
                  <>
                    <td className="px-3 py-2 text-xs">
                      {li.dateOfService
                        ? new Date(li.dateOfService).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {li.placeOfServiceCode || "-"}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      {li.modifiers && li.modifiers.length > 0
                        ? li.modifiers.join(", ")
                        : "-"}
                    </td>
                  </>
                )}
                <td className="px-4 py-2 text-right font-mono">
                  {formatCents(li.unitPriceCents)}
                </td>
                <td className="px-4 py-2 text-right">{li.quantity}</td>
                <td className="px-4 py-2 text-right font-mono">
                  {formatCents(li.totalCents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="border-t px-4 py-3 text-right text-sm space-y-1">
          <div>Subtotal: {formatCents(invoice.subtotalCents)}</div>
          {invoice.taxCents > 0 && <div>Tax: {formatCents(invoice.taxCents)}</div>}
          <div className="font-bold">Total: {formatCents(invoice.totalCents)}</div>
          <div className="text-green-600">Paid: {formatCents(invoice.paidCents)}</div>
          <div className="font-bold text-lg">Balance: {formatCents(balanceCents)}</div>
        </div>
      </div>

      {/* Notes */}
      {invoice.notes && (
        <div className="rounded-lg border bg-white p-4">
          <div className="font-medium mb-1">Notes</div>
          <p className="text-sm text-muted-foreground">{invoice.notes}</p>
        </div>
      )}

      {/* Payments */}
      <div className="rounded-lg border bg-white">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="font-medium">Payments</span>
          {canPay && (
            <Button size="sm" variant="outline" onClick={() => {
              setPaymentAmount((balanceCents / 100).toFixed(2));
              setShowPaymentForm(true);
            }}>
              <Plus className="mr-1 h-3 w-3" />
              Record Payment
            </Button>
          )}
        </div>
        {payments.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-right">Amount</th>
                <th className="px-4 py-2 text-left">Method</th>
                <th className="px-4 py-2 text-left">Reference</th>
                <th className="px-4 py-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b">
                  <td className="px-4 py-2">
                    {new Date(p.receivedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {formatCents(p.amountCents)}
                  </td>
                  <td className="px-4 py-2">{p.method}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {p.reference || "-"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => {
                        confirm({
                          title: "Remove Payment",
                          description: "Remove this payment?",
                          confirmLabel: "Remove",
                          variant: "danger",
                          onConfirm: () => deletePaymentMut.mutate(p.id),
                        });
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            No payments recorded.
          </p>
        )}

        {showPaymentForm && (
          <div className="border-t p-4 space-y-3">
            <div className="text-sm font-medium">Record Payment</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Method</label>
                <select
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as "OTHER" | "CASH" | "CHECK" | "CREDIT_CARD" | "INSURANCE")}
                >
                  <option value="CASH">Cash</option>
                  <option value="CHECK">Check</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="INSURANCE">Insurance</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Reference (optional)</label>
              <input
                className="w-full rounded border px-2 py-1.5 text-sm"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="Check #, transaction ID..."
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleRecordPayment} disabled={recordPayment.isPending}>
                {recordPayment.isPending ? "Saving..." : "Record"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowPaymentForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => {
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
            window.open(`${apiBase}/api/invoices/${invoiceId}/pdf`, "_blank");
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Download PDF
        </Button>
        {canPay && stripeStatus?.connected && savedCards.length > 0 && (
          <Button onClick={() => setChargeDialogOpen(true)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Charge Card
          </Button>
        )}
        {canSend && (
          <Button onClick={() => sendInvoice.mutate()} disabled={sendInvoice.isPending}>
            <Send className="mr-2 h-4 w-4" />
            Send Invoice
          </Button>
        )}
        {canVoid && (
          <Button
            variant="outline"
            onClick={() => {
              confirm({
                title: "Void Invoice",
                description: "Void this invoice? This cannot be undone.",
                confirmLabel: "Void",
                variant: "danger",
                onConfirm: () => voidInvoice.mutate(),
              });
            }}
            disabled={voidInvoice.isPending}
          >
            <Ban className="mr-2 h-4 w-4" />
            Void
          </Button>
        )}
        {canDelete && (
          <Button
            variant="destructive"
            onClick={() => {
              confirm({
                title: "Delete Invoice",
                description: "Delete this draft invoice?",
                confirmLabel: "Delete",
                variant: "danger",
                onConfirm: () =>
                  deleteInvoice.mutate(invoiceId, {
                    onSuccess: () => router.push("/billing"),
                  }),
              });
            }}
            disabled={deleteInvoice.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        )}
      </div>

      {/* Charge Card Dialog */}
      {savedCards.length > 0 && (
        <ChargeCardDialog
          open={chargeDialogOpen}
          onOpenChange={setChargeDialogOpen}
          invoiceId={invoiceId}
          amountCents={balanceCents}
          cards={savedCards}
        />
      )}

      {confirmDialog}
    </div>
  );
}
