# Claim Submission Entry Point + Claim Detail View -- Full SDLC Spec

---

## 1. IDEATION

### Problem Statement

The Claims page (`apps/web/src/app/(dashboard)/claims/page.tsx`) is currently read-only. Despite a full backend (create, list, get detail, refresh status, resubmit) and a frontend `useCreateClaim` hook (`apps/web/src/hooks/use-claims.ts:93`), there is no "New Claim" button anywhere in the UI. The only way a claim could be created is by writing a direct API call -- no clinician can actually do this.

Additionally, clicking a claim row sets `selectedClaimId` state (line 93-95) but nothing renders with that selection -- it is a dead click. There is no claim detail view, no way to see denial reasons, no way to see ERA data, and no way to edit a rejected claim before resubmission. The existing "Resubmit" button on rejected claims calls `resubmitClaim.mutate({ claimId: claim.id })` with no editable data -- a blind resubmit with no corrections.

### Impact

- Clinicians cannot submit insurance claims through Steady, defeating the purpose of the Stedi integration.
- Claim detail view (denial reasons, status history, payer responses) is invisible.
- Rejected claims cannot be corrected before resubmission, leading to repeat rejections.
- The `stedi-claim-submit` pg-boss worker exists but has no trigger -- there is no `POST /api/claims/:id/submit` endpoint to enqueue a DRAFT claim for Stedi submission.

### Existing Assets (Already Built)

| Layer | What Exists | What Is Missing |
|-------|------------|-----------------|
| **Prisma models** | `InsuranceClaim`, `ClaimStatusHistory`, `DiagnosisCode`, `PatientInsurance` | Nothing -- models are complete |
| **API routes** | `POST /api/claims` (create), `GET /api/claims` (list), `GET /api/claims/:id` (detail), `POST /api/claims/:id/refresh-status`, `PUT /api/claims/:id/resubmit` | `POST /api/claims/:id/submit` to enqueue DRAFT -> SUBMITTED via pg-boss |
| **Services** | `createClaim`, `listClaims`, `getClaim`, `refreshClaimStatus`, `resubmitClaim` in `claims.ts`. `stedi-claim-submit` worker in `queue.ts` | `submitDraftClaim` service function that enqueues to pg-boss |
| **Zod schemas** | `CreateClaimSchema`, `ResubmitClaimSchema`, `ListClaimsQuerySchema`, `ClaimStatusEnum` | Nothing missing |
| **Hooks** | `useClaims`, `useClaim`, `useCreateClaim`, `useRefreshClaimStatus`, `useResubmitClaim` | `useSubmitClaim` hook for DRAFT -> SUBMITTED |
| **Components** | `ClaimStatusBadge` | `CreateClaimDialog`, `ClaimDetailPanel`, `ClaimEditForm` |
| **State machine** | `VALID_TRANSITIONS` map in `claims.ts` with DRAFT->SUBMITTED->ACCEPTED/REJECTED/DENIED->PAID | No submit endpoint uses it |

### Alternatives Considered

**A. Inline detail expansion (accordion rows)** -- Clicking a claim row expands it in-place to show details. Simple but cramped for the amount of data (status history, diagnosis codes, payer response, edit form).

**B. Slide-over panel (Sheet component)** -- RECOMMENDED. Right-side panel opens on row click, showing full claim detail. Consistent with modern SaaS patterns. Allows the claims list to remain visible for context. Does not require a new route.

**C. Dedicated detail page (`/claims/[id]`)** -- Full page with URL routing. More discoverable and bookmarkable but heavy for a secondary view that clinicians visit briefly. Breaks the flow of scanning the claims list.

**Recommendation: Approach B** -- Slide-over panel. The claims list stays visible, the panel shows full detail, and the edit-before-resubmit form fits naturally. The `selectedClaimId` state already exists -- we just need to render a panel when it is set. A Sheet/Dialog component can be added to `apps/web/src/components/ui/` since one does not exist yet.

---

## 2. PRODUCT OWNER SPEC

### Overview

This feature completes the Stedi insurance billing loop by adding three missing UI capabilities: (1) a "New Claim" button that creates a claim from an attended appointment, (2) a claim detail slide-over panel showing full claim data with status history and denial reasons, and (3) an edit-before-resubmit flow for rejected claims. It also adds the missing `POST /api/claims/:id/submit` endpoint that bridges DRAFT claims to the pg-boss `stedi-claim-submit` worker.

### Functional Requirements

#### FR-1: New Claim Entry Point

Clinicians can create a new insurance claim from the Claims page.

**Acceptance Criteria:**

- GIVEN a clinician on the Claims page
  WHEN they click the "+ New Claim" button in the page header
  THEN a "Create Claim" dialog opens

- GIVEN the Create Claim dialog is open
  WHEN the clinician selects an attended appointment from a dropdown (filtered to ATTENDED appointments without existing claims, sorted by date descending)
  THEN the dialog auto-populates: participant name, date of service, CPT code, payer name, charge amount, and place of service

- GIVEN the dialog is auto-populated
  WHEN the clinician adds at least one diagnosis code via the ICD-10 searchable picker (existing `GET /api/diagnosis-codes` endpoint)
  THEN the "Create Draft" button becomes enabled

