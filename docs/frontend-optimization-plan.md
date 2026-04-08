# STEADY Web App -- Frontend Optimization Plan

## Audit Summary

**Auditors**: 100 frontend expert agents across 4 specialist teams
**Scope**: `apps/web/src/` -- components, hooks, pages, tests, DX
**Date**: April 8, 2026
**Total findings**: 89 issues across all teams
**Estimated total effort**: ~80-100 hours

---

## Phase 1: Quick Wins (1-2 days, ~8 hours)

These fixes are high-impact, low-effort, and can be done in a single PR.

### 1.1 Delete Dead Code (~45 min)
- [ ] Delete `hooks/use-homework-compliance.ts` (unused)
- [ ] Delete `hooks/use-review-templates.ts` (unused)
- [ ] Delete `hooks/use-sidebar-panel.tsx` (unused)
- [ ] Delete `components/claims/ClaimEditForm.tsx` (never imported)
- [ ] Delete `components/claims/StatusTimeline.tsx` (replaced by ClaimStatusTimeline)
- [ ] Remove dead exports from `lib/tz.ts` (`formatDate`, `localDateInTz`)
- [ ] Remove `void getByText;` dead expression in AppointmentModal.test.tsx

### 1.2 Consolidate Duplicated Constants (~1 hour)
- [ ] Create `lib/billing-constants.ts` with:
  - `COMMON_MODIFIERS` (currently duplicated in 5 files)
  - `PLACE_OF_SERVICE_OPTIONS` (duplicated in 3 files)
  - `COMMON_ICD10_CODES` (hardcoded in participants page, 55 entries)
  - `US_STATES` (duplicated with different formats in 2 files)
- [ ] Create `lib/constants.ts` with `MS_PER_DAY = 86_400_000` (used in 4 files)
- [ ] Replace all inline duplicates with imports

### 1.3 Consolidate Duplicated Utilities (~30 min)
- [ ] Replace 6 inline `formatDate` implementations with imports from `@/lib/format`
- [ ] Add `formatDateNumeric()` to `lib/format.ts` for MM/DD/YYYY format (superbill)
- [ ] Replace 6 inline `formatCents` implementations with existing `formatMoney` from `@/lib/format`
- [ ] Consolidate `formatCurrency` vs `formatMoney` in `lib/format.ts` (pick one API)

### 1.4 Fix Auth Bypass in Hooks (~3 hours)
- [ ] **CRITICAL**: Fix `useClaims` -- bypasses API client auth refresh with raw `fetch()`
- [ ] **CRITICAL**: Fix `useUnbilledAppointments` -- same raw `fetch()` bypass
- [ ] **CRITICAL**: Fix `usePracticeParticipants` -- same raw `fetch()` bypass
- [ ] Add `api.getRaw<T>()` method to `api-client.ts` that returns full JSON (not just `.data`) for paginated endpoints

### 1.5 Fix Claims Pagination Bug (~2 hours)
- [ ] **CRITICAL**: Replace `useClaims` `useState` inside `queryFn` with proper `useInfiniteQuery`
- [ ] Fixes race condition when switching status filters

### 1.6 Replace `window.confirm()` (~15 min)
- [ ] Replace 3 `confirm()` calls in billing pages with `useConfirmDialog()`
- [ ] Files: `billing/[invoiceId]/page.tsx` lines 278, 373, 389

### 1.7 Fix Missing Cache Invalidations (~30 min)
- [ ] `useCreateProgramForClient`: add `["programs"]` invalidation
- [ ] `useCompleteSession`: add `["appointments"]` invalidation
- [ ] `useCreateCheckoutSession` / `useChargeCard`: add `["billing-summary"]` and `["invoice"]` invalidation
- [ ] `useDeleteDailyTracker`: add `["daily-tracker"]` invalidation

---

## Phase 2: Shared Components (3-5 days, ~25 hours)

Create reusable abstractions for patterns duplicated across the codebase.

### 2.1 ModifierInput Component (~3 hours)
- [ ] Extract from `billing/new/page.tsx` (lines 220-328)
- [ ] Props: `{ modifiers: string[], onChange, maxModifiers? }`
- [ ] Includes chip display, suggested chips, free-text input
- [ ] Replace 4 duplicate implementations (CreateClaimDialog, NewClaimFlow, ClaimEditForm, ResubmitForm)

### 2.2 DiagnosisCodePicker Consolidation (~3 hours)
- [ ] Merge 3 incompatible implementations into one
- [ ] Base on `DiagnosisCodePicker.tsx` (cleanest)
- [ ] Support both `string[]` and `DiagnosisCode[]` modes
- [ ] Delete `DiagnosisCodeSearch.tsx` and inline version in `billing/new`

### 2.3 Shared Tabs Component (~3 hours)
- [ ] Create `components/ui/tabs.tsx`
- [ ] Props: `{ tabs: TabItem[], active, onChange }`
- [ ] Proper ARIA: `role="tablist"`, `role="tab"`, `aria-selected`
- [ ] Keyboard navigation (arrow keys)
- [ ] Replace 9+ duplicate tab implementations

