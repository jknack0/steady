# Billing & Invoicing — Compliance Assessment

## Regulatory Context

Billing data linked to identified patients constitutes Protected Health Information (PHI) under HIPAA. Invoices tie a specific patient to clinical services rendered (via service codes), dates of service, and financial amounts. This data requires the same safeguards as clinical records.

## HIPAA Requirements

### Data Classification

| Data Element | PHI? | Rationale |
|-------------|------|-----------|
| Invoice (participantId + serviceCodeId + dates) | Yes | Links patient identity to clinical services |
| Invoice notes | Yes | May contain clinical context |
| Payment records | Yes | Linked to patient invoices |
| Line item descriptions | Yes | Describe clinical services for an identified patient |
| Billing summary (aggregate) | No | Aggregate counts, no patient identifiers |
| Invoice number | No | Sequential identifier, no patient info |

### Access Controls

- **Minimum necessary**: Clinicians see only their own invoices; practice owners see all practice invoices
- **Authentication**: All endpoints require JWT auth + CLINICIAN or ADMIN role
- **Authorization**: Practice membership verified via `requirePracticeCtx` middleware
- **Cross-tenant isolation**: Every query filters by `practiceId`; cross-practice requests return 404 (no existence leakage)

### Audit Trail

- All CREATE, UPDATE, DELETE operations on Invoice, InvoiceLineItem, and Payment are captured by the existing Prisma audit middleware
- Audit logs record: userId, action, resourceType, resourceId, changed field names
- Audit logs NEVER record: dollar amounts, invoice notes, patient names, line item descriptions
- Status transitions (DRAFT -> SENT, etc.) are audit-logged with from/to metadata (non-PHI)

### Logging

- Logger (`packages/api/src/lib/logger.ts`) is used for all logging — never `console.log`
- Logs record operation names and resource IDs only
- NEVER log: amountCents, paidCents, totalCents, invoice notes, payment references, patient names
- Error logs include error name + message only (existing pattern)

### Data Security

- All amounts stored as integers (cents) — prevents floating-point representation attacks
- Invoice notes field has `.max(2000)` Zod constraint
- Payment reference field has `.max(200)` Zod constraint
- No file uploads in this sprint (PDF generation deferred)
- All API communication over HTTPS in production
- 30-minute session timeout applies (existing `InactivityTimeout` component)

### Data Retention

- Invoices are soft-transitioned (VOID), not hard-deleted, except DRAFT status
- DRAFT deletion is a hard delete (no financial record established yet)
- Payment deletion recalculates invoice balance — maintains consistency
- Audit trail is immutable and retained indefinitely

## SOC 2 Considerations

- **CC6.1 (Logical access)**: Role-based access enforced at middleware layer
- **CC6.3 (External parties)**: No external integrations in this sprint
- **CC7.2 (System monitoring)**: All mutations audit-logged
- **CC8.1 (Change management)**: Schema changes via Prisma migrations; tested before deployment

## Compliance Verdict

**PASS** — The billing feature follows established HIPAA patterns in the codebase. No new compliance risks introduced beyond existing appointment/RTM handling. Key mitigations: audit logging, no PII in logs, cross-tenant isolation, integer-only money representation.

## Conditions

1. NEVER log dollar amounts at any log level
2. NEVER expose invoice notes in audit log metadata
3. ALWAYS verify practice ownership before returning invoice data
4. ALWAYS use Prisma singleton (connection pooling) — no ad-hoc clients
5. Invoice notes MUST be treated as PHI in any future export/reporting features