- GIVEN the clinician clicks "Create Draft"
  WHEN the API call succeeds (`POST /api/claims`)
  THEN the claim is created with status DRAFT, the dialog closes, the claims list refreshes, and a toast confirms "Claim created as draft"

- GIVEN the clinician clicks "Create & Submit"
  WHEN the API calls succeed (`POST /api/claims` then `POST /api/claims/:id/submit`)
  THEN the claim is created, enqueued for Stedi submission, status is SUBMITTED, and a toast confirms "Claim submitted to payer"

- GIVEN no attended appointments without claims exist
  WHEN the clinician opens the Create Claim dialog
  THEN the appointment dropdown is empty with a message "No billable appointments. Mark an appointment as ATTENDED to create a claim."

#### FR-2: Claim Detail Slide-Over Panel

Clinicians can view full claim details by clicking a claim row.

**Acceptance Criteria:**

- GIVEN a clinician on the Claims page
  WHEN they click a claim row
  THEN a slide-over panel opens from the right showing full claim detail (fetched via `GET /api/claims/:id`)

- GIVEN the claim detail panel is open
  THEN it displays:
  - Header: participant name, claim status badge, date of service
  - Claim data section: CPT code, diagnosis codes (with descriptions), payer name, charge amount, place of service
  - Status history timeline: each transition with timestamp, actor (clinician or system), and reason (if any)
  - Rejection/denial section (only if status is REJECTED or DENIED): rejection reason prominently displayed in a warning/error callout

- GIVEN a claim with status DRAFT
  WHEN the clinician views the detail panel
  THEN a "Submit to Payer" button is visible and functional (calls `POST /api/claims/:id/submit`)

- GIVEN a claim with status SUBMITTED or ACCEPTED
  WHEN the clinician views the detail panel
  THEN a "Check Status" button is visible (calls `POST /api/claims/:id/refresh-status`)

- GIVEN a claim with status REJECTED
  WHEN the clinician views the detail panel
  THEN an "Edit & Resubmit" button is visible, along with the rejection reason

- GIVEN a claim with status DENIED or PAID
  WHEN the clinician views the detail panel
  THEN no action buttons are shown (terminal states)

- GIVEN the detail panel is open
  WHEN the clinician clicks outside the panel, presses Escape, or clicks the close button
  THEN the panel closes and `selectedClaimId` is cleared

#### FR-3: Edit Before Resubmit Flow

Clinicians can correct claim data before resubmitting a rejected claim.

**Acceptance Criteria:**

- GIVEN a claim with status REJECTED and the detail panel open
  WHEN the clinician clicks "Edit & Resubmit"
  THEN the detail panel switches to an edit form with pre-populated fields: diagnosis codes (editable via ICD-10 picker), service/CPT code (editable dropdown), and an optional correction note

- GIVEN the edit form is open
  WHEN the clinician modifies fields and clicks "Resubmit"
  THEN `PUT /api/claims/:id/resubmit` is called with the updated data, the claim resets to DRAFT, is immediately enqueued for submission, and a toast confirms "Claim resubmitted with corrections"

- GIVEN the edit form is open
  WHEN the clinician clicks "Cancel"
  THEN the panel returns to the read-only detail view with no changes saved

#### FR-4: Submit Draft Claim Endpoint (Backend)

A new API endpoint bridges DRAFT claims to the pg-boss submission worker.

**Acceptance Criteria:**

- GIVEN a DRAFT claim exists
  WHEN `POST /api/claims/:id/submit` is called by an authenticated clinician who owns the claim
  THEN the claim status transitions to SUBMITTED (optimistically), a `stedi-claim-submit` job is enqueued in pg-boss, and the response includes the updated claim

- GIVEN a claim with status other than DRAFT
  WHEN `POST /api/claims/:id/submit` is called
  THEN a 409 response is returned: "Only DRAFT claims can be submitted"

- GIVEN a claim not owned by the authenticated clinician
  WHEN `POST /api/claims/:id/submit` is called
  THEN a 404 response is returned

- GIVEN the practice has no Stedi API key configured
  WHEN `POST /api/claims/:id/submit` is called
  THEN a 400 response is returned: "Insurance billing not configured"

### Non-Functional Requirements

#### NFR-1: Performance
- Claim detail panel must open within 500ms (single API call to `GET /api/claims/:id`).
- Appointment dropdown in Create Claim dialog must load within 1 second.
- Diagnosis code search must return results within 200ms (existing endpoint).

#### NFR-2: Accessibility
- Slide-over panel must trap focus when open.
- All form fields must have labels and error messages.
- Status history timeline must be screen-reader friendly (ordered list with aria-labels).
- Keyboard navigation: Escape closes the panel.

#### NFR-3: Error Handling
- Network errors during claim creation show a toast with retry guidance.
- Stedi submission failures result in DRAFT status with automatic retry (existing pg-boss behavior).
- Optimistic UI updates for status refresh revert on failure.

### Scope

