"use client";

import { useEffect, useMemo, useState, KeyboardEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogBody,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ClientSearchSelect } from "./ClientSearchSelect";
import { ServiceCodeSelect } from "./ServiceCodeSelect";
import { LocationSelect } from "./LocationSelect";
import { appointmentStrings as S } from "@/lib/strings/appointments";
import type {
  AppointmentView,
  ServiceCodeRef,
  LocationRef,
  ParticipantSearchResult,
  AppointmentType,
} from "@/lib/appointment-types";
import { useCreateAppointment, useUpdateAppointment, useDeleteAppointment } from "@/hooks/use-appointments";
import { useCreateSeries } from "@/hooks/use-recurring-series";
import { useCreateInvoiceFromAppointment } from "@/hooks/use-invoices";
import { isTerminal } from "./status-colors";
import { formatInClinicianTz } from "@/lib/tz";
import { useRouter } from "next/navigation";
import { PostSessionBillingPrompt } from "./PostSessionBillingPrompt";
import { ClaimStatusBadge } from "@/components/claims/ClaimStatusBadge";
import { useParticipantInsurance } from "@/hooks/use-participant-insurance";
import { Video } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  existing?: AppointmentView;
  serviceCodes: ServiceCodeRef[];
  locations: LocationRef[];
  timezone: string;
  initialStart?: Date;
}

interface ConflictState {
  conflictIds: string[];
  newAppointmentId: string;
}

function toLocalInputValue(iso: string, tz: string): string {
  // Input type=datetime-local expects YYYY-MM-DDTHH:mm in browser-local time.
  // We'll display in clinician's tz by formatting accordingly.
  return formatInClinicianTz(iso, tz, "yyyy-MM-dd'T'HH:mm");
}

function fromLocalInputValue(value: string): string {
  // Interpret as local time in browser; API stores UTC (timestamptz).
  // For sprint 19 we accept browser-local → ISO conversion (matches tz if browser tz == clinician tz).
  if (!value) return "";
  const d = new Date(value);
  return d.toISOString();
}

