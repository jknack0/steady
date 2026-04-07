# Billing Profile Settings Page — Full SDLC Deliverable

---

## Phase 1: IDEATION

### Problem Statement

The superbill page (`apps/web/src/app/(dashboard)/rtm/[enrollmentId]/superbill/[periodId]/page.tsx`) renders provider billing fields — NPI, Tax ID, license number, address, phone, practice name, credentials — from the `ClinicianBillingProfile` database model. However, there is **no UI anywhere in the application** for clinicians to enter or edit this data. When the billing profile is missing, the superbill endpoint returns an error: _"Billing profile not set up. Please configure your billing profile before generating a superbill."_ The superbill page shows the generic message _"Please ensure your billing profile is configured"_ with no link or guidance.

The Settings page (`apps/web/src/app/(dashboard)/settings/page.tsx`) currently has cards for Provider Profile (provider type, modality, practice name), Default Client Settings, Homework Labels, and Integrations (Stedi). None of these cards collect billing-specific data.

### What Exists Today

- **Database model**: `ClinicianBillingProfile` in Prisma schema (13 fields: providerName, credentials, npiNumber, taxId, practiceName, practiceAddress/City/State/Zip, practicePhone, licenseNumber, licenseState, placeOfServiceCode).
- **API endpoints**: `GET /api/rtm/billing-profile` and `PUT /api/rtm/billing-profile` already exist in `packages/api/src/routes/rtm.ts`.
- **Zod schema**: `SaveBillingProfileSchema` in `packages/shared/src/schemas/rtm.ts` with full validation (NPI = 10 digits, Tax ID = 9 digits, ZIP regex, etc.).
- **Frontend hooks**: `useBillingProfile()` and `useSaveBillingProfile()` already exist in `apps/web/src/hooks/use-rtm.ts`.
- **Integration tests**: Billing profile GET/PUT tests exist in `packages/api/src/__tests__/integration/rtm.test.ts`.

### What Is Missing

A frontend UI card/form on the Settings page that uses the existing hooks to let clinicians view, enter, and edit their billing profile data.

### Key Assumptions

- The existing API, schema, and hooks are correct and complete — this is purely a frontend gap.
- The `BillingProfile` TypeScript interface in `use-rtm.ts` (lines 90-96) is slightly stale (only has `npiNumber`, `taxId`, `practiceName`, `practiceAddress`, `defaultRates`) and needs to be updated to match the full Prisma model.
- The billing profile card will be added to the existing Settings page, not a separate page.
- No new API endpoints are required.

---

## Phase 2: PRODUCT OWNER SPECIFICATION

### Feature: Billing Profile Card on Settings Page

**Priority**: P0 (blocks insurance billing workflow)

### Functional Requirements

#### FR-1: Billing Profile Card on Settings Page

A new card titled "Billing Profile" appears on the Settings page between the "Provider Profile" card and the "Default Client Settings" card. It contains all fields needed for superbill generation.

**Fields** (all required except placeOfServiceCode which defaults to "02"):

| Field | Label | Type | Validation | Notes |
|-------|-------|------|------------|-------|
| `providerName` | Provider Name | text | required, max 200 | Full legal name for billing |
| `credentials` | Credentials | text | required, max 50 | e.g., "PhD", "LCSW", "MD" |
| `npiNumber` | NPI Number | text | exactly 10 digits | National Provider Identifier |
| `taxId` | Tax ID (EIN/SSN) | text | exactly 9 digits | Stored as digits only, displayed as XX-XXXXXXX |
| `practiceName` | Practice Name | text | required, max 200 | May differ from Settings practice name |
| `practiceAddress` | Street Address | text | required, max 500 | |
| `practiceCity` | City | text | required, max 200 | |
| `practiceState` | State | select | required, 2-letter state code | Dropdown of US states |
| `practiceZip` | ZIP Code | text | 5 digits or 5+4 format | Regex: `^\d{5}(-\d{4})?$` |
| `practicePhone` | Phone Number | text | required, max 20 | |
| `licenseNumber` | License Number | text | required, max 100 | State professional license |
| `licenseState` | License State | select | required, 2-letter state code | State that issued the license |
| `placeOfServiceCode` | Place of Service | select | max 2 chars, default "02" | "02" = Telehealth, "11" = Office |