**In Scope:**
- "New Claim" button + Create Claim dialog on Claims page
- Claim detail slide-over panel with full claim data, status history, denial reasons
- Edit-before-resubmit form for REJECTED claims
- `POST /api/claims/:id/submit` backend endpoint
- `useSubmitClaim` frontend hook
- Sheet UI component (Radix-based, for slide-over panel)

**Out of Scope:**
- Claim creation from appointment detail page (future: auto-prompt after ATTENDED)
- ERA/835 payment data display
- Batch claim operations (submit all drafts)
- Claim PDF/CMS-1500 generation
- Secondary insurance claims

---

## 3. COMPLIANCE (HIPAA)

### Verdict: PASS_WITH_CONDITIONS

This feature extends the existing Stedi integration UI. The backend endpoints and data models already exist and have been compliance-reviewed (see `docs/sdlc/insurance-billing-stedi/03-compliance.md`). The new work is exclusively UI components and one new API endpoint that uses existing service patterns.

### Data Classification -- New PHI Exposure Points

| UI Element | PHI Displayed | Existing Backend | Risk Level |
|-----------|---------------|-----------------|------------|
| Create Claim Dialog -- appointment dropdown | Participant name, date of service | `GET /api/appointments` (existing, auth-gated) | Medium |
| Create Claim Dialog -- diagnosis code picker | ICD-10 codes per patient | `GET /api/diagnosis-codes` (existing, auth-gated) | High (stigma-sensitive) |
| Claim Detail Panel -- header | Participant name | Already in claims list | Low (no new exposure) |
| Claim Detail Panel -- claim data | Diagnosis codes, subscriber info (via payer name), CPT code | `GET /api/claims/:id` (existing, auth-gated, ownership-checked) | High |
| Claim Detail Panel -- rejection reason | Payer denial text (may reference PHI) | Already stored in `rejectionReason` column | Medium |
| Claim Detail Panel -- status history | Actor IDs, status transitions | `ClaimStatusHistory` model (existing) | Low |
| Edit & Resubmit form | Editable diagnosis codes, CPT code | `PUT /api/claims/:id/resubmit` (existing, auth-gated) | High |

### HIPAA Assessment

| Requirement | Status | Notes |
|------------|--------|-------|
| Access Control (164.312(a)) | PASS | All endpoints use `authenticate` + `requireRole("CLINICIAN", "ADMIN")` + `requirePracticeCtx`. Claims are scoped to clinician or practice via `ServiceCtx`. The new submit endpoint must follow the same pattern. |
| Audit Controls (164.312(b)) | PASS | Prisma audit middleware logs all CREATE/UPDATE/DELETE on `InsuranceClaim` and `ClaimStatusHistory`. The new submit endpoint triggers an UPDATE (status change) which is automatically logged. |
| Minimum Necessary (164.502(b)) | PASS | `getClaim` returns only the fields needed for display (participant name, payer name -- not full subscriber ID). The detail panel renders what the API returns. |
| Transmission Security (164.312(e)) | PASS | All API communication is over HTTPS. Stedi API calls are server-side only. No PHI sent to browser beyond what is already returned by existing endpoints. |
| PHI in Client State | CAUTION | The slide-over panel will hold claim data in component state (React). This data is already returned by the list endpoint and held in TanStack Query cache. No new PHI surface in browser memory. However, ensure `selectedClaimId` is cleared on panel close and claim detail is not persisted to localStorage. |
| Diagnosis Code Display | CAUTION | Mental health ICD-10 codes (F-category) are stigma-sensitive under 42 CFR Part 2 considerations. The detail panel must display diagnosis codes, but they should not appear in browser URL, page title, or any log-capable location. |

### Conditions for Approval

1. **[COND-UI-1]: Submit endpoint ownership check** -- `POST /api/claims/:id/submit` must verify the claim belongs to the authenticated clinician (via `clinicianId` match or `isAccountOwner` for practice admin). Must return 404, not 403, to avoid information leakage. *Must be verified in QA.*

2. **[COND-UI-2]: No PHI in URLs** -- The slide-over panel must not put claim IDs, diagnosis codes, or participant names in the URL query string or hash. The `selectedClaimId` state is in-memory only (React useState). *Must be verified in QA.*

3. **[COND-UI-3]: Panel close clears state** -- When the slide-over panel closes, `selectedClaimId` must be set to `null` so TanStack Query does not continue fetching claim detail in the background. *Must be verified in QA.*

4. **[COND-UI-4]: Audit log on submit** -- The `POST /api/claims/:id/submit` endpoint triggers a Prisma UPDATE on the `InsuranceClaim` record (status DRAFT -> SUBMITTED). Verify this is captured by the audit middleware. Additionally, the pg-boss job enqueue itself should be logged at INFO level (operation name + claim ID only, no PHI). *Must be verified in QA.*

5. **[COND-UI-5]: Rejection reason sanitization** -- Payer rejection reasons (`rejectionReason` field) may contain unexpected content. The detail panel must render rejection reasons as plain text (no `dangerouslySetInnerHTML`). *Must be in implementation.*

### Blocking Issues

None. All backend endpoints exist, are auth-gated, and have been previously compliance-reviewed. The new submit endpoint follows the exact same pattern.

