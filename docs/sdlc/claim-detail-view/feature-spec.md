# Claim Detail View — Full SDLC Feature Spec

---

## Phase 1: Ideation

### Problem Statement

Clicking a claim row on the Claims page (`apps/web/src/app/(dashboard)/claims/page.tsx`) calls `setSelectedClaimId` (line 93-95), but the `selectedClaimId` state is never consumed in the render output. The click handler is a dead code path -- users see a cursor pointer, click, and nothing happens. This means:

1. **No claim detail view** -- clinicians cannot see denial reasons, status history, ERA/EOB data, or payer responses after clicking a claim.
2. **Blind resubmission** -- the "Resubmit" button calls `resubmitClaim.mutate({ claimId: claim.id })` with no correction data. The API supports `diagnosisCodes` and `serviceCode` corrections but the UI sends neither.
3. **No status timeline** -- the `ClaimStatusHistory` model exists and `getClaim` returns `statusHistory` ordered by `createdAt`, but this data is never displayed.

### Approach Options

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **A: Slide-over panel** | Stays in claims list context; no page navigation; fast open/close; follows existing modal patterns in the codebase | Limited width for complex data | **Selected** |
| **B: Separate detail page** (`/claims/[id]`) | Full-width layout; deep-linkable | Disrupts workflow; navigating back loses scroll position and filter state; heavier implementation | Rejected |
| **C: Expandable row** | Inline; no overlay | Table layout breaks with variable-height rows; cramped for status timeline + resubmit form | Rejected |

### Decision: Slide-over Panel (Dialog)

Use a Radix `Dialog` component (already available as `apps/web/src/components/ui/dialog.tsx`) to render a right-aligned detail panel. This matches the codebase's existing modal pattern while keeping the clinician in the claims list context. The `useClaim` hook (`apps/web/src/hooks/use-claims.ts:85-91`) already fetches full claim detail with `statusHistory` -- it just needs to be wired up.

---

## Phase 2: Product Owner Specification

### User Stories

**US-1: View claim details**
AS A clinician
I WANT TO click a claim row and see its full details in a slide-over panel
SO THAT I can review payer responses, denial reasons, and claim history without leaving the claims list.

**US-2: View status timeline**
AS A clinician
I WANT TO see a chronological timeline of all status changes for a claim
SO THAT I can understand the claim's lifecycle and when each transition occurred.

**US-3: Edit and resubmit rejected claims**
AS A clinician
I WANT TO correct diagnosis codes and service codes before resubmitting a rejected claim
SO THAT I can address the rejection reason and improve the chance of acceptance.

**US-4: Refresh claim status from detail view**
AS A clinician
I WANT TO check claim status from the detail panel (not just the table row)
SO THAT I can get updated payer responses while reviewing claim details.

### Functional Requirements

#### FR-1: Claim Detail Panel

**GIVEN** the clinician is on the Claims page
**WHEN** they click a claim row
**THEN** a dialog/slide-over opens showing the full claim detail fetched via `GET /api/claims/:id`

**GIVEN** the detail panel is open
**WHEN** the clinician clicks the close button, presses Escape, or clicks the overlay
**THEN** the panel closes and `selectedClaimId` resets to null

#### FR-2: Detail Data Display

The detail panel MUST display:

| Field | Source | Format |
|-------|--------|--------|
| Participant name | `claim.participant.user.firstName + lastName` | "Jane Doe" |
| Status | `claim.status` | `ClaimStatusBadge` component |
| Payer name | `claim.patientInsurance.payerName` | Text |
| Date of service | `claim.dateOfService` | "Apr 1, 2026" |
| Service code (CPT) | `claim.serviceCode` | Monospace, e.g. `90834` |
| Charge amount | `claim.servicePriceCents` | "$140.00" |
| Diagnosis codes | `claim.diagnosisCodes` | Comma-separated monospace badges |
| Place of service | `claim.placeOfServiceCode` | Code + label (02 = Telehealth, 11 = Office) |
| Rejection reason | `claim.rejectionReason` | Red alert box, only when non-null |
| Submitted at | `claim.submittedAt` | Date or "Not yet submitted" |
| Payer response at | `claim.respondedAt` | Date or dash |
| Stedi transaction ID | `claim.stediTransactionId` | Monospace, truncated, only when present |
| Retry count | `claim.retryCount` | Only shown when > 0 |