**Acceptance Criteria:**

- GIVEN a clinician on the Settings page
  WHEN the page loads
  THEN they see a "Billing Profile" card with all fields listed above
  AND if they have saved a billing profile before, the fields are pre-populated

- GIVEN a clinician filling out the billing profile form
  WHEN they click "Save Settings"
  THEN the billing profile is saved via `PUT /api/rtm/billing-profile`
  AND a success indicator appears

- GIVEN a clinician with an incomplete billing profile form (missing required fields or invalid NPI/Tax ID/ZIP)
  WHEN they click "Save Settings"
  THEN inline validation errors appear on the invalid fields
  AND the save is prevented

- GIVEN a clinician with no billing profile
  WHEN they navigate to the superbill page and see the error
  THEN the error message includes a link to Settings page

#### FR-2: Superbill Error Message Enhancement

When the superbill page shows the billing profile error, it should include a link to `/settings` so clinicians can navigate directly.

**Acceptance Criteria:**

- GIVEN a clinician viewing a superbill with no billing profile configured
  WHEN they see the error message
  THEN the message includes a clickable link to the Settings page

#### FR-3: BillingProfile TypeScript Interface Alignment

The `BillingProfile` interface in `use-rtm.ts` must be updated to match all fields from the Prisma model so the frontend form can read and write all values.

**Acceptance Criteria:**

- GIVEN the `BillingProfile` interface in `apps/web/src/hooks/use-rtm.ts`
  WHEN compared to the Prisma `ClinicianBillingProfile` model
  THEN all fields are present with correct types
  AND `defaultRates` is removed (does not exist in Prisma model)

### Out of Scope

- Encryption at rest for NPI/Tax ID (handled by database-level encryption if needed; see Compliance section).
- Auto-populating billing profile from Provider Profile card fields.
- Billing profile for non-clinician roles.
- Tax ID masking in API responses (could be future enhancement).

---

## Phase 3: COMPLIANCE (HIPAA)

### Data Classification

| Field | Classification | PHI? | Sensitivity |
|-------|---------------|------|-------------|
| Provider Name | Provider PII | No | Medium |
| NPI Number | Public registry | No | Low (publicly searchable via NPPES) |
| Tax ID (EIN/SSN) | Financial PII | No* | **High** — if SSN rather than EIN |
| License Number | Public registry | No | Low |
| Practice Address/Phone | Business info | No | Low |
| Credentials | Professional info | No | Low |

*NPI and Tax ID are provider identifiers, not patient health information, so they fall outside HIPAA's PHI definition. However, a Tax ID that is a sole-proprietor SSN is sensitive financial PII under state privacy laws and PCI-like standards.

### Controls Required

1. **Transport encryption**: Already satisfied — all API calls use HTTPS in production, JWT auth required on both endpoints.

2. **Access control**: Already satisfied — endpoints use `authenticate` + `requireRole("CLINICIAN")` middleware. The billing profile is scoped to `clinicianId` from the JWT, preventing cross-clinician access.

3. **Audit logging**: Already satisfied — Prisma audit middleware automatically logs CREATE/UPDATE/DELETE on `clinicianBillingProfile` table. Field names are logged but values are not (per audit middleware design).

4. **Frontend handling of Tax ID**:
   - Display the Tax ID in a `type="password"` field by default with a show/hide toggle (same pattern as the Stedi API key field on the same Settings page).
   - Never log the Tax ID value at INFO level (already enforced by logger design).

5. **No additional encryption at rest required**: The Tax ID is stored as-is in PostgreSQL. Database-level encryption (TDE or column-level) is a separate infrastructure concern. The audit middleware does not log values, only field names. This is acceptable for the current deployment model (Railway managed PostgreSQL with encryption at rest enabled).