---

## 4. ARCHITECTURE

### Decision: Slide-Over Panel (Sheet Component)

The claim detail will be a **right-side slide-over panel** implemented as a Radix UI Sheet component, consistent with shadcn/ui conventions. This is chosen over a dedicated route because:

1. The `selectedClaimId` state already exists in `claims/page.tsx` -- we just need to render when it is set.
2. The claims list remains visible behind the panel for context.
3. No URL change means no PHI in the URL (COND-UI-2).
4. The pattern scales to future enhancements (ERA data, payment posting) by adding tabs to the panel.

### New Components

```
apps/web/src/components/ui/sheet.tsx          -- Radix UI Sheet (shadcn/ui standard)
apps/web/src/components/claims/CreateClaimDialog.tsx  -- Dialog for new claim creation
apps/web/src/components/claims/ClaimDetailPanel.tsx   -- Slide-over panel for claim detail
apps/web/src/components/claims/ClaimEditForm.tsx      -- Inline edit form for resubmit
apps/web/src/components/claims/DiagnosisCodePicker.tsx -- Searchable ICD-10 code picker
apps/web/src/components/claims/StatusTimeline.tsx     -- Status history timeline
```

### New API Endpoint

```
POST /api/claims/:id/submit
```

**Route handler** (`packages/api/src/routes/claims.ts`):
- Auth: `authenticate` + `requireRole("CLINICIAN", "ADMIN")` + `requirePracticeCtx` (already applied to router)
- Calls new `submitDraftClaim(ctx, claimId)` service function
- Returns 200 with updated claim on success
- Returns 404 if claim not found or not owned
- Returns 409 if claim is not DRAFT
- Returns 400 if Stedi API key not configured

**Service function** (`packages/api/src/services/claims.ts`):
```typescript
export async function submitDraftClaim(ctx: ServiceCtx, claimId: string) {
  // 1. Find claim with ownership check (same pattern as getClaim)
  // 2. Verify status === "DRAFT"
  // 3. Check practice has Stedi API key configured
  // 4. Enqueue "stedi-claim-submit" job via pg-boss
  // 5. Return updated claim
}
```

Note: The claim status is NOT optimistically set to SUBMITTED in the database. The pg-boss worker handles the transition after successful Stedi API call. The frontend can optimistically show "Submitting..." but the actual status change happens asynchronously.

### New Hook

```typescript
// apps/web/src/hooks/use-claims.ts
export function useSubmitClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (claimId: string) => api.post(`/api/claims/${claimId}/submit`),
    onSuccess: (_d, claimId) => {
      qc.invalidateQueries({ queryKey: ["claims", claimId] });
      qc.invalidateQueries({ queryKey: ["claims"] });
    },
  });
}
```

### New Appointment Query

The Create Claim dialog needs a list of ATTENDED appointments without existing claims. This requires a new query parameter on the existing appointments endpoint or a dedicated endpoint.

**Option A (Recommended):** Add a `billable=true` query param to `GET /api/appointments` that filters to `status=ATTENDED` and `insuranceClaim IS NULL`. This reuses the existing endpoint and hook pattern.

**Option B:** A dedicated `GET /api/claims/billable-appointments` endpoint. More explicit but adds a new route for a simple filter.

**Recommendation:** Option A, with a new `useBillableAppointments` hook that wraps `useAppointments` with the right params.

### Data Flow

```
Create Claim:
  User clicks "+ New Claim"
    -> CreateClaimDialog opens
    -> Fetches billable appointments (GET /api/appointments?status=ATTENDED&billable=true)
    -> User selects appointment + diagnosis codes
    -> POST /api/claims (creates DRAFT)
    -> Optionally: POST /api/claims/:id/submit (enqueues to pg-boss)
    -> pg-boss worker: builds 837P, calls Stedi, updates status to SUBMITTED

View Claim Detail:
  User clicks claim row
    -> selectedClaimId set
    -> ClaimDetailPanel renders
    -> GET /api/claims/:id (fetches full claim + status history)
    -> Panel displays data

Resubmit Rejected Claim:
  User clicks "Edit & Resubmit" in detail panel
    -> ClaimEditForm renders with pre-populated fields
    -> User edits diagnosis codes / CPT code
    -> PUT /api/claims/:id/resubmit (resets to DRAFT with corrections)
    -> POST /api/claims/:id/submit (enqueues corrected claim)
```

### Modified Files

| File | Change |
|------|--------|
| `packages/api/src/routes/claims.ts` | Add `POST /:id/submit` route |
| `packages/api/src/services/claims.ts` | Add `submitDraftClaim` function |
| `apps/web/src/hooks/use-claims.ts` | Add `useSubmitClaim` hook |
| `apps/web/src/app/(dashboard)/claims/page.tsx` | Add "New Claim" button, render `ClaimDetailPanel` when `selectedClaimId` is set |
| `apps/web/src/hooks/use-appointments.ts` | Add `useBillableAppointments` hook (or add billable filter param) |
| `packages/api/src/routes/appointments.ts` | Add `billable` query param support (optional, may use existing filters) |