#### FR-3: Status Timeline

**GIVEN** the detail panel is open
**WHEN** the claim has `statusHistory` entries
**THEN** a vertical timeline renders each transition:
- From status -> To status
- Timestamp (`createdAt`)
- Changed by (userId or "system")
- Reason (if present, e.g., "Invalid code" for rejections)

**GIVEN** a claim in DRAFT status
**WHEN** it has only one history entry
**THEN** the timeline shows a single "Created" node

#### FR-4: Resubmit with Corrections

**GIVEN** a REJECTED claim is open in the detail panel
**WHEN** the clinician clicks "Resubmit"
**THEN** the panel shows an inline edit form pre-populated with current diagnosis codes and service code

**GIVEN** the resubmit form is shown
**WHEN** the clinician modifies diagnosis codes and/or service code and confirms
**THEN** `PUT /api/claims/:id/resubmit` is called with the correction data
**AND** the claim list and detail queries are invalidated

**GIVEN** the resubmit form is shown
**WHEN** the clinician clicks "Cancel"
**THEN** the form collapses without sending any request

#### FR-5: Refresh Status from Detail

**GIVEN** a SUBMITTED or ACCEPTED claim is open in the detail panel
**WHEN** the clinician clicks "Check Status"
**THEN** `POST /api/claims/:id/refresh-status` is called
**AND** the detail panel updates with the new status and any new `statusHistory` entries

#### FR-6: Actions by Status

| Status | Available Actions |
|--------|------------------|
| DRAFT | None (claim not yet submitted; submission happens from appointment view) |
| SUBMITTED | "Check Status" button |
| ACCEPTED | "Check Status" button |
| REJECTED | "Resubmit" button (opens correction form) |
| DENIED | None (terminal -- display denial reason prominently) |
| PAID | None (terminal -- display paid confirmation) |

### Acceptance Criteria

- AC-1: Clicking a claim row opens the detail panel within 200ms (perceived).
- AC-2: Detail panel shows all fields listed in FR-2.
- AC-3: Status timeline renders all `statusHistory` entries in chronological order.
- AC-4: Resubmit form accepts modified diagnosis codes (1-4 codes) and optional service code.
- AC-5: Resubmit validates input client-side using `ResubmitClaimSchema` before sending.
- AC-6: After resubmit, claim status resets to DRAFT and the list row updates.
- AC-7: Check Status button is disabled while the mutation is pending (loading spinner).
- AC-8: Panel is keyboard-accessible: Escape closes, Tab navigates, Enter activates buttons.
- AC-9: No PHI is logged to console in any code path.

### Out of Scope

- ERA/EOB document rendering (no API for this yet; Stedi returns status only).
- Batch resubmit (single claim at a time).
- Claim editing before first submission (handled by appointment prep flow).
- PDF export of claim detail.

---

## Phase 3: Compliance (HIPAA)

### Data Classification

| Data Element | PHI? | Rationale |
|-------------|------|-----------|
| Participant name (firstName, lastName) | Yes | Direct patient identifier |
| Diagnosis codes (ICD-10) | Yes | Clinical information linked to identified patient |
| Service code (CPT) | Yes | Describes clinical service for identified patient |
| Rejection reason | Yes | May reference clinical details for identified patient |
| Charge amount (servicePriceCents) | Yes | Financial data linked to identified patient |
| Payer name | No | Insurance company name, not patient-specific |
| Claim status | No | Operational metadata |
| Stedi transaction ID | No | System identifier |
| Status timeline timestamps | No | Operational metadata |

### Access Controls

