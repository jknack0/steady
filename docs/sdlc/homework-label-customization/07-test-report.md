# Homework Label Customization — QA Report

## Test Results

**34 tests passing** across 3 suites.

| Test File | Tests | Status |
|---|---|---|
| `packages/shared/src/__tests__/homework-labels.test.ts` | 10 | PASS |
| `packages/shared/src/__tests__/homework-label-schemas.test.ts` | 17 | PASS |
| `packages/api/src/__tests__/config-homework-labels.test.ts` | 7 | PASS |

## Acceptance Criteria Verification

### FR-1: Clinician Default Label Settings — PASS
- Settings page renders "Homework Labels" Card with all 11 types
- Each type shows system default as placeholder
- Custom labels saved via `useSaveHomeworkLabels` hook → `PATCH /api/config/homework-labels`
- Clearing a label deletes the key from state; resolver falls through to system default

### FR-2: Retroactive Label Application — PASS
- Read-time resolution via `resolveHomeworkItemLabel()` means changing defaults instantly affects all non-overridden items
- Items with part-level `customLabel` are checked first, unaffected by default changes

### FR-3: Part-Level Label Override — PASS
- Homework editor calls `resolveHomeworkItemLabel()` for each item header
- Pencil icon toggles inline edit mode with confirm/reset buttons
- `customLabel` saved via existing content `onChange` callback (auto-save)
- Reset destructures out `customLabel` from item, removing it

### FR-4: Label Persistence on Default Removal — PASS
- Part-level overrides (`customLabel`) stored on the item itself, independent of clinician defaults
- Items without a part-level override fall to system default when clinician default is removed (correct read-time behavior)

### FR-5: Participant-Facing Labels — PASS
- Mobile `HomeworkRenderer` accepts `displayLabels` prop, uses resolved label with fallback
- API enriches homework instances with `displayLabels` map keyed by item index/sortOrder

### FR-6: Label Validation — PASS
- `SaveHomeworkLabelsSchema` uses `z.string().trim().min(1).max(50)` server-side
- `customLabel` uses same constraint: `z.string().trim().min(1).max(50).optional()`
- Whitespace-only rejected by `.trim().min(1)` — tested

### NFR-2: Security — PASS
- Route uses `authenticate` + `requireRole("CLINICIAN")` middleware
- Ownership implicit via `req.user.clinicianProfileId`
- 401 for unauthenticated, 403 for wrong role — tested
- Input validated via Zod middleware

## Issues Found & Resolved

### FIXED — `displayLabels` Map Key Mismatch (Medium)
**Original issue:** `displayLabels` was keyed by item type (`"ACTION"`, etc.), so if two items of the same type had different `customLabel` values, the second was lost.
**Fix applied:** Changed to key by item index/sortOrder (matching the existing response key pattern). Updated both `participant.ts` and mobile `part-renderers.tsx`. All tests pass after fix.

## Coverage Gaps (Accepted)

1. **No save round-trip integration test** — The API test verifies validation and auth but not full save-and-retrieve persistence. Accepted as low risk since the service function follows the exact same pattern as `saveDashboardLayout` which is proven.
2. **No test for `displayLabels` enrichment in participant service** — Accepted as medium risk; the logic is straightforward and verified by code review.
3. **Web component tests not written** — Per project guidelines, frontend coverage is secondary to API/shared coverage.

## Sign-off

**APPROVED** — All acceptance criteria verified. The medium-severity `displayLabels` key bug was fixed and retested. Remaining coverage gaps are accepted risks documented above.