### New Files

| File | Purpose |
|------|---------|
| `apps/web/src/components/ui/sheet.tsx` | Radix Sheet component (shadcn/ui) |
| `apps/web/src/components/claims/CreateClaimDialog.tsx` | New claim creation dialog |
| `apps/web/src/components/claims/ClaimDetailPanel.tsx` | Claim detail slide-over |
| `apps/web/src/components/claims/ClaimEditForm.tsx` | Edit form for resubmission |
| `apps/web/src/components/claims/DiagnosisCodePicker.tsx` | ICD-10 code search + select |
| `apps/web/src/components/claims/StatusTimeline.tsx` | Status history timeline |

---

## 5. UX DESIGN

### Layout: Claims Page with Detail Panel

```
+------------------------------------------------------------------+
| Claims                                           [+ New Claim]   |
| Manage insurance claims submitted via Stedi                      |
+------------------------------------------------------------------+
| All | Draft | Submitted | Accepted | Rejected | Denied | Paid   |
+------------------------------------------------------------------+
| Participant | Date       | CPT   | Payer    | Amount | Status | |
|-------------|------------|-------|----------|--------|--------|--|
| Jane Doe    | 04/01/2026 | 90834 | Aetna    | $150   | Paid   |>|
| John Smith  | 03/28/2026 | 90837 | BCBS     | $200   | Reject |>|  <- arrow indicates clickable
| ...         | ...        | ...   | ...      | ...    | ...    | |
+------------------------------------------------------------------+
```

When a row is clicked, the slide-over panel opens:

```
+------------------------------+-----------------------------------+
| Claims list (dimmed)         | Claim Detail              [X]    |
|                              |                                   |
|                              | Jane Doe                          |
|                              | Paid - 04/01/2026                 |
|                              |                                   |
|                              | --- Claim Information ---         |
|                              | CPT Code:    90834                |
|                              | Diagnosis:   F90.0 - ADHD, inat. |
|                              |              F41.1 - GAD          |
|                              | Payer:       Aetna                |
|                              | Amount:      $150.00              |
|                              | Place of Svc: 02 (Telehealth)    |
|                              |                                   |
|                              | --- Status History ---            |
|                              | o DRAFT      04/01 10:30am  You  |
|                              | |                                 |
|                              | o SUBMITTED  04/01 10:31am  Sys  |
|                              | |                                 |
|                              | o ACCEPTED   04/02  2:15pm  Sys  |
|                              | |                                 |
|                              | o PAID       04/10 11:00am  Sys  |
|                              |                                   |
+------------------------------+-----------------------------------+
```

### Rejected Claim Detail Panel

```
+-----------------------------------+
| Claim Detail              [X]    |
|                                   |
| John Smith                        |
| Rejected - 03/28/2026            |
|                                   |
| !!! REJECTION REASON !!!         |
| +-------------------------------+ |
| | Missing or invalid diagnosis  | |
| | code. Primary diagnosis code  | |
| | F90 is not specific enough.   | |
| | Use F90.0, F90.1, or F90.2.  | |
| +-------------------------------+ |
|                                   |
| --- Claim Information ---         |
| CPT Code:    90837                |
| Diagnosis:   F90 (not specific)   |
| Payer:       BCBS                 |
| Amount:      $200.00              |
|                                   |
| --- Status History ---            |
| o DRAFT      03/28 9:00am  You   |
| |                                 |
| o SUBMITTED  03/28 9:01am  Sys   |
| |                                 |
| o REJECTED   03/29 3:00pm  Sys   |
|   "Missing or invalid diagnosis"  |
|                                   |
| [Edit & Resubmit]                 |
+-----------------------------------+
```

### Edit & Resubmit Form

When "Edit & Resubmit" is clicked, the panel switches to an edit view:

```
+-----------------------------------+
| Edit & Resubmit           [X]    |
|                                   |
| John Smith - 03/28/2026          |
|                                   |
| Rejection Reason (read-only):     |
| "Missing or invalid diagnosis..." |
|                                   |
| Diagnosis Codes *                 |
| [F90.0 - ADHD, inattentive  x]   |
| [Search ICD-10 codes...       ]   |
|                                   |
| CPT Code                          |
| [90837 - Psychotherapy, 60min v]  |
|                                   |
|          [Cancel] [Resubmit]      |
+-----------------------------------+
```

### Create Claim Dialog

```
+---------------------------------------------+
| Create New Claim                        [X] |
|                                             |
| Select Appointment *                        |
| [v] Jane Doe - 04/05/2026 - 90834 - Aetna  |
|     John Smith - 04/03/2026 - 90837 - BCBS  |
|                                             |
| --- Auto-populated (read-only) ---          |
| Participant:  Jane Doe                      |
| Date of Service: 04/05/2026                 |
| CPT Code: 90834                             |
| Payer: Aetna                                |
| Charge: $150.00                             |
| Place of Service: 02 (Telehealth)           |
|                                             |
| Diagnosis Codes *                           |
| [Search ICD-10 codes...               ]    |
|   Recent: F90.0, F41.1                      |
|                                             |
|      [Cancel] [Create Draft] [Create & Submit] |
+---------------------------------------------+
```

