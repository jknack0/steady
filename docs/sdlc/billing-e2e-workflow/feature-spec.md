# End-to-End Billing Workflow (Session to Payment)

**Feature ID**: billing-e2e-workflow
**Status**: SPEC COMPLETE
**Date**: 2026-04-07
**Author**: SDLC Pipeline (Ideation through QA)

---

## Table of Contents

1. [Ideation](#1-ideation)
2. [Product Owner Spec](#2-product-owner-spec)
3. [Compliance (HIPAA)](#3-compliance-hipaa)
4. [Architecture](#4-architecture)
5. [UX Design](#5-ux-design)
6. [Engineering Plan](#6-engineering-plan)
7. [QA / Test Plan](#7-qa--test-plan)

---

## 1. Ideation

### Problem Statement

Billing in STEADY is fragmented across four disconnected pages: **Appointments** (Calendar), **Billing** (Invoices), **Claims** (Insurance), and **RTM** (Remote Therapeutic Monitoring). A clinician who has just completed a session cannot answer the fundamental question: *"How do I get paid for this?"*

Usability testing shows that only 30% of study participants could complete the end-to-end billing flow from session completion to payment receipt. The primary failure modes are:

1. **No contextual billing actions** -- After marking an appointment as ATTENDED, the clinician must leave the calendar, navigate to either Billing or Claims, and manually create a charge. The only bridge that exists is a "Generate Invoice" button in the AppointmentModal, but only when the appointment is already in edit mode with ATTENDED status and no existing invoice.

2. **Insurance vs. private pay decision is invisible** -- The system has both `useCreateClaim` (insurance via Stedi) and `useCreateInvoiceFromAppointment` (private pay via Stripe), but `useCreateClaim` is never called from any UI component. There is no UI that helps a clinician decide which billing path to take for a given appointment.

3. **No post-session workflow** -- After a session, clinicians must remember to: (a) mark attendance, (b) complete session notes, (c) create a charge, (d) submit claim or send invoice. These are separate actions on separate pages with no guided flow.

4. **No billing status on appointment views** -- Calendar cards show appointment status but not billing status. A clinician cannot scan their calendar to find unbilled sessions.

### Who Benefits

- **Clinicians**: Reduce billing admin time from ~15 min/session to ~2 min. Eliminate revenue leakage from forgotten charges.
- **Practice managers**: Dashboard visibility into unbilled sessions and outstanding revenue.
- **Participants/Clients**: Faster, more accurate billing means fewer billing disputes.

### Risks of NOT Doing This

- Revenue leakage: Clinicians forget to bill, especially for insurance claims where the `useCreateClaim` hook is completely unwired.
- Clinician burnout: Manual multi-step billing across 4 pages is the #1 admin complaint in user interviews.
- Compliance risk: Delayed claim submission may miss payer filing deadlines.
- Competitive disadvantage: Competing platforms (SimplePractice, TherapyNotes) have integrated post-session billing workflows.

### MVP Scope vs. Full Vision

**MVP (this spec)**:
- Post-session billing prompt: After marking ATTENDED, show a billing action panel with insurance claim and private pay invoice options.
- Billing status indicators on appointment cards in all calendar views.
- Unbilled appointments queue on the Billing page.
- Create Claim dialog accessible from appointments (wire the existing `useCreateClaim` hook).

**Full Vision (future)**:
- Auto-draft claims/invoices on appointment completion based on client's billing profile.
- Batch billing for multiple appointments.
- ERA (Electronic Remittance Advice) auto-posting from Stedi.
- Unified billing dashboard combining invoices, claims, and RTM superbills.
- Client-facing billing portal in the mobile app.

---

## 2. Product Owner Spec

### User Stories

#### US-1: Post-Session Billing Prompt
**As a** clinician,
**I want** to be prompted with billing options immediately after marking an appointment as ATTENDED,
**so that** I never forget to capture charges for a completed session.

**Acceptance Criteria**:
- When appointment status changes to ATTENDED in the AppointmentModal or AppointmentStatusPopover, a billing action panel appears.
- The panel shows two paths: "File Insurance Claim" and "Create Invoice (Private Pay)".
- "File Insurance Claim" is enabled only when the participant has active insurance on file.
- "Create Invoice" creates a draft invoice from the appointment (using existing `createInvoiceFromAppointment` endpoint).
- "File Insurance Claim" opens a claim creation dialog pre-populated with appointment data.
- If neither path is chosen, the panel can be dismissed with "Bill Later".
- Dismissing does NOT prevent billing later from the appointment or billing pages.

#### US-2: Create Claim Dialog
**As a** clinician,
**I want** to create an insurance claim directly from an attended appointment,
**so that** I do not have to manually navigate to the Claims page and re-enter appointment data.

**Acceptance Criteria**:
- A `CreateClaimDialog` component is accessible from the post-session billing prompt and from the appointment edit modal.
- The dialog is pre-populated with: participant name, date of service, service code, and price from the appointment.
- The clinician must enter at least one ICD-10 diagnosis code (searchable input).
- Place of service code defaults based on appointment location type (02 for VIRTUAL, 11 for in-person).
- On submit, calls `POST /api/claims` with the appointment ID and diagnosis codes.
- On success, shows confirmation with claim status and navigates to the Claims page or stays in context.
- Shows clear error if participant has no active insurance.
- Shows clear error if a claim already exists for this appointment.

#### US-3: Billing Status on Calendar
**As a** clinician,
**I want** to see at a glance which attended appointments have been billed,
**so that** I can identify unbilled sessions without leaving the calendar.

**Acceptance Criteria**:
- AppointmentCard shows a billing status indicator for ATTENDED appointments:
  - No indicator for non-ATTENDED appointments.
  - Green dollar sign icon if an invoice or claim exists.
  - Orange dollar sign icon if invoice is in DRAFT status.
  - No indicator (implying unbilled) if neither exists -- but a subtle "Unbilled" label appears.
- The indicator is derived from existing `invoiceId` field on the appointment view and a new `claimId` field.

#### US-4: Unbilled Appointments Queue
**As a** clinician,
**I want** to see a list of attended appointments that have not been billed,
**so that** I can batch-process billing at the end of the day or week.

**Acceptance Criteria**:
- The Billing page (`/billing`) shows a new "Unbilled Sessions" section above the invoice list.
- Displays ATTENDED appointments from the last 90 days that have neither an invoice line item nor an insurance claim.
- Each row shows: client name, date, service code, and action buttons for "Create Invoice" and "File Claim".
- Clicking "Create Invoice" calls `POST /api/invoices/from-appointment/:id` and redirects to the invoice detail page.
- Clicking "File Claim" opens the CreateClaimDialog for that appointment.
- The section is collapsible and shows a count badge (e.g., "Unbilled Sessions (3)").
- Empty state: "All sessions billed" with a green checkmark.

#### US-5: Claim Status on Appointment View
**As a** clinician,
**I want** to see the insurance claim status when viewing an appointment that has a claim,
**so that** I can track claim progress without navigating to the Claims page.

**Acceptance Criteria**:
- In AppointmentModal (edit mode), if the appointment has an associated claim:
  - Show claim status badge (DRAFT, SUBMITTED, ACCEPTED, REJECTED, DENIED, PAID).
  - Show "View Claim" link that navigates to the Claims page.
  - Show "Refresh Status" button for SUBMITTED/ACCEPTED claims.
- If the appointment has both a claim and an invoice, show both statuses.

### Scope Boundaries

**In Scope**:
- Post-session billing prompt UI (AppointmentModal, AppointmentStatusPopover).
- CreateClaimDialog component (wire existing `useCreateClaim` hook).
- Billing status indicators on AppointmentCard.
- Unbilled appointments API endpoint and UI section on Billing page.
- Claim ID on appointment view response.
- Diagnosis code search input component (wire existing `POST /api/insurance/diagnosis-search`).

**Out of Scope**:
- Auto-billing (automatically creating claims/invoices without clinician action).
- Batch claim submission (submit multiple claims at once).
- ERA auto-posting (automatically recording payments from insurance remittances).
- RTM superbill integration into this workflow (RTM has its own separate flow).
- Mobile app billing (participant-facing billing stays on web for now).
- Stripe Checkout integration (payment link generation is a separate feature).
- Changes to the Claims page layout or functionality.

### Success Metrics

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| End-to-end billing completion rate | 30% | 80% | Usability testing |
| Time from session to charge capture | ~15 min | <2 min | Session log analysis |
| Unbilled sessions per clinician (weekly) | Unknown | <2 | Query `appointments WHERE status=ATTENDED AND no invoice AND no claim` |
| `useCreateClaim` hook invocation count | 0 | >0 per session | Usage analytics |

### Dependencies

- Existing `POST /api/claims` endpoint and `createClaim` service function (implemented).
- Existing `POST /api/invoices/from-appointment/:id` endpoint (implemented).
- Existing `useCreateClaim` hook (implemented, never called).
- Existing `useCreateInvoiceFromAppointment` hook (implemented, only called from AppointmentModal).
- Existing `POST /api/insurance/diagnosis-search` endpoint (implemented).
- `PatientInsurance` model for checking insurance eligibility (implemented).
- `AppointmentView.invoiceId` field (already derived from `invoiceLineItems` in `toClinicianView`).

---

## 3. Compliance (HIPAA)

### PHI Exposure Assessment

| Data Element | PHI? | Exposure Point | Mitigation |
|-------------|------|----------------|------------|
| Participant name | Yes | Billing prompt, unbilled queue, claim dialog | Already displayed in appointment context; no new exposure surface |
| Diagnosis codes (ICD-10) | Yes | Claim creation dialog, search endpoint | Search endpoint already exists with auth; diagnosis codes stored encrypted in `InsuranceClaim.diagnosisCodes` |
| Insurance info (payer, subscriber ID) | Yes | Claim dialog (display only, read from DB) | Already stored in `PatientInsurance` model; no new input surface |
| Service codes + pricing | No (CPT) | Billing prompt, claim dialog | Standard medical codes, not PHI |
| Appointment date/time | No alone | Calendar billing indicators | Already visible on calendar |

### Audit Logging Requirements

All billing actions are already covered by the existing Prisma audit middleware in `packages/db/src/audit-middleware.ts`. Specific audit events for this feature:

| Action | Resource Type | Already Logged? | Notes |
|--------|-------------|----------------|-------|
| Create invoice from appointment | Invoice | Yes | Via Prisma CREATE middleware |
| Create insurance claim | InsuranceClaim | Yes | Via Prisma CREATE middleware |
| View claim status | - | No (read-only) | Reads are not logged per HIPAA minimum necessary; acceptable |
| Dismiss billing prompt | - | No | No-op, nothing to log |
| Query unbilled appointments | - | No (read-only) | Query-level logging not required |

No new audit logging implementation is needed. The existing middleware covers all CREATE/UPDATE/DELETE operations on Invoice and InsuranceClaim models.

### Data Flow Security

1. **Diagnosis code search**: Uses existing authenticated endpoint (`POST /api/insurance/diagnosis-search`). Search terms are not logged (only IDs). Results limited to standard ICD-10 codes, not patient-specific data.

2. **Unbilled appointments query**: New endpoint will use existing `requirePracticeCtx` middleware to scope results to the clinician's practice. No cross-practice data exposure.

3. **Claim creation**: Existing `createClaim` service already validates:
   - Appointment ownership (practice scoping).
   - Appointment must be ATTENDED.
   - Participant must have active insurance.
   - No duplicate claims per appointment.

4. **Session timeout**: All new UI components inherit the existing 30-minute inactivity timeout from `InactivityTimeout` in the dashboard layout.

5. **Transport security**: All API calls use the existing `api` client which enforces HTTPS in production.

### HIPAA Compliance Verdict: PASS

No new PHI exposure surfaces. All data already accessible through existing authenticated views. Audit logging already covers all mutation paths. No changes to data retention, encryption, or access control required.

---

## 4. Architecture

### Component Map

```
                    EXISTING                           NEW / MODIFIED
                    --------                           --------------

AppointmentStatusPopover ──> status change ──> [PostSessionBillingPrompt] ──+
                                                                            |
AppointmentModal (edit) ──> ATTENDED status ──> [PostSessionBillingPrompt] ──+
                                                                            |
                           +-------------------------------------------------+
                           |
                           v
                    [BillingActionPanel]
                      /            \
                     /              \
          "Create Invoice"    "File Insurance Claim"
              |                        |
              v                        v
    POST /api/invoices/         [CreateClaimDialog] ──> POST /api/claims
    from-appointment/:id            |
              |                     v
              v            DiagnosisCodeSearch input
    redirect /billing/:id     (existing endpoint)

AppointmentCard ──> [BillingStatusIndicator] (new sub-component)

BillingPage ──> [UnbilledSessionsSection] ──> GET /api/appointments/unbilled (new endpoint)
```

### Existing Components to Connect

| Component | File | Modification |
|-----------|------|-------------|
| `AppointmentModal` | `apps/web/src/components/appointments/AppointmentModal.tsx` | Add PostSessionBillingPrompt after status change to ATTENDED; add claim status display |
| `AppointmentStatusPopover` | `apps/web/src/components/appointments/AppointmentStatusPopover.tsx` | Emit callback when status changes to ATTENDED to trigger billing prompt |
| `AppointmentCard` | `apps/web/src/components/appointments/AppointmentCard.tsx` | Add billing status indicator |
| `BillingPage` | `apps/web/src/app/(dashboard)/billing/page.tsx` | Add UnbilledSessionsSection above invoice list |
| `toClinicianView` | `packages/api/src/services/appointments.ts` | Add `claimId` to appointment view (from existing `insuranceClaim` relation) |
| `AppointmentView` type | `apps/web/src/lib/appointment-types.ts` | Add `claimId` and `claimStatus` fields |

### New Components

| Component | File | Purpose |
|-----------|------|---------|
| `PostSessionBillingPrompt` | `apps/web/src/components/appointments/PostSessionBillingPrompt.tsx` | Contextual billing action panel shown after ATTENDED status change |
| `CreateClaimDialog` | `apps/web/src/components/claims/CreateClaimDialog.tsx` | Dialog for creating insurance claim from appointment |
| `DiagnosisCodeSearch` | `apps/web/src/components/claims/DiagnosisCodeSearch.tsx` | Searchable ICD-10 diagnosis code input |
| `BillingStatusIndicator` | `apps/web/src/components/appointments/BillingStatusIndicator.tsx` | Small icon/badge showing billing state on appointment cards |
| `UnbilledSessionsSection` | `apps/web/src/components/billing/UnbilledSessionsSection.tsx` | Collapsible section listing unbilled attended appointments |

### API Endpoints

| Endpoint | Status | Purpose |
|----------|--------|---------|
| `POST /api/claims` | **Exists** | Create insurance claim from appointment |
| `POST /api/invoices/from-appointment/:id` | **Exists** | Create private pay invoice from appointment |
| `POST /api/insurance/diagnosis-search` | **Exists** | Search ICD-10 diagnosis codes |
| `GET /api/appointments/unbilled` | **New** | List attended appointments without invoice or claim |
| `GET /api/appointments/:id` | **Modify** | Include `claimId` and `claimStatus` in response |

### New API Endpoint: `GET /api/appointments/unbilled`

```typescript
// packages/api/src/routes/appointments.ts

router.get("/unbilled", async (req: Request, res: Response) => {
  // Returns ATTENDED appointments from the last 90 days
  // that have neither an invoiceLineItem nor an insuranceClaim.
  // Scoped to clinician's practice via requirePracticeCtx.
  // Paginated with cursor, default limit 20, max 50.
  // Ordered by startAt DESC.
  // Response shape:
  // {
  //   success: true,
  //   data: AppointmentView[],  // with participant name, service code, location
  //   cursor: string | null
  // }
});
```

### Data Model Changes

**No schema changes required.** The `Appointment` model already has:
- `insuranceClaim InsuranceClaim?` (one-to-one relation via `appointmentId @unique`)
- `invoiceLineItems InvoiceLineItem[]` (one-to-many relation)

The `toClinicianView` function already resolves `invoiceId` from `invoiceLineItems`. We only need to add `claimId` and `claimStatus` resolution from the existing `insuranceClaim` relation.

### Data Flow: Post-Session Billing

```
1. Clinician marks appointment ATTENDED
   (via AppointmentStatusPopover or AppointmentModal)
        |
2. Status change succeeds (optimistic update + server confirm)
        |
3. PostSessionBillingPrompt renders with three options:
   a. "Create Invoice" -- calls POST /api/invoices/from-appointment/:id
   b. "File Insurance Claim" -- opens CreateClaimDialog
   c. "Bill Later" -- dismisses prompt
        |
4a. Invoice path: redirect to /billing/:invoiceId
4b. Claim path: CreateClaimDialog collects diagnosis codes,
    calls POST /api/claims, shows success/error
4c. Dismiss: no action, appointment shows as "unbilled" on calendar
```

---

## 5. UX Design

### User Flow: Post-Session Billing

**Entry Point**: Clinician changes appointment status to ATTENDED.

**Step 1 -- Billing Prompt Appears**
After the status change succeeds, a bottom panel slides into the AppointmentModal (or a popover appears below the AppointmentStatusPopover) with:

```
+--------------------------------------------------+
|  Session marked as attended.                      |
|  How would you like to bill for this session?     |
|                                                   |
|  [$ Create Invoice]  [+ File Insurance Claim]     |
|                                                   |
|  [Bill Later - dismiss]                           |
+--------------------------------------------------+
```

- "Create Invoice" button has a DollarSign icon, primary variant.
- "File Insurance Claim" button has a FileText icon, outline variant.
- If participant has no active insurance, the "File Insurance Claim" button is disabled with tooltip: "No active insurance on file for this client."
- "Bill Later" is a ghost/link button at the bottom.

**Step 2a -- Invoice Path**
Clicking "Create Invoice" immediately calls `POST /api/invoices/from-appointment/:id`. A loading spinner replaces the button text. On success:
- The AppointmentModal closes.
- The browser navigates to `/billing/:invoiceId`.
- The invoice is created as DRAFT with the appointment's service code and price pre-filled.

**Step 2b -- Insurance Claim Path**
Clicking "File Insurance Claim" opens the `CreateClaimDialog`:

```
+--------------------------------------------------+
|  Create Insurance Claim                          |
|                                                   |
|  Client: Jane Doe                                 |
|  Date of Service: Apr 7, 2026                     |
|  Service: 90837 - Psychotherapy, 60 min           |
|  Price: $175.00                                   |
|  Payer: Blue Cross Blue Shield                    |
|  Place of Service: 02 (Telehealth)                |
|                                                   |
|  Diagnosis Codes *                                |
|  [Search ICD-10 codes...              ]           |
|  + F90.0 - ADHD, predominantly inattentive        |
|                                                   |
|  [Cancel]                    [Submit Claim]        |
+--------------------------------------------------+
```

- Top section is read-only, pre-populated from appointment + insurance data.
- Diagnosis code input is a searchable multi-select (min 1, max 4 codes).
- Uses existing `POST /api/insurance/diagnosis-search` endpoint.
- Place of service auto-detected from location type but editable.
- Submit calls `POST /api/claims`.
- On success: shows confirmation banner and either closes dialog or navigates to Claims page.

**Step 2c -- Bill Later**
Clicking "Bill Later" dismisses the prompt. The appointment remains marked as ATTENDED but has no associated billing record. It will appear in the "Unbilled Sessions" queue on the Billing page.

### User Flow: Calendar Billing Indicators

**On AppointmentCard (all calendar views)**:
For ATTENDED appointments, a small indicator appears in the bottom-right corner:

| State | Indicator | Visual |
|-------|-----------|--------|
| Unbilled | "Unbilled" text label, orange | Small text, slightly muted orange |
| Invoice DRAFT | Dollar icon, orange | `$` with orange color |
| Invoice SENT/PAID | Dollar icon, green | `$` with green color |
| Claim SUBMITTED | Shield icon, blue | Shield with blue color |
| Claim ACCEPTED/PAID | Shield icon, green | Shield with green color |
| Claim REJECTED | Shield icon, red | Shield with red color |

For non-ATTENDED appointments, no billing indicator is shown.

### User Flow: Unbilled Sessions Queue

**Location**: Top of the Billing page (`/billing`), above the summary cards.

```
+--------------------------------------------------+
|  Unbilled Sessions (3)                    [Hide]  |
+--------------------------------------------------+
|  Jane Doe  |  Apr 7, 2026  |  90837  |  $175.00  |
|                      [Create Invoice] [File Claim]|
|  ------------------------------------------------|
|  John Smith | Apr 5, 2026  |  90834  |  $125.00  |
|                      [Create Invoice] [File Claim]|
|  ------------------------------------------------|
|  Alex Brown | Apr 4, 2026  |  90837  |  $175.00  |
|                      [Create Invoice] [File Claim]|
+--------------------------------------------------+
```

- Collapsible with a chevron toggle. Open by default if count > 0.
- When count is 0: "All sessions billed" with a green checkmark, auto-collapsed.
- "Create Invoice" calls the existing `from-appointment` endpoint and navigates to invoice detail.
- "File Claim" opens `CreateClaimDialog` for that appointment.
- If participant has no insurance, "File Claim" is disabled with tooltip.
- Shows most recent 20 unbilled sessions by default, with "Show more" if there are more.

### Component Specifications

#### PostSessionBillingPrompt

```typescript
interface PostSessionBillingPromptProps {
  appointmentId: string;
  participantId: string;
  participantName: string;
  hasInsurance: boolean;
  onInvoiceCreated: (invoiceId: string) => void;
  onClaimCreated: () => void;
  onDismiss: () => void;
}
```

- Renders inside the AppointmentModal footer area when status is ATTENDED and no billing exists.
- Animated entrance (slide up, 200ms ease).
- Does not block other modal interactions.

#### CreateClaimDialog

```typescript
interface CreateClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  appointmentData: {
    participantName: string;
    dateOfService: string;
    serviceCode: string;
    servicePriceCents: number;
    locationTypeName: string;
    placeOfServiceCode: string;
  };
  insuranceData: {
    payerName: string;
  } | null;
  onSuccess?: (claimId: string) => void;
}
```

- Uses existing Dialog component from `@/components/ui/dialog`.
- Diagnosis code search with debounce (300ms).
- Form validation: at least 1, at most 4 diagnosis codes.
- Loading state on submit button.
- Error display for: no insurance, duplicate claim, API errors.

#### BillingStatusIndicator

```typescript
interface BillingStatusIndicatorProps {
  invoiceId: string | null;
  invoiceStatus?: string;
  claimId: string | null;
  claimStatus?: string;
  appointmentStatus: string;
}
```

- Renders nothing for non-ATTENDED appointments.
- Tiny inline component (16px icon + optional text).
- Tooltip shows full status detail on hover.

### Error States

| Scenario | Display |
|----------|---------|
| No active insurance, clinician clicks "File Claim" | Button disabled, tooltip: "No active insurance on file. Add insurance in the client's profile first." |
| Claim already exists for appointment | Error banner in CreateClaimDialog: "A claim already exists for this appointment." with link to view it. |
| Invoice already exists for appointment | "Create Invoice" button replaced with "View Invoice" link. |
| Diagnosis code search returns no results | Empty state in dropdown: "No matching codes found. Try a different search term." |
| Network error during claim/invoice creation | Error banner with retry button: "Failed to create [claim/invoice]. Please try again." |
| Appointment not ATTENDED | Billing prompt does not appear. If somehow reached, API returns 409. |

---

## 6. Engineering Plan

### Implementation Steps

#### Step 1: Extend Appointment View with Claim Data (Backend)
**Files**: `packages/api/src/services/appointments.ts`
**Complexity**: Low
**Changes**:
- Add `insuranceClaim` to `APPOINTMENT_INCLUDE` query (select `id` and `status` only).
- In `toClinicianView`, resolve `claimId` and `claimStatus` from the `insuranceClaim` relation (same pattern as existing `invoiceId` resolution from `invoiceLineItems`).

#### Step 2: Add `claimId` and `claimStatus` to AppointmentView Type (Frontend)
**Files**: `apps/web/src/lib/appointment-types.ts`
**Complexity**: Low
**Changes**:
- Add `claimId: string | null` and `claimStatus: string | null` to `AppointmentView` interface.

#### Step 3: Create Unbilled Appointments Endpoint (Backend)
**Files**: `packages/api/src/routes/appointments.ts`, `packages/api/src/services/appointments.ts`
**Complexity**: Medium
**Changes**:
- Add service function `listUnbilledAppointments(ctx, query)` that queries:
  ```sql
  WHERE status = 'ATTENDED'
    AND startAt >= (now - 90 days)
    AND practiceId = ctx.practiceId
    AND clinicianId = ctx.clinicianProfileId  -- unless account owner
    AND NOT EXISTS (SELECT 1 FROM invoice_line_items WHERE appointmentId = id)
    AND NOT EXISTS (SELECT 1 FROM insurance_claims WHERE appointmentId = id)
  ORDER BY startAt DESC
  TAKE limit + 1
  ```
- Add `GET /unbilled` route (must be registered before `/:id` to avoid route collision).
- Response includes participant name, service code, location, price.

#### Step 4: Add Participant Insurance Check Hook (Frontend)
**Files**: `apps/web/src/hooks/use-participant-insurance.ts` (new)
**Complexity**: Low
**Changes**:
- Create hook `useParticipantInsurance(participantId)` that calls `GET /api/insurance/:participantId` (existing endpoint) to check if participant has active insurance.
- Returns `{ hasInsurance: boolean, payerName: string | null, isLoading }`.

#### Step 5: Create DiagnosisCodeSearch Component (Frontend)
**Files**: `apps/web/src/components/claims/DiagnosisCodeSearch.tsx` (new)
**Complexity**: Medium
**Changes**:
- Searchable input that calls `POST /api/insurance/diagnosis-search` with debounce (300ms).
- Multi-select up to 4 codes.
- Each selected code displayed as a removable chip/badge.
- Uses existing `useDiagnosisSearch` hook if available, or create one.

#### Step 6: Create CreateClaimDialog Component (Frontend)
**Files**: `apps/web/src/components/claims/CreateClaimDialog.tsx` (new)
**Complexity**: Medium
**Changes**:
- Dialog with pre-populated appointment data (read-only fields).
- DiagnosisCodeSearch for code selection.
- Place of service code (auto-detected, editable).
- Submit wires to existing `useCreateClaim` hook.
- Error handling for all failure modes.

#### Step 7: Create PostSessionBillingPrompt Component (Frontend)
**Files**: `apps/web/src/components/appointments/PostSessionBillingPrompt.tsx` (new)
**Complexity**: Medium
**Changes**:
- Contextual panel with "Create Invoice", "File Insurance Claim", and "Bill Later" actions.
- "Create Invoice" uses existing `useCreateInvoiceFromAppointment` hook.
- "File Insurance Claim" opens CreateClaimDialog.
- Insurance button disabled based on `useParticipantInsurance` result.
- Animated entrance.

#### Step 8: Integrate PostSessionBillingPrompt into AppointmentModal (Frontend)
**Files**: `apps/web/src/components/appointments/AppointmentModal.tsx`
**Complexity**: Medium
**Changes**:
- Add state: `showBillingPrompt` boolean, set to `true` when status changes to ATTENDED.
- Render PostSessionBillingPrompt in the dialog footer when `showBillingPrompt` is true.
- Pass appointment data and insurance status as props.
- Handle navigation on invoice/claim creation.
- Move existing "Generate Invoice" and "View Invoice" buttons into the PostSessionBillingPrompt.

#### Step 9: Create BillingStatusIndicator Component (Frontend)
**Files**: `apps/web/src/components/appointments/BillingStatusIndicator.tsx` (new)
**Complexity**: Low
**Changes**:
- Small indicator component showing billing state.
- Icon + color based on invoice/claim status.
- Tooltip with details.

#### Step 10: Add BillingStatusIndicator to AppointmentCard (Frontend)
**Files**: `apps/web/src/components/appointments/AppointmentCard.tsx`
**Complexity**: Low
**Changes**:
- Import and render BillingStatusIndicator for ATTENDED appointments.
- Pass `invoiceId`, `claimId`, `claimStatus` from `appointment` prop.

#### Step 11: Create UnbilledSessionsSection Component (Frontend)
**Files**: `apps/web/src/components/billing/UnbilledSessionsSection.tsx` (new)
**Complexity**: Medium
**Changes**:
- Collapsible section fetching from `GET /api/appointments/unbilled`.
- Table/list of unbilled appointments with action buttons.
- "Create Invoice" and "File Claim" actions.
- Empty state for no unbilled sessions.

#### Step 12: Add Unbilled Appointments Hook (Frontend)
**Files**: `apps/web/src/hooks/use-unbilled-appointments.ts` (new)
**Complexity**: Low
**Changes**:
- `useUnbilledAppointments()` hook calling the new endpoint.
- Returns `{ appointments, isLoading, count }`.

#### Step 13: Integrate UnbilledSessionsSection into BillingPage (Frontend)
**Files**: `apps/web/src/app/(dashboard)/billing/page.tsx`
**Complexity**: Low
**Changes**:
- Import and render UnbilledSessionsSection above summary cards.
- Pass CreateClaimDialog state management.

#### Step 14: Claim Status in AppointmentModal (Frontend)
**Files**: `apps/web/src/components/appointments/AppointmentModal.tsx`
**Complexity**: Low
**Changes**:
- When `existing?.claimId` is set, show claim status badge and "View Claim" link in the footer.
- Add "Refresh Status" button for SUBMITTED/ACCEPTED claims using existing `useRefreshClaimStatus` hook.

#### Step 15: Tests
**Files**: Multiple test files (see QA section)
**Complexity**: Medium
**Changes**:
- API integration tests for the new unbilled appointments endpoint.
- API integration tests for claim creation (from appointment context).
- Frontend component tests for PostSessionBillingPrompt, CreateClaimDialog, BillingStatusIndicator, UnbilledSessionsSection.

### File Summary

**New Files (8)**:
- `apps/web/src/components/appointments/PostSessionBillingPrompt.tsx`
- `apps/web/src/components/appointments/BillingStatusIndicator.tsx`
- `apps/web/src/components/claims/CreateClaimDialog.tsx`
- `apps/web/src/components/claims/DiagnosisCodeSearch.tsx`
- `apps/web/src/components/billing/UnbilledSessionsSection.tsx`
- `apps/web/src/hooks/use-participant-insurance.ts`
- `apps/web/src/hooks/use-unbilled-appointments.ts`
- `packages/api/src/__tests__/unbilled-appointments.test.ts`

**Modified Files (7)**:
- `packages/api/src/services/appointments.ts` (add claim data to view, add unbilled query)
- `packages/api/src/routes/appointments.ts` (add `/unbilled` route)
- `apps/web/src/lib/appointment-types.ts` (add `claimId`, `claimStatus`)
- `apps/web/src/components/appointments/AppointmentModal.tsx` (billing prompt, claim status)
- `apps/web/src/components/appointments/AppointmentCard.tsx` (billing indicator)
- `apps/web/src/app/(dashboard)/billing/page.tsx` (unbilled section)
- `apps/web/src/hooks/use-claims.ts` (no changes needed -- hook already exists)

---

## 7. QA / Test Plan

### Test Scenarios

#### 7.1 API Tests

**File**: `packages/api/src/__tests__/unbilled-appointments.test.ts`

| # | Scenario | Method | Expected |
|---|----------|--------|----------|
| T1 | List unbilled appointments returns only ATTENDED without invoice or claim | GET /api/appointments/unbilled | 200, data contains only qualifying appointments |
| T2 | ATTENDED appointment with invoice excluded | GET /api/appointments/unbilled | Appointment not in results |
| T3 | ATTENDED appointment with claim excluded | GET /api/appointments/unbilled | Appointment not in results |
| T4 | Non-ATTENDED appointments excluded | GET /api/appointments/unbilled | SCHEDULED, NO_SHOW, CANCELED appointments not in results |
| T5 | Appointments older than 90 days excluded | GET /api/appointments/unbilled | Old appointments not in results |
| T6 | Pagination works with cursor | GET /api/appointments/unbilled?limit=1 | Returns cursor for next page |
| T7 | Non-owner clinician sees only own appointments | GET /api/appointments/unbilled | Other clinicians' appointments excluded |
| T8 | Practice owner sees all practice appointments | GET /api/appointments/unbilled | All practice appointments included |
| T9 | Unauthenticated request rejected | GET /api/appointments/unbilled | 401 |
| T10 | Participant role rejected | GET /api/appointments/unbilled | 403 |

**File**: `packages/api/src/__tests__/claims.test.ts` (extend existing)

| # | Scenario | Method | Expected |
|---|----------|--------|----------|
| T11 | Create claim from attended appointment succeeds | POST /api/claims | 201, claim created with DRAFT status |
| T12 | Create claim from non-attended appointment fails | POST /api/claims | 409, error: "must be ATTENDED" |
| T13 | Create claim when no insurance fails | POST /api/claims | 404, error: "No active insurance" |
| T14 | Create duplicate claim fails | POST /api/claims | 409, error: "claim already exists" |
| T15 | Claim includes correct appointment data | POST /api/claims | Service code, price, date match appointment |

**File**: Appointment view tests (extend existing)

| # | Scenario | Expected |
|---|----------|----------|
| T16 | `toClinicianView` includes `claimId` when claim exists | `claimId` is the InsuranceClaim ID |
| T17 | `toClinicianView` includes `claimStatus` when claim exists | `claimStatus` matches claim status |
| T18 | `toClinicianView` returns null `claimId` when no claim | `claimId` is null |

#### 7.2 Frontend Component Tests

**PostSessionBillingPrompt**:

| # | Scenario | Expected |
|---|----------|----------|
| T19 | Renders "Create Invoice" and "File Insurance Claim" buttons | Both buttons visible |
| T20 | "File Insurance Claim" disabled when `hasInsurance` is false | Button disabled with tooltip |
| T21 | Clicking "Create Invoice" calls `useCreateInvoiceFromAppointment` | Mutation called with appointment ID |
| T22 | Clicking "File Insurance Claim" opens CreateClaimDialog | Dialog opens |
| T23 | Clicking "Bill Later" calls `onDismiss` | Callback invoked |

**CreateClaimDialog**:

| # | Scenario | Expected |
|---|----------|----------|
| T24 | Pre-populates appointment data correctly | Participant name, date, service code, price displayed |
| T25 | Submit disabled without diagnosis codes | Button disabled |
| T26 | Can add and remove diagnosis codes | Codes appear as chips, removable |
| T27 | Submit calls `useCreateClaim` with correct data | Mutation called with appointmentId and diagnosisCodes |
| T28 | Shows error when claim creation fails | Error banner displayed |
| T29 | Shows success and calls onSuccess callback | Success state, callback invoked |

**BillingStatusIndicator**:

| # | Scenario | Expected |
|---|----------|----------|
| T30 | Renders nothing for SCHEDULED appointment | No output |
| T31 | Shows "Unbilled" for ATTENDED with no invoice/claim | Orange "Unbilled" text |
| T32 | Shows green dollar icon for PAID invoice | Green $ icon |
| T33 | Shows blue shield for SUBMITTED claim | Blue shield icon |
| T34 | Shows red shield for REJECTED claim | Red shield icon |

**UnbilledSessionsSection**:

| # | Scenario | Expected |
|---|----------|----------|
| T35 | Renders appointment list from API | Table rows with client name, date, service code |
| T36 | "Create Invoice" button calls endpoint and navigates | Invoice created, redirect to detail |
| T37 | "File Claim" button opens CreateClaimDialog | Dialog opens with appointment data |
| T38 | Empty state shows "All sessions billed" | Green checkmark and message |
| T39 | Section is collapsible | Toggle hides/shows content |
| T40 | Count badge shows correct number | Badge matches unbilled count |

### Edge Cases

| # | Edge Case | Expected Behavior |
|---|-----------|-------------------|
| E1 | Clinician creates invoice, then tries to create claim for same appointment | Claim creation succeeds (both can coexist -- invoice is private pay, claim is insurance) |
| E2 | Clinician creates claim, then navigates to billing page and tries "Create Invoice" for same appointment | Invoice creation succeeds (appointment can have both) |
| E3 | Participant insurance is deactivated after appointment but before claim creation | "File Insurance Claim" shows "No active insurance" error on submit |
| E4 | Multiple clinicians in same practice view unbilled queue | Each sees only their own appointments (unless practice owner) |
| E5 | Appointment marked ATTENDED then status changed back to SCHEDULED | Billing prompt dismisses; billing indicators removed from card |
| E6 | Very old appointments (>90 days) with no billing | Not shown in unbilled queue (90-day cutoff) |
| E7 | Clinician opens billing prompt, navigates away, comes back | Prompt state resets on modal reopen |
| E8 | Rapid double-click on "Create Invoice" | Mutation is deduplicated by TanStack Query; button shows loading state to prevent double-click |
| E9 | Appointment has both invoice and claim | Both indicators shown; modal shows both statuses |
| E10 | Diagnosis search returns 100+ results | Results truncated; user prompted to refine search |

### Integration Test Requirements

1. **Full workflow test**: Create appointment -> mark ATTENDED -> create invoice from billing prompt -> verify invoice appears on billing page -> verify appointment no longer appears in unbilled queue.

2. **Insurance claim workflow test**: Create appointment -> add insurance to participant -> mark ATTENDED -> open claim dialog -> search and select diagnosis code -> submit claim -> verify claim appears on claims page -> verify appointment no longer appears in unbilled queue.

3. **Calendar billing indicator test**: Create appointment -> mark ATTENDED -> verify "Unbilled" indicator on card -> create invoice -> verify green indicator on card.

4. **Cross-page navigation test**: Start on calendar -> mark ATTENDED -> click "Create Invoice" in billing prompt -> verify redirect to `/billing/:id` -> verify invoice detail page loads correctly -> navigate back to calendar -> verify billing indicator updated.

### Test Infrastructure Notes

- API tests use the existing `steady_adhd_test` database and test helpers from `packages/api/src/__tests__/helpers.ts`.
- Frontend tests use Vitest with jsdom environment and React Testing Library.
- The `useCreateClaim` hook test should verify the hook calls `api.post("/api/claims", data)` with correct shape.
- Mock `useParticipantInsurance` in component tests to control insurance availability.
- The unbilled appointments endpoint test needs to seed appointments in various states (ATTENDED with/without invoices/claims, SCHEDULED, old dates) to verify filtering logic.

---

## Appendix A: Sequence Diagram -- Post-Session Billing

```
Clinician          AppointmentModal     API               Database
   |                     |               |                    |
   |--mark ATTENDED----->|               |                    |
   |                     |--POST status->|--UPDATE appt------>|
   |                     |<-200 OK-------|<-OK----------------|
   |                     |               |                    |
   |   [BillingPrompt    |               |                    |
   |    appears]         |               |                    |
   |                     |               |                    |
   |--"Create Invoice"-->|               |                    |
   |                     |--POST from--->|--CREATE invoice---->|
   |                     |  appointment  |--CREATE line item-->|
   |                     |<-201 invoice--|<-OK----------------|
   |                     |               |                    |
   |<--redirect to-------|               |                    |
   |   /billing/:id      |               |                    |
```

## Appendix B: Data Dependencies

```
Appointment (ATTENDED)
  |
  +---> InvoiceLineItem? ---> Invoice (DRAFT -> SENT -> PAID)
  |
  +---> InsuranceClaim? (DRAFT -> SUBMITTED -> ACCEPTED -> PAID)
  |
  +---> ServiceCode (code, defaultPriceCents)
  |
  +---> Location (type -> placeOfServiceCode)
  |
  +---> Participant
         |
         +---> PatientInsurance? (payerId, payerName, isActive)
```
