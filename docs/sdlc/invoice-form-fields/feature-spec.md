# Add Critical Fields to Invoice Form — Full SDLC Spec

---

## Phase 1: IDEATION

### Problem Statement

The invoice creation form (`billing/new/page.tsx`) is missing fields required for insurance billing (CMS-1500 compliance) and incomplete for private-pay workflows. Currently, the form only captures: client, service code, description, price, quantity, and notes. This means:

1. **Insurance invoices cannot be submitted** -- no date of service (Box 24A), diagnosis codes (Box 21/24E), place of service (Box 24B), or modifiers (Box 24D).
2. **Private-pay invoices lack accounting rigor** -- no due date, payment terms, or rendering/billing provider distinction.
3. **The InsuranceClaim model already stores these fields** (dateOfService, diagnosisCodes, placeOfServiceCode) but the Invoice/InvoiceLineItem models do not, creating a data gap between the two billing paths.

### Opportunity

The codebase already has the infrastructure to support these fields:
- `DiagnosisCode` model with search service (`services/diagnosis-codes.ts`) and API route (`routes/diagnosis-codes.ts`)
- `useDiagnosisCodeSearch` hook on the frontend
- `ClinicianBillingProfile` with `placeOfServiceCode` default
- `Location` model with `IN_PERSON`/`VIRTUAL` type that maps to CMS place-of-service codes
- `ServiceCode` model already on line items

The work is primarily additive: new columns on existing tables, new fields on existing Zod schemas, and new UI fields on an existing form.

### Risks & Constraints

| Risk | Mitigation |
|------|-----------|
| ICD-10 codes are PHI when linked to a patient | Audit logging already strips values; diagnosis codes stored as code strings only (no descriptions persisted on invoice) |
| Schema migration on existing invoices | All new columns are nullable/optional; existing DRAFT invoices remain valid |
| Form complexity increases significantly | Conditional field groups (insurance vs. private-pay) keep the form focused |
| Modifier values are freeform in CMS-1500 | Use a constrained set of common modifiers (95, GT, HO, etc.) with freeform fallback |

---

## Phase 2: PRODUCT OWNER SPEC

### Glossary

| Term | Definition |
|------|-----------|
| **Date of Service** | The date the clinical service was rendered (CMS-1500 Box 24A) |
| **Diagnosis Code (ICD-10)** | International Classification of Diseases code identifying the patient's condition (CMS-1500 Box 21/24E) |
| **Place of Service (POS)** | Two-digit code identifying where the service was rendered, e.g., 02 = Telehealth, 11 = Office (CMS-1500 Box 24B) |
| **Modifier** | Two-character code modifying the service description, e.g., 95 = synchronous telehealth, GT = telehealth (CMS-1500 Box 24D) |
| **Rendering Provider** | The clinician who performed the service (CMS-1500 Box 31) |
| **Billing Provider** | The entity submitting the bill, may differ from rendering provider in group practices (CMS-1500 Box 33) |
| **Due Date** | Date by which payment is expected |
| **Payment Terms** | Standard terms like Net 30, Due on Receipt, etc. |

### MVP vs. Later

| Field | Priority | Rationale |
|-------|----------|-----------|
| Date of service (per line item) | **MVP** | Cannot bill insurance or track services without it |
| Diagnosis codes (per invoice) | **MVP** | Required for insurance; useful for private-pay record-keeping |
| Place of service (per line item) | **MVP** | Required for insurance; auto-populated from appointment location |
| Modifiers (per line item) | **MVP** | Required for telehealth insurance claims |
| Due date | **MVP** | Currently hardcoded to 30 days on send; should be configurable at creation |
| Payment terms | **Later** | Can derive from due date for now; formal terms (Net 30, etc.) are a convenience |
| Rendering provider (per line item) | **Later** | Current system assumes single clinician per invoice; needed for group practices |
| Billing provider distinction | **Later** | Only relevant for group practice billing; ClinicianBillingProfile already stores this |

### Functional Requirements

#### FR-1: Date of Service on Line Items

**GIVEN** a clinician creating an invoice
**WHEN** they add a line item
**THEN** a "Date of Service" date picker is shown, defaulting to today