6. **Input sanitization**: The Zod schema strips the Tax ID to digits-only (`/^\d{9}$/`), preventing injection. NPI is similarly constrained.

### HIPAA Compliance Verdict: PASS

No new PHI is introduced. Provider PII is adequately protected by existing transport encryption, role-based access, and audit logging. The Tax ID show/hide toggle is a UX-level privacy measure, not a HIPAA requirement.

---

## Phase 4: ARCHITECTURE

### System Boundaries

This feature is entirely frontend. No new API endpoints, database migrations, or schema changes are needed.

```
┌──────────────────────────────────────────┐
│  Settings Page (page.tsx)                │
│  ┌────────────────────────────────┐      │
│  │  Provider Profile Card         │      │
│  ├────────────────────────────────┤      │
│  │  ** Billing Profile Card **    │ NEW  │
│  ├────────────────────────────────┤      │
│  │  Default Client Settings Card  │      │
│  ├────────────────────────────────┤      │
│  │  Homework Labels Card          │      │
│  ├────────────────────────────────┤      │
│  │  Integrations Card (Stedi)     │      │
│  └────────────────────────────────┘      │
└──────────────────┬───────────────────────┘
                   │ useBillingProfile()
                   │ useSaveBillingProfile()
                   ▼
         GET /api/rtm/billing-profile
         PUT /api/rtm/billing-profile
                   │
                   ▼
         ClinicianBillingProfile (Prisma)
```

### Data Flow

1. **Page load**: Settings page calls `useBillingProfile()` alongside `useClinicianConfig()`. Both load in parallel.
2. **Form population**: `useEffect` populates local form state from the billing profile query data (same pattern as existing config fields).
3. **Save**: The existing `handleSave` function is extended to also call `useSaveBillingProfile().mutateAsync()` in the `Promise.all` alongside config saves. Only calls billing profile save if the billing profile form has data (at least one field filled).
4. **Validation**: Client-side validation runs before save. Zod schema (`SaveBillingProfileSchema`) provides the source of truth for validation rules, but we do lightweight inline validation for UX (field-level error messages).

### Key Decisions

1. **Single save button**: The billing profile saves with the same "Save Settings" button as other settings. This is consistent with the page's existing UX.

2. **Billing profile is independent from clinician config**: They are separate database models, separate API endpoints, and separate TanStack Query keys. The save is parallel via `Promise.all`.

3. **BillingProfile card is a separate React component**: Extracted as `BillingProfileCard` (like the existing `StediConfigCard`), keeping the main page component clean.

4. **Conditional save**: If no billing profile fields are populated, the billing profile PUT is skipped during save to avoid validation errors.

### Interface Update

The `BillingProfile` interface in `use-rtm.ts` needs updating:

```typescript
// Current (incomplete)
export interface BillingProfile {
  npiNumber: string | null;
  taxId: string | null;
  practiceName: string | null;
  practiceAddress: string | null;
  defaultRates: Record<string, number>;  // does not exist in DB
}

// Updated (matches Prisma model)
export interface BillingProfile {
  id: string;
  clinicianId: string;
  providerName: string;
  credentials: string;
  npiNumber: string;
  taxId: string;
  practiceName: string;
  practiceAddress: string;
  practiceCity: string;
  practiceState: string;
  practiceZip: string;
  practicePhone: string;
  licenseNumber: string;
  licenseState: string;
  placeOfServiceCode: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## Phase 5: UX DESIGN

### Layout

The Billing Profile card is placed on the Settings page as the **second card**, directly after the Provider Profile card. This groups provider identity information (who you are, how you bill) together before moving into clinical defaults.

### Card Structure

```
┌─────────────────────────────────────────────────┐
│  Billing Profile                                │
│  Required for generating superbills and         │
│  insurance claims.                              │
│                                                 │
│  ── Provider Information ──────────────         │
│  Provider Name     [ Dr. Jane Smith          ]  │
│  Credentials       [ PhD, LCSW               ]  │
│  NPI Number        [ 1234567890              ]  │
│  Tax ID            [ ●●●●●●●●● ] 👁            │
│                                                 │
│  ── Practice Address ──────────────────         │
│  Street Address    [ 123 Main St             ]  │
│  City              [ Portland     ]             │
│  State  [ OR ▾ ]   ZIP  [ 97201  ]              │
│  Phone             [ (503) 555-0123          ]  │
│                                                 │
│  ── Licensing ─────────────────────────         │
│  License Number    [ C12345                  ]  │
│  License State     [ OR ▾ ]                     │
│  Place of Service  [ 02 - Telehealth ▾ ]        │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Field Groupings

