import { prisma } from "@steady/db";
import type { ServiceCtx } from "../lib/practice-context";
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  ListInvoicesQuery,
  InvoiceStatus,
} from "@steady/shared";
import { logger } from "../lib/logger";

const INVOICE_INCLUDE = {
  lineItems: {
    include: {
      serviceCode: true,
      appointment: true,
    },
  },
  payments: true,
  participant: {
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  },
  clinician: {
    include: { user: { select: { firstName: true, lastName: true } } },
  },
} as const;

async function generateInvoiceNumber(
  practiceId: string,
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<string> {
  const last = await tx.invoice.findFirst({
    where: { practiceId },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  });
  const nextNum = last
    ? parseInt(last.invoiceNumber.replace("INV-", ""), 10) + 1
    : 1;
  return `INV-${String(nextNum).padStart(3, "0")}`;
}

export async function createInvoice(
  ctx: ServiceCtx,
  input: CreateInvoiceInput,
): Promise<{ invoice: any } | { error: "not_found" } | { error: "validation"; message: string }> {
  if (!ctx.clinicianProfileId) return { error: "not_found" };

  // Verify participant belongs to practice
  const participant = await prisma.participantProfile.findUnique({
    where: { id: input.participantId },
  });
  if (!participant) return { error: "not_found" };

  // Verify all service codes belong to practice
  for (const item of input.lineItems) {
    const sc = await prisma.serviceCode.findFirst({
      where: { id: item.serviceCodeId, practiceId: ctx.practiceId },
    });
    if (!sc) return { error: "not_found" };

    // If appointmentId provided, verify it
    if (item.appointmentId) {
      const appt = await prisma.appointment.findFirst({
        where: { id: item.appointmentId, practiceId: ctx.practiceId },
      });
      if (!appt) return { error: "not_found" };
    }
  }

  const invoice = await prisma.$transaction(async (tx) => {
    const invoiceNumber = await generateInvoiceNumber(ctx.practiceId, tx);

    // Build line items with resolved prices
    const lineItemsData: Array<{
      appointmentId: string | null;
      serviceCodeId: string;
      description: string;
      unitPriceCents: number;
      quantity: number;
      totalCents: number;
    }> = [];

    for (const item of input.lineItems) {
      const sc = await tx.serviceCode.findFirst({
        where: { id: item.serviceCodeId, practiceId: ctx.practiceId },
      });
      if (!sc) throw new Error("Service code not found");

      const unitPrice = item.unitPriceCents ?? sc.defaultPriceCents ?? 0;
      const qty = item.quantity ?? 1;
      lineItemsData.push({
        appointmentId: item.appointmentId ?? null,
        serviceCodeId: item.serviceCodeId,
        description: item.description ?? sc.description,
        unitPriceCents: unitPrice,
        quantity: qty,
        totalCents: unitPrice * qty,
      });
    }

    const subtotalCents = lineItemsData.reduce((sum, li) => sum + li.totalCents, 0);
    const taxCents = input.taxCents ?? 0;
    const totalCents = subtotalCents + taxCents;

    const inv = await tx.invoice.create({
      data: {
        practiceId: ctx.practiceId,
        clinicianId: ctx.clinicianProfileId!,
        participantId: input.participantId,
        invoiceNumber,
        status: "DRAFT",
        subtotalCents,
        taxCents,
        totalCents,
        paidCents: 0,
        notes: input.notes ?? null,
        lineItems: {
          create: lineItemsData,
        },
      },
      include: INVOICE_INCLUDE,
    });

    return inv;
  });

  return { invoice };
}

function parseStatusList(raw?: string): InvoiceStatus[] | undefined {
  if (!raw) return undefined;
  const valid = new Set<InvoiceStatus>([
    "DRAFT", "SENT", "PAID", "PARTIALLY_PAID", "OVERDUE", "VOID",
  ]);
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is InvoiceStatus => valid.has(s as InvoiceStatus));
  return list.length > 0 ? list : undefined;
}