**GIVEN** a line item linked to an appointment (via appointmentId)
**WHEN** the appointment data is available
**THEN** dateOfService auto-populates from the appointment's `startAt` date

**GIVEN** a line item with a dateOfService
**WHEN** the invoice is saved
**THEN** the dateOfService is persisted on the InvoiceLineItem record

#### FR-2: Diagnosis Codes on Invoice

**GIVEN** a clinician creating an invoice
**WHEN** they reach the diagnosis codes section
**THEN** a searchable ICD-10 code picker is shown, allowing 1-4 codes

**GIVEN** an invoice with a selected client who has recent claims
**WHEN** the diagnosis code picker is opened
**THEN** recently-used codes for that client are shown as suggestions

**GIVEN** a clinician entering a diagnosis code search
**WHEN** the query is >= 2 characters
**THEN** matching codes are fetched from `/api/diagnosis-codes?q=...&participantId=...`

**GIVEN** an invoice created from an appointment that has an InsuranceClaim
**WHEN** auto-populating
**THEN** diagnosis codes from the linked claim are pre-filled

#### FR-3: Place of Service on Line Items

**GIVEN** a clinician creating an invoice
**WHEN** they add a line item
**THEN** a "Place of Service" dropdown is shown with common POS codes

**GIVEN** a line item with an appointmentId
**WHEN** the linked appointment has a Location with type VIRTUAL
**THEN** placeOfServiceCode defaults to "02" (Telehealth - Patient Home)

**GIVEN** a line item with an appointmentId
**WHEN** the linked appointment has a Location with type IN_PERSON
**THEN** placeOfServiceCode defaults to "11" (Office)

**GIVEN** no appointment link
**WHEN** the clinician's billing profile has a default placeOfServiceCode
**THEN** that default is used

#### FR-4: Modifiers on Line Items

**GIVEN** a clinician creating an invoice
**WHEN** they add a line item
**THEN** up to 4 modifier fields are available (matching CMS-1500 Box 24D columns)

**GIVEN** a line item with placeOfServiceCode "02" (telehealth)
**WHEN** auto-populating
**THEN** modifier "95" (synchronous telehealth) is suggested but not forced

**GIVEN** a modifier field
**WHEN** the clinician types
**THEN** common modifiers are shown in a dropdown (95, GT, HO, 76, 77, etc.) with freeform entry allowed

#### FR-5: Due Date on Invoice

**GIVEN** a clinician creating an invoice
**WHEN** the form loads
**THEN** a "Due Date" field is shown, defaulting to 30 days from today

**GIVEN** a due date on a draft invoice
**WHEN** the invoice is sent
**THEN** the stored dueAt uses the user-specified due date instead of hardcoding now + 30 days

#### FR-6: Invoice Detail Display

**GIVEN** a saved invoice with the new fields
**WHEN** viewing the invoice detail page
**THEN** dateOfService, diagnosisCodes, placeOfServiceCode, and modifiers are displayed

**GIVEN** a saved invoice
**WHEN** generating a PDF
**THEN** the new fields appear in the PDF output

### Acceptance Criteria

- [ ] All new fields are optional -- existing invoices without these fields remain valid
- [ ] Diagnosis code search uses the existing `/api/diagnosis-codes` endpoint
- [ ] Place of service auto-populates from appointment location type
- [ ] Modifiers auto-suggest "95" for telehealth but allow override
- [ ] Due date defaults to 30 days from today, overridable
- [ ] Invoice detail page displays all new fields
- [ ] PDF output includes new fields when present
- [ ] All new schema fields have appropriate `.max()` bounds
- [ ] Existing tests continue to pass (backward compatibility)

---

## Phase 3: COMPLIANCE (HIPAA)

### Data Classification

| Field | PHI Status | Rationale |
|-------|-----------|-----------|
| Date of Service | **Yes** (when linked to patient) | Treatment date is a HIPAA identifier |
| Diagnosis Codes (ICD-10) | **Yes** (when linked to patient) | Medical condition = health information |
| Place of Service | **No** | Administrative code, not patient-identifying |
| Modifiers | **No** | Procedure modifier, not patient-identifying |
| Due Date | **No** | Financial/administrative |

