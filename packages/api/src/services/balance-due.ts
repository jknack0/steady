import { prisma } from "@steady/db";
import { logger } from "../lib/logger";

export async function checkAndCreateBalanceDue(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      payments: true,
      lineItems: { include: { serviceCode: true } },
    },
  });

  if (!invoice || invoice.status === "VOID") return;

  // Calculate remaining balance
  const totalPaid = invoice.payments.reduce((sum: number, p: any) => sum + p.amountCents, 0);
  const remaining = invoice.totalCents - totalPaid;

  if (remaining <= 0) return; // Fully paid

  // Check for existing balance-due draft
  const existingDraft = await prisma.invoice.findFirst({
    where: {
      balanceDueSourceInvoiceId: invoiceId,
      status: "DRAFT",
    },
  });

  if (existingDraft) {
    // Update existing draft with new remaining amount
    await prisma.invoice.update({
      where: { id: existingDraft.id },
      data: {
        subtotalCents: remaining,
        totalCents: remaining,
      },
    });

    // Update line item amount
    await prisma.invoiceLineItem.updateMany({
      where: { invoiceId: existingDraft.id },
      data: { unitPriceCents: remaining, totalCents: remaining },
    });

    logger.info(`Updated balance-due invoice ${existingDraft.id} to ${remaining} cents`);
    return;
  }

  // Check if a non-draft balance-due already exists (clinician already sent it)
  const existingSent = await prisma.invoice.findFirst({
    where: {
      balanceDueSourceInvoiceId: invoiceId,
      status: { not: "DRAFT" },
    },
  });

  if (existingSent) return; // Don't create another

  // Generate invoice number
  const lastInvoice = await prisma.invoice.findFirst({
    where: { practiceId: invoice.practiceId },
    orderBy: { createdAt: "desc" },
    select: { invoiceNumber: true },
  });

  let nextNumber = 1001;
  if (lastInvoice?.invoiceNumber) {
    const match = lastInvoice.invoiceNumber.match(/(\d+)$/);
    if (match) nextNumber = parseInt(match[1], 10) + 1;
  }
  const invoiceNumber = `INV-${nextNumber}`;

  // Find a service code from the original invoice for the line item
  const serviceCodeId = invoice.lineItems[0]?.serviceCodeId;
  if (!serviceCodeId) {
    logger.warn(`Cannot create balance-due invoice for ${invoiceId}: no line items`);
    return;
  }

  // Create balance-due draft invoice
  const balanceDueInvoice = await prisma.invoice.create({
    data: {
      practiceId: invoice.practiceId,
      clinicianId: invoice.clinicianId,
      participantId: invoice.participantId,
      invoiceNumber,
      status: "DRAFT",
      subtotalCents: remaining,
      totalCents: remaining,
      balanceDueSourceInvoiceId: invoiceId,
      lineItems: {
        create: {
          serviceCodeId,
          description: "Patient responsibility — balance after insurance",
          unitPriceCents: remaining,
          quantity: 1,
          totalCents: remaining,
        },
      },
    },
  });

  logger.info(`Created balance-due invoice ${balanceDueInvoice.id} for ${remaining} cents from source ${invoiceId}`);
}
