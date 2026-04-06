import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { cancelRemindersForAppointment } from "./appointment-reminders";

// ── Invoice Includes ────────────────────────────────────

const PARTICIPANT_INVOICE_DETAIL_INCLUDE = {
  lineItems: {
    select: {
      id: true,
      description: true,
      unitPriceCents: true,
      quantity: true,
      totalCents: true,
    },
  },
  payments: {
    select: {
      id: true,
      amountCents: true,
      method: true,
      receivedAt: true,
    },
  },
  clinician: {
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  },
} as const;

// ── Visible statuses for participants ────────────────────

const PARTICIPANT_VISIBLE_STATUSES = ["SENT", "PAID", "PARTIALLY_PAID", "OVERDUE"] as const;

// ── Serializers ─────────────────────────────────────────

export function toParticipantInvoiceListView(invoice: any): any {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issuedAt: invoice.issuedAt ? toIso(invoice.issuedAt) : null,
    dueAt: invoice.dueAt ? toIso(invoice.dueAt) : null,
    totalCents: invoice.totalCents,
    paidCents: invoice.paidCents,
    clinician: invoice.clinician?.user
      ? {
          firstName: invoice.clinician.user.firstName ?? null,
          lastName: invoice.clinician.user.lastName ?? null,
        }
      : null,
  };
}

export function toParticipantInvoiceDetailView(invoice: any): any {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issuedAt: invoice.issuedAt ? toIso(invoice.issuedAt) : null,
    dueAt: invoice.dueAt ? toIso(invoice.dueAt) : null,
    subtotalCents: invoice.subtotalCents,
    taxCents: invoice.taxCents,
    totalCents: invoice.totalCents,
    paidCents: invoice.paidCents,
    lineItems: (invoice.lineItems ?? []).map((li: any) => ({
      id: li.id,
      description: li.description,
      unitPriceCents: li.unitPriceCents,
      quantity: li.quantity,
      totalCents: li.totalCents,
    })),
    payments: (invoice.payments ?? []).map((p: any) => ({
      id: p.id,
      amountCents: p.amountCents,
      method: p.method,
      receivedAt: toIso(p.receivedAt),
    })),
    clinician: invoice.clinician?.user
      ? {
          firstName: invoice.clinician.user.firstName ?? null,
          lastName: invoice.clinician.user.lastName ?? null,
        }
      : null,
  };
}

// ── Service Functions ───────────────────────────────────

export async function getParticipantInvoices(
  participantProfileId: string,
  params: { cursor?: string; limit?: number },
): Promise<{ data: any[]; cursor: string | null }> {
  const limit = Math.min(params.limit ?? 50, 100);

  const items = await prisma.invoice.findMany({
    where: {
      participantId: participantProfileId,
      status: { in: [...PARTICIPANT_VISIBLE_STATUSES] },
    },
    include: {
      clinician: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return {
    data: data.map(toParticipantInvoiceListView),
    cursor: hasMore ? data[data.length - 1].id : null,
  };
}

export async function getParticipantInvoice(
  participantProfileId: string,
  invoiceId: string,
): Promise<any | null> {
  const invoice = await prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      participantId: participantProfileId,
      status: { in: [...PARTICIPANT_VISIBLE_STATUSES] },
    },
    include: PARTICIPANT_INVOICE_DETAIL_INCLUDE,
  });

  if (!invoice) return null;
  return toParticipantInvoiceDetailView(invoice);
}

export async function participantCancelAppointment(
  participantProfileId: string,
  userId: string,
  appointmentId: string,
  cancelReason?: string,
): Promise<
  | { appointment: any }
  | { error: "not_found" }
  | { error: "conflict"; message: string }
> {
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      participantId: participantProfileId,
    },
  });

  if (!appointment) return { error: "not_found" };

  if (appointment.status !== "SCHEDULED") {
    return { error: "conflict", message: "Only scheduled appointments can be canceled" };
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "CLIENT_CANCELED",
      statusChangedAt: new Date(),
      ...(cancelReason ? { cancelReason } : {}),
    },
    include: {
      clinician: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      serviceCode: { select: { code: true, description: true } },
      location: { select: { name: true, type: true } },
    },
  });

  // Cancel pending reminders
  await cancelRemindersForAppointment(appointmentId);

  // Audit log
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action: "UPDATE",
        resourceType: "Appointment",
        resourceId: appointmentId,
        metadata: {
          changedFields: ["status"],
          from: "SCHEDULED",
          to: "CLIENT_CANCELED",
          initiator: "participant",
        },
      },
    });
  } catch {
    // fire-and-forget
  }

  return { appointment: updated };
}

export async function getParticipantOutstandingInvoiceCount(
  participantProfileId: string,
): Promise<number> {
  return prisma.invoice.count({
    where: {
      participantId: participantProfileId,
      status: { in: ["SENT", "OVERDUE"] },
    },
  });
}

// ── Helpers ─────────────────────────────────────────────

function toIso(d: Date | string): string {
  if (typeof d === "string") return d;
  return d.toISOString();
}