### Controls Assessment

| Control | Current State | Gap | Action |
|---------|--------------|-----|--------|
| Audit logging | Prisma middleware logs CREATE/UPDATE/DELETE on all models, field names only, never values | No gap | No change needed -- InvoiceLineItem already audited |
| Access control | Invoice routes require `authenticate` + `requireRole("CLINICIAN", "ADMIN")` + practice ownership check | No gap | Existing middleware covers new fields |
| Logging | `logger` from `packages/api/src/lib/logger.ts` strips PII | No gap | Do not log diagnosis codes at INFO level; only log field names in audit |
| Encryption at rest | PostgreSQL on Railway with encryption at rest | No gap | New columns inherit existing encryption |
| Transport security | HTTPS enforced in production | No gap | No change needed |
| Minimum necessary | Diagnosis codes stored as code strings ("F90.0"), not descriptions | **Verify** | Ensure `diagnosisCodes` on Invoice stores only code strings, not joined descriptions |
| Retention | No explicit retention policy on invoices | **Existing gap** | Out of scope for this feature; flagged for future work |

### Diagnosis Code Handling

The `DiagnosisCode` table is a reference table (not patient-linked). The PHI risk arises when codes are associated with a specific patient on an invoice. Controls:

1. **Storage**: Store only the ICD-10 code strings (e.g., `["F90.0", "F90.1"]`) on the Invoice, not descriptions. Descriptions are resolved at display time from the reference table.
2. **Audit**: The existing audit middleware will log that `diagnosisCodes` was changed, but never log the values.
3. **API Response**: Diagnosis codes are returned only to the authenticated clinician who owns the invoice (or practice owner). The existing ownership check in `getInvoice()` enforces this.
4. **Search Endpoint**: The `/api/diagnosis-codes` search endpoint returns reference data only (not patient-linked). When `participantId` is provided for "recent codes" suggestions, this is scoped to the requesting clinician's own claims -- no cross-clinician data exposure.

### Verdict: PASS

All new fields are covered by existing HIPAA controls. No new access patterns, no new data export paths, no new API surface beyond what existing models already expose. The diagnosis code storage pattern matches the existing `InsuranceClaim.diagnosisCodes` field.

---

## Phase 4: ARCHITECTURE

### Database Schema Changes

#### InvoiceLineItem -- Add Columns

```prisma
model InvoiceLineItem {
  // ... existing fields ...
  dateOfService      DateTime?
  placeOfServiceCode String?       // CMS-1500 Box 24B, e.g., "02", "11"
  modifiers          String[]      // CMS-1500 Box 24D, up to 4 values, e.g., ["95", "GT"]
}
```

#### Invoice -- Add Columns

```prisma
model Invoice {
  // ... existing fields ...
  diagnosisCodes     String[]      // ICD-10 codes, e.g., ["F90.0", "F90.1"]
}
```

**Note**: `dueAt` already exists on the Invoice model as a nullable DateTime. Currently it is only set during `sendInvoice()` (hardcoded to now + 30 days). The change is to allow setting it at creation time.

#### Migration Strategy

- All new columns are nullable/have defaults (`String[] = []`). No data migration needed.
- Existing invoices remain valid -- the Zod schema additions are all `.optional()`.
- Run `prisma db push` -- no manual SQL migration required.

### Zod Schema Changes

#### `packages/shared/src/schemas/billing.ts`

```typescript
// Updated CreateInvoiceLineItemSchema
export const CreateInvoiceLineItemSchema = z.object({
  appointmentId: z.string().optional(),
  serviceCodeId: z.string(),
  description: z.string().max(200).optional(),
  unitPriceCents: z.number().int().min(0).optional(),
  quantity: z.number().int().min(1).default(1),
  // New fields:
  dateOfService: z.string().max(20).optional(),           // ISO date string "2026-04-07"
  placeOfServiceCode: z.string().max(10).optional(),      // "02", "11", etc.
  modifiers: z.array(z.string().max(10)).max(4).optional(), // Up to 4 modifiers
});

// Updated CreateInvoiceSchema
export const CreateInvoiceSchema = z.object({
  participantId: z.string(),
  lineItems: z.array(CreateInvoiceLineItemSchema).min(1, "At least one line item is required"),
  notes: z.string().max(2000).optional(),
  taxCents: z.number().int().min(0).default(0),
  // New fields:
  diagnosisCodes: z.array(z.string().min(1).max(20)).max(4).optional(),
  dueDate: z.string().max(20).optional(),                 // ISO date string
});
```

