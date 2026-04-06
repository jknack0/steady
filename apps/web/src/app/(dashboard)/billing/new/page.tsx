"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { useServiceCodes } from "@/hooks/use-service-codes";
import { ClientSearchSelect } from "@/components/appointments/ClientSearchSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import type { ParticipantSearchResult, ServiceCodeRef } from "@/lib/appointment-types";

interface LineItemRow {
  serviceCodeId: string;
  description: string;
  unitPriceCents: string;
  quantity: string;
}

function emptyRow(): LineItemRow {
  return { serviceCodeId: "", description: "", unitPriceCents: "", quantity: "1" };
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const createInvoice = useCreateInvoice();
  const { data: serviceCodes = [] } = useServiceCodes();

  const [client, setClient] = useState<ParticipantSearchResult | null>(null);
  const [rows, setRows] = useState<LineItemRow[]>([emptyRow()]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function updateRow(index: number, patch: Partial<LineItemRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function handleServiceCodeChange(index: number, scId: string) {
    const sc = (serviceCodes as ServiceCodeRef[]).find((c) => c.id === scId);
    updateRow(index, {
      serviceCodeId: scId,
      description: sc?.description ?? "",
      unitPriceCents: sc?.defaultPriceCents != null ? String(sc.defaultPriceCents / 100) : "",
    });
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function addRow() {
    setRows((prev) => [...prev, emptyRow()]);
  }

  const lineItems = rows
    .filter((r) => r.serviceCodeId)
    .map((r) => ({
      serviceCodeId: r.serviceCodeId,
      description: r.description || undefined,
      unitPriceCents: r.unitPriceCents
        ? Math.round(parseFloat(r.unitPriceCents) * 100)
        : undefined,
      quantity: parseInt(r.quantity) || 1,
    }));

  const subtotalCents = rows.reduce((sum, r) => {
    if (!r.serviceCodeId) return sum;
    const price = r.unitPriceCents ? Math.round(parseFloat(r.unitPriceCents) * 100) : 0;
    const qty = parseInt(r.quantity) || 1;
    return sum + price * qty;
  }, 0);

  const canSubmit = !!client?.id && lineItems.length > 0;

  async function handleSubmit() {
    if (!client?.id) return;
    setError(null);
    try {
      const result = await createInvoice.mutateAsync({
        participantId: client.id,
        lineItems,
        notes: notes || undefined,
        taxCents: 0,
      });
      const invoiceId = (result as any)?.id ?? (result as any)?.data?.id;
      if (invoiceId) {
        router.push(`/billing/${invoiceId}`);
      } else {
        router.push("/billing");
      }
    } catch (e) {
      setError((e as Error).message || "Failed to create invoice");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <button
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        onClick={() => router.push("/billing")}
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Billing
      </button>

      <h1 className="text-2xl font-bold">New Invoice</h1>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {error}
        </div>
      )}

      {/* Client */}
      <div>
        <Label>Client *</Label>
        <ClientSearchSelect value={client} onChange={setClient} />
      </div>

      {/* Line Items */}
      <div className="space-y-3">
        <Label>Line Items *</Label>
        {rows.map((row, i) => (
          <div key={i} className="flex items-end gap-2 rounded-md border p-3">
            <div className="flex-1 space-y-2">
              <div>
                <label className="text-xs text-muted-foreground">Service Code</label>
                <select
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  value={row.serviceCodeId}
                  onChange={(e) => handleServiceCodeChange(i, e.target.value)}
                >
                  <option value="">Select...</option>
                  {(serviceCodes as ServiceCodeRef[]).map((sc) => (
                    <option key={sc.id} value={sc.id}>
                      {sc.code} - {sc.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <input
                  className="w-full rounded border px-2 py-1.5 text-sm"
                  value={row.description}
                  onChange={(e) => updateRow(i, { description: e.target.value })}
                  placeholder="Service description"
                />
              </div>
            </div>
            <div className="w-24">
              <label className="text-xs text-muted-foreground">Price ($)</label>
              <input
                type="number"
                step="0.01"
                className="w-full rounded border px-2 py-1.5 text-sm"
                value={row.unitPriceCents}
                onChange={(e) => updateRow(i, { unitPriceCents: e.target.value })}
              />
            </div>
            <div className="w-16">
              <label className="text-xs text-muted-foreground">Qty</label>
              <input
                type="number"
                min="1"
                className="w-full rounded border px-2 py-1.5 text-sm"
                value={row.quantity}
                onChange={(e) => updateRow(i, { quantity: e.target.value })}
              />
            </div>
            {rows.length > 1 && (
              <button
                type="button"
                className="mb-1 text-red-500 hover:text-red-700"
                onClick={() => removeRow(i)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="mr-1 h-3 w-3" />
          Add Line Item
        </Button>
      </div>

      {/* Subtotal preview */}
      {subtotalCents > 0 && (
        <div className="text-right text-sm font-medium">
          Estimated Total: {formatCents(subtotalCents)}
        </div>
      )}

      {/* Notes */}
      <div>
        <Label htmlFor="invoice-notes">Notes (optional)</Label>
        <Textarea
          id="invoice-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={2000}
          placeholder="Additional notes for this invoice..."
        />
      </div>

      {/* Submit */}
      <div className="flex gap-3">
        <Button disabled={!canSubmit || createInvoice.isPending} onClick={handleSubmit}>
          {createInvoice.isPending ? "Creating..." : "Create as Draft"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/billing")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