- **Authentication**: All claim endpoints already require JWT auth via `authenticate` middleware.
- **Authorization**: Routes require `CLINICIAN` or `ADMIN` role via `requireRole()`. Practice membership verified via `requirePracticeCtx`.
- **Ownership**: `getClaim` service function scopes queries by `clinicianId` (non-owners) or `practiceId` (owners). Cross-practice requests return 404 (no existence leakage).
- **No new endpoints needed**: This feature consumes existing `GET /api/claims/:id` and `PUT /api/claims/:id/resubmit` endpoints. No new data exposure paths.

### Audit Trail

- The existing Prisma audit middleware captures all `InsuranceClaim` and `ClaimStatusHistory` mutations.
- No additional audit logging needed -- the feature only adds a UI to display already-available data.
- The resubmit mutation already logs to `ClaimStatusHistory` with `changedBy: ctx.userId` and `reason: "Resubmitted with corrections"`.

### Logging Rules

- NEVER log diagnosis codes, rejection reasons, or participant names to the browser console.
- NEVER log `servicePriceCents` or charge amounts.
- Error boundaries may log error names and messages but NEVER log response payloads containing PHI.
- The existing `logger` on the API side already follows these rules.

### Data Minimization

- The detail panel displays only data already returned by `getClaim`. No additional Prisma includes are needed.
- The `getClaim` service already uses `select` projections on `participant` (only `id`, `firstName`, `lastName`) and `patientInsurance` (only `payerName`).

### Compliance Verdict

**PASS** -- This feature adds a frontend display layer for data already accessible via authenticated, role-guarded, ownership-scoped API endpoints. No new data exposure, no new endpoints, no changes to the data model. All existing HIPAA controls remain in effect.

### Conditions

1. COND-1: Never log PHI (diagnosis codes, rejection reasons, participant names) in browser console or frontend error handlers.
2. COND-2: The detail panel must respect the existing 30-minute session timeout (already handled by `InactivityTimeout` component).
3. COND-3: Resubmit correction data must be validated client-side with the existing `ResubmitClaimSchema` before transmission.
4. COND-4: No claim data may be cached in `localStorage` or `sessionStorage`.

---

## Phase 4: Architecture

### System Context

No new API routes, database models, or service functions are needed. This feature wires up existing backend capabilities to a new frontend component.

```
+------------------------------------------------------------------+
| Next.js Web (apps/web)                                            |
|                                                                   |
|   /claims page (existing)                                         |
|   +-- <ClaimsPage> -- claim list table (existing)                 |
|   +-- <ClaimDetailPanel> -- NEW slide-over dialog                 |
|       +-- Header: participant name, status badge                  |
|       +-- Claim info grid                                         |
|       +-- Status timeline                                         |
|       +-- Rejection alert (conditional)                           |
|       +-- Action buttons (Check Status / Resubmit)                |
|       +-- <ResubmitForm> -- inline correction form (conditional)  |
|                                                                   |
|   Hooks used (all existing):                                      |
|   +-- useClaim(claimId)            -- GET /api/claims/:id         |
|   +-- useRefreshClaimStatus()      -- POST /refresh-status        |
|   +-- useResubmitClaim()           -- PUT /resubmit               |
+----------------------------+-------------------------------------+
                             | HTTPS + JWT (existing)
+----------------------------v-------------------------------------+
| Express API (packages/api) -- NO CHANGES                          |
|   routes/claims.ts    -> services/claims.ts                       |
|   getClaim()          returns statusHistory, participant, payer    |
|   resubmitClaim()     accepts { diagnosisCodes?, serviceCode? }   |
|   refreshClaimStatus() polls Stedi, updates status + history      |
+------------------------------------------------------------------+
```

### Data Flow

1. User clicks claim row -> `setSelectedClaimId(claim.id)`
2. `selectedClaimId` is non-null -> Dialog opens
3. Dialog renders `<ClaimDetailPanel claimId={selectedClaimId} />`
4. `ClaimDetailPanel` calls `useClaim(claimId)` -> `GET /api/claims/:id`
5. API returns full claim with `statusHistory[]`, `participant`, `patientInsurance`
6. Panel renders claim info, timeline, and status-dependent actions
7. "Check Status" -> `useRefreshClaimStatus().mutate(claimId)` -> invalidates queries -> panel re-renders
8. "Resubmit" -> shows inline form -> user edits -> `useResubmitClaim().mutate({ claimId, data })` -> invalidates queries -> panel shows updated DRAFT status