### API Service Changes

#### `packages/api/src/services/billing.ts`

**`createInvoice()`**:
- Accept `diagnosisCodes` and `dueDate` from input.
- Store `diagnosisCodes` as `String[]` on the Invoice record.
- Parse `dueDate` into `dueAt` DateTime if provided; otherwise leave null (set on send as before).
- For each line item, store `dateOfService` (parsed to DateTime), `placeOfServiceCode`, and `modifiers`.

**`sendInvoice()`**:
- If `invoice.dueAt` is already set (from creation), preserve it.
- If `invoice.dueAt` is null, default to now + 30 days (existing behavior).

**`updateInvoice()`**:
- Accept `diagnosisCodes` and `dueDate` in the patch.
- When rebuilding line items, include the new fields.

**`getInvoiceForPdf()`**:
- No query changes needed -- new columns are returned automatically by existing `INVOICE_INCLUDE`.

### Frontend State Changes

#### `billing/new/page.tsx`

New state variables:
```typescript
const [diagnosisCodes, setDiagnosisCodes] = useState<string[]>([]);
const [dueDate, setDueDate] = useState<string>(defaultDueDate()); // 30 days from today

interface LineItemRow {
  serviceCodeId: string;
  description: string;
  unitPriceCents: string;
  quantity: string;
  // New:
  dateOfService: string;          // ISO date string
  placeOfServiceCode: string;     // POS code
  modifiers: string[];            // Up to 4
}
```

#### New Component: DiagnosisCodePicker

Wraps the existing `useDiagnosisCodeSearch` hook. Displays:
- Search input with debounce
- Recent codes for the selected client (when participantId available)
- Selected codes as removable tags (max 4)

#### Data Flow

```
User fills form
  --> Build payload with new fields
  --> POST /api/invoices (validate middleware runs CreateInvoiceSchema.parse())
  --> createInvoice() service stores new columns
  --> Response includes new fields
  --> Invoice detail page renders new fields
  --> PDF generation includes new fields
```

### Affected Files Summary

| File | Change Type |
|------|-------------|
| `packages/db/prisma/schema.prisma` | Add columns to Invoice, InvoiceLineItem |
| `packages/shared/src/schemas/billing.ts` | Add fields to CreateInvoiceLineItemSchema, CreateInvoiceSchema, UpdateInvoiceSchema |
| `packages/api/src/services/billing.ts` | Handle new fields in create/update/send |
| `packages/api/src/services/invoice-pdf.ts` | Render new fields in PDF |
| `apps/web/src/app/(dashboard)/billing/new/page.tsx` | Add form fields for DOS, diagnosis, POS, modifiers, due date |
| `apps/web/src/app/(dashboard)/billing/[invoiceId]/page.tsx` | Display new fields |
| `apps/web/src/hooks/use-invoices.ts` | No changes -- already uses `any` for mutation data |
| `packages/shared/src/__tests__/billing.schema.test.ts` | Add tests for new fields |
| `packages/api/src/__tests__/invoices.test.ts` | Add tests for new field persistence |

---

## Phase 5: UX DESIGN

### Form Layout

The updated form follows a top-down flow with logical groupings. The new fields are integrated into existing sections where they belong, rather than added as a separate block.