Three visual sub-sections within the card, separated by subtle labels (not dividers):

1. **Provider Information**: providerName, credentials, npiNumber, taxId
2. **Practice Address**: practiceAddress, practiceCity, practiceState + practiceZip (side-by-side), practicePhone
3. **Licensing**: licenseNumber, licenseState, placeOfServiceCode

### Interaction Details

- **Tax ID field**: Uses `type="password"` with a show/hide toggle (Eye/EyeOff icons) — same pattern as the Stedi API key field already on the page.
- **NPI field**: Plain text input. Helper text below: "10-digit National Provider Identifier".
- **State selects**: Dropdown with all 50 US states + DC + territories, using 2-letter codes.
- **Place of Service select**: Two options: "02 - Telehealth" (default) and "11 - Office".
- **ZIP code**: Text input with placeholder "12345 or 12345-6789".
- **Phone**: Text input, no auto-formatting (clinician enters whatever format they prefer, max 20 chars).

### Validation UX

- **On blur**: Validate individual fields when focus leaves. Show red border + error text below field.
- **On save**: Validate all fields. Scroll to first error if any.
- **NPI**: "NPI must be exactly 10 digits" (shown if not matching `/^\d{10}$/`).
- **Tax ID**: "Tax ID must be exactly 9 digits" (shown if not matching `/^\d{9}$/`).
- **ZIP**: "Invalid ZIP code format" (shown if not matching `/^\d{5}(-\d{4})?$/`).
- **Required fields**: "This field is required" for any empty required field.

### Empty State

When no billing profile exists:
- All fields show empty with placeholders.
- A subtle info banner at the top of the card: "Complete your billing profile to generate superbills for insurance billing."

### Superbill Error Enhancement

The superbill page error message changes from:

> Failed to generate superbill. Please ensure your billing profile is configured.

To:

> Failed to generate superbill. Please [configure your billing profile](/settings) in Settings.

Where "configure your billing profile" is a Next.js `<Link>` to `/settings`.

---

## Phase 6: ENGINEERING PLAN

### Task Breakdown

#### Task 1: Update BillingProfile TypeScript interface (use-rtm.ts)

**File**: `apps/web/src/hooks/use-rtm.ts`

Update the `BillingProfile` interface to match the full Prisma model:

```typescript
export interface BillingProfile {
  id: string;
  clinicianId: string;
  providerName: string;
  credentials: string;
  npiNumber: string;
  taxId: string;
  practiceName: string;
  practiceAddress: string;
  practiceCity: string;
  practiceState: string;
  practiceZip: string;
  practicePhone: string;
  licenseNumber: string;
  licenseState: string;
  placeOfServiceCode: string;
  createdAt: string;
  updatedAt: string;
}
```

Update `useSaveBillingProfile` mutation function signature to accept the full form shape (minus `id`, `clinicianId`, `createdAt`, `updatedAt`).

**Estimated effort**: 10 minutes.

#### Task 2: Add BillingProfileCard component to Settings page (page.tsx)

**File**: `apps/web/src/app/(dashboard)/settings/page.tsx`

Add a new `BillingProfileCard` component (defined in the same file, following the `StediConfigCard` pattern):

- Import `useBillingProfile` and `useSaveBillingProfile` from `@/hooks/use-rtm`.
- Add `Eye`, `EyeOff` icons (already imported).
- Define `US_STATES` constant array with `{ value: "AL", label: "Alabama" }` entries.
- Define `PLACE_OF_SERVICE_OPTIONS` constant: `[{ value: "02", label: "02 - Telehealth" }, { value: "11", label: "11 - Office" }]`.
- Component manages its own local state for all 13 form fields.
- `useEffect` populates form state when `useBillingProfile()` data loads.
- Exposes a save function that the parent page calls.