export async function listInvoices(
  ctx: ServiceCtx,
  query: ListInvoicesQuery,
): Promise<{ data: any[]; cursor: string | null }> {
  const limit = Math.min(query.limit ?? 50, 100);
  const statusList = parseStatusList(query.status);

  const where: any = {
    practiceId: ctx.practiceId,
    ...(statusList ? { status: { in: statusList } } : {}),
    ...(query.participantId ? { participantId: query.participantId } : {}),
  };

  // Non-owner sees only own invoices
  if (!ctx.isAccountOwner) {
    where.clinicianId = ctx.clinicianProfileId;
  }

  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) where.createdAt.gte = new Date(query.from);
    if (query.to) where.createdAt.lte = new Date(query.to);
  }

  const items = await prisma.invoice.findMany({
    where,
    include: {
      participant: {
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
      },
      clinician: {
        include: { user: { select: { firstName: true, lastName: true } } },
      },
      _count: { select: { lineItems: true, payments: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
    ...(query.cursor ? { skip: 1, cursor: { id: query.cursor } } : {}),
  });

  const hasMore = items.length > limit;
  const data = hasMore ? items.slice(0, limit) : items;
  return { data, cursor: hasMore ? data[data.length - 1].id : null };
}

export async function getInvoice(
  ctx: ServiceCtx,
  id: string,
): Promise<any | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { id, practiceId: ctx.practiceId },
    include: INVOICE_INCLUDE,
  });
  if (!invoice) return null;
  if (!ctx.isAccountOwner && invoice.clinicianId !== ctx.clinicianProfileId) {
    return null;
  }
  return invoice;
}

export async function updateInvoice(
  ctx: ServiceCtx,
  id: string,
  patch: UpdateInvoiceInput,
): Promise<
  | { invoice: any }
  | { error: "not_found" }
  | { error: "conflict"; message: string }
> {
  const existing = await prisma.invoice.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  if (!ctx.isAccountOwner && existing.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }
  if (existing.status !== "DRAFT") {
    return { error: "conflict", message: "Only draft invoices can be edited" };
  }

  const invoice = await prisma.$transaction(async (tx) => {
    // If line items provided, rebuild them
    if (patch.lineItems) {
      await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });

      const lineItemsData: Array<{
        invoiceId: string;
        appointmentId: string | null;
        serviceCodeId: string;
        description: string;
        unitPriceCents: number;
        quantity: number;
        totalCents: number;
      }> = [];

      for (const item of patch.lineItems) {
        const sc = await tx.serviceCode.findFirst({
          where: { id: item.serviceCodeId, practiceId: ctx.practiceId },
        });
        if (!sc) throw new Error("Service code not found");

        const unitPrice = item.unitPriceCents ?? sc.defaultPriceCents ?? 0;
        const qty = item.quantity ?? 1;
        lineItemsData.push({
          invoiceId: id,
          appointmentId: item.appointmentId ?? null,
          serviceCodeId: item.serviceCodeId,
          description: item.description ?? sc.description,
          unitPriceCents: unitPrice,
          quantity: qty,
          totalCents: unitPrice * qty,
        });
      }

      for (const liData of lineItemsData) {
        await tx.invoiceLineItem.create({ data: liData });
      }

      const subtotalCents = lineItemsData.reduce((sum, li) => sum + li.totalCents, 0);
      const taxCents = patch.taxCents ?? existing.taxCents;
      const totalCents = subtotalCents + taxCents;

      return tx.invoice.update({
        where: { id },
        data: {
          subtotalCents,
          taxCents,
          totalCents,
          ...(patch.notes !== undefined ? { notes: patch.notes } : {}),
        },
        include: INVOICE_INCLUDE,
      });
    }

    // No line items update — just notes/tax
    const data: any = {};
    if (patch.notes !== undefined) data.notes = patch.notes;
    if (patch.taxCents !== undefined) {
      data.taxCents = patch.taxCents;
      data.totalCents = existing.subtotalCents + patch.taxCents;
    }

    return tx.invoice.update({
      where: { id },
      data,
      include: INVOICE_INCLUDE,
    });
  });

  return { invoice };
}

export async function sendInvoice(
  ctx: ServiceCtx,
  id: string,
): Promise<{ invoice: any } | { error: "not_found" } | { error: "conflict"; message: string }> {
  const existing = await prisma.invoice.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  if (!ctx.isAccountOwner && existing.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }
  if (existing.status !== "DRAFT") {
    return { error: "conflict", message: "Only draft invoices can be sent" };
  }

  const now = new Date();
  const dueAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const invoice = await prisma.invoice.update({
    where: { id },
    data: {
      status: "SENT",
      issuedAt: now,
      dueAt,
    },
    include: INVOICE_INCLUDE,
  });

  return { invoice };
}

