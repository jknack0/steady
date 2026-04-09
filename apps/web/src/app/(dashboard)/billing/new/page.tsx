"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { useServiceCodes } from "@/hooks/use-service-codes";
import { ClientSearchSelect } from "@/components/appointments/ClientSearchSelect";
import { DiagnosisCodePicker } from "@/components/claims/DiagnosisCodePicker";
import { ModifierInput } from "@/components/billing/ModifierInput";
import { AlertBanner } from "@/components/ui/alert-banner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PLACE_OF_SERVICE_OPTIONS } from "@/lib/billing-constants";
import { formatCents } from "@/lib/format";
import type { ParticipantSearchResult, ServiceCodeRef } from "@/lib/appointment-types";

// ── Helpers ─────────────────────────────────────────────

function defaultDueDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().split("T")[0];
}

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

interface LineItemRow {
  serviceCodeId: string;
  description: string;
  unitPriceCents: string;
  quantity: string;
  dateOfService: string;
  placeOfServiceCode: string;
  modifiers: string[];
}

function emptyRow(): LineItemRow {
  return {
    serviceCodeId: "",
    description: "",
    unitPriceCents: "",
    quantity: "1",
    dateOfService: todayStr(),
    placeOfServiceCode: "02",
    modifiers: [],
  };
}

// ── Main Page ───────────────────────────────────────────

export default function NewInvoicePage() {
  const router = useRouter();
  const createInvoice = useCreateInvoice();
  const { data: serviceCodes = [] } = useServiceCodes();

  const [client, setClient] = useState<ParticipantSearchResult | null>(null);
  const [rows, setRows] = useState<LineItemRow[]>([emptyRow()]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dueDate, setDueDate] = useState(defaultDueDate());
  const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);

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
      dateOfService: r.dateOfService || undefined,
      placeOfServiceCode: r.placeOfServiceCode || undefined,
      modifiers: r.modifiers,
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
        diagnosisCodes,
        dueDate: dueDate || undefined,
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

      {error && <AlertBanner variant="error">{error}</AlertBanner>}

      {/* Client */}
      <div>
        <Label>Client *</Label>
        <ClientSearchSelect value={client} onChange={setClient} />
      </div>

      {/* Due Date */}
      <div>
        <Label htmlFor="due-date">Due Date</Label>
        <input
          id="due-date"
          type="date"
          className="w-full rounded border px-3 py-1.5 text-sm"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      {/* Diagnosis Codes */}
      {client?.id && (
        <div>
          <Label>Diagnosis Codes (ICD-10)</Label>
          <DiagnosisCodePicker
            selectedCodes={diagnosisCodes}
            onCodesChange={setDiagnosisCodes}
            participantId={client.id}
          />
        </div>
      )}

      {/* Line Items */}
      <div className="space-y-3">
        <Label>Line Items *</Label>
        {rows.map((row, i) => (
          <div key={i} className="rounded-md border p-3 space-y-2">
            <div className="flex items-start gap-2">
              <div className="flex-1 space-y-2">
                {/* Service Code */}
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

                {/* Description */}
                <div>
                  <label className="text-xs text-muted-foreground">Description</label>
                  <input
                    className="w-full rounded border px-2 py-1.5 text-sm"
                    value={row.description}
                    onChange={(e) => updateRow(i, { description: e.target.value })}
                    placeholder="Service description"
                  />
                </div>

                {/* Date of Service + Place of Service row */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Date of Service</label>
                    <input
                      type="date"
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      value={row.dateOfService}
                      onChange={(e) => updateRow(i, { dateOfService: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Place of Service</label>
                    <select
                      className="w-full rounded border px-2 py-1.5 text-sm"
                      value={row.placeOfServiceCode}
                      onChange={(e) => updateRow(i, { placeOfServiceCode: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {PLACE_OF_SERVICE_OPTIONS.map((pos) => (
                        <option key={pos.code} value={pos.code}>
                          {pos.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Modifiers */}
                <div>
                  <label className="text-xs text-muted-foreground">Modifiers</label>
                  <ModifierInput
                    modifiers={row.modifiers}
                    onChange={(mods) => updateRow(i, { modifiers: mods })}
                  />
                </div>
              </div>

              {/* Price + Qty + Delete column */}
              <div className="flex items-end gap-2 pt-4">
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
            </div>
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