**Integration with existing save flow**:

The `BillingProfileCard` component needs to participate in the page-level "Save Settings" button. Two approaches:

**Chosen approach**: Lift billing profile state to the parent page level (same as providerType, primaryModality, etc.) so the single `handleSave` function can include the billing profile save in its `Promise.all`. This is consistent with how all other cards work on this page. The `BillingProfileCard` receives state + setters as props.

This means:
- Add billing profile state variables to `SettingsPage` component.
- Add `useBillingProfile()` and `useSaveBillingProfile()` hooks to `SettingsPage`.
- Extend `handleSave` to include billing profile save in the `Promise.all`.
- `BillingProfileCard` is a presentational component receiving props.

**Estimated effort**: 2 hours.

#### Task 3: Client-side validation

**File**: `apps/web/src/app/(dashboard)/settings/page.tsx`

Add a `validateBillingProfile` function that checks:
- All required fields are non-empty.
- NPI matches `/^\d{10}$/`.
- Tax ID matches `/^\d{9}$/`.
- ZIP matches `/^\d{5}(-\d{4})?$/`.
- State codes are 2 characters.

Returns a `Record<string, string>` of field name to error message. The `BillingProfileCard` displays these errors below each field.

The `handleSave` function runs validation before the API call. If errors exist, it sets them in state and does not call the API.

