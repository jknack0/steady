import { prisma } from "@steady/db";
import type { ServiceCtx } from "../lib/practice-context";
import type { CreatePaymentInput, InvoiceStatus } from "@steady/shared";

async function recalculateInvoice(
  invoiceId: string,
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
): Promise<void> {
  const payments = await tx.payment.findMany({
    where: { invoiceId, deletedAt: null },
    select: { amountCents: true },
  });
  const paidCents = payments.reduce((sum, p) => sum + p.amountCents, 0);

  const invoice = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { status: true, totalCents: true },
  });

  let status: InvoiceStatus;
  if (invoice.status === "VOID" || invoice.status === "DRAFT") {
    status = invoice.status;
  } else if (paidCents >= invoice.totalCents) {
    status = "PAID";
  } else if (paidCents > 0) {
    status = "PARTIALLY_PAID";
  } else {
    status = "SENT";
  }

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { paidCents, status },
  });
}

export async function recordPayment(
  ctx: ServiceCtx,
  invoiceId: string,
  input: CreatePaymentInput,
): Promise<
  | { payment: any }
  | { error: "not_found" }
  | { error: "conflict"; message: string }
> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, practiceId: ctx.practiceId },
  });
  if (!invoice) return { error: "not_found" };
  if (!ctx.isAccountOwner && invoice.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }

  if (invoice.status === "DRAFT" || invoice.status === "VOID") {
    return {
      error: "conflict",
      message: "Cannot record payment on a draft or void invoice",
    };
  }

  const receivedAt = input.receivedAt ? new Date(input.receivedAt) : new Date();

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: {
        invoiceId,
        amountCents: input.amountCents,
        method: input.method,
        reference: input.reference ?? null,
        receivedAt,
      },
    });

    await recalculateInvoice(invoiceId, tx);
    return p;
  });

  return { payment };
}

export async function listPayments(
  ctx: ServiceCtx,
  invoiceId: string,
): Promise<{ data: any[] } | { error: "not_found" }> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, practiceId: ctx.practiceId },
  });
  if (!invoice) return { error: "not_found" };
  if (!ctx.isAccountOwner && invoice.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }

  const data = await prisma.payment.findMany({
    where: { invoiceId, deletedAt: null },
    orderBy: { receivedAt: "desc" },
    take: 200,
  });

  return { data };
}

export async function deletePayment(
  ctx: ServiceCtx,
  invoiceId: string,
  paymentId: string,
): Promise<
  | { ok: true }
  | { error: "not_found" }
> {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, practiceId: ctx.practiceId },
  });
  if (!invoice) return { error: "not_found" };
  if (!ctx.isAccountOwner && invoice.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" };
  }

  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, invoiceId },
  });
  if (!payment) return { error: "not_found" };

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({ where: { id: paymentId }, data: { deletedAt: new Date() } });
    await recalculateInvoice(invoiceId, tx);
  });

  return { ok: true };
}