### 2.4 Domain Status Badges (~2 hours)
- [ ] `InvoiceStatusBadge` (follows ClaimStatusBadge pattern)
- [ ] `EnrollmentStatusBadge`
- [ ] `SessionStatusBadge`
- [ ] `AppointmentStatusBadge`
- [ ] Encapsulate color maps that are currently duplicated in 7+ files

### 2.5 AlertBanner Component (~1 hour)
- [ ] Variants: `error`, `warning`, `info`, `success`
- [ ] Replace 4+ inconsistent error/info display patterns
- [ ] Base on `ClaimDetailPanel` StatusBanner pattern

### 2.6 useClickOutside Hook (~30 min)
- [ ] Extract duplicated click-outside handler (3 copies)
- [ ] `useClickOutside(ref, callback)`

### 2.7 Shared LogTimeDialog (~2 hours)
- [ ] Extract from RTM dashboard (superset version)
- [ ] Used by both RTM dashboard and RTM detail page
- [ ] Delete duplicate in detail page

### 2.8 Shared Test Helpers (~1 hour)
- [ ] Create `__tests__/test-utils.tsx` with:
  - `createTestWrapper()` -- consistent QueryClient
  - `mockApiClient()` -- standardized API mock
- [ ] Replace 5 duplicate wrapper definitions
- [ ] Remove custom `waitFor` in `use-programs.test.tsx`

---

## Phase 3: Page Decomposition (5-8 days, ~30 hours)

Break apart monolithic page files into focused components.

### 3.1 Participant Detail Page (2,691 lines -> ~200 lines) (~6 hours)
- [ ] Extract `components/participant-detail/OverviewTab.tsx`
- [ ] Extract `components/participant-detail/HomeworkTab.tsx`
- [ ] Extract `components/participant-detail/TrackersTab.tsx`
- [ ] Extract `components/participant-detail/InsuranceTab.tsx`
- [ ] Extract `components/participant-detail/DemographicsSection.tsx`
- [ ] Extract `components/participant-detail/RtmEnrollmentDialog.tsx`
- [ ] Extract `components/participant-detail/EnrollmentManagement.tsx`
- [ ] Extract `components/participant-detail/SessionHistory.tsx`
- [ ] Use `next/dynamic` for non-default tabs

### 3.2 Settings Page (1,078 lines -> ~150 lines) (~3 hours)
- [ ] Extract `components/settings/BillingProfileCard.tsx`
- [ ] Extract `components/settings/StediConfigCard.tsx`
- [ ] Extract `components/settings/HomeworkLabelsCard.tsx`
- [ ] Extract `components/settings/TrackerPresetsCard.tsx`

### 3.3 RTM Detail Page (1,011 lines -> ~100 lines) (~2 hours)
- [ ] Extract `components/rtm/EngagementCalendar.tsx`
- [ ] Extract `components/rtm/BillabilityCard.tsx`
- [ ] Extract `components/rtm/ActivityTimeline.tsx`
- [ ] Move `computeBillability` to `lib/rtm-utils.ts`

### 3.4 RTM Dashboard (843 lines -> ~100 lines) (~2 hours)
- [ ] Extract `components/rtm/ClientCard.tsx`
- [ ] Extract `components/rtm/BillabilityCheck.tsx`
- [ ] Extract `components/rtm/EngagementProgressBar.tsx`

### 3.5 Invoice Create Page (603 lines) (~1 hour)
- [ ] Extract inline `DiagnosisCodePicker` (done in Phase 2)
- [ ] Extract inline `ModifierInput` (done in Phase 2)

### 3.6 AppointmentModal (647 lines) (~2 hours)
- [ ] Replace 17 `useState` calls with `useReducer`
- [ ] Extract conflict UI and discard confirmation into sub-components

### 3.7 Settings Page State (~1 hour)
- [ ] Replace 13 `useState` calls with `useReducer`
- [ ] Add `SYNC_FROM_CONFIG` action for initial data population

---

## Phase 4: Next.js Best Practices (2-3 days, ~15 hours)

### 4.1 Add Error Boundaries (~2 hours)
- [ ] `app/(dashboard)/error.tsx` -- branded error with "Try again", preserves sidebar
- [ ] `app/telehealth/error.tsx` -- telehealth-specific recovery
- [ ] `app/global-error.tsx` -- last resort

### 4.2 Add Loading States (~2 hours)
- [ ] `app/(dashboard)/loading.tsx` -- skeleton for all dashboard pages
- [ ] `app/(dashboard)/participants/[id]/loading.tsx` -- heavy page
- [ ] `app/(dashboard)/rtm/[enrollmentId]/loading.tsx` -- heavy page

### 4.3 Dynamic Imports (~3 hours)
- [ ] `next/dynamic` for modals: PhonePreviewModal, AssignmentModal, CreatePartModal, EditPartModal
- [ ] `next/dynamic` for non-default tabs (after Phase 3 extraction)
- [ ] `next/dynamic` for TelehealthSession (280KB+ LiveKit)
- [ ] `next/dynamic` for Recharts (450KB)
- [ ] `next/dynamic` for RecurringSeriesPanel

