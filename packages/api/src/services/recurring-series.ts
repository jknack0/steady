import { prisma } from "@steady/db";
import { runWithAuditUser } from "@steady/db";
import type { ServiceCtx } from "../lib/practice-context";
import type {
  CreateSeriesInput,
  UpdateSeriesInput,
  ListSeriesQuery,
} from "@steady/shared";
import { detectConflicts } from "./appointments";
import { logger } from "../lib/logger";

export const NotFound = Symbol("NotFound");
export const Conflict = Symbol("Conflict");
export type NotFoundT = typeof NotFound;
export type ConflictT = typeof Conflict;

const MAX_SERIES_PER_CLINICIAN = 200;
const GENERATION_WEEKS = 4;

const SERIES_INCLUDE = {
  serviceCode: true,
  location: true,
  participant: { include: { user: true } },
  clinician: { include: { user: true } },
} as const;

// ── Helpers ──────────────────────────────────────────

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setUTCHours(0, 0, 0, 0);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

/**
 * Compute occurrence dates for a recurring series within a window.
 */
function computeOccurrenceDates(
  rule: string,
  dayOfWeek: number,
  anchorDate: Date,
  windowStart: Date,
  windowEnd: Date,
): Date[] {
  const dates: Date[] = [];

  // Find the first occurrence on/after windowStart that matches dayOfWeek
  let current = new Date(windowStart);
  const currentDow = current.getUTCDay();
  let daysUntilTarget = (dayOfWeek - currentDow + 7) % 7;
  if (daysUntilTarget === 0 && current < windowStart) daysUntilTarget = 7;
  current = addDays(current, daysUntilTarget);

  if (rule === "WEEKLY") {
    while (current <= windowEnd) {
      dates.push(new Date(current));
      current = addDays(current, 7);
    }
  } else if (rule === "BIWEEKLY") {
    // Anchor biweekly from the series start date to maintain consistent cadence
    const anchor = startOfDay(anchorDate);
    const anchorDow = anchor.getUTCDay();
    let anchorStart = addDays(anchor, ((dayOfWeek - anchorDow + 7) % 7));

    // Find first biweekly occurrence on/after windowStart
    while (anchorStart < windowStart) {
      anchorStart = addDays(anchorStart, 14);
    }
    current = anchorStart;
    while (current <= windowEnd) {
      dates.push(new Date(current));
      current = addDays(current, 14);
    }
  } else if (rule === "MONTHLY") {
    // Monthly: same week-of-month and day-of-week
    // e.g., "2nd Tuesday" -> week index in month + day of week
    const anchorMonth = new Date(anchorDate);
    const weekOfMonth = Math.floor((anchorMonth.getUTCDate() - 1) / 7);

    let month = new Date(windowStart);
    month.setUTCDate(1);
    month.setUTCHours(0, 0, 0, 0);

    // Check current month + next few months
    for (let i = 0; i < 6; i++) {
      // Find the Nth occurrence of dayOfWeek in this month
      const firstDay = new Date(month);
      const firstDow = firstDay.getUTCDay();
      let firstOccurrence = addDays(firstDay, ((dayOfWeek - firstDow + 7) % 7));
      const targetDate = addDays(firstOccurrence, weekOfMonth * 7);

      // Verify it's still in the same month
      if (
        targetDate.getUTCMonth() === month.getUTCMonth() &&
        targetDate >= windowStart &&
        targetDate <= windowEnd
      ) {
        dates.push(targetDate);
      }

      // Move to next month
      month.setUTCMonth(month.getUTCMonth() + 1);
    }
  }

  return dates;
}

function combineDateTime(date: Date, timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const result = new Date(date);
  result.setUTCHours(hours, minutes, 0, 0);
  return result;
}

// ── CRUD ─────────────────────────────────────────────

export async function createSeries(
  ctx: ServiceCtx,
  input: CreateSeriesInput,
): Promise<
  | { series: any; appointmentsCreated: number; conflicts: string[] }
  | { error: "not_found" }
  | { error: "conflict"; message: string }
