# Insurance Billing & Claims via Stedi — UX Design

## User Flows

### Flow 1: Add Patient Insurance

**Entry point:** Participant detail page → Insurance tab
**Success state:** Insurance card displayed with payer name, masked subscriber ID, relationship

**Steps:**
1. Clinician navigates to participant detail → clicks "Insurance" tab
2. Empty state shows: shield icon, "No insurance on file" heading, "Add Insurance" button
3. Clinician clicks "Add Insurance" → inline form expands below the empty state card
4. Clinician types in payer search field (min 2 chars) → dropdown shows matching payers from Stedi with payer name and ID
5. Clinician selects payer, fills subscriber ID, optional group number
6. Clinician selects relationship: Self (default) / Spouse / Child / Other
7. If relationship ≠ Self → policy holder demographics fields animate in (first name, last name, DOB, gender)
8. Clinician clicks "Save" → form collapses, insurance card appears with summary
9. "Check Eligibility" button now visible on the insurance card

**Error paths:**
- Payer search unavailable → inline message: "Payer search unavailable — enter payer ID manually" + manual payer ID text field appears
- Validation error → red border on invalid fields with inline messages below each field
- Network error on save → toast: "Failed to save insurance — please try again"

### Flow 2: Check Eligibility

**Entry point:** Insurance tab "Check Eligibility" button OR appointment detail "Verify Insurance" link
**Success state:** Eligibility result card showing coverage status, copay, deductible, coinsurance

**Steps:**
1. Clinician clicks "Check Eligibility"
2. Button text changes to "Checking..." with spinner, button disabled
3. System calls Stedi eligibility API (≤10s timeout)
4. Success → Eligibility card appears below insurance info:
   - Status indicator: green checkmark "Active" or red X "Inactive"
   - Grid: Copay | Deductible Remaining | Coinsurance | Plan
   - Footer: "Checked Apr 6, 2026 2:15 PM" + "Re-check" link
5. Result cached for 24 hours — subsequent views show cached result with timestamp

**Error paths:**
- No insurance on file → inline prompt: "Add insurance information to check eligibility" with "Add Insurance" link
- Stedi timeout/error → inline alert (amber): "Unable to verify eligibility — try again later" with "Retry" button
- Stedi not configured for practice → disabled button with tooltip: "Insurance billing not configured — ask your practice admin to add a Stedi API key in Practice Settings"

**Edge cases:**
- Cached result < 24h → show cached card immediately, "Re-check" link available
- Cached result > 24h → card hidden, "Check Eligibility" button shown fresh
- Check from appointment detail → same eligibility card rendered inline on appointment page, with service-specific CPT context

### Flow 3: Submit Claim After Session (Auto-Prompt)

**Entry point:** Clinician marks appointment status → ATTENDED
**Success state:** Claim created, toast confirmation, claim badge on appointment