export function AppointmentModal({
  open,
  onOpenChange,
  mode,
  existing,
  serviceCodes,
  locations,
  timezone,
  initialStart,
}: Props) {
  const [client, setClient] = useState<ParticipantSearchResult | null>(null);
  const [serviceCodeId, setServiceCodeId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [startAt, setStartAt] = useState<string>("");
  const [endAt, setEndAt] = useState<string>("");
  const [appointmentType, setAppointmentType] = useState<AppointmentType>("INDIVIDUAL");
  const [internalNote, setInternalNote] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [dirty, setDirty] = useState(false);
  const [showDiscard, setShowDiscard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [endAtTouched, setEndAtTouched] = useState(false);
  const [repeatEnabled, setRepeatEnabled] = useState(false);
  const [recurrenceRule, setRecurrenceRule] = useState<"WEEKLY" | "BIWEEKLY" | "MONTHLY">("WEEKLY");
  const [seriesEndDate, setSeriesEndDate] = useState<string>("");
  const [showBillingPrompt, setShowBillingPrompt] = useState(false);

  const router = useRouter();
  const create = useCreateAppointment();
  const createSeries = useCreateSeries();
  const update = useUpdateAppointment(existing?.id ?? "");
  const del = useDeleteAppointment();
  const createInvoiceFromAppt = useCreateInvoiceFromAppointment();
  const { hasInsurance, payerName } = useParticipantInsurance(
    mode === "edit" ? existing?.participantId : undefined,
  );

  const terminal = mode === "edit" && existing && isTerminal(existing.status);

  // Initialize on open
  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setConflictState(null);
    setDirty(false);
    setEndAtTouched(false);
    setRepeatEnabled(false);
    setRecurrenceRule("WEEKLY");
    setSeriesEndDate("");
    setShowBillingPrompt(false);
    if (mode === "edit" && existing) {
      setClient({
        id: existing.participant?.id ?? "",
        firstName: existing.participant?.firstName ?? "",
        lastName: existing.participant?.lastName ?? "",
        email: existing.participant?.email ?? "",
      });
      setServiceCodeId(existing.serviceCode?.id ?? null);
      setLocationId(existing.location?.id ?? null);
      setStartAt(toLocalInputValue(existing.startAt, timezone));
      setEndAt(toLocalInputValue(existing.endAt, timezone));
      setAppointmentType(existing.appointmentType);
      setInternalNote(existing.internalNote ?? "");
    } else {
      setClient(null);
      setServiceCodeId(null);
      setLocationId(locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? null);
      const start = initialStart ?? new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const iso = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}T${pad(start.getHours())}:${pad(start.getMinutes())}`;
      setStartAt(iso);
      // default 45 min
      const end = new Date(start.getTime() + 45 * 60 * 1000);
      const isoEnd = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
      setEndAt(isoEnd);
      setAppointmentType("INDIVIDUAL");
      setInternalNote("");
    }
  }, [open, mode, existing, initialStart, timezone, locations]);

  // When service code changes (and endAt untouched), recompute endAt from duration.
  useEffect(() => {
    if (!serviceCodeId || endAtTouched || !startAt) return;
    const code = serviceCodes.find((c) => c.id === serviceCodeId);
    if (!code) return;
    const d = new Date(startAt);
    if (isNaN(d.getTime())) return;
    const end = new Date(d.getTime() + code.defaultDurationMinutes * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, "0");
    const iso = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}T${pad(end.getHours())}:${pad(end.getMinutes())}`;
    setEndAt(iso);
  }, [serviceCodeId, startAt, serviceCodes, endAtTouched]);

  const markDirty = () => setDirty(true);

  const canSubmit = useMemo(() => {
    if (terminal) return true; // only internalNote editable, submit always allowed
    if (!client?.id) return false;
    if (!serviceCodeId || !locationId || !startAt || !endAt) return false;
    if (new Date(endAt) <= new Date(startAt)) return false;
    return true;
  }, [client, serviceCodeId, locationId, startAt, endAt, terminal]);

  async function handleSubmit() {
    setSubmitError(null);
    try {
      if (mode === "create") {
        if (!client?.id || !serviceCodeId || !locationId) return;
        if (repeatEnabled) {
          const startDate = new Date(fromLocalInputValue(startAt));
          const endDate = new Date(fromLocalInputValue(endAt));
          const dayOfWeek = startDate.getDay();
          const pad2 = (n: number) => String(n).padStart(2, "0");
          const sTime = `${pad2(startDate.getHours())}:${pad2(startDate.getMinutes())}`;
          const eTime = `${pad2(endDate.getHours())}:${pad2(endDate.getMinutes())}`;
          const seriesResult = await createSeries.mutateAsync({
            participantId: client.id,
            serviceCodeId,
            locationId,
            recurrenceRule,
            dayOfWeek,
            startTime: sTime,
            endTime: eTime,
            seriesStartDate: startDate.toISOString(),
            seriesEndDate: seriesEndDate ? new Date(seriesEndDate).toISOString() : undefined,
            appointmentType,
            internalNote: internalNote || undefined,
          });
          if (seriesResult.conflicts && seriesResult.conflicts.length > 0) {
            setConflictState({ conflictIds: seriesResult.conflicts, newAppointmentId: seriesResult.series.id });
            return;
          }
          onOpenChange(false);
        } else {
        const result = await create.mutateAsync({
          participantId: client.id,
          serviceCodeId,
          locationId,
          startAt: fromLocalInputValue(startAt),
          endAt: fromLocalInputValue(endAt),
          appointmentType,
          internalNote: internalNote || undefined,
        });
        if (result.conflicts && result.conflicts.length > 0) {
          setConflictState({ conflictIds: result.conflicts, newAppointmentId: result.appointment.id });
          return;
        }
        onOpenChange(false);
        }
      } else if (existing) {
        const patch = terminal
          ? { internalNote: internalNote || null }
          : {
              startAt: fromLocalInputValue(startAt),
              endAt: fromLocalInputValue(endAt),
              serviceCodeId: serviceCodeId ?? undefined,
              locationId: locationId ?? undefined,
              appointmentType,
              internalNote: internalNote || null,
            };
        const result = await update.mutateAsync(patch);
        if (result.conflicts && result.conflicts.length > 0) {
          setConflictState({ conflictIds: result.conflicts, newAppointmentId: result.appointment.id });
          return;
        }
        onOpenChange(false);
      }
    } catch (e) {
      const msg = (e as Error).message || S.errorGeneric;
      if (msg.toLowerCase().includes("completed")) {
        setSubmitError(S.errorTerminalSchedule);
      } else {
        setSubmitError(msg);
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (canSubmit) handleSubmit();
    }
  }

  function attemptClose() {
    if (dirty) setShowDiscard(true);
    else onOpenChange(false);
  }

  const canDelete =
    mode === "edit" &&
    existing &&
    existing.status === "SCHEDULED" &&
    Date.now() - new Date(existing.createdAt).getTime() < 24 * 60 * 60 * 1000;

  const title = mode === "create" ? S.modalCreateTitle : S.modalEditTitle;
  const isPending = create.isPending || update.isPending || createSeries.isPending;
  const submitLabel =
    isPending
      ? S.modalSavingBtn
      : mode === "create"
        ? repeatEnabled ? "Schedule series" : S.modalScheduleBtn
        : S.modalSaveBtn;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) attemptClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent
        className="max-w-lg"
        onKeyDown={handleKeyDown}
        onEscapeKeyDown={(e) => {
          if (dirty) {
            e.preventDefault();
            setShowDiscard(true);
          }
        }}
      >
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <DialogBody>
          {terminal && (
            <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
              {S.modalTerminalBanner}
            </div>
          )}
          {submitError && (
            <div
              role="alert"
              className="mb-3 rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-900"
            >
              {submitError}
            </div>
          )}
          {conflictState && (
            <div
              role="alert"
              className="mb-3 rounded-md border border-yellow-300 bg-yellow-50 p-2 text-xs text-yellow-900"
            >
              <div>{S.modalConflictBanner(conflictState.conflictIds.length)}</div>
              <div className="mt-1 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setConflictState(null);
                    onOpenChange(false);
                  }}
                >
                  {S.modalConflictKeep}
                </Button>
                {mode === "create" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={async () => {
                      await del.mutateAsync(conflictState.newAppointmentId);
                      setConflictState(null);
                      onOpenChange(false);
                    }}
                  >
                    {S.modalConflictUndo}
                  </Button>
                )}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label>{S.modalClient} *</Label>
              <ClientSearchSelect value={client} onChange={(v) => { setClient(v); markDirty(); }} readOnly={mode === "edit" || terminal} />
            </div>

            <div>
              <Label>{S.modalServiceCode} *</Label>
              <ServiceCodeSelect
                codes={serviceCodes}
                value={serviceCodeId}
                onChange={(v) => { setServiceCodeId(v); markDirty(); }}
                disabled={terminal}
              />
            </div>

            <div>
              <Label>{S.modalLocation} *</Label>
              <LocationSelect
                locations={locations}
                value={locationId}
                onChange={(v) => { setLocationId(v); markDirty(); }}
                disabled={terminal}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="start-at">Start *</Label>
                <Input
                  id="start-at"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => { setStartAt(e.target.value); markDirty(); }}
                  disabled={terminal}
                />
              </div>
              <div>
                <Label htmlFor="end-at">End *</Label>
                <Input
                  id="end-at"
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => { setEndAt(e.target.value); setEndAtTouched(true); markDirty(); }}
                  disabled={terminal}
                />
                {endAt && startAt && new Date(endAt) <= new Date(startAt) && (
                  <p className="text-xs text-red-600 mt-1">{S.validationEndBeforeStart}</p>
                )}
              </div>
            </div>

            <div>
              <Label>{S.modalAppointmentType}</Label>
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={appointmentType === "INDIVIDUAL"}
                    onChange={() => { setAppointmentType("INDIVIDUAL"); markDirty(); }}
                    disabled={terminal}
                  />
                  {S.modalTypeIndividual}
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="radio"
                    checked={appointmentType === "COUPLE"}
                    onChange={() => { setAppointmentType("COUPLE"); markDirty(); }}
                    disabled={terminal}
                  />
                  {S.modalTypeCouple}
                </label>
              </div>
            </div>

            {mode === "create" && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={repeatEnabled}
                    onChange={(e) => { setRepeatEnabled(e.target.checked); markDirty(); }}
                  />
                  Repeat
                </label>
                {repeatEnabled && (
                  <div className="ml-6 space-y-2">
                    <div>
                      <Label>Frequency</Label>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={recurrenceRule}
                        onChange={(e) => { setRecurrenceRule(e.target.value as "WEEKLY" | "BIWEEKLY" | "MONTHLY"); markDirty(); }}
                      >
                        <option value="WEEKLY">Weekly</option>
                        <option value="BIWEEKLY">Every 2 weeks</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="series-end-date">Series end date (optional)</Label>
                      <Input
                        id="series-end-date"
                        type="date"
                        value={seriesEndDate}
                        onChange={(e) => { setSeriesEndDate(e.target.value); markDirty(); }}
                      />
                      {!seriesEndDate && (
                        <p className="text-xs text-muted-foreground mt-1">Ongoing until paused or deleted</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="internal-note">{S.modalInternalNoteLabel}</Label>
              <Textarea
                id="internal-note"
                value={internalNote}
                maxLength={500}
                placeholder={S.modalInternalNotePlaceholder}
                onChange={(e) => { setInternalNote(e.target.value); markDirty(); }}
              />
              <div className="text-right text-xs text-muted-foreground">{internalNote.length} / 500</div>
            </div>
          </div>

          {showDiscard && (
            <div role="alertdialog" className="mt-3 rounded-md border bg-white p-3 shadow">
              <div className="mb-2 text-sm font-medium">{S.modalDiscardConfirmTitle}</div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowDiscard(false)}>
                  {S.modalDiscardKeep}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setShowDiscard(false);
                    setDirty(false);
                    onOpenChange(false);
                  }}
                >
                  {S.modalDiscardDiscard}
                </Button>
              </div>
            </div>
          )}

          {showDeleteConfirm && existing && (
            <div role="alertdialog" className="mt-3 rounded-md border bg-white p-3 shadow">
              <div className="mb-1 text-sm font-medium">{S.modalDeleteConfirmTitle}</div>
              <div className="mb-2 text-xs text-muted-foreground">{S.modalDeleteConfirmBody}</div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                  {S.modalDeleteConfirmNo}
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    await del.mutateAsync(existing.id);
                    setShowDeleteConfirm(false);
                    onOpenChange(false);
                  }}
                >
                  {S.modalDeleteConfirmYes}
                </Button>
              </div>
            </div>
          )}
        </DialogBody>

        {/* Claim status display for appointments with claims */}
        {mode === "edit" && existing?.claimId && existing?.claimStatus && (
          <div className="mx-6 mb-2 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Claim:</span>
            <ClaimStatusBadge status={existing.claimStatus} />
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => {
                onOpenChange(false);
                router.push("/claims");
              }}
            >
              View Claim
            </Button>
          </div>
        )}

        {/* Existing invoice link */}
        {mode === "edit" && existing?.invoiceId && (
          <div className="mx-6 mb-2 flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Invoice:</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => {
                onOpenChange(false);
                router.push(`/billing/${existing.invoiceId}`);
              }}
            >
              View Invoice
            </Button>
          </div>
        )}

        {/* Post-session billing prompt */}
        {mode === "edit" &&
          existing?.status === "ATTENDED" &&
          !existing.invoiceId &&
          !existing.claimId &&
          (showBillingPrompt || true) && (
          <div className="px-6 pb-2">
            <PostSessionBillingPrompt
              appointmentId={existing.id}
              participantId={existing.participantId}
              participantName={
                existing.participant
                  ? `${existing.participant.firstName ?? ""} ${existing.participant.lastName ?? ""}`.trim() || "Client"
                  : "Client"
              }
              dateOfService={existing.startAt}
              serviceCode={existing.serviceCode?.code ?? ""}
              serviceDescription={existing.serviceCode?.description}
              servicePriceCents={existing.serviceCode?.defaultPriceCents ?? 0}
              locationTypeName={existing.location?.name ?? ""}
              placeOfServiceCode={
                existing.location?.type === "VIRTUAL" ? "02" : "11"
              }
              hasInsurance={hasInsurance}
              payerName={payerName}
              existingInvoiceId={existing.invoiceId}
              existingClaimId={existing.claimId}
              onInvoiceCreated={() => {}}
              onClaimCreated={() => {}}
              onDismiss={() => setShowBillingPrompt(false)}
              onCloseModal={() => onOpenChange(false)}
            />
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t">
          {canDelete && (
            <Button
              type="button"
              variant="ghost"
              className="text-red-600 hover:text-red-700 mr-auto"
              onClick={() => setShowDeleteConfirm(true)}
            >
              {S.modalDeleteBtn}
            </Button>
          )}
          {/* Start Video Session button for virtual appointments within the time window */}
          {mode === "edit" &&
            existing &&
            existing.location?.type === "VIRTUAL" &&
            ["SCHEDULED", "ATTENDED"].includes(existing.status) &&
            (() => {
              const now = Date.now();
              const start = new Date(existing.startAt).getTime();
              const end = new Date(existing.endAt).getTime();
              const fifteenMinMs = 15 * 60 * 1000;
              return now >= start - fifteenMinMs && now <= end;
            })() && (
            <Button
              type="button"
              className="bg-emerald-600 text-white hover:bg-emerald-700 mr-auto"
              onClick={() => {
                onOpenChange(false);
                router.push(`/telehealth/${existing!.id}`);
              }}
            >
              <Video className="mr-2 h-4 w-4" />
              Start Video Session
            </Button>
          )}
          <Button type="button" variant="outline" onClick={attemptClose}>
            {S.modalCancelBtn}
          </Button>
          <Button type="button" disabled={!canSubmit || isPending} onClick={handleSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
