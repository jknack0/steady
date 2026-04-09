import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import { requirePracticeCtx } from "../lib/practice-context";
import { validate } from "../middleware/validate";
import {
  CreateInvoiceSchema,
  UpdateInvoiceSchema,
  CreatePaymentSchema,
  ListInvoicesQuerySchema,
} from "@steady/shared";
import {
  createInvoice,
  listInvoices,
  getInvoice,
  updateInvoice,
  sendInvoice,
  voidInvoice,
  deleteInvoice,
  createInvoiceFromAppointment,
  getInvoiceForPdf,
} from "../services/billing";
import { generateInvoicePdf } from "../services/invoice-pdf";
import {
  recordPayment,
  listPayments,
  deletePayment,
} from "../services/payments";
import { logger } from "../lib/logger";

const router = Router();

router.use(authenticate);
router.use(requireRole("CLINICIAN", "ADMIN"));
router.use(requirePracticeCtx);

// ── Invoice CRUD ───────────────────────────────────────

router.post("/", validate(CreateInvoiceSchema), async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await createInvoice(ctx, req.body);
    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (result.error === "validation") {
        res.status(400).json({ success: false, error: result.message });
        return;
      }
    }
    res.status(201).json({ success: true, data: (result as any).invoice });
  } catch (err) {
    logger.error("Create invoice error", err);
    res.status(500).json({ success: false, error: "Failed to create invoice" });
  }
});

router.get("/", async (req: Request, res: Response) => {
  try {
    const parsed = ListInvoicesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }
    const ctx = res.locals.practiceCtx!;
    const result = await listInvoices(ctx, parsed.data);
    res.json({ success: true, data: result.data, cursor: result.cursor });
  } catch (err) {
    logger.error("List invoices error", err);
    res.status(500).json({ success: false, error: "Failed to list invoices" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const invoice = await getInvoice(ctx, req.params.id);
    if (!invoice) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.json({ success: true, data: invoice });
  } catch (err) {
    logger.error("Get invoice error", err);
    res.status(500).json({ success: false, error: "Failed to get invoice" });
  }
});

router.patch("/:id", validate(UpdateInvoiceSchema), async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await updateInvoice(ctx, req.params.id, req.body);
    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (result.error === "conflict") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
    }
    res.json({ success: true, data: (result as any).invoice });
  } catch (err) {
    logger.error("Update invoice error", err);
    res.status(500).json({ success: false, error: "Failed to update invoice" });
  }
});

router.post("/:id/send", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await sendInvoice(ctx, req.params.id);
    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (result.error === "conflict") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
    }
    res.json({ success: true, data: (result as any).invoice });
  } catch (err) {
    logger.error("Send invoice error", err);
    res.status(500).json({ success: false, error: "Failed to send invoice" });
  }
});

router.post("/:id/void", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await voidInvoice(ctx, req.params.id);
    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (result.error === "conflict") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
    }
    res.json({ success: true, data: (result as any).invoice });
  } catch (err) {
    logger.error("Void invoice error", err);
    res.status(500).json({ success: false, error: "Failed to void invoice" });
  }
});

router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await deleteInvoice(ctx, req.params.id);
    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (result.error === "conflict") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
    }
    res.status(204).send();
  } catch (err) {
    logger.error("Delete invoice error", err);
    res.status(500).json({ success: false, error: "Failed to delete invoice" });
  }
});

// ── Auto-invoice from appointment ──────────────────────

router.post("/from-appointment/:appointmentId", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await createInvoiceFromAppointment(ctx, req.params.appointmentId);
    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (result.error === "conflict") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
    }
    res.status(201).json({ success: true, data: (result as any).invoice });
  } catch (err) {
    logger.error("Create invoice from appointment error", err);
    res.status(500).json({ success: false, error: "Failed to create invoice" });
  }
});

// ── PDF ───────────────────────────────────────────────

router.get("/:id/pdf", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const invoice = await getInvoiceForPdf(ctx, req.params.id);
    if (!invoice) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    const pdf = generateInvoicePdf(invoice);
    const filename = `${invoice.invoiceNumber}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdf);
  } catch (err) {
    logger.error("Generate invoice PDF error", err);
    res.status(500).json({ success: false, error: "Failed to generate PDF" });
  }
});

// ── Payments ───────────────────────────────────────────

router.post("/:id/payments", validate(CreatePaymentSchema), async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await recordPayment(ctx, req.params.id, req.body);
    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Not found" });
        return;
      }
      if (result.error === "conflict") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
    }
    res.status(201).json({ success: true, data: (result as any).payment });
  } catch (err) {
    logger.error("Record payment error", err);
    res.status(500).json({ success: false, error: "Failed to record payment" });
  }
});

router.get("/:id/payments", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await listPayments(ctx, req.params.id);
    if ("error" in result) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error("List payments error", err);
    res.status(500).json({ success: false, error: "Failed to list payments" });
  }
});

router.delete("/:id/payments/:paymentId", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await deletePayment(ctx, req.params.id, req.params.paymentId);
    if ("error" in result) {
      res.status(404).json({ success: false, error: "Not found" });
      return;
    }
    res.status(204).send();
  } catch (err) {
    logger.error("Delete payment error", err);
    res.status(500).json({ success: false, error: "Failed to delete payment" });
  }
});

export default router;