### 4.4 Page Metadata (~2 hours)
- [ ] Add `<title>` to each dashboard page (client-side since all use `"use client"`)
- [ ] Create `usePageTitle(title)` hook that sets `document.title`
- [ ] Dashboard, Programs, Clients, Calendar, Billing, Claims, Settings, RTM

### 4.5 Replace Native `<select>` Elements (~3 hours)
- [ ] 124 native `<select>` elements bypass the design system
- [ ] Replace with Radix `<Select>` from `components/ui/select.tsx`
- [ ] Start with most visible pages: participant detail, settings, billing

### 4.6 Optimize Auth Provider Scope (~1 hour)
- [ ] Move `AuthProvider` from root layout to `(dashboard)/layout.tsx`
- [ ] Create `(auth)` route group for login/register with their own provider
- [ ] Prevents auth client code loading on public landing page

---

## Phase 5: Type Safety & Hook Quality (2-3 days, ~20 hours)

### 5.1 Type All Hook Returns (~4 hours)
- [ ] `useInsurance` -- add `InsuranceData` interface
- [ ] `usePayerSearch` -- add `Payer` interface
- [ ] `useDiagnosisCodeSearch` -- add `DiagnosisCode` interface
- [ ] `useSavedCards` -- add `SavedCard` interface
- [ ] `usePayments` -- add `Payment` interface
- [ ] `useInvoices` / `useInvoice` -- add `Invoice` interface
- [ ] `useUpdateSession` -- add `UpdateSessionInput` interface

### 5.2 Type All Mutation Inputs (~2 hours)
- [ ] `useCreateInvoice` -- typed input (not `any`)
- [ ] `useUpdateInvoice` -- typed input
- [ ] `useRecordPayment` -- typed input
- [ ] `useUpsertInsurance` -- typed input
- [ ] `useResubmitClaim` -- typed input

### 5.3 Query Key Factory (~3 hours)
- [ ] Create `lib/query-keys.ts` with typed key factory
- [ ] Standardize on plural-always convention
- [ ] Update all 43 hook files to use factory
- [ ] Fixes: invoice/invoices key split, claims key collision

### 5.4 Consolidate Duplicate Hooks (~2 hours)
- [ ] Merge `useInsurance` + `useParticipantInsurance` (same endpoint, dual cache)
- [ ] Consolidate `useDeleteModule` (exists in use-modules.ts and use-assignment.ts)
- [ ] Consolidate `useDeletePart` (same duplication)
- [ ] Clarify `usePrepareSession` vs `useSessionPrep`

### 5.5 Add Optimistic Updates (~2 hours)
- [ ] `useDeleteInvoice` -- optimistic removal from list
- [ ] `useReorderModules` -- optimistic reorder on drag-drop
- [ ] `useReorderParts` -- optimistic reorder on drag-drop

### 5.6 Fix Autosave Status Bug (~30 min)
- [ ] Move `setStatus("saving")` inside setTimeout callback
- [ ] Add "pending" status for debounce period

### 5.7 Eliminate `as any` Casts (~3 hours)
- [ ] 40+ `as any` casts across codebase
- [ ] Prioritize billing/invoice pages (runtime risk)
- [ ] Replace with proper types from hooks (after 5.1/5.2)

### 5.8 Build Query String Utility (~30 min)
- [ ] Create `lib/query-utils.ts` with generic `buildQueryString()`
- [ ] Replace 3 duplicate `toQueryString` implementations

---

## Priority Matrix

| Phase | Effort | Impact | Risk Reduction |
|---|---|---|---|
| 1: Quick Wins | 8 hrs | HIGH | Fixes 3 auth bugs, 1 data race, dead code |
| 2: Shared Components | 25 hrs | HIGH | DRY, accessibility, consistency |
| 3: Page Decomposition | 30 hrs | MEDIUM-HIGH | Maintainability, bundle size |
| 4: Next.js Best Practices | 15 hrs | MEDIUM | Performance, reliability |
| 5: Type Safety | 20 hrs | MEDIUM | Developer experience, bug prevention |

## What's Already Good

The audit teams also identified strong patterns already in place:

- `EmptyState`, `LoadingState`, `PageHeader` -- well-built shared components
- `ConfirmDialog` with `useConfirmDialog` hook -- clean pattern (just not universally adopted)
- UI primitives (Button, Card, Dialog, Sheet, Badge) follow shadcn/ui standards
- `ClaimStatusBadge` -- good model for domain-specific status components
- CVA-based variants in Button/Badge -- clean composition
- `api-client.ts` with cookie-based auth and 401 retry -- solid foundation
- Audit middleware and HIPAA-safe logger -- well-implemented
- TanStack Query used consistently (not mixed with useState for server state)
- Tailwind with design tokens -- good theming foundation
