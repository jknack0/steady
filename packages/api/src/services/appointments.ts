import { prisma } from "@steady/db";
import type { ServiceCtx } from "../lib/practice-context";
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ListAppointmentsQuery,
  AppointmentStatus as AppointmentStatusType,
} from "@steady/shared";

export const NotFound = Symbol("NotFound");
export const Conflict = Symbol("Conflict");
export type NotFoundT = typeof NotFound;
export type ConflictT = typeof Conflict;

export interface ConflictError {
  error: ConflictT;
  message: string;
}

const TERMINAL_STATUSES: AppointmentStatusType[] = [
  "ATTENDED",
  "NO_SHOW",
  "LATE_CANCELED",
  "CLIENT_CANCELED",
  "CLINICIAN_CANCELED",
];

const NON_CONFLICTING_STATUSES: AppointmentStatusType[] = [
  "CLIENT_CANCELED",
  "CLINICIAN_CANCELED",
  "LATE_CANCELED",
  "NO_SHOW",
];

const APPOINTMENT_INCLUDE = {
  serviceCode: true,
  location: true,
  participant: { include: { user: true } },
  clinician: { include: { user: true } },
  invoiceLineItems: { select: { invoiceId: true }, take: 1 },
} as const;

// TODO(sprint-20): participant search + "Add new client" flow is deferred — it needs
// cross-cutting changes to participant routes. Revisit alongside the search endpoint.

export async function detectConflicts(
  ctx: ServiceCtx,
  clinicianId: string,
  startAt: Date,
  endAt: Date,
  excludeId?: string,
): Promise<string[]> {
  const rows = await prisma.appointment.findMany({
    where: {
      practiceId: ctx.practiceId,
      clinicianId,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      status: { notIn: NON_CONFLICTING_STATUSES as any },
      AND: [
        { startAt: { lt: endAt } },
        { endAt: { gt: startAt } },
      ],
    },
    select: { id: true },
    take: 10,
  });
  return rows.map((r) => r.id);
}

async function verifyServiceCode(ctx: ServiceCtx, serviceCodeId: string) {
  const sc = await prisma.serviceCode.findFirst({
    where: { id: serviceCodeId, practiceId: ctx.practiceId },
  });
  return sc;
}

async function verifyLocation(ctx: ServiceCtx, locationId: string) {
  const loc = await prisma.location.findFirst({
    where: { id: locationId, practiceId: ctx.practiceId, isActive: true },
  });
  return loc;
}

async function verifyParticipant(ctx: ServiceCtx, participantId: string) {
  // Participant is considered visible if they belong to a user who has a
  // ClinicianClient link to any clinician in the same practice, OR if any
  // existing appointment/enrollment connects them to the practice.
  const participant = await prisma.participantProfile.findUnique({
    where: { id: participantId },
    include: { user: true },
  });
  if (!participant) return null;

  const link = await prisma.clinicianClient.findFirst({
    where: {
      clientId: participant.userId,
      clinician: {
        memberships: { some: { practiceId: ctx.practiceId } },
      },
    },
  });
  if (link) return participant;

  // Fallback: existing appointment in this practice
  const existing = await prisma.appointment.findFirst({
    where: { practiceId: ctx.practiceId, participantId },
  });
  if (existing) return participant;

  return null;
}

export async function createAppointment(
  ctx: ServiceCtx,
  input: CreateAppointmentInput,
): Promise<
  | { appointment: any; conflicts: string[] }
  | { error: "not_found" }
  | { error: "validation"; message: string }
> {
  if (!ctx.clinicianProfileId) return { error: "not_found" };

  const startAt = new Date(input.startAt);
  const endAt = new Date(input.endAt);

  const [serviceCode, location, participant] = await Promise.all([
    verifyServiceCode(ctx, input.serviceCodeId),
    verifyLocation(ctx, input.locationId),
    verifyParticipant(ctx, input.participantId),
  ]);

  if (!serviceCode || !location || !participant) return { error: "not_found" };
  if (!serviceCode.isActive) {
    return { error: "validation", message: "Service code is not active" };
  }

  const conflicts = await detectConflicts(ctx, ctx.clinicianProfileId, startAt, endAt);

  const appointment = await prisma.appointment.create({
    data: {
      practiceId: ctx.practiceId,
      clinicianId: ctx.clinicianProfileId,
      participantId: input.participantId,
      serviceCodeId: input.serviceCodeId,
      locationId: input.locationId,
      startAt,
      endAt,
      appointmentType: input.appointmentType ?? "INDIVIDUAL",
      internalNote: input.internalNote ?? null,
      createdById: ctx.userId,
    },
    include: APPOINTMENT_INCLUDE,
  });

  return { appointment, conflicts };
}

