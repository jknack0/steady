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
import { isTerminal } from "./status-colors";
import { formatInClinicianTz } from "@/lib/tz";

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

  const create = useCreateAppointment();
  const update = useUpdateAppointment(existing?.id ?? "");
  const del = useDeleteAppointment();

  const terminal = mode === "edit" && existing && isTerminal(existing.status);

  // Initialize on open
  useEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setConflictState(null);
    setDirty(false);
    setEndAtTouched(false);
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
  const submitLabel =
    create.isPending || update.isPending
      ? S.modalSavingBtn
      : mode === "create"
        ? S.modalScheduleBtn
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
          <Button type="button" variant="outline" onClick={attemptClose}>
            {S.modalCancelBtn}
          </Button>
          <Button type="button" disabled={!canSubmit || create.isPending || update.isPending} onClick={handleSubmit}>
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