```
+----------------------------------------------+
|  <-- Back to Billing                         |
|  New Invoice                                  |
|                                               |
|  [ERROR BANNER if any]                        |
|                                               |
|  --- Client ---                               |
|  Client *          [Client search select]     |
|                                               |
|  --- Invoice Details ---                      |
|  Due Date          [Date picker: +30 days]    |
|                                               |
|  --- Diagnosis Codes ---                      |
|  ICD-10 Codes      [Search input............] |
|    Recent: [F90.0 ADHD] [F90.1 ADHD-HI]      |
|    Selected: [F90.0 x] [F90.2 x]             |
|                                               |
|  --- Line Items * ---                         |
|  +------------------------------------------+ |
|  | Service Code  [Dropdown...............]  | |
|  | Description   [Text input.............]  | |
|  | Date of Svc   [Date picker]               | |
|  | Place of Svc  [Dropdown: 02-Telehealth]  | |
|  | Modifiers     [Tag input: 95, GT]        | |
|  | Price ($) [___] Qty [___]    [Trash]     | |
|  +------------------------------------------+ |
|  [+ Add Line Item]                            |
|                                               |
|  Estimated Total: $140.00         (right)     |
|                                               |
|  --- Notes ---                                |
|  [Textarea..........................]         |
|                                               |
|  [Create as Draft]  [Cancel]                  |
+----------------------------------------------+
```

### Field Details

#### Due Date
- Type: Date input (`<input type="date">`)
- Default: 30 days from today
- Position: Below client, above diagnosis codes
- Label: "Due Date"
- Optional -- if cleared, reverts to auto-set on send

#### Diagnosis Code Picker
- Type: Search-with-tags component
- Shows after client is selected (needs participantId for recent codes)
- Search triggers on >= 2 characters (matching existing hook behavior)
- Results show: `F90.0 - Attention-deficit hyperactivity disorder, predominantly inattentive type`
- Selected codes displayed as removable chips/tags
- Max 4 codes (matching CMS-1500 Box 21 limit and existing InsuranceClaim schema)
- If client has no recent codes, the "Recent" section is hidden

#### Date of Service (per line item)
- Type: Date input (`<input type="date">`)
- Default: Today's date
- Position: Below description, above place of service
- When linked to appointment: auto-fills from appointment startAt

#### Place of Service (per line item)
- Type: Select dropdown
- Default: From clinician billing profile's `placeOfServiceCode`, or "02" if not set
- Common options:
  - `02` - Telehealth Provided Other than in Patient's Home
  - `10` - Telehealth Provided in Patient's Home
  - `11` - Office
  - `12` - Home
  - `53` - Community Mental Health Center
  - `99` - Other Place of Service
- Position: Below date of service

#### Modifiers (per line item)
- Type: Multi-select tag input (max 4)
- Default: Empty (auto-suggest "95" when POS is "02")
- Common options dropdown:
  - `95` - Synchronous Telehealth
  - `GT` - Interactive Telehealth
  - `HO` - Master's Level
  - `76` - Repeat Procedure, Same Physician
  - `77` - Repeat Procedure, Different Physician
  - `XE` - Separate Encounter
  - `XS` - Separate Structure
- Allows freeform entry for unlisted modifiers
- Position: Below place of service

### Conditional Behavior

- Diagnosis code picker appears only after a client is selected (required for recent-code lookup).
- When a line item's service code changes, if the service code maps to a known appointment, auto-populate dateOfService, placeOfServiceCode, and suggest modifiers.
- When placeOfServiceCode is set to "02" (telehealth), auto-suggest modifier "95" but do not force it.

### Responsive Considerations

The line item card already stacks fields vertically within a bordered container. The new fields follow the same pattern:
- On desktop: dateOfService and placeOfServiceCode can share a row; modifiers get their own row.
- On mobile: all fields stack vertically.

### Error States

- Diagnosis code search with < 2 characters: Show helper text "Type at least 2 characters to search"
- More than 4 diagnosis codes: Disable the "add" action and show "Maximum 4 codes"
- More than 4 modifiers on a line item: Disable the "add" action and show "Maximum 4 modifiers"
- Invalid date format: Browser-native date input handles validation

---

## Phase 6: ENGINEERING PLAN

### Step 1: Prisma Schema Migration

**File**: `packages/db/prisma/schema.prisma`

Add to `InvoiceLineItem`:
```prisma
  dateOfService      DateTime?
  placeOfServiceCode String?
  modifiers          String[]    @default([])
```

Add to `Invoice`:
```prisma
  diagnosisCodes     String[]    @default([])
```