### Interaction Patterns

1. **Appointment selection auto-populates**: Selecting an appointment fills in all read-only fields. The clinician only needs to add diagnosis codes.

2. **Diagnosis code picker**: Searchable dropdown with debounced search (200ms). Shows code + description. "Recent" section shows codes previously used for this participant. Min 1, max 4 codes.

3. **Two-button create**: "Create Draft" saves locally for later review. "Create & Submit" saves and immediately enqueues for Stedi submission. Default action is "Create & Submit" (primary button).

4. **Status-dependent actions in detail panel**:
   - DRAFT: "Submit to Payer" button
   - SUBMITTED/ACCEPTED: "Check Status" button
   - REJECTED: "Edit & Resubmit" button + rejection reason callout
   - DENIED/PAID: No action buttons (terminal)

5. **Panel transitions**: The detail panel animates in from the right (300ms ease-out). Edit mode is an in-place swap within the panel, not a new panel.

6. **Loading states**: Skeleton loaders in the detail panel while `GET /api/claims/:id` is in flight. Button loading spinners on all mutation actions.

7. **Toast notifications**: Success/error toasts for all mutations (create, submit, resubmit, refresh status).

---

## 6. ENGINEERING PLAN

### Phase 1: Backend -- Submit Endpoint (Est. 1 hour)

**1a. Add `submitDraftClaim` service function**

File: `packages/api/src/services/claims.ts`

```typescript
export async function submitDraftClaim(ctx: ServiceCtx, claimId: string) {
  const where: any = { id: claimId };
  if (!ctx.isAccountOwner) {
    where.clinicianId = ctx.clinicianProfileId;
  } else {
    where.practiceId = ctx.practiceId;
  }

  const claim = await prisma.insuranceClaim.findFirst({ where });
  if (!claim) return { error: "not_found" as const };

  if (claim.status !== "DRAFT") {
    return { error: "invalid_status" as const, message: "Only DRAFT claims can be submitted" };
  }

  // Check Stedi configuration
  const { getEncryptedKey } = await import("./stedi-config");
  const encryptedKey = await getEncryptedKey(ctx.practiceId);
  if (!encryptedKey) {
    return { error: "not_configured" as const, message: "Insurance billing not configured" };
  }

  // Enqueue for async submission via pg-boss
  const { getQueue } = await import("./queue");
  const boss = await getQueue();
  await boss.send("stedi-claim-submit", { claimId });

  return { data: claim };
}
```

**1b. Add route handler**

File: `packages/api/src/routes/claims.ts`

Add between the `refresh-status` and `resubmit` routes:

```typescript
// POST /api/claims/:id/submit -- submit draft claim to Stedi
router.post("/:id/submit", async (req: Request, res: Response) => {
  try {
    const ctx = res.locals.practiceCtx!;
    const result = await submitDraftClaim(ctx, req.params.id);

    if ("error" in result) {
      if (result.error === "not_found") {
        res.status(404).json({ success: false, error: "Claim not found" });
        return;
      }
      if (result.error === "invalid_status") {
        res.status(409).json({ success: false, error: result.message });
        return;
      }
      if (result.error === "not_configured") {
        res.status(400).json({ success: false, error: result.message });
        return;
      }
      res.status(400).json({ success: false, error: "Request failed" });
      return;
    }

    res.json({ success: true, data: result.data });
  } catch (err) {
    logger.error("Submit claim error", err);
    res.status(500).json({ success: false, error: "Failed to submit claim" });
  }
});
```

**1c. Ensure `stedi-claim-submit` queue is created**

File: `packages/api/src/services/queue.ts`

The worker is registered via `boss.work("stedi-claim-submit", ...)` but per pg-boss v10, `boss.createQueue("stedi-claim-submit")` must be called first. Check that this is present (it appears to be missing based on code review). Add it alongside other `createQueue` calls if missing.

### Phase 2: Frontend -- Sheet Component (Est. 30 min)

**2a. Create Sheet UI component**

File: `apps/web/src/components/ui/sheet.tsx`