**Steps:**
1. Clinician changes appointment status to ATTENDED and saves
2. System checks: does participant have active insurance?
3. Yes → "Submit Insurance Claim?" dialog appears (modal, not blocking — can dismiss)
4. Dialog shows pre-populated read-only fields:
   - CPT code (from appointment's service code)
   - Date of service (appointment date)
   - Charge amount (from service code default price)
   - Provider (clinician name + NPI)
   - Payer (from patient insurance)
5. Clinician uses diagnosis code picker to add ICD-10 codes (required, at least 1)
6. Clinician clicks "Submit Claim"
7. Button shows spinner "Submitting..."
8. Claim created as DRAFT, submission queued via pg-boss
9. Dialog closes, toast: "Claim submitted — tracking in Claims"
10. Appointment detail now shows claim status badge (gray "Draft" initially, updates as claim progresses)

**Error paths:**
- No insurance on file → no dialog shown, normal ATTENDED confirmation only
- Stedi unavailable during submission → claim saved as DRAFT, toast: "Claim saved as draft — submission will retry automatically"
- Clinician dismisses dialog → "Skip for Now" closes dialog, no claim created. "Submit Claim" button remains on appointment detail for later.
- Claim already exists for appointment → no dialog. Appointment detail shows existing claim status instead.

### Flow 4: Claims Dashboard

**Entry point:** Sidebar nav → "Claims"
**Success state:** Filterable list of all claims with status badges

**Steps:**
1. Clinician clicks "Claims" in sidebar
2. Page loads with status filter tabs: All | Draft | Submitted | Accepted | Rejected | Denied | Paid
3. Default tab: "All", sorted by most recent first
4. Each row shows: participant name, date of service, CPT code, payer name, charge amount, status badge
5. Clinician clicks a row → navigates to claim detail page
6. Claim detail shows:
   - Header: participant name, claim status badge, date of service
   - Claim data: CPT code, diagnosis codes, payer, charge amount, provider info
   - Status timeline: chronological list of status changes with timestamps and actors
   - Actions section (varies by status)

**Status-specific actions:**
- DRAFT (failed submission): "Retry Submission" button
- SUBMITTED: "Check Status" button (calls Stedi status API, updates inline)
- REJECTED: rejection reason in red alert box + "Edit & Resubmit" button
- DENIED: denial reason in dark red alert box, no resubmit action
- ACCEPTED: "Check Status" button (to see if it moved to PAID)
- PAID: payment info displayed, no actions

**Edge cases:**
- Empty state (no claims): centered illustration, "No claims yet", "Claims will appear here after you submit them from appointments."
- 50+ claims: cursor-based pagination, "Load more" button at bottom
- Non-owner clinician: sees only their own patients' claims
- Account owner: sees all practice claims with clinician column added

### Flow 5: Resubmit Rejected Claim

**Entry point:** Claim detail page for a REJECTED claim
**Success state:** Claim reset to DRAFT, resubmission queued, status timeline updated

**Steps:**
1. Clinician views rejected claim detail
2. Red alert box shows: "Rejected by [payer name]" with rejection reason text
3. Clinician clicks "Edit & Resubmit"
4. Claim fields become editable: diagnosis codes (picker), service code (dropdown)
5. Clinician makes corrections
6. Clinician clicks "Resubmit"
7. Button shows spinner
8. Claim fields reset to read-only, status changes to DRAFT
9. Status timeline shows new entry: "Resubmitted by [clinician name]"
10. Toast: "Claim resubmitted"
11. pg-boss worker picks up and submits to Stedi

**Error paths:**
- Network error during resubmit → toast: "Failed to resubmit — please try again"
- Stedi unavailable → same as initial submission: claim stays DRAFT, retries queued

### Flow 6: Configure Stedi API Key (Practice Settings)

**Entry point:** Practice Settings page → Insurance Billing section
**Success state:** API key saved, "Connected" confirmation shown

**Steps:**
1. Practice admin navigates to Practice Settings
2. "Insurance Billing" section shows:
   - If no key: empty field + "Add your Stedi API key to enable insurance billing"
   - If key exists: masked field showing "••••••••abcd" (last 4 chars) + "Update" button
3. Admin enters/pastes API key
4. Clicks "Test Connection" → spinner on button
5. Success → green checkmark + "Connected to Stedi"
6. Admin clicks "Save" → key encrypted and stored
7. All clinicians in practice can now use insurance features

**Error paths:**
- Invalid key → red text: "Invalid API key — check your Stedi dashboard"
- Network error during test → "Unable to reach Stedi — check your connection"

## Component Specifications

### InsuranceTab

**Purpose:** Display and manage a participant's insurance information and eligibility status.

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Empty | Card with shield icon, "No insurance on file" heading, subtext, "Add Insurance" primary button | Click button → form expands |
| Has Insurance | Card: payer name (bold), subscriber ID masked (••••1234), group number, relationship badge | Edit (pencil icon) / Remove (trash icon) buttons in card header |
| Has Insurance + Fresh Eligibility | Insurance card + eligibility result card below with green/red status, grid of benefits | "Re-check" link on eligibility card |
| Has Insurance + Stale Eligibility | Insurance card only, "Check Eligibility" button visible | Previous result hidden (>24h) |
| Stedi Not Configured | Insurance card (if exists) + amber banner: "Insurance billing not configured..." | "Check Eligibility" button disabled with tooltip |
| Loading | Skeleton card | |
| Error | "Failed to load insurance information" + retry link | |

### InsuranceForm

**Purpose:** Add or edit patient insurance information.

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Create mode | Empty form fields, "Save" button disabled until required fields filled | Expands inline below empty state |
| Edit mode | Pre-populated fields from existing record | Same form, "Save" replaces existing |
| Payer searching | Spinner in payer dropdown, results appearing | Dropdown open, 2+ char minimum |
| Payer search failed | Amber text below dropdown: "Payer search unavailable — enter payer ID manually" + text input | Manual entry fallback |
| Relationship = Self | Policy holder fields hidden | Default state |
| Relationship ≠ Self | Policy holder fields (first name, last name, DOB, gender) animate in | All required |
| Saving | "Save" button shows spinner, all fields disabled | |
| Validation error | Red borders on invalid fields, inline error text below each | Focus moves to first error field |

### EligibilityCard

**Purpose:** Display insurance eligibility verification results.

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Checking | "Checking eligibility..." with spinner, full-width loading bar | Non-interruptible |
| Active coverage | Green checkmark + "Active", 2x2 grid: Copay ($25), Deductible Remaining ($500), Coinsurance (20%), Plan name | Timestamp footer + "Re-check" link |
| Inactive coverage | Red X + "Inactive", plan details if available | Timestamp footer + "Re-check" link |
| Error | Amber alert: "Unable to verify eligibility — try again later" + "Retry" button | Retry re-triggers check |
| Cached (fresh) | Same as Active/Inactive with "Checked [timestamp]" | "Re-check" available |

### ClaimDialog

**Purpose:** Modal dialog for submitting an insurance claim after marking appointment ATTENDED.

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Open (pre-populated) | Modal with read-only claim fields at top, diagnosis code picker below, "Submit Claim" + "Skip for Now" buttons | Must add ≥1 diagnosis code to enable submit |
| Submit disabled | "Submit Claim" button grayed out | No diagnosis codes selected yet |
| Submitting | Spinner on "Submit Claim", all fields disabled, "Skip for Now" hidden | Cannot close dialog |
| Success | Dialog auto-closes | Toast notification appears |
| Error | Inline amber alert in dialog: "Claim saved as draft — submission will retry automatically" | "Close" button available |

### DiagnosisCodePicker

**Purpose:** Searchable ICD-10 code selector with recent codes for the participant.

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Default (closed) | Input with placeholder "Search diagnosis codes..." | Focus opens dropdown |
| Default (open, with recent) | Dropdown: "Recent" section (up to 5 codes), divider, then empty search area | Click recent code to select |
| Searching | Spinner in input right side, results streaming into dropdown | 200ms debounce on keystrokes |
| Results shown | Dropdown: "Recent" section (if applicable) + "Results" section with matching codes | Each row: code in mono font + description. F-category codes sorted first. |
| No results | Dropdown: "No matching codes — try a different search term" | |
| Code selected | Chip appears below input: "[F90.0] ADHD, predominantly inattentive" with X button | Max 4 codes. Input clears for next search. |
| Max codes reached | Input disabled, text: "Maximum 4 diagnosis codes" | Remove a chip to add more |

### ClaimStatusBadge

**Purpose:** Color-coded status indicator for claims.

| Status | Color | Icon |
|--------|-------|------|
| DRAFT | Gray bg, gray text | Circle outline |
| SUBMITTED | Blue bg, blue text | Arrow up |
| ACCEPTED | Teal bg, teal text | Check |
| REJECTED | Red bg, red text | X circle |
| DENIED | Dark red bg, white text | X circle filled |
| PAID | Green bg, green text | Dollar sign |

### ClaimDetail

**Purpose:** Full claim information with status history and actions.

**Layout:**
- Header: participant name, status badge, date of service
- Two-column on desktop (single on mobile):
  - Left (2/3): Claim data card (CPT, diagnosis codes, payer, charge, provider)
  - Right (1/3): Status timeline card (chronological entries with timestamps)
- Actions bar at bottom (varies by status)

**Status timeline entries:**
- Each entry: status badge + timestamp + actor name + optional note
- Example: "Draft → Submitted · Apr 6, 2026 2:30 PM · System (auto-submitted)"
- Example: "Submitted → Rejected · Apr 8, 2026 · Aetna · Reason: Invalid diagnosis code for service"
- Example: "Rejected → Draft · Apr 8, 2026 3:15 PM · Dr. Kevin Barr · Resubmitted with corrected codes"

### StediConfigSection

**Purpose:** Practice-level Stedi API key management in Practice Settings.

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| No key | Empty input, helper text: "Add your Stedi API key to enable insurance billing" | "Test Connection" and "Save" buttons |
| Key configured | Masked display: "••••••••abcd", "Update" button | Click Update → input becomes editable |
| Testing | Spinner on "Test Connection" button | Other buttons disabled |
| Test success | Green checkmark + "Connected to Stedi" below input | "Save" button enabled/highlighted |
| Test failure | Red text: "Invalid API key — check your Stedi dashboard" | "Save" still available (user might fix and re-test) |
| Saving | Spinner on "Save" button | |
| Non-owner | Section visible but read-only: "Configured by [owner name]" | No edit capability |

## Information Hierarchy

### Insurance Tab (Participant Detail)
1. **Primary:** Insurance status (has insurance or not) — immediate visual signal
2. **Secondary:** Payer name + subscriber ID — identification
3. **Tertiary:** Eligibility status — actionable information
4. **Tucked away:** Group number, relationship, policy holder details — in edit form or expandable section

### Claims Dashboard
1. **Primary:** Status filter tabs — the first thing a clinician wants is to find claims by status
2. **Secondary:** Claim rows with participant name + status badge — scanning for specific claims
3. **Tertiary:** Charge amount, CPT code, payer — details for each claim
4. **Tucked away:** Full claim detail, status history — accessed by clicking into a claim

### Claim Dialog (Post-Session)
1. **Primary:** Diagnosis code picker — the only thing the clinician needs to interact with
2. **Secondary:** Pre-populated claim summary — review at a glance
3. **Tertiary:** "Submit Claim" / "Skip for Now" — clear action buttons
4. **Not shown:** Technical details (Stedi transaction ID, idempotency key) — backend only

## Content & Copy

| Element | Copy | Notes |
|---------|------|-------|
| Insurance tab empty heading | "No insurance on file" | Neutral, not alarming |
| Insurance tab empty body | "Add insurance information to check eligibility and submit claims." | Explains value |
| Add insurance button | "Add Insurance" | Primary button |
| Save insurance button | "Save" | In form |
| Remove insurance confirmation | "Remove insurance for [participant name]? This won't delete existing claims." | Destructive action warning |
| Check eligibility button | "Check Eligibility" | On insurance card |
| Eligibility checking state | "Checking eligibility..." | With spinner |
| Eligibility active | "Active" | Green with checkmark |
| Eligibility inactive | "Inactive" | Red with X |
| Eligibility error | "Unable to verify eligibility — try again later" | Amber alert, not red |
| Eligibility cached timestamp | "Checked [relative time]" | e.g., "Checked 3 hours ago" |
| Re-check link | "Re-check" | Subtle link, not button |
| Claim dialog title | "Submit Insurance Claim" | Modal title |
| Claim submit button | "Submit Claim" | Primary button |
| Claim skip button | "Skip for Now" | Ghost/link button |
| Claim success toast | "Claim submitted — tracking in Claims" | Auto-dismiss 5s |
| Claim draft fallback toast | "Claim saved as draft — submission will retry automatically" | Auto-dismiss 8s |
| Claims page title | "Claims" | Page heading |
| Claims empty state | "No claims yet" | Heading |
| Claims empty body | "Claims will appear here after you submit them from appointments." | Explains where claims come from |
| Rejection reason heading | "Rejection Reason" | In red alert box |
| Resubmit button | "Edit & Resubmit" | Primary button on rejected claims |
| Resubmit success toast | "Claim resubmitted" | Auto-dismiss 5s |
| Check status button | "Check Status" | On submitted/accepted claims |
| Status updated toast | "Claim status updated" | After manual status check |
| Stedi not configured banner | "Insurance billing not configured — ask your practice admin to add a Stedi API key in Practice Settings" | Amber banner, links to settings if user is owner |
| API key helper text | "Add your Stedi API key to enable insurance billing" | In Practice Settings |
| API key test success | "Connected to Stedi" | Green with checkmark |
| API key test failure | "Invalid API key — check your Stedi dashboard" | Red text |
| API key saved toast | "Stedi API key saved" | Auto-dismiss 5s |
| Payer search unavailable | "Payer search unavailable — enter payer ID manually" | Amber inline text |
| Diagnosis code placeholder | "Search diagnosis codes..." | Input placeholder |
| Diagnosis code no results | "No matching codes — try a different search term" | In dropdown |
| Diagnosis code max reached | "Maximum 4 diagnosis codes" | Replaces input when at limit |

## Accessibility Notes

- **Keyboard navigation:** All forms fully keyboard navigable. Tab order follows visual flow. Payer search dropdown and diagnosis code picker support arrow keys + Enter to select.
- **Screen reader:** Status badges have aria-labels (e.g., `aria-label="Claim status: Rejected"`). Eligibility card announces coverage status. Toasts use `role="status"` with `aria-live="polite"`.
- **Focus management:** When claim dialog opens, focus moves to first interactive element (diagnosis code picker). When dialog closes, focus returns to the trigger button. When insurance form expands, focus moves to payer search field.
- **Color contrast:** Status badge colors meet WCAG AA contrast ratios. Rejection reasons use text + icon (not color alone) to convey status. Eligibility active/inactive uses checkmark/X icons alongside green/red colors.
- **Error announcements:** Validation errors announced via `aria-describedby` linking input to error message. Form-level errors use `role="alert"`.
- **Loading states:** Spinner buttons retain their label in aria-label (e.g., `aria-label="Checking eligibility"` while spinning). Skeleton loaders have `aria-busy="true"`.

## Sidebar Navigation Update

Add "Claims" to the main nav section, positioned after "Billing":

```
Dashboard
Programs
Clients
Calendar
Billing
Claims ← NEW (icon: FileText from lucide-react)
Practice
```

## Open Questions

None — all resolved during design review.