Run: `npm run db:generate && npm run db:push`

### Step 2: Zod Schema Updates

**File**: `packages/shared/src/schemas/billing.ts`

Update `CreateInvoiceLineItemSchema`:
```typescript
export const CreateInvoiceLineItemSchema = z.object({
  appointmentId: z.string().optional(),
  serviceCodeId: z.string(),
  description: z.string().max(200).optional(),
  unitPriceCents: z.number().int().min(0).optional(),
  quantity: z.number().int().min(1).default(1),
  dateOfService: z.string().max(20).optional(),
  placeOfServiceCode: z.string().max(10).optional(),
  modifiers: z.array(z.string().max(10)).max(4).default([]),
});
```

Update `CreateInvoiceSchema`:
```typescript
export const CreateInvoiceSchema = z.object({
  participantId: z.string(),
  lineItems: z.array(CreateInvoiceLineItemSchema).min(1, "At least one line item is required"),
  notes: z.string().max(2000).optional(),
  taxCents: z.number().int().min(0).default(0),
  diagnosisCodes: z.array(z.string().min(1).max(20)).max(4).default([]),
  dueDate: z.string().max(20).optional(),
});
```

Update `UpdateInvoiceSchema`:
```typescript
export const UpdateInvoiceSchema = z.object({
  notes: z.string().max(2000).optional(),
  taxCents: z.number().int().min(0).optional(),
  lineItems: z.array(CreateInvoiceLineItemSchema).min(1).optional(),
  diagnosisCodes: z.array(z.string().min(1).max(20)).max(4).optional(),
  dueDate: z.string().max(20).optional(),
});
```

### Step 3: Write Schema Tests (TDD)

**File**: `packages/shared/src/__tests__/billing.schema.test.ts`

Add tests for:
- `CreateInvoiceLineItemSchema` accepts dateOfService, placeOfServiceCode, modifiers
- `CreateInvoiceLineItemSchema` rejects > 4 modifiers
- `CreateInvoiceLineItemSchema` applies default modifiers = []
- `CreateInvoiceSchema` accepts diagnosisCodes and dueDate
- `CreateInvoiceSchema` rejects > 4 diagnosis codes
- `CreateInvoiceSchema` applies default diagnosisCodes = []
- `UpdateInvoiceSchema` accepts diagnosisCodes and dueDate
- Round-trip test: parse existing DB-shaped data through updated schema and verify no fields are stripped

### Step 4: API Service Updates

**File**: `packages/api/src/services/billing.ts`

**`createInvoice()`** -- update line item data construction:
```typescript
lineItemsData.push({
  // ... existing fields ...
  dateOfService: item.dateOfService ? new Date(item.dateOfService) : null,
  placeOfServiceCode: item.placeOfServiceCode ?? null,
  modifiers: item.modifiers ?? [],
});
```

Update invoice create to include `diagnosisCodes` and optional `dueAt`:
```typescript
const inv = await tx.invoice.create({
  data: {
    // ... existing fields ...
    diagnosisCodes: input.diagnosisCodes ?? [],
    dueAt: input.dueDate ? new Date(input.dueDate) : null,
    // ... rest ...
  },
});
```

**`sendInvoice()`** -- respect pre-set dueAt:
```typescript
const dueAt = existing.dueAt ?? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
```

**`updateInvoice()`** -- handle new fields in both line-item-rebuild and notes-only paths:
```typescript
// In line item rebuild:
lineItemsData.push({
  // ... existing fields ...
  dateOfService: item.dateOfService ? new Date(item.dateOfService) : null,
  placeOfServiceCode: item.placeOfServiceCode ?? null,
  modifiers: item.modifiers ?? [],
});

// In invoice update data:
if (patch.diagnosisCodes !== undefined) data.diagnosisCodes = patch.diagnosisCodes;
if (patch.dueDate !== undefined) data.dueAt = patch.dueDate ? new Date(patch.dueDate) : null;
```

### Step 5: Write API Tests (TDD)

**File**: `packages/api/src/__tests__/invoices.test.ts`