> {
  if (!ctx.clinicianProfileId) return { error: "not_found" };

  // Verify references
  const [serviceCode, location, participant] = await Promise.all([
    prisma.serviceCode.findFirst({
      where: { id: input.serviceCodeId, practiceId: ctx.practiceId },
    }),
    prisma.location.findFirst({
      where: { id: input.locationId, practiceId: ctx.practiceId, isActive: true },
    }),
    prisma.participantProfile.findUnique({
      where: { id: input.participantId },
    }),
  ]);

  if (!serviceCode || !location || !participant) return { error: "not_found" };
  if (!serviceCode.isActive) {
    return { error: "conflict", message: "Service code is not active" };
  }

  // Enforce series limit
  const count = await prisma.recurringSeries.count({
    where: {
      practiceId: ctx.practiceId,
      clinicianId: ctx.clinicianProfileId,
      isActive: true,
    },
  });
  if (count >= MAX_SERIES_PER_CLINICIAN) {
    return { error: "conflict", message: "Maximum recurring series limit reached" };
  }

  const series = await prisma.recurringSeries.create({
    data: {
      practiceId: ctx.practiceId,
      clinicianId: ctx.clinicianProfileId,
      participantId: input.participantId,
      serviceCodeId: input.serviceCodeId,
      locationId: input.locationId,
      appointmentType: (input.appointmentType ?? "INDIVIDUAL") as any,
      internalNote: input.internalNote ?? null,
      recurrenceRule: input.recurrenceRule as any,
      dayOfWeek: input.dayOfWeek,
      startTime: input.startTime,
      endTime: input.endTime,
      seriesStartDate: new Date(input.seriesStartDate),
      seriesEndDate: input.seriesEndDate ? new Date(input.seriesEndDate) : null,
      isActive: true,
      createdById: ctx.userId,
    },
    include: SERIES_INCLUDE,
  });

  // Generate first 4 weeks of appointments
  const { created, allConflicts } = await generateAppointmentsForSeries(series, ctx);

  return { series, appointmentsCreated: created, conflicts: allConflicts };
}

export async function listSeries(
  ctx: ServiceCtx,
  query: ListSeriesQuery,
): Promise<{ data: any[]; cursor: string | null }> {
  const limit = Math.min(query.limit ?? 50, 100);

  const where: any = {
    practiceId: ctx.practiceId,
    ...(query.participantId ? { participantId: query.participantId } : {}),
    ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
  };

  // Non-account-owners see only their own series
  if (!ctx.isAccountOwner && ctx.clinicianProfileId) {
    where.clinicianId = ctx.clinicianProfileId;
  }

  const items = await prisma.recurringSeries.findMany({
    where,
    include: SERIES_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return { data, cursor: hasMore ? data[data.length - 1].id : null };
}

export async function getSeries(
  ctx: ServiceCtx,
  id: string,
): Promise<any | null> {
  const series = await prisma.recurringSeries.findFirst({
    where: { id, practiceId: ctx.practiceId },
    include: SERIES_INCLUDE,
  });
  if (!series) return null;
  if (!ctx.isAccountOwner && series.clinicianId !== ctx.clinicianProfileId) {
    return null;
  }

  // Fetch upcoming appointments for this series
  const now = new Date();
  const fourWeeksOut = addDays(now, GENERATION_WEEKS * 7);
  const upcomingAppointments = await prisma.appointment.findMany({
    where: {
      recurringSeriesId: id,
      startAt: { gte: now, lte: fourWeeksOut },
    },
    orderBy: { startAt: "asc" },
    take: 50,
    include: {
      serviceCode: true,
      location: true,
    },
  });

  return { ...series, upcomingAppointments };
}

export async function updateSeries(
  ctx: ServiceCtx,
  id: string,
  patch: UpdateSeriesInput,
): Promise<
  | { series: any; appointmentsRegenerated: number }
  | { error: "not_found" }
  | { error: "conflict"; message: string }
> {
  const existing = await prisma.recurringSeries.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  if (!ctx.isAccountOwner && existing.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }

  // Verify new references if provided
  if (patch.serviceCodeId) {
    const sc = await prisma.serviceCode.findFirst({
      where: { id: patch.serviceCodeId, practiceId: ctx.practiceId },
    });
    if (!sc) return { error: "not_found" };
    if (!sc.isActive) return { error: "conflict", message: "Service code is not active" };
  }
  if (patch.locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: patch.locationId, practiceId: ctx.practiceId, isActive: true },
    });
    if (!loc) return { error: "not_found" };
  }

  const data: any = {};
  if (patch.startTime !== undefined) data.startTime = patch.startTime;
  if (patch.endTime !== undefined) data.endTime = patch.endTime;
  if (patch.locationId !== undefined) data.locationId = patch.locationId;
  if (patch.serviceCodeId !== undefined) data.serviceCodeId = patch.serviceCodeId;
  if (patch.seriesEndDate !== undefined)
    data.seriesEndDate = patch.seriesEndDate ? new Date(patch.seriesEndDate) : null;
  if (patch.appointmentType !== undefined) data.appointmentType = patch.appointmentType as any;
  if (patch.internalNote !== undefined) data.internalNote = patch.internalNote;
  if (patch.recurrenceRule !== undefined) data.recurrenceRule = patch.recurrenceRule as any;
  if (patch.dayOfWeek !== undefined) data.dayOfWeek = patch.dayOfWeek;

  const series = await prisma.recurringSeries.update({
    where: { id },
    data,
    include: SERIES_INCLUDE,
  });

  // Determine if we need to regenerate appointments
  const schedulingChanged =
    patch.startTime !== undefined ||
    patch.endTime !== undefined ||
    patch.locationId !== undefined ||
    patch.serviceCodeId !== undefined ||
    patch.recurrenceRule !== undefined ||
    patch.dayOfWeek !== undefined ||
    patch.seriesEndDate !== undefined ||
    patch.appointmentType !== undefined;

  let regenerated = 0;
  if (schedulingChanged) {
    // Delete future SCHEDULED appointments
    const now = new Date();
    await prisma.appointment.deleteMany({
      where: {
        recurringSeriesId: id,
        status: "SCHEDULED" as any,
        startAt: { gt: now },
      },
    });

    // Regenerate
    const result = await generateAppointmentsForSeries(series, ctx);
    regenerated = result.created;
  }

  return { series, appointmentsRegenerated: regenerated };
}