export async function voidInvoice(
  ctx: ServiceCtx,
  id: string,
): Promise<{ invoice: any } | { error: "not_found" } | { error: "conflict"; message: string }> {
  const existing = await prisma.invoice.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  if (!ctx.isAccountOwner && existing.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }
  if (existing.status === "VOID") {
    return { error: "conflict", message: "Invoice is already void" };
  }

  const invoice = await prisma.invoice.update({
    where: { id },
    data: { status: "VOID" },
    include: INVOICE_INCLUDE,
  });

  // Audit status transition
  try {
    await prisma.auditLog.create({
      data: {
        userId: ctx.userId,
        action: "UPDATE",
        resourceType: "Invoice",
        resourceId: id,
        metadata: { changedFields: ["status"], from: existing.status, to: "VOID" },
      },
    });
  } catch {
    // fire-and-forget
  }

  return { invoice };
}

export async function deleteInvoice(
  ctx: ServiceCtx,
  id: string,
): Promise<{ ok: true } | { error: "not_found" } | { error: "conflict"; message: string }> {
  const existing = await prisma.invoice.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  if (!ctx.isAccountOwner && existing.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }
  if (existing.status !== "DRAFT") {
    return { error: "conflict", message: "Only draft invoices can be deleted" };
  }

  await prisma.invoice.delete({ where: { id } });
  return { ok: true };
}

export async function createInvoiceFromAppointment(
  ctx: ServiceCtx,
  appointmentId: string,
): Promise<
  | { invoice: any }
  | { error: "not_found" }
  | { error: "conflict"; message: string }
> {
  if (!ctx.clinicianProfileId) return { error: "not_found" };

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, practiceId: ctx.practiceId },
    include: { serviceCode: true },
  });
  if (!appt) return { error: "not_found" };
  if (!ctx.isAccountOwner && appt.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }

  if (appt.status !== "ATTENDED") {
    return { error: "conflict", message: "Only attended appointments can be invoiced" };
  }

  // Check if appointment already has an invoice line item
  const existingLineItem = await prisma.invoiceLineItem.findFirst({
    where: { appointmentId },
  });
  if (existingLineItem) {
    return { error: "conflict", message: "Appointment already has an invoice" };
  }

  const unitPrice = appt.serviceCode.defaultPriceCents ?? 0;

  return createInvoice(ctx, {
    participantId: appt.participantId,
    lineItems: [
      {
        appointmentId: appt.id,
        serviceCodeId: appt.serviceCodeId,
        description: appt.serviceCode.description,
        unitPriceCents: unitPrice,
        quantity: 1,
      },
    ],
    taxCents: 0,
  });
}

export async function getBillingSummary(
  ctx: ServiceCtx,
): Promise<{
  totalOutstandingCents: number;
  totalReceivedThisMonthCents: number;
  overdueCount: number;
  invoiceCountsByStatus: Record<string, number>;
}> {
  const clinicianFilter = ctx.isAccountOwner ? {} : { clinicianId: ctx.clinicianProfileId };

  // Outstanding = SENT + PARTIALLY_PAID + OVERDUE balances
  const outstandingInvoices = await prisma.invoice.findMany({
    where: {
      practiceId: ctx.practiceId,
      ...clinicianFilter,
      status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] },
    },
    select: { totalCents: true, paidCents: true },
  });
  const totalOutstandingCents = outstandingInvoices.reduce(
    (sum, inv) => sum + (inv.totalCents - inv.paidCents),
    0,
  );

  // Received this month
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const payments = await prisma.payment.findMany({
    where: {
      invoice: {
        practiceId: ctx.practiceId,
        ...clinicianFilter,
      },
      receivedAt: { gte: monthStart },
    },
    select: { amountCents: true },
  });
  const totalReceivedThisMonthCents = payments.reduce(
    (sum, p) => sum + p.amountCents,
    0,
  );

  // Overdue count
  const overdueCount = await prisma.invoice.count({
    where: {
      practiceId: ctx.practiceId,
      ...clinicianFilter,
      status: "OVERDUE",
    },
  });

  // Counts by status
  const allStatuses: InvoiceStatus[] = [
    "DRAFT", "SENT", "PAID", "PARTIALLY_PAID", "OVERDUE", "VOID",
  ];
  const invoiceCountsByStatus: Record<string, number> = {};
  for (const status of allStatuses) {
    invoiceCountsByStatus[status] = await prisma.invoice.count({
      where: {
        practiceId: ctx.practiceId,
        ...clinicianFilter,
        status,
      },
    });
  }

  return {
    totalOutstandingCents,
    totalReceivedThisMonthCents,
    overdueCount,
    invoiceCountsByStatus,
  };
}