Add tests for:
- `POST /api/invoices` with dateOfService, placeOfServiceCode, modifiers on line items
- `POST /api/invoices` with diagnosisCodes and dueDate on invoice
- `POST /api/invoices` rejects > 4 diagnosis codes (400)
- `POST /api/invoices` rejects > 4 modifiers on a line item (400)
- `PATCH /api/invoices/:id` updates diagnosisCodes
- `POST /api/invoices/:id/send` preserves user-set dueAt
- `POST /api/invoices/:id/send` defaults dueAt when not pre-set
- Backward compat: existing payload without new fields still works

### Step 6: Invoice PDF Updates

**File**: `packages/api/src/services/invoice-pdf.ts`

Add to `PdfLineItem` interface:
```typescript
interface PdfLineItem {
  // ... existing ...
  dateOfService?: Date | string | null;
  placeOfServiceCode?: string | null;
  modifiers?: string[];
}
```

Add to `PdfInvoice` interface:
```typescript
interface PdfInvoice {
  // ... existing ...
  diagnosisCodes?: string[];
}
```

In the PDF rendering:
- Add a "Diagnosis Codes" section above the line items table if `diagnosisCodes.length > 0`
- Add "DOS", "POS", and "Mod" columns to the line items table (compact format)
- Adjust column widths to accommodate

### Step 7: Frontend -- Invoice Creation Form

**File**: `apps/web/src/app/(dashboard)/billing/new/page.tsx`

1. Add `diagnosisCodes`, `dueDate` state variables.
2. Extend `LineItemRow` interface with `dateOfService`, `placeOfServiceCode`, `modifiers`.
3. Update `emptyRow()` to include defaults.
4. Add DiagnosisCodePicker section (search + tags).
5. Add date picker for due date.
6. Add per-line-item fields: dateOfService date input, placeOfServiceCode dropdown, modifiers tag input.
7. Update `handleSubmit()` payload to include new fields.

### Step 8: Frontend -- Invoice Detail Page

**File**: `apps/web/src/app/(dashboard)/billing/[invoiceId]/page.tsx`

1. Display diagnosis codes as chips below the header.
2. Add DOS, POS, Modifiers columns to the line items table.
3. Show due date in the header section (already partially done -- `invoice.dueAt` is displayed).

### Step 9: Integration Testing

Run full test suite:
```bash
npm run test
npm run typecheck
npm run lint
```

Verify:
- All existing tests pass (backward compat)
- New schema tests pass
- New API route tests pass
- TypeScript compiles cleanly
- Linter passes

---

## Phase 7: QA / TEST PLAN

### Test Matrix

#### Schema Tests (`packages/shared/src/__tests__/billing.schema.test.ts`)

| # | Test Case | Input | Expected |
|---|-----------|-------|----------|
| S1 | Line item accepts dateOfService | `{ serviceCodeId: "sc-1", dateOfService: "2026-04-07" }` | Parses successfully, dateOfService = "2026-04-07" |
| S2 | Line item accepts placeOfServiceCode | `{ serviceCodeId: "sc-1", placeOfServiceCode: "02" }` | Parses successfully |
| S3 | Line item accepts modifiers | `{ serviceCodeId: "sc-1", modifiers: ["95", "GT"] }` | Parses successfully, modifiers = ["95", "GT"] |
| S4 | Line item rejects > 4 modifiers | `{ serviceCodeId: "sc-1", modifiers: ["95","GT","HO","76","77"] }` | Parse fails |
| S5 | Line item defaults modifiers to [] | `{ serviceCodeId: "sc-1" }` | modifiers = [] |
| S6 | Invoice accepts diagnosisCodes | `{ participantId: "p-1", lineItems: [...], diagnosisCodes: ["F90.0"] }` | Parses successfully |
| S7 | Invoice rejects > 4 diagnosisCodes | `{ ..., diagnosisCodes: ["F90.0","F90.1","F90.2","F90.8","F90.9"] }` | Parse fails |
| S8 | Invoice defaults diagnosisCodes to [] | `{ participantId: "p-1", lineItems: [...] }` | diagnosisCodes = [] |
| S9 | Invoice accepts dueDate | `{ ..., dueDate: "2026-05-07" }` | Parses successfully |
| S10 | UpdateInvoice accepts diagnosisCodes | `{ diagnosisCodes: ["F90.0"] }` | Parses successfully |
| S11 | UpdateInvoice accepts dueDate | `{ dueDate: "2026-05-07" }` | Parses successfully |
| S12 | Backward compat: existing payload without new fields | Original test payload | Still parses successfully with defaults |
| S13 | Round-trip: DB-shaped data through schema | Payload matching existing DB row shape | No fields stripped or corrupted |