Standard shadcn/ui Sheet component wrapping `@radix-ui/react-dialog` (or use the Radix Sheet primitive directly). Provides `Sheet`, `SheetTrigger`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetClose`.

### Phase 3: Frontend -- Hooks (Est. 30 min)

**3a. Add `useSubmitClaim` hook**

File: `apps/web/src/hooks/use-claims.ts`

**3b. Add `useBillableAppointments` hook**

File: `apps/web/src/hooks/use-claims.ts` (or `use-appointments.ts`)

Fetches ATTENDED appointments that do not have an existing claim. May need a new API endpoint or query param on existing appointments list.

**3c. Add `useDiagnosisCodeSearch` hook**

File: `apps/web/src/hooks/use-claims.ts`

Wraps `GET /api/diagnosis-codes?q=:query&participantId=:id`.

### Phase 4: Frontend -- Components (Est. 3 hours)

**4a. DiagnosisCodePicker** -- Searchable multi-select for ICD-10 codes. Debounced search input, displays code + description, "Recent" section, max 4 selections.

**4b. StatusTimeline** -- Renders `ClaimStatusHistory[]` as a vertical timeline with status badges, timestamps, and actor labels.

**4c. CreateClaimDialog** -- Dialog with appointment selector, auto-populated fields, diagnosis code picker, and two action buttons.

**4d. ClaimDetailPanel** -- Sheet component that fetches and displays full claim detail. Conditionally renders action buttons based on status. Contains inline `ClaimEditForm` for rejected claims.

**4e. ClaimEditForm** -- Editable form for diagnosis codes and CPT code, pre-populated from current claim data.

### Phase 5: Claims Page Integration (Est. 1 hour)

**5a. Update `claims/page.tsx`**:
- Add "+ New Claim" button in the header
- Render `<CreateClaimDialog>` controlled by open state
- Render `<ClaimDetailPanel claimId={selectedClaimId}>` when `selectedClaimId` is set
- Pass `onClose={() => setSelectedClaimId(null)}` to panel

### Phase 6: Tests (Est. 2 hours)

**6a. API tests** (`packages/api/src/__tests__/claims.test.ts`):
- `POST /api/claims/:id/submit` -- happy path, not found, wrong status, not configured
- Verify ownership check (clinician A cannot submit clinician B's claim)

**6b. Hook tests** (if not already covered):
- `useSubmitClaim` -- mutation fires and invalidates queries

**6c. Component tests** (optional, secondary priority per CLAUDE.md):
- `ClaimDetailPanel` renders correct actions per status
- `CreateClaimDialog` enables submit only when diagnosis codes are selected

### Estimated Total: ~8 hours

---

## 7. QA / TEST PLAN

### Test Matrix

#### 7.1 Backend Tests -- `POST /api/claims/:id/submit`

| ID | Test Case | Input | Expected | Priority |
|----|-----------|-------|----------|----------|
| BE-1 | Submit DRAFT claim -- happy path | Valid DRAFT claim ID, authenticated clinician owner | 200, claim data returned, pg-boss job enqueued | P0 |
| BE-2 | Submit non-existent claim | Random claim ID | 404 | P0 |
| BE-3 | Submit claim owned by different clinician | Claim ID owned by clinician B, auth as clinician A | 404 (not 403) | P0 |
| BE-4 | Submit SUBMITTED claim | Claim in SUBMITTED status | 409 "Only DRAFT claims can be submitted" | P0 |
| BE-5 | Submit ACCEPTED claim | Claim in ACCEPTED status | 409 | P1 |
| BE-6 | Submit REJECTED claim | Claim in REJECTED status | 409 | P1 |
| BE-7 | Submit DENIED claim | Claim in DENIED status | 409 | P1 |
| BE-8 | Submit PAID claim | Claim in PAID status | 409 | P1 |
| BE-9 | Submit without Stedi config | DRAFT claim, practice has no Stedi API key | 400 "Insurance billing not configured" | P0 |
| BE-10 | Submit as practice admin (isAccountOwner) | DRAFT claim, auth as admin of same practice | 200 | P1 |
| BE-11 | Submit without authentication | No auth token | 401 | P0 |
| BE-12 | Submit as PARTICIPANT role | Auth as participant | 403 | P1 |

#### 7.2 Frontend -- Create Claim Dialog

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|-------|----------|----------|
| FE-1 | Open Create Claim dialog | Click "+ New Claim" button | Dialog opens with appointment dropdown | P0 |
| FE-2 | Appointment dropdown shows only billable | Have 3 appointments: ATTENDED (no claim), ATTENDED (has claim), SCHEDULED | Only first appointment appears in dropdown | P0 |
| FE-3 | Select appointment auto-populates | Select an appointment from dropdown | Participant, date, CPT, payer, amount, POS fields populate | P0 |
| FE-4 | Diagnosis code search | Type "ADHD" in diagnosis picker | Matching ICD-10 codes appear (F90.0, F90.1, etc.) | P0 |
| FE-5 | Create Draft button disabled without diagnosis | Select appointment but add no diagnosis codes | "Create Draft" and "Create & Submit" are disabled | P0 |
| FE-6 | Create Draft success | Select appointment, add F90.0, click "Create Draft" | Dialog closes, toast "Claim created as draft", list refreshes | P0 |
| FE-7 | Create & Submit success | Select appointment, add F90.0, click "Create & Submit" | Dialog closes, toast "Claim submitted to payer", list refreshes with SUBMITTED status | P0 |
| FE-8 | Empty state -- no billable appointments | No ATTENDED appointments without claims | Dropdown shows "No billable appointments" message | P1 |
| FE-9 | Max 4 diagnosis codes | Add 4 codes, try to add 5th | Picker disables or shows "Maximum 4 diagnosis codes" | P1 |
| FE-10 | Recent diagnosis codes | Participant has prior claims with F90.0 | F90.0 appears in "Recent" section of picker | P2 |

#### 7.3 Frontend -- Claim Detail Panel

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|-------|----------|----------|
| FE-11 | Open detail panel on row click | Click a claim row | Slide-over panel opens from right with claim detail | P0 |
| FE-12 | Panel shows correct data | Open panel for a claim | Participant name, status badge, date, CPT, diagnosis codes, payer, amount, POS all correct | P0 |
| FE-13 | Status history timeline | Open panel for claim with history | Timeline shows all transitions with timestamps and actors | P0 |
| FE-14 | DRAFT claim shows Submit button | Open panel for DRAFT claim | "Submit to Payer" button visible | P0 |
| FE-15 | Submit from detail panel | Click "Submit to Payer" on DRAFT claim | Button shows loading, then toast "Claim submitted", status updates | P0 |
| FE-16 | SUBMITTED claim shows Check Status | Open panel for SUBMITTED claim | "Check Status" button visible | P0 |
| FE-17 | REJECTED claim shows rejection reason | Open panel for REJECTED claim | Rejection reason in warning callout, "Edit & Resubmit" button visible | P0 |
| FE-18 | DENIED claim shows denial reason | Open panel for DENIED claim | Denial reason in error callout, no action buttons | P0 |
| FE-19 | PAID claim -- no actions | Open panel for PAID claim | No action buttons shown | P1 |
| FE-20 | Close panel -- Escape key | Press Escape while panel is open | Panel closes, selectedClaimId cleared | P1 |
| FE-21 | Close panel -- click outside | Click outside the panel overlay | Panel closes | P1 |
| FE-22 | Close panel -- X button | Click the X button | Panel closes | P1 |
| FE-23 | Panel loading state | Click row for claim with slow API | Skeleton loader shown while fetching | P2 |

#### 7.4 Frontend -- Edit & Resubmit Flow

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|-------|----------|----------|
| FE-24 | Enter edit mode | Click "Edit & Resubmit" on rejected claim | Panel switches to edit form with pre-populated fields | P0 |
| FE-25 | Edit diagnosis codes | Remove F90, add F90.0 | Updated code appears in the form | P0 |
| FE-26 | Resubmit with corrections | Edit diagnosis code, click "Resubmit" | Toast "Claim resubmitted", panel returns to detail view, status shows update | P0 |
| FE-27 | Cancel edit | Click "Cancel" in edit form | Returns to read-only detail view, no changes saved | P0 |
| FE-28 | Rejection reason visible during edit | Enter edit mode on rejected claim | Rejection reason displayed as read-only context above the form | P1 |

#### 7.5 HIPAA / Compliance Verification

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|-------|----------|----------|
| H-1 | COND-UI-1: Ownership check on submit | Call `POST /api/claims/:id/submit` with claim owned by different clinician | 404 returned (not 403) | P0 |
| H-2 | COND-UI-2: No PHI in URL | Open claim detail panel, inspect browser URL | URL does not contain claim ID, diagnosis codes, or participant name | P0 |
| H-3 | COND-UI-3: Panel close clears state | Close panel, inspect React state / network tab | selectedClaimId is null, no background fetches for claim detail | P0 |
| H-4 | COND-UI-4: Audit log on submit | Submit a DRAFT claim, check audit_logs table | Entry exists for InsuranceClaim UPDATE (DRAFT -> SUBMITTED) | P0 |
| H-5 | COND-UI-5: Rejection reason XSS safety | Inject HTML in rejectionReason field, view in panel | HTML rendered as plain text, not executed | P0 |
| H-6 | Diagnosis codes not logged | Submit claim, check API server logs | No ICD-10 codes appear in logs (only claim ID) | P1 |

#### 7.6 Edge Cases

| ID | Test Case | Steps | Expected | Priority |
|----|-----------|-------|----------|----------|
| E-1 | Rapid double-click submit | Double-click "Submit to Payer" quickly | Only one submission occurs (button disabled during mutation) | P1 |
| E-2 | Submit while Stedi is down | Submit claim when Stedi API is unreachable | Claim stays DRAFT, pg-boss retries up to 3 times | P1 |
| E-3 | Create claim for appointment that already has one | Race condition: two tabs, same appointment | Second create returns 409 "A claim already exists" | P1 |
| E-4 | Network error during panel load | Open panel with network disconnected | Error state shown in panel with retry button | P2 |
| E-5 | Panel open while claim status changes | Panel open, another user refreshes status | Panel data stale until manual refresh or re-open | P2 |

### Test Infrastructure

- **Backend tests**: Vitest with supertest against Express app. Use test helpers from `packages/api/src/__tests__/helpers.ts` (`createTestToken`, `authHeader`). Mock pg-boss send to verify job enqueue without running Stedi.
- **Frontend component tests**: React Testing Library with jsdom. Mock `api` client to return test data. Verify render behavior per claim status.
- **HIPAA tests**: Backend integration tests that verify 404 (not 403) on ownership violations. Manual inspection of server logs for PHI leakage.

### Definition of Done

- [ ] All P0 test cases pass
- [ ] All P1 test cases pass
- [ ] `npm run test` passes across all packages
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] No PHI in server logs during claim submission flow
- [ ] Audit log entries created for all claim mutations
- [ ] Rejection reasons render as plain text (no XSS)
- [ ] Panel closes cleanly with no orphaned state or background fetches