export async function pauseSeries(
  ctx: ServiceCtx,
  id: string,
): Promise<any | { error: "not_found" } | { error: "conflict"; message: string }> {
  const existing = await prisma.recurringSeries.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  if (!ctx.isAccountOwner && existing.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }
  if (!existing.isActive) {
    return { error: "conflict", message: "Series is already paused" };
  }

  const series = await prisma.recurringSeries.update({
    where: { id },
    data: { isActive: false },
    include: SERIES_INCLUDE,
  });

  return series;
}

export async function resumeSeries(
  ctx: ServiceCtx,
  id: string,
): Promise<
  | { series: any; appointmentsCreated: number }
  | { error: "not_found" }
  | { error: "conflict"; message: string }
> {
  const existing = await prisma.recurringSeries.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  if (!ctx.isAccountOwner && existing.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }
  if (existing.isActive) {
    return { error: "conflict", message: "Series is already active" };
  }

  const series = await prisma.recurringSeries.update({
    where: { id },
    data: { isActive: true },
    include: SERIES_INCLUDE,
  });

  const { created } = await generateAppointmentsForSeries(series, ctx);

  return { series, appointmentsCreated: created };
}

export async function deleteSeries(
  ctx: ServiceCtx,
  id: string,
): Promise<{ ok: true } | { error: "not_found" }> {
  const existing = await prisma.recurringSeries.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  if (!ctx.isAccountOwner && existing.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }

  const now = new Date();

  // Delete future SCHEDULED linked appointments
  await prisma.appointment.deleteMany({
    where: {
      recurringSeriesId: id,
      status: "SCHEDULED" as any,
      startAt: { gt: now },
    },
  });

  // Hard-delete the series (SetNull will handle remaining appointment FKs)
  await prisma.recurringSeries.delete({ where: { id } });

  return { ok: true };
}

// ── Generation ───────────────────────────────────────