### Component Architecture

```
ClaimsPage (existing, modified)
  |-- Dialog (open={!!selectedClaimId}, onOpenChange)
       |-- ClaimDetailPanel (new component)
            |-- ClaimDetailHeader (participant name, status, close button)
            |-- ClaimInfoGrid (date of service, CPT, payer, amount, dx codes, POS)
            |-- ClaimStatusTimeline (vertical timeline from statusHistory[])
            |-- RejectionAlert (conditional, shown for REJECTED/DENIED)
            |-- ClaimActions (Check Status / Resubmit buttons)
            |-- ResubmitForm (conditional, inline correction form)
```

### New Files

| File | Purpose |
|------|---------|
| `apps/web/src/components/claims/ClaimDetailPanel.tsx` | Main detail panel component |
| `apps/web/src/components/claims/ClaimStatusTimeline.tsx` | Vertical status timeline |
| `apps/web/src/components/claims/ResubmitForm.tsx` | Inline correction form for rejected claims |

### Modified Files

| File | Change |
|------|--------|
| `apps/web/src/app/(dashboard)/claims/page.tsx` | Wire `selectedClaimId` to Dialog + ClaimDetailPanel |

### Existing Code Reuse

- `useClaim` hook (already exists, just not called)
- `useRefreshClaimStatus` hook (already imported in page)
- `useResubmitClaim` hook (already imported in page, but needs correction data wired)
- `ClaimStatusBadge` component (already exists)
- `Dialog` / `DialogContent` from `components/ui/dialog.tsx`
- `ResubmitClaimSchema` from `@steady/shared` for client-side validation
- `formatDate` / `formatMoney` from `lib/format.ts`

### State Management

- `selectedClaimId: string | null` -- already exists in `ClaimsPage`, drives Dialog open state.
- `isResubmitFormOpen: boolean` -- local state inside `ClaimDetailPanel`, toggles inline edit form.
- All server state via TanStack Query (existing hooks). No new `useState` for fetched data.

---

## Phase 5: UX Design

### Detail Panel Layout

The panel opens as a Dialog with a wide content area (`max-w-lg`), appearing from the right with the standard Radix animation.

```
+----------------------------------------------------------+
| Claim Detail                                         [X]  |
+----------------------------------------------------------+
| Jane Doe                              [Rejected]          |
| Aetna                                                     |
+----------------------------------------------------------+
|                                                           |
| CLAIM INFORMATION                                         |
| +------------------------------------------------------+ |
| | Date of Service    | Apr 1, 2026                     | |
| | Service Code       | 90834                           | |
| | Charge Amount      | $140.00                         | |
| | Place of Service   | 02 - Telehealth                 | |
| | Diagnosis Codes    | [F90.0] [F90.1]                 | |
| | Submitted          | Apr 2, 2026                     | |
| | Payer Response     | Apr 5, 2026                     | |
| | Stedi Txn          | txn_abc123...                   | |
| +------------------------------------------------------+ |
|                                                           |
| +------------------------------------------------------+ |
| | ! REJECTION REASON                                   | |
| |   Invalid diagnosis code: F90.0 is not covered       | |
| |   under the subscriber's current plan.               | |
| +------------------------------------------------------+ |
|                                                           |
| CLAIM HISTORY                                             |
| o Created              Apr 1, 2026  12:00 PM             |
| |                                                         |
| o Submitted            Apr 2, 2026   9:30 AM             |
| |                      by clinician                       |
| |                                                         |
| o Rejected             Apr 5, 2026   2:15 PM             |
|                        by system                          |
|                        "Invalid diagnosis code"           |
|                                                           |
| +------------------------------------------------------+ |
| | [Resubmit with Corrections]                          | |
| +------------------------------------------------------+ |
+----------------------------------------------------------+
```

