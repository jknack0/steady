"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCreateInvoice } from "@/hooks/use-invoices";
import { useServiceCodes } from "@/hooks/use-service-codes";
import { useDiagnosisCodeSearch } from "@/hooks/use-diagnosis-codes";
import { ClientSearchSelect } from "@/components/appointments/ClientSearchSelect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, X, Search } from "lucide-react";
import type { ParticipantSearchResult, ServiceCodeRef } from "@/lib/appointment-types";

// ── Constants ───────────────────────────────────────────

const PLACE_OF_SERVICE_OPTIONS = [
  { code: "02", label: "02 - Telehealth (Other)" },
  { code: "10", label: "10 - Telehealth (Patient Home)" },
  { code: "11", label: "11 - Office" },
  { code: "12", label: "12 - Home" },
  { code: "53", label: "53 - Community MH Center" },
  { code: "99", label: "99 - Other" },
] as const;

const COMMON_MODIFIERS = [
  { code: "95", label: "95 - Synchronous Telehealth" },
  { code: "GT", label: "GT - Interactive Telehealth" },
  { code: "HO", label: "HO - Master's Level" },
  { code: "76", label: "76 - Repeat Procedure, Same Physician" },
  { code: "77", label: "77 - Repeat Procedure, Different Physician" },
  { code: "XE", label: "XE - Separate Encounter" },
  { code: "XS", label: "XS - Separate Structure" },
] as const;

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

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ── Diagnosis Code Picker ───────────────────────────────

function DiagnosisCodePicker({
  participantId,
  selected,
  onChange,
}: {
  participantId: string | undefined;
  selected: string[];
  onChange: (codes: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data: searchData } = useDiagnosisCodeSearch(query, participantId);

  const results = (searchData as any)?.data?.results ?? (searchData as any)?.results ?? [];
  const recent = (searchData as any)?.data?.recent ?? (searchData as any)?.recent ?? [];

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addCode(code: string) {
    if (selected.length >= 4) return;
    if (!selected.includes(code)) {
      onChange([...selected, code]);
    }
    setQuery("");
    setIsOpen(false);
  }

  function removeCode(code: string) {
    onChange(selected.filter((c) => c !== code));
  }

  return (
    <div ref={ref} className="space-y-2">
      {/* Selected tags */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((code) => (
            <span
              key={code}
              className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
            >
              {code}
              <button
                type="button"
                onClick={() => removeCode(code)}
                className="hover:text-blue-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      {selected.length < 4 && (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className="w-full rounded border px-2 py-1.5 pl-7 text-sm"
              placeholder="Search ICD-10 codes (e.g., F90)..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
            />
          </div>

          {isOpen && query.length >= 2 && (
            <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded border bg-white shadow-md">
              {/* Recent codes */}
              {recent.length > 0 && (
                <div className="border-b px-3 py-1.5">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    Recent
                  </div>
                  {recent.map((r: any) => (
                    <button
                      key={r.code}
                      type="button"
                      className="block w-full px-1 py-1 text-left text-xs hover:bg-gray-50"
                      onClick={() => addCode(r.code)}
                      disabled={selected.includes(r.code)}
                    >
                      <span className="font-mono font-medium">{r.code}</span>
                      {r.description && (
                        <span className="ml-1 text-muted-foreground">{r.description}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Search results */}
              {results.length > 0 ? (
                results.map((r: any) => (
                  <button
                    key={r.code}
                    type="button"
                    className="block w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => addCode(r.code)}
                    disabled={selected.includes(r.code)}
                  >
                    <span className="font-mono font-medium">{r.code}</span>
                    {r.description && (
                      <span className="ml-1 text-muted-foreground">{r.description}</span>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">No results found</div>
              )}
            </div>
          )}

          {isOpen && query.length > 0 && query.length < 2 && (
            <div className="absolute z-10 mt-1 w-full rounded border bg-white px-3 py-2 text-xs text-muted-foreground shadow-md">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      )}

      {selected.length >= 4 && (
        <p className="text-xs text-muted-foreground">Maximum 4 diagnosis codes</p>
      )}
    </div>
  );
}

// ── Modifier Input ──────────────────────────────────────

function ModifierInput({
  modifiers,
  onChange,
}: {
  modifiers: string[];
  onChange: (mods: string[]) => void;
}) {
  const [inputVal, setInputVal] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function addModifier(code: string) {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || modifiers.length >= 4 || modifiers.includes(trimmed)) return;
    onChange([...modifiers, trimmed]);
    setInputVal("");
    setIsOpen(false);
  }

  function removeModifier(code: string) {
    onChange(modifiers.filter((m) => m !== code));
  }

  const filteredOptions = COMMON_MODIFIERS.filter(
    (m) =>
      !modifiers.includes(m.code) &&
      (inputVal === "" || m.code.toLowerCase().includes(inputVal.toLowerCase()) || m.label.toLowerCase().includes(inputVal.toLowerCase())),
  );

  return (
    <div ref={ref} className="space-y-1">
      {modifiers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {modifiers.map((mod) => (
            <span
              key={mod}
              className="inline-flex items-center gap-0.5 rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono"
            >
              {mod}
              <button type="button" onClick={() => removeModifier(mod)}>
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {modifiers.length < 4 && (
        <div className="relative">
          <input
            className="w-full rounded border px-2 py-1 text-xs"
            placeholder="Add modifier..."
            value={inputVal}
            onChange={(e) => {
              setInputVal(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (inputVal.trim()) addModifier(inputVal);
              }
            }}
          />

          {isOpen && (
            <div className="absolute z-10 mt-1 max-h-36 w-full overflow-auto rounded border bg-white shadow-sm">
              {filteredOptions.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  className="block w-full px-2 py-1 text-left text-xs hover:bg-gray-50"
                  onClick={() => addModifier(opt.code)}
                >
                  {opt.label}
                </button>
              ))}
              {inputVal.trim() &&
                !COMMON_MODIFIERS.some((m) => m.code === inputVal.trim().toUpperCase()) && (
                  <button
                    type="button"
                    className="block w-full px-2 py-1 text-left text-xs text-blue-600 hover:bg-gray-50"
                    onClick={() => addModifier(inputVal)}
                  >
                    Add &quot;{inputVal.trim().toUpperCase()}&quot;
                  </button>
                )}
            </div>
          )}
        </div>
      )}

      {modifiers.length >= 4 && (
        <p className="text-[10px] text-muted-foreground">Maximum 4 modifiers</p>
      )}
    </div>
  );
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
      modifiers: r.modifiers.length > 0 ? r.modifiers : undefined,
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
        diagnosisCodes: diagnosisCodes.length > 0 ? diagnosisCodes : undefined,
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
            participantId={client.id}
            selected={diagnosisCodes}
            onChange={setDiagnosisCodes}
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