function parseStatusList(raw?: string): AppointmentStatusType[] | undefined {
  if (!raw) return undefined;
  const valid = new Set<AppointmentStatusType>([
    "SCHEDULED",
    "ATTENDED",
    "NO_SHOW",
    "LATE_CANCELED",
    "CLIENT_CANCELED",
    "CLINICIAN_CANCELED",
  ]);
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is AppointmentStatusType => valid.has(s as any));
  return list.length > 0 ? list : undefined;
}

export async function listAppointments(
  ctx: ServiceCtx,
  query: ListAppointmentsQuery,
): Promise<
  { data: any[]; cursor: string | null } | { error: "not_found" }
> {
  const startAt = new Date(query.startAt);
  const endAt = new Date(query.endAt);
  const limit = Math.min(query.limit ?? 100, 100);

  let clinicianFilter: string | undefined;
  if (query.clinicianId) {
    if (!ctx.isAccountOwner && query.clinicianId !== ctx.clinicianProfileId) {
      return { error: "not_found" };
    }
    clinicianFilter = query.clinicianId;
  } else if (!ctx.isAccountOwner) {
    clinicianFilter = ctx.clinicianProfileId;
  }

  const statusList = parseStatusList(query.status);

  const items = await prisma.appointment.findMany({
    where: {
      practiceId: ctx.practiceId,
      ...(clinicianFilter ? { clinicianId: clinicianFilter } : {}),
      ...(query.locationId ? { locationId: query.locationId } : {}),
      ...(statusList ? { status: { in: statusList as any } } : {}),
      AND: [{ startAt: { lt: endAt } }, { endAt: { gt: startAt } }],
    },
    include: APPOINTMENT_INCLUDE,
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return { data, cursor: hasMore ? data[data.length - 1].id : null };
}

export async function getAppointment(
  ctx: ServiceCtx,
  id: string,
): Promise<any | null> {
  const appt = await prisma.appointment.findFirst({
    where: { id, practiceId: ctx.practiceId },
    include: APPOINTMENT_INCLUDE,
  });
  if (!appt) return null;
  if (!ctx.isAccountOwner && appt.clinicianId !== ctx.clinicianProfileId) {
    return null;
  }
  return appt;
}

export async function updateAppointment(
  ctx: ServiceCtx,
  id: string,
  patch: UpdateAppointmentInput,
): Promise<
  | { appointment: any; conflicts: string[] }
  | { error: "not_found" }
  | { error: "conflict"; message: string }
  | { error: "validation"; message: string }
> {
  const existing = await prisma.appointment.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  if (!ctx.isAccountOwner && existing.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }

  const isTerminal = TERMINAL_STATUSES.includes(existing.status as AppointmentStatusType);
  const touchesScheduling =
    patch.startAt !== undefined ||
    patch.endAt !== undefined ||
    patch.serviceCodeId !== undefined ||
    patch.locationId !== undefined;

  if (isTerminal && touchesScheduling) {
    return {
      error: "conflict",
      message: "Cannot modify scheduling fields of a completed appointment",
    };
  }

  if (patch.serviceCodeId) {
    const sc = await verifyServiceCode(ctx, patch.serviceCodeId);
    if (!sc) return { error: "not_found" };
    if (!sc.isActive) return { error: "validation", message: "Service code is not active" };
  }
  if (patch.locationId) {
    const loc = await verifyLocation(ctx, patch.locationId);
    if (!loc) return { error: "not_found" };
  }

  const newStart = patch.startAt ? new Date(patch.startAt) : existing.startAt;
  const newEnd = patch.endAt ? new Date(patch.endAt) : existing.endAt;
  if (newEnd <= newStart) {
    return { error: "validation", message: "endAt must be after startAt" };
  }

  const conflicts = await detectConflicts(
    ctx,
    existing.clinicianId,
    newStart,
    newEnd,
    existing.id,
  );

  const data: any = {};
  if (patch.startAt !== undefined) data.startAt = newStart;
  if (patch.endAt !== undefined) data.endAt = newEnd;
  if (patch.serviceCodeId !== undefined) data.serviceCodeId = patch.serviceCodeId;
  if (patch.locationId !== undefined) data.locationId = patch.locationId;
  if (patch.internalNote !== undefined) data.internalNote = patch.internalNote;
  if (patch.appointmentType !== undefined) data.appointmentType = patch.appointmentType;

  const appointment = await prisma.appointment.update({
    where: { id },
    data,
    include: APPOINTMENT_INCLUDE,
  });

  return { appointment, conflicts };
}

export async function changeStatus(
  ctx: ServiceCtx,
  id: string,
  status: AppointmentStatusType,
  cancelReason?: string,
): Promise<any | { error: "not_found" }> {
  const existing = await prisma.appointment.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  if (!ctx.isAccountOwner && existing.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }

  const from = existing.status;

  const appointment = await prisma.appointment.update({
    where: { id },
    data: {
      status: status as any,
      statusChangedAt: new Date(),
      ...(cancelReason !== undefined ? { cancelReason } : {}),
    },
    include: APPOINTMENT_INCLUDE,
  });

  // Status transition audit row — value-level exception (COND-4/5)
  try {
    await prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        action: "UPDATE",
        resourceType: "Appointment",
        resourceId: id,
        metadata: { changedFields: ["status"], from, to: status },
      },
    });
  } catch {
    // fire-and-forget
  }

  return appointment;
}

