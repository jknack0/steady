import PDFDocument from "pdfkit";

interface PdfLineItem {
  description: string;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
  serviceCode?: { code: string } | null;
}

interface PdfPayment {
  receivedAt: Date | string;
  method: string;
  amountCents: number;
}

interface PdfInvoice {
  invoiceNumber: string;
  status: string;
  issuedAt: Date | string | null;
  dueAt: Date | string | null;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  paidCents: number;
  notes: string | null;
  lineItems: PdfLineItem[];
  payments: PdfPayment[];
  participant: {
    user: { firstName: string; lastName: string; email: string };
  };
  clinician: {
    user: { firstName: string; lastName: string; email?: string };
    billingProfile?: {
      practiceName: string;
      practiceAddress: string;
      practiceCity: string;
      practiceState: string;
      practiceZip: string;
      practicePhone: string;
    } | null;
  };
  practice?: { name: string } | null;
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function generateInvoicePdf(invoice: PdfInvoice): Buffer {
  const doc = new PDFDocument({ size: "LETTER", margin: 50 });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const clientName =
    `${invoice.participant.user.firstName} ${invoice.participant.user.lastName}`.trim();
  const clientEmail = invoice.participant.user.email;
  const bp = invoice.clinician.billingProfile;
  const practiceName =
    bp?.practiceName || invoice.practice?.name || "Practice";
  const practiceAddress = bp
    ? `${bp.practiceAddress}, ${bp.practiceCity}, ${bp.practiceState} ${bp.practiceZip}`
    : "";
  const practicePhone = bp?.practicePhone || "";
  const clinicianName =
    `${invoice.clinician.user.firstName} ${invoice.clinician.user.lastName}`.trim();

  // Header
  doc.fontSize(18).font("Helvetica-Bold").text(practiceName, 50, 50);
  if (practiceAddress) {
    doc.fontSize(9).font("Helvetica").text(practiceAddress);
  }
  if (practicePhone) {
    doc.fontSize(9).text(practicePhone);
  }

  // INVOICE title + number
  doc
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("INVOICE", 350, 50, { align: "right" });
  doc
    .fontSize(11)
    .font("Helvetica")
    .text(invoice.invoiceNumber, 350, 80, { align: "right" });

  // Dates
  const dateY = 110;
  doc.fontSize(9).font("Helvetica");
  doc.text(`Issued: ${fmtDate(invoice.issuedAt)}`, 350, dateY, {
    align: "right",
  });
  doc.text(`Due: ${fmtDate(invoice.dueAt)}`, 350, dateY + 14, {
    align: "right",
  });
  doc.text(`Status: ${invoice.status}`, 350, dateY + 28, { align: "right" });

  // Bill To
  const billY = 120;
  doc.fontSize(10).font("Helvetica-Bold").text("Bill To:", 50, billY);
  doc.fontSize(10).font("Helvetica").text(clientName, 50, billY + 14);
  doc.text(clientEmail, 50, billY + 28);

  // Line items table
  const tableTop = 190;
  const colX = { desc: 50, qty: 340, price: 400, total: 480 };

  // Table header
  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .text("Description", colX.desc, tableTop)
    .text("Qty", colX.qty, tableTop)
    .text("Unit Price", colX.price, tableTop)
    .text("Total", colX.total, tableTop);

  doc
    .moveTo(50, tableTop + 14)
    .lineTo(560, tableTop + 14)
    .stroke();

  let y = tableTop + 20;
  doc.font("Helvetica").fontSize(9);
  for (const li of invoice.lineItems) {
    const codePrefix = li.serviceCode?.code ? `[${li.serviceCode.code}] ` : "";
    doc.text(`${codePrefix}${li.description}`, colX.desc, y, { width: 280 });
    doc.text(String(li.quantity), colX.qty, y);
    doc.text(fmt(li.unitPriceCents), colX.price, y);
    doc.text(fmt(li.totalCents), colX.total, y);
    y += 18;
  }

  // Totals
  doc
    .moveTo(350, y + 4)
    .lineTo(560, y + 4)
    .stroke();
  y += 12;

  doc.font("Helvetica").fontSize(9);
  doc.text("Subtotal:", 400, y).text(fmt(invoice.subtotalCents), colX.total, y);
  y += 14;

  if (invoice.taxCents > 0) {
    doc.text("Tax:", 400, y).text(fmt(invoice.taxCents), colX.total, y);
    y += 14;
  }

  doc.font("Helvetica-Bold").fontSize(11);
  doc.text("Total:", 400, y).text(fmt(invoice.totalCents), colX.total, y);
  y += 16;

  if (invoice.paidCents > 0) {
    doc.font("Helvetica").fontSize(9);
    doc.text("Paid:", 400, y).text(fmt(invoice.paidCents), colX.total, y);
    y += 14;
  }

  const balanceCents = invoice.totalCents - invoice.paidCents;
  doc.font("Helvetica-Bold").fontSize(13);
  doc.text("Balance Due:", 380, y).text(fmt(balanceCents), colX.total, y);
  y += 24;

  // Payments section
  if (invoice.payments.length > 0) {
    doc.font("Helvetica-Bold").fontSize(10).text("Payments", 50, y);
    y += 16;
    doc.font("Helvetica").fontSize(9);
    for (const p of invoice.payments) {
      doc.text(
        `${fmtDate(p.receivedAt)}  ${p.method}  ${fmt(p.amountCents)}`,
        50,
        y,
      );
      y += 14;
    }
    y += 10;
  }

  // Notes
  if (invoice.notes) {
    doc.font("Helvetica-Bold").fontSize(10).text("Notes", 50, y);
    y += 14;
    doc.font("Helvetica").fontSize(9).text(invoice.notes, 50, y, { width: 500 });
    y += 30;
  }

  // Footer
  const footerY = Math.max(y + 30, 680);
  doc
    .moveTo(50, footerY)
    .lineTo(560, footerY)
    .stroke();
  doc
    .fontSize(9)
    .font("Helvetica")
    .text("Thank you for your payment.", 50, footerY + 8, { align: "center" });
  if (practicePhone) {
    doc.text(
      `Questions? Contact ${practiceName} at ${practicePhone}`,
      50,
      footerY + 20,
      { align: "center" },
    );
  }

  doc.end();

  // Synchronous: pdfkit buffers are already pushed by the time end() returns
  // But we need to build from chunks
  return Buffer.concat(chunks);
}
