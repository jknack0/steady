# Billing & Invoicing — Release Materials

## Feature Summary

Steady now supports invoice creation, payment tracking, and billing summary for clinical practices. Clinicians can generate invoices from attended appointments or create them manually, record payments, and view practice-wide billing metrics.

## What's New

### For Solo Clinicians
- **One-click invoicing**: Generate an invoice directly from any attended appointment — service code, price, and client are pre-filled
- **Payment tracking**: Record cash, check, credit card, insurance, or other payments with automatic balance calculation
- **Billing dashboard**: See outstanding balance, monthly revenue, and overdue invoices at a glance

### For Practice Owners
- **Practice-wide visibility**: View invoices from all clinicians in your practice
- **Consolidated metrics**: Billing summary includes all clinicians' invoices and payments

### Invoice Lifecycle
- **Draft**: Create and edit freely. Add line items, adjust prices, add notes.
- **Sent**: Mark as sent to the client. Due date auto-set to 30 days.
- **Payment tracking**: Record full or partial payments. Status auto-updates.
- **Void**: Cancel any invoice while preserving the audit trail.

## Talking Points

1. "Steady now handles billing alongside clinical workflow — no more switching between tools."
2. "Generate an invoice in one click from any attended appointment."
3. "Track partial payments with automatic balance recalculation."
4. "Practice owners get a unified view of all billing across clinicians."
5. "All billing data is HIPAA-compliant with full audit logging."

## FAQ

**Q: Can I generate PDF invoices?**
A: PDF generation is planned for a future sprint. Currently, invoice data is viewable in the web app.

**Q: How are invoice numbers generated?**
A: Invoice numbers are auto-incremented per practice (INV-001, INV-002, etc.) and guaranteed unique.

**Q: Can I edit a sent invoice?**
A: No. Once an invoice is sent, it can only receive payments or be voided. To correct an error, void the invoice and create a new one.

**Q: Does this integrate with accounting software?**
A: Not yet. QuickBooks/Stripe integration is on the roadmap.

**Q: Is billing data HIPAA-compliant?**
A: Yes. All invoice/payment mutations are audit-logged. Financial data linked to patients is treated as PHI. Dollar amounts are never logged.

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | /api/invoices | Create invoice |
| GET | /api/invoices | List invoices |
| GET | /api/invoices/:id | Get invoice detail |
| PATCH | /api/invoices/:id | Update draft invoice |
| POST | /api/invoices/:id/send | Send invoice |
| POST | /api/invoices/:id/void | Void invoice |
| DELETE | /api/invoices/:id | Delete draft |
| POST | /api/invoices/:id/payments | Record payment |
| GET | /api/invoices/:id/payments | List payments |
| DELETE | /api/invoices/:id/payments/:paymentId | Remove payment |
| POST | /api/invoices/from-appointment/:id | Auto-invoice |
| GET | /api/billing/summary | Billing summary |