**Conditional save**: If ALL billing profile fields are empty (user hasn't started filling it out), skip validation and skip the billing profile API call. Only validate + save if at least one field has a value.

**Estimated effort**: 45 minutes.

#### Task 4: Enhance superbill error message

**File**: `apps/web/src/app/(dashboard)/rtm/[enrollmentId]/superbill/[periodId]/page.tsx`

Change the error fallback from:

```tsx
"Failed to generate superbill. Please ensure your billing profile is configured."
```

To:

```tsx
<>
  Failed to generate superbill.{" "}
  <Link href="/settings" className="underline text-primary hover:text-primary/80">
    Configure your billing profile
  </Link>{" "}
  in Settings.
</>
```

Add `Link` import from `next/link`.

**Estimated effort**: 10 minutes.

#### Task 5: Tests

**Files**:
- `apps/web/src/__tests__/settings-billing-profile.test.tsx` — Component tests for the BillingProfileCard
- Existing `packages/api/src/__tests__/integration/rtm.test.ts` — Already has billing profile API tests (no changes needed)

Component tests:
1. Renders all billing profile fields when data is loaded.
2. Shows empty state when no billing profile exists.
3. Validates NPI format (rejects non-10-digit, accepts valid).
4. Validates Tax ID format (rejects non-9-digit, accepts valid).
5. Validates ZIP format (accepts 5-digit and 5+4, rejects invalid).
6. Shows/hides Tax ID with toggle button.
7. Calls save mutation with correct payload on form submit.

**Estimated effort**: 1.5 hours.

### Total Estimated Effort: ~4.5 hours

### File Changes Summary

| File | Change Type | Description |
|------|------------|-------------|
| `apps/web/src/hooks/use-rtm.ts` | Modify | Update `BillingProfile` interface to match Prisma model |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | Modify | Add BillingProfileCard, billing profile state, validation, save integration |
| `apps/web/src/app/(dashboard)/rtm/[enrollmentId]/superbill/[periodId]/page.tsx` | Modify | Add Link to settings in error message |
| `apps/web/src/__tests__/settings-billing-profile.test.tsx` | Create | Component tests for billing profile card |

### Dependencies

None. All backend infrastructure exists. No new packages needed (shadcn/ui Select, Input, Label, Card components are already imported on the Settings page).

---

## Phase 7: QA / TEST PLAN

### Test Matrix

#### Unit / Component Tests

| ID | Test Case | Expected Result | Priority |
|----|-----------|-----------------|----------|
| TC-1 | BillingProfileCard renders all 13 fields | All inputs and selects visible with correct labels | P0 |
| TC-2 | Pre-populated fields when billing profile exists | Fields show saved values from API | P0 |
| TC-3 | Empty fields when no billing profile exists | All fields empty, info banner visible | P0 |
| TC-4 | Valid NPI (10 digits) passes validation | No error shown | P0 |
| TC-5 | Invalid NPI (not 10 digits) shows error | "NPI must be exactly 10 digits" error | P0 |
| TC-6 | Valid Tax ID (9 digits) passes validation | No error shown | P0 |
| TC-7 | Invalid Tax ID (not 9 digits) shows error | "Tax ID must be exactly 9 digits" error | P0 |
| TC-8 | Valid ZIP (5 digits) passes validation | No error shown | P0 |
| TC-9 | Valid ZIP (5+4 format) passes validation | No error shown | P0 |
| TC-10 | Invalid ZIP shows error | "Invalid ZIP code format" error | P1 |
| TC-11 | Tax ID show/hide toggle works | Field type toggles between password and text | P1 |
| TC-12 | Save calls `PUT /api/rtm/billing-profile` with correct payload | Mutation called with all field values | P0 |
| TC-13 | Save skipped when all billing fields empty | Billing profile mutation NOT called | P1 |
| TC-14 | Validation prevents save when required fields missing | Save blocked, errors displayed | P0 |
| TC-15 | State dropdowns contain all US states | 50 states + DC available | P1 |

#### Integration Tests (Existing — No Changes Needed)

The following tests already exist in `packages/api/src/__tests__/integration/rtm.test.ts`:

| ID | Test Case | Status |
|----|-----------|--------|
| IT-1 | `PUT /api/rtm/billing-profile` saves billing profile | Existing, passing |
| IT-2 | `PUT /api/rtm/billing-profile` rejects invalid NPI | Existing, passing |
| IT-3 | `GET /api/rtm/billing-profile` retrieves saved profile | Existing, passing |

#### Manual / E2E Scenarios

| ID | Scenario | Steps | Expected |
|----|----------|-------|----------|
| E2E-1 | First-time billing profile setup | 1. Go to Settings. 2. Fill all billing fields. 3. Click Save. 4. Refresh page. | All fields persist after refresh. |
| E2E-2 | Edit existing billing profile | 1. Go to Settings with existing profile. 2. Change NPI. 3. Save. 4. Refresh. | Updated NPI persists. |
| E2E-3 | Superbill without billing profile | 1. Ensure no billing profile. 2. Go to superbill page. 3. See error with link. 4. Click link. | Navigates to Settings page. |
| E2E-4 | Superbill after billing profile setup | 1. Set up billing profile. 2. Generate superbill. | Superbill renders with correct provider info (NPI, Tax ID, address). |
| E2E-5 | Save Settings with billing profile + config changes | 1. Change provider type AND billing NPI. 2. Save. | Both changes persist (parallel save). |
| E2E-6 | Validation prevents bad data | 1. Enter "12345" as NPI. 2. Enter "ABC" as Tax ID. 3. Click Save. | Inline errors shown, save blocked. |
| E2E-7 | Tax ID privacy | 1. Load settings with saved Tax ID. 2. Verify Tax ID field is masked. 3. Click eye icon. | Tax ID revealed. |

### Regression Risks

1. **Existing settings save flow**: The `handleSave` function is being extended. Verify that Provider Profile, Default Client Settings, and Homework Labels still save correctly when billing profile is also being saved.
2. **Superbill rendering**: After changing the error message to include a Link component, verify the superbill still renders correctly when the billing profile IS configured.
3. **BillingProfile interface change**: The `useBillingProfile()` hook is used only on the Settings page (not elsewhere), but verify no other component imports the old `BillingProfile` type.

### Coverage Requirements

- New component test file must achieve >80% line coverage of the BillingProfileCard component.
- Existing API integration tests for billing profile endpoints remain passing (no API changes).