#### API Integration Tests (`packages/api/src/__tests__/invoices.test.ts`)

| # | Test Case | Method | Expected |
|---|-----------|--------|----------|
| A1 | Create invoice with new line item fields | POST /api/invoices | 201, line items include dateOfService, placeOfServiceCode, modifiers |
| A2 | Create invoice with diagnosisCodes | POST /api/invoices | 201, invoice includes diagnosisCodes |
| A3 | Create invoice with dueDate | POST /api/invoices | 201, invoice includes dueAt as DateTime |
| A4 | Create invoice rejects > 4 diagnosisCodes | POST /api/invoices | 400 |
| A5 | Create invoice rejects > 4 modifiers | POST /api/invoices | 400 |
| A6 | Update invoice diagnosisCodes | PATCH /api/invoices/:id | 200, diagnosisCodes updated |
| A7 | Send invoice preserves user-set dueAt | POST /api/invoices/:id/send | 200, dueAt = original value |
| A8 | Send invoice defaults dueAt when null | POST /api/invoices/:id/send | 200, dueAt = now + 30 days |
| A9 | Backward compat: create without new fields | POST /api/invoices | 201, new fields default to null/[] |
| A10 | Get invoice returns new fields | GET /api/invoices/:id | 200, response includes diagnosisCodes, line items include new fields |

#### Manual QA Checklist

| # | Scenario | Steps | Expected Result |
|---|----------|-------|-----------------|
| M1 | Create invoice with all new fields | 1. Navigate to /billing/new 2. Select client 3. Add diagnosis codes 4. Set due date 5. Add line item with DOS, POS, modifiers 6. Submit | Invoice created with all fields visible on detail page |
| M2 | Diagnosis code search | 1. Select client 2. Type "F90" in diagnosis search | Results appear: F90.0, F90.1, F90.2, etc. |
| M3 | Recent diagnosis codes | 1. Select client with prior claims 2. Open diagnosis picker | Recent codes shown as suggestions |
| M4 | POS auto-populate from appointment | 1. Create invoice from attended appointment (virtual location) | POS defaults to "02" |
| M5 | Modifier auto-suggest for telehealth | 1. Set POS to "02" | Modifier "95" suggested |
| M6 | Due date default | 1. Open /billing/new | Due date field shows today + 30 days |
| M7 | PDF includes new fields | 1. Create invoice with all fields 2. Download PDF | PDF shows diagnosis codes, DOS, POS, modifiers |
| M8 | Backward compat: existing invoices | 1. View an invoice created before this feature | Displays normally; new fields show as empty/absent |
| M9 | 4-code limit on diagnosis codes | 1. Add 4 diagnosis codes 2. Try to add a 5th | 5th code input is disabled or rejected |
| M10 | 4-modifier limit | 1. Add 4 modifiers to a line item 2. Try to add a 5th | 5th modifier input is disabled or rejected |

#### Regression Scope

- [ ] Existing invoice creation (without new fields) still works
- [ ] Invoice listing page renders correctly
- [ ] Invoice send/void/delete flows unaffected
- [ ] Payment recording unaffected
- [ ] PDF generation for invoices without new fields unaffected
- [ ] `createInvoiceFromAppointment` still works (new fields default to null/[])
- [ ] Billing summary endpoint unaffected
- [ ] All existing tests in `invoices.test.ts`, `payments.test.ts`, `billing.schema.test.ts` pass

### Coverage Requirements

Per CLAUDE.md, `packages/api` and `packages/shared` must maintain > 80% line coverage:
```bash
npx vitest run --coverage --reporter=verbose
```

All new service logic and schema additions must have corresponding test coverage.