### Resubmit Form (Expanded State)

When the clinician clicks "Resubmit with Corrections", an inline form replaces the action button area:

```
| CORRECTION FORM                                           |
| +------------------------------------------------------+ |
| | Service Code                                         | |
| | [90834                                          ]    | |
| |                                                      | |
| | Diagnosis Codes                                      | |
| | [F90.0] [x]  [F90.1] [x]                           | |
| | [+ Add code                                    ]    | |
| |                                                      | |
| |                     [Cancel]  [Resubmit Claim]       | |
| +------------------------------------------------------+ |
```

### Status-Specific Behaviors

| Status | Panel Appearance |
|--------|-----------------|
| DRAFT | Neutral. No action buttons (submission done from appointment view). Info text: "This claim has not been submitted yet." |
| SUBMITTED | Blue accent. "Check Status" button. Info text: "Waiting for payer response." |
| ACCEPTED | Teal accent. "Check Status" button. Info text: "Claim accepted by payer. Waiting for payment." |
| REJECTED | Red alert box with rejection reason. "Resubmit with Corrections" button. |
| DENIED | Dark red alert box with denial reason. No action buttons. Info text: "This claim has been denied. Contact the payer for further information." |
| PAID | Green success banner. No action buttons. Info text: "Payment received." |

### Timeline Node Design

Each timeline node uses the corresponding status color:

| Status | Node Color | Icon |
|--------|-----------|------|
| DRAFT | Gray | Circle |
| SUBMITTED | Blue | Send |
| ACCEPTED | Teal | CheckCircle |
| REJECTED | Red | XCircle |
| DENIED | Dark Red | XCircle |
| PAID | Green | CheckCircle |

### Loading State

While `useClaim` is loading, the panel shows a centered `Loader2` spinner with "Loading claim details..." text.

### Error State

If `useClaim` returns an error, the panel shows an error alert with a "Retry" button that calls `refetch()`.

### Responsive Considerations

- Panel width: `max-w-lg` (32rem / 512px) on desktop.
- On mobile viewports (<640px), the dialog takes full width via existing Dialog responsive behavior.
- Scrollable content area for long timelines.

### Accessibility

- Dialog traps focus when open (Radix built-in).
- Escape key closes the panel (Radix built-in).
- Timeline uses semantic `<ol>` list markup with `aria-label="Claim status history"`.
- Action buttons have descriptive `aria-label` attributes.
- Status badge has existing `aria-label` (confirmed in `ClaimStatusBadge.tsx`).

---

## Phase 6: Engineering Plan

### Task Breakdown

#### Task 1: Create `ClaimStatusTimeline` component

**File**: `apps/web/src/components/claims/ClaimStatusTimeline.tsx`

Accepts `statusHistory: Array<{ id, fromStatus, toStatus, changedBy, reason, createdAt }>` as props. Renders a vertical timeline with colored nodes per status, timestamps, actor, and reason.

Uses:
- `formatDate` from `@/lib/format`
- Status color mapping from `ClaimStatusBadge` pattern
- Lucide icons: `Circle`, `Send`, `CheckCircle2`, `XCircle`

No hooks -- pure presentational component receiving data as props.

#### Task 2: Create `ResubmitForm` component

**File**: `apps/web/src/components/claims/ResubmitForm.tsx`

Props:
- `claimId: string`
- `currentDiagnosisCodes: string[]`
- `currentServiceCode: string`
- `onCancel: () => void`
- `onSuccess: () => void`

Behavior:
- Pre-populates form with current values.
- Diagnosis codes as editable tag list (add/remove).
- Service code as text input.
- Validates with `ResubmitClaimSchema.safeParse()` before submitting.
- Calls `useResubmitClaim().mutate({ claimId, data: { diagnosisCodes, serviceCode } })`.
- Shows validation errors inline.
- Disables submit button while mutation is pending.

#### Task 3: Create `ClaimDetailPanel` component

