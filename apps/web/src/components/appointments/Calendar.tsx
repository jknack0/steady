"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarDayView } from "./CalendarDayView";
import { CalendarWeekView } from "./CalendarWeekView";
import { CalendarMonthView } from "./CalendarMonthView";
import { CalendarFilters } from "./CalendarFilters";
import { AppointmentModal } from "./AppointmentModal";

const RecurringSeriesPanel = dynamic(
  () =>
    import("./RecurringSeriesPanel").then((mod) => mod.RecurringSeriesPanel),
  { ssr: false }
);
import { useAppointments } from "@/hooks/use-appointments";
import { useLocations } from "@/hooks/use-locations";
import { useServiceCodes } from "@/hooks/use-service-codes";
import type { AppointmentStatus, AppointmentView } from "@/lib/appointment-types";
import { resolveTz, dayRangeInTz, weekRangeInTz, monthRangeInTz, formatInClinicianTz } from "@/lib/tz";
import { appointmentStrings as S } from "@/lib/strings/appointments";
import { addDays, addMonths } from "date-fns";

type ViewMode = "day" | "week" | "month";

function parseView(raw: string | null): ViewMode {
  if (raw === "day" || raw === "week" || raw === "month") return raw;
  return "week";
}

function parseDate(raw: string | null): Date {
  if (!raw) return new Date();
  const d = new Date(`${raw}T12:00:00`);
  return isNaN(d.getTime()) ? new Date() : d;
}

function parseCsv(raw: string | null): string[] {
  if (!raw) return [];
  return raw.split(",").filter(Boolean);
}