export async function generateAppointmentsForSeries(
  series: any,
  ctx?: ServiceCtx,
): Promise<{ created: number; allConflicts: string[] }> {
  const today = startOfDay(new Date());
  const effectiveStart = series.seriesStartDate > today ? startOfDay(series.seriesStartDate) : today;
  let windowEnd = addDays(today, GENERATION_WEEKS * 7);

  if (series.seriesEndDate && series.seriesEndDate < windowEnd) {
    windowEnd = series.seriesEndDate;
  }

  if (effectiveStart > windowEnd) {
    return { created: 0, allConflicts: [] };
  }

  const dates = computeOccurrenceDates(
    series.recurrenceRule,
    series.dayOfWeek,
    series.seriesStartDate,
    effectiveStart,
    windowEnd,
  );

  let created = 0;
  const allConflicts: string[] = [];

  for (const date of dates) {
    if (date < today) continue; // never generate past appointments

    const startAt = combineDateTime(date, series.startTime);
    const endAt = combineDateTime(date, series.endTime);

    // Check if appointment already exists for this series + date (within 1 hour tolerance)
    const toleranceStart = new Date(startAt.getTime() - 60 * 60 * 1000);
    const toleranceEnd = new Date(startAt.getTime() + 60 * 60 * 1000);

    const existing = await prisma.appointment.findFirst({
      where: {
        recurringSeriesId: series.id,
        startAt: { gte: toleranceStart, lte: toleranceEnd },
      },
      select: { id: true },
    });

    if (existing) continue; // skip duplicate

    await prisma.appointment.create({
      data: {
        practiceId: series.practiceId,
        clinicianId: series.clinicianId,
        participantId: series.participantId,
        serviceCodeId: series.serviceCodeId,
        locationId: series.locationId,
        startAt,
        endAt,
        appointmentType: series.appointmentType as any,
        internalNote: series.internalNote,
        recurringSeriesId: series.id,
        createdById: series.createdById,
        status: "SCHEDULED" as any,
      },
    });
    created++;

    // Warn-only conflict detection
    if (ctx) {
      try {
        const conflicts = await detectConflicts(
          ctx,
          series.clinicianId,
          startAt,
          endAt,
        );
        if (conflicts.length > 0) {
          allConflicts.push(...conflicts);
          logger.warn(
            `Recurring series ${series.id}: conflict detected on ${date.toISOString()}`,
          );
        }
      } catch {
        // fire-and-forget
      }
    }
  }

  return { created, allConflicts };
}

/**
 * Daily cron job: generates appointments for all active series.
 */
export async function generateAllSeriesAppointments(): Promise<void> {
  const allSeries = await prisma.recurringSeries.findMany({
    where: { isActive: true },
    include: SERIES_INCLUDE,
  });

  let totalCreated = 0;
  let errors = 0;

  for (const series of allSeries) {
    try {
      const ctx: ServiceCtx = {
        practiceId: series.practiceId,
        userId: series.createdById,
        clinicianProfileId: series.clinicianId,
        isAccountOwner: false,
      };

      const result = await runWithAuditUser(series.createdById, async () => {
        return generateAppointmentsForSeries(series, ctx);
      });
      totalCreated += result.created;
    } catch (err) {
      errors++;
      logger.error(`Recurring series generation failed for ${series.id}`, err);
    }
  }

  logger.info(
    `Recurring series cron completed: ${allSeries.length} series processed, ${totalCreated} appointments created, ${errors} errors`,
  );
}

// ── View serializer ──────────────────────────────────

export function toSeriesView(s: any): any {
  return {
    id: s.id,
    practiceId: s.practiceId,
    clinicianId: s.clinicianId,
    participantId: s.participantId,
    participant: s.participant
      ? {
          id: s.participant.id,
          firstName: s.participant.user?.firstName ?? null,
          lastName: s.participant.user?.lastName ?? null,
          email: s.participant.user?.email ?? null,
        }
      : null,
    serviceCode: s.serviceCode
      ? {
          id: s.serviceCode.id,
          code: s.serviceCode.code,
          description: s.serviceCode.description,
          defaultDurationMinutes: s.serviceCode.defaultDurationMinutes,
        }
      : null,
    location: s.location
      ? { id: s.location.id, name: s.location.name, type: s.location.type }
      : null,
    appointmentType: s.appointmentType,
    internalNote: s.internalNote,
    recurrenceRule: s.recurrenceRule,
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    seriesStartDate: toIso(s.seriesStartDate),
    seriesEndDate: s.seriesEndDate ? toIso(s.seriesEndDate) : null,
    isActive: s.isActive,
    createdById: s.createdById,
    createdAt: toIso(s.createdAt),
    updatedAt: toIso(s.updatedAt),
    upcomingAppointments: s.upcomingAppointments ?? undefined,
  };
}

function toIso(d: Date | string): string {
  if (typeof d === "string") return d;
  return d.toISOString();
}