**File**: `apps/web/src/components/claims/ClaimDetailPanel.tsx`

Props:
- `claimId: string`
- `onClose: () => void`

Behavior:
- Calls `useClaim(claimId)` to fetch full claim data.
- Renders header with participant name and `ClaimStatusBadge`.
- Renders info grid with all claim fields.
- Renders `ClaimStatusTimeline` with `claim.statusHistory`.
- Conditionally renders rejection/denial alert.
- Conditionally renders action buttons based on status.
- Manages `isResubmitFormOpen` state for inline form toggle.
- Renders `ResubmitForm` when toggled.

#### Task 4: Wire up `ClaimsPage` to open detail panel

**File**: `apps/web/src/app/(dashboard)/claims/page.tsx`

Changes:
- Import `Dialog`, `DialogContent` from `@/components/ui/dialog`.
- Import `ClaimDetailPanel` from `@/components/claims/ClaimDetailPanel`.
- Add Dialog wrapping `ClaimDetailPanel` at the bottom of the render:
  ```tsx
  <Dialog open={!!selectedClaimId} onOpenChange={(open) => !open && setSelectedClaimId(null)}>
    <DialogContent className="max-w-lg">
      {selectedClaimId && (
        <ClaimDetailPanel
          claimId={selectedClaimId}
          onClose={() => setSelectedClaimId(null)}
        />
      )}
    </DialogContent>
  </Dialog>
  ```
- Remove the duplicate "Check Status" and "Resubmit" buttons from the table actions column (these will now live in the detail panel). Or keep them as quick-action shortcuts -- **decision: keep them in the table for quick access, but also show in the detail panel**.

### Implementation Order

1. `ClaimStatusTimeline.tsx` (pure component, no deps on other new files)
2. `ResubmitForm.tsx` (depends on `useResubmitClaim` hook, `ResubmitClaimSchema`)
3. `ClaimDetailPanel.tsx` (composes Timeline + ResubmitForm + useClaim)
4. `page.tsx` modifications (wires everything together)

### Place of Service Labels

Add a simple mapping for display:

```typescript
const POS_LABELS: Record<string, string> = {
  "02": "Telehealth",
  "11": "Office",
  "12": "Home",
  "22": "Outpatient Hospital",
};
```

### No Backend Changes

All required API endpoints and data shapes already exist:
- `GET /api/claims/:id` returns `statusHistory`, `participant`, `patientInsurance`
- `PUT /api/claims/:id/resubmit` accepts `{ diagnosisCodes?, serviceCode? }`
- `POST /api/claims/:id/refresh-status` polls Stedi and updates status

The `useClaim`, `useRefreshClaimStatus`, and `useResubmitClaim` hooks are already defined in `apps/web/src/hooks/use-claims.ts`.

---

## Phase 7: QA / Test Plan

### Frontend Tests

#### Test File: `apps/web/src/__tests__/claims/ClaimStatusTimeline.test.tsx`

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Renders timeline with multiple status history entries | Shows all entries in chronological order |
| 2 | Displays "Created" for the first entry (fromStatus is null) | First node shows "Created" label |
| 3 | Shows reason text when present on a history entry | Reason text visible in rejection node |
| 4 | Shows "system" vs clinician for changedBy | Correct actor label displayed |
| 5 | Applies correct color for each status node | REJECTED = red, PAID = green, etc. |
| 6 | Renders single-entry timeline for DRAFT claim | One node, no connecting lines |

#### Test File: `apps/web/src/__tests__/claims/ResubmitForm.test.tsx`

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Pre-populates with current diagnosis codes and service code | Form fields show existing values |
| 2 | Allows adding a diagnosis code | New code appears in tag list |
| 3 | Allows removing a diagnosis code | Code removed from tag list |
| 4 | Prevents removing last diagnosis code | Remove button disabled when 1 code remains |
| 5 | Prevents adding more than 4 diagnosis codes | Add button disabled at 4 codes |
| 6 | Validates empty diagnosis code input | Error message shown |
| 7 | Calls resubmit mutation with corrected data on submit | `mutate` called with correct payload |
| 8 | Shows loading state while mutation is pending | Submit button disabled, spinner shown |
| 9 | Calls onSuccess callback after successful mutation | Callback invoked |
| 10 | Calls onCancel when cancel button clicked | Callback invoked, no mutation |