export function Calendar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timezone = resolveTz(null);

  const view = parseView(searchParams.get("view"));
  const anchor = parseDate(searchParams.get("date"));
  const locationFilter = parseCsv(searchParams.get("location"));
  const statusFilter = parseCsv(searchParams.get("status")) as AppointmentStatus[];
  const clinicianIdFilter = searchParams.get("clinicianId") ?? undefined;

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [modalInitialStart, setModalInitialStart] = useState<Date | undefined>(undefined);
  const [modalExisting, setModalExisting] = useState<AppointmentView | undefined>(undefined);
  const [seriesPanelOpen, setSeriesPanelOpen] = useState(false);

  const range = useMemo(() => {
    if (view === "day") return dayRangeInTz(anchor, timezone);
    if (view === "month") return monthRangeInTz(anchor, timezone);
    return weekRangeInTz(anchor, timezone);
  }, [view, anchor, timezone]);

  const { data: appointments, isLoading, isError, refetch } = useAppointments({
    startAt: range.startIso,
    endAt: range.endIso,
    locationId: locationFilter[0],
    status: statusFilter.length > 0 ? statusFilter.join(",") : undefined,
    clinicianId: clinicianIdFilter,
    limit: 100,
  });

  const { data: locations = [] } = useLocations();
  const { data: serviceCodes = [] } = useServiceCodes();

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const sp = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") sp.delete(k);
        else sp.set(k, v);
      }
      router.replace(`/appointments?${sp.toString()}`);
    },
    [router, searchParams],
  );

  const goToday = useCallback(() => {
    const today = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    updateParams({ date: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}` });
  }, [updateParams]);

  const goPrev = useCallback(() => {
    let next: Date;
    if (view === "day") next = addDays(anchor, -1);
    else if (view === "month") next = addMonths(anchor, -1);
    else next = addDays(anchor, -7);
    const pad = (n: number) => String(n).padStart(2, "0");
    updateParams({ date: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}` });
  }, [view, anchor, updateParams]);

  const goNext = useCallback(() => {
    let next: Date;
    if (view === "day") next = addDays(anchor, 1);
    else if (view === "month") next = addMonths(anchor, 1);
    else next = addDays(anchor, 7);
    const pad = (n: number) => String(n).padStart(2, "0");
    updateParams({ date: `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}` });
  }, [view, anchor, updateParams]);

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (modalOpen) return;
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (e.key === "t" || e.key === "T") goToday();
      else if (e.key === "d" || e.key === "D") updateParams({ view: "day" });
      else if (e.key === "w" || e.key === "W") updateParams({ view: "week" });
      else if (e.key === "m" || e.key === "M") updateParams({ view: "month" });
      else if (e.key === "[") goPrev();
      else if (e.key === "]") goNext();
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goToday, goPrev, goNext, updateParams, modalOpen]);

  function openCreate(start?: Date) {
    setModalMode("create");
    setModalInitialStart(start);
    setModalExisting(undefined);
    setModalOpen(true);
  }

  function openEdit(a: AppointmentView) {
    setModalMode("edit");
    setModalExisting(a);
    setModalOpen(true);
  }

  const rangeLabel = useMemo(() => {
    if (view === "day") return formatInClinicianTz(anchor, timezone, "EEEE, MMMM d, yyyy");
    if (view === "month") return formatInClinicianTz(anchor, timezone, "MMMM yyyy");
    const wr = weekRangeInTz(anchor, timezone);
    return `${formatInClinicianTz(wr.startDate, timezone, "MMM d")} – ${formatInClinicianTz(addDays(wr.endDate, -1), timezone, "MMM d, yyyy")}`;
  }, [view, anchor, timezone]);

  const empty = !isLoading && appointments && appointments.length === 0;

  return (
    <div className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{S.pageTitle}</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden" role="tablist" aria-label="View mode">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="tab"
                aria-selected={view === v}
                className={`px-3 py-1.5 text-sm ${view === v ? "bg-primary text-primary-foreground" : "bg-white hover:bg-accent"}`}
                onClick={() => updateParams({ view: v })}
              >
                {v === "day" ? S.viewDay : v === "week" ? S.viewWeek : S.viewMonth}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={goPrev} aria-label={S.prev}>
            ◄
          </Button>
          <span className="text-sm font-medium min-w-48 text-center">{rangeLabel}</span>
          <Button variant="outline" size="sm" onClick={goNext} aria-label={S.next}>
            ►
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            {S.today}
          </Button>
          <CalendarFilters
            locations={locations}
            selectedLocationIds={locationFilter}
            selectedStatuses={statusFilter}
            onChange={({ locationIds, statuses }) =>
              updateParams({
                location: locationIds.length > 0 ? locationIds.join(",") : null,
                status: statuses.length > 0 ? statuses.join(",") : null,
              })
            }
          />
          <Button variant="outline" size="sm" onClick={() => setSeriesPanelOpen(true)}>
            ↻ Recurring
          </Button>
          <Button size="sm" onClick={() => openCreate(new Date())}>
            {S.scheduleBtn}
          </Button>
        </div>
      </header>

      {isLoading && <div className="text-sm text-muted-foreground">Loading…</div>}
      {isError && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          {S.loadError}{" "}
          <Button variant="link" size="sm" onClick={() => refetch()}>
            {S.retry}
          </Button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          {view === "day" && (
            <CalendarDayView
              anchor={anchor}
              appointments={appointments ?? []}
              timezone={timezone}
              onSlotClick={openCreate}
              onCardClick={openEdit}
            />
          )}
          {view === "week" && (
            <CalendarWeekView
              anchor={anchor}
              appointments={appointments ?? []}
              timezone={timezone}
              onSlotClick={openCreate}
              onCardClick={openEdit}
            />
          )}
          {view === "month" && (
            <CalendarMonthView
              anchor={anchor}
              appointments={appointments ?? []}
              timezone={timezone}
              onDayClick={(d) => {
                const pad = (n: number) => String(n).padStart(2, "0");
                updateParams({
                  view: "day",
                  date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
                });
              }}
            />
          )}
        </>
      )}

      <AppointmentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        existing={modalExisting}
        serviceCodes={serviceCodes}
        locations={locations}
        timezone={timezone}
        initialStart={modalInitialStart}
      />

      <RecurringSeriesPanel
        open={seriesPanelOpen}
        onOpenChange={setSeriesPanelOpen}
      />
    </div>
  );
}