export async function deleteAppointment(
  ctx: ServiceCtx,
  id: string,
): Promise<
  | { ok: true }
  | { error: "not_found" }
  | { error: "conflict"; message: string }
> {
  const existing = await prisma.appointment.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  if (
    !ctx.isAccountOwner &&
    existing.createdById !== ctx.userId &&
    existing.clinicianId !== ctx.clinicianProfileId
  ) {
    return { error: "not_found" };
  }

  if (existing.status !== "SCHEDULED") {
    return {
      error: "conflict",
      message: "Cannot delete a completed or canceled appointment — use cancellation instead",
    };
  }

  const ageMs = Date.now() - existing.createdAt.getTime();
  if (ageMs > 24 * 60 * 60 * 1000) {
    return {
      error: "conflict",
      message: "Cannot delete an appointment older than 24 hours — cancel it instead",
    };
  }

  const linkedSession = await prisma.session.findFirst({
    where: { appointmentId: id },
    select: { id: true },
  });
  if (linkedSession) {
    return {
      error: "conflict",
      message: "Cannot delete an appointment with a linked session",
    };
  }

  await prisma.appointment.delete({ where: { id } });
  return { ok: true };
}

export function toClinicianView(a: any): any {
  // Resolve invoiceId from line items if available
  const invoiceId =
    a.invoiceLineItems?.[0]?.invoiceId ?? null;

  return {
    id: a.id,
    practiceId: a.practiceId,
    clinicianId: a.clinicianId,
    participantId: a.participantId,
    participant: a.participant
      ? {
          id: a.participant.id,
          firstName: a.participant.user?.firstName ?? null,
          lastName: a.participant.user?.lastName ?? null,
          email: a.participant.user?.email ?? null,
        }
      : null,
    serviceCode: a.serviceCode
      ? {
          id: a.serviceCode.id,
          code: a.serviceCode.code,
          description: a.serviceCode.description,
          defaultDurationMinutes: a.serviceCode.defaultDurationMinutes,
        }
      : null,
    location: a.location
      ? { id: a.location.id, name: a.location.name, type: a.location.type }
      : null,
    startAt: toIso(a.startAt),
    endAt: toIso(a.endAt),
    status: a.status,
    appointmentType: a.appointmentType,
    internalNote: a.internalNote,
    cancelReason: a.cancelReason,
    statusChangedAt: a.statusChangedAt ? toIso(a.statusChangedAt) : null,
    createdById: a.createdById,
    createdAt: toIso(a.createdAt),
    updatedAt: toIso(a.updatedAt),
    invoiceId,
  };
}

export function toParticipantView(a: any): any {
  return {
    id: a.id,
    clinicianId: a.clinicianId,
    clinician: a.clinician?.user
      ? {
          firstName: a.clinician.user.firstName ?? null,
          lastName: a.clinician.user.lastName ?? null,
        }
      : null,
    serviceCode: a.serviceCode
      ? { code: a.serviceCode.code, description: a.serviceCode.description }
      : null,
    location: a.location
      ? {
          name: a.location.name,
          type: a.location.type,
          addressLine1: a.location.addressLine1 ?? null,
          city: a.location.city ?? null,
          state: a.location.state ?? null,
        }
      : null,
    startAt: toIso(a.startAt),
    endAt: toIso(a.endAt),
    status: a.status,
    appointmentType: a.appointmentType,
  };
}

export async function listParticipantAppointments(params: {
  participantProfileId: string;
  from: Date;
  to: Date;
  status: AppointmentStatusType[];
  limit: number;
  cursor?: string;
}): Promise<{ data: any[]; cursor: string | null }> {
  const { participantProfileId, from, to, status, limit, cursor } = params;
  const items = await prisma.appointment.findMany({
    where: {
      participantId: participantProfileId,
      status: { in: status as any },
      AND: [{ startAt: { lt: to } }, { endAt: { gt: from } }],
    },
    include: APPOINTMENT_INCLUDE,
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: limit + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return { data, cursor: hasMore ? data[data.length - 1].id : null };
}

function toIso(d: Date | string): string {
  if (typeof d === "string") return d;
  return d.toISOString();
}