#### Test File: `apps/web/src/__tests__/claims/ClaimDetailPanel.test.tsx`

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Shows loading spinner while claim is being fetched | Loader2 visible |
| 2 | Displays participant name and status badge | Name and badge rendered |
| 3 | Displays all claim info fields | Date, CPT, amount, payer, dx codes visible |
| 4 | Displays status timeline | Timeline component rendered with history data |
| 5 | Shows rejection alert for REJECTED claim | Red alert box with rejection reason |
| 6 | Shows denial alert for DENIED claim | Dark red alert box |
| 7 | Shows "Resubmit" button for REJECTED claims | Button visible |
| 8 | Does NOT show "Resubmit" for PAID claims | No button rendered |
| 9 | Shows "Check Status" for SUBMITTED claims | Button visible |
| 10 | Does NOT show "Check Status" for DRAFT claims | No button rendered |
| 11 | Opens ResubmitForm when "Resubmit" clicked | Form becomes visible |
| 12 | Shows success banner for PAID claims | Green banner visible |
| 13 | Shows "Not yet submitted" for DRAFT claim with no submittedAt | Text shown |
| 14 | Handles error state with retry button | Error alert and retry button visible |

#### Test File: Integration test for claims page dialog wiring

| # | Test Case | Expected Result |
|---|-----------|-----------------|
| 1 | Clicking a claim row opens the detail dialog | Dialog opens with claim data |
| 2 | Clicking the close button closes the dialog | Dialog closes, selectedClaimId is null |
| 3 | Pressing Escape closes the dialog | Dialog closes |
| 4 | Clicking a different row while dialog is open switches claim | New claim data loads |

### Existing API Tests (Already Passing)

The following tests in `packages/api/src/__tests__/claims.test.ts` already cover the backend for the endpoints this feature consumes:

- `GET /api/claims/:id` -- returns claim detail with statusHistory (line 355-403)
- `PUT /api/claims/:id/resubmit` -- resubmits REJECTED claim, rejects non-REJECTED (line 478-557)
- `POST /api/claims/:id/refresh-status` -- refreshes SUBMITTED/ACCEPTED, rejects others (line 407-474)
- State machine guards (line 559-594)
- Auth/role guards (401/403 tests throughout)

No new API tests needed since no backend changes are made.

### Manual QA Checklist

- [ ] Click claim row -> detail panel opens with correct data
- [ ] Panel shows all fields from FR-2
- [ ] Status timeline renders in chronological order
- [ ] REJECTED claim shows rejection reason in red alert
- [ ] DENIED claim shows denial reason in dark red alert
- [ ] PAID claim shows green success banner
- [ ] "Check Status" button works for SUBMITTED claim
- [ ] "Check Status" button works for ACCEPTED claim
- [ ] "Resubmit" opens correction form with pre-populated values
- [ ] Can modify diagnosis codes in correction form
- [ ] Can modify service code in correction form
- [ ] Resubmit sends correction data to API
- [ ] After resubmit, claim status shows DRAFT in both panel and table row
- [ ] Close button closes panel
- [ ] Escape key closes panel
- [ ] Clicking overlay closes panel
- [ ] Tab navigation works within panel
- [ ] Loading spinner shows while fetching claim detail
- [ ] No console errors or warnings
- [ ] No PHI logged to browser console
- [ ] Session timeout still functions while panel is open
- [ ] Quick-action buttons in table row still work independently of detail panel

### Coverage Requirements

- New components (`ClaimDetailPanel`, `ClaimStatusTimeline`, `ResubmitForm`) must have >80% line coverage.
- All branches (status-dependent rendering) must be tested.
- `packages/api` coverage remains unaffected (no backend changes).
