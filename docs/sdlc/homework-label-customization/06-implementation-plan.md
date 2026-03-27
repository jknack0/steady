# Homework Label Customization — Implementation Plan & Summary

## TDD Approach
All 34 tests were written before implementation code. Tests confirmed to fail for the right reasons, then implementation was written to make them pass.

## Files Created (4)

| File | Purpose |
|---|---|
| `packages/shared/src/constants/homework-labels.ts` | `HOMEWORK_TYPE_SYSTEM_LABELS` constant (11 types), `resolveHomeworkItemLabel()` pure resolver function |
| `packages/shared/src/__tests__/homework-labels.test.ts` | 10 unit tests for the resolver function covering all fallback paths |
| `packages/shared/src/__tests__/homework-label-schemas.test.ts` | 17 unit tests for `customLabel` field, `HomeworkItemTypeEnum`, and `SaveHomeworkLabelsSchema` |
| `packages/api/src/__tests__/config-homework-labels.test.ts` | 7 integration tests for `PATCH /config/homework-labels` endpoint |

## Files Modified (11)

| File | Changes |
|---|---|
| `packages/shared/src/schemas/part.ts` | Added `customLabel: z.string().trim().min(1).max(50).optional()` to all 11 homework item schema variants |
| `packages/shared/src/schemas/config.ts` | Added `HomeworkItemTypeEnum`, `SaveHomeworkLabelsSchema`, `SaveHomeworkLabelsInput` type |
| `packages/shared/src/constants/index.ts` | Re-exports `homework-labels` module |
| `packages/db/prisma/schema.prisma` | Added `homeworkLabels Json?` to `ClinicianConfig` model |
| `packages/api/src/services/config.ts` | Added `saveHomeworkLabels()` service function |
| `packages/api/src/routes/config.ts` | Added `PATCH /homework-labels` endpoint with Zod validation and auth |
| `packages/api/src/services/participant.ts` | Enhanced `getHomeworkInstances()` to resolve labels server-side and return `displayLabels` map |
| `apps/web/src/hooks/use-config.ts` | Added `homeworkLabels` to `ClinicianConfigData`, added `useSaveHomeworkLabels()` mutation hook |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | Added "Homework Labels" Card with 11 input rows, reset buttons, character counters |
| `apps/web/src/components/part-editors/homework-editor.tsx` | Resolved label in item header, pencil icon inline edit, confirm/reset, italic + dot for overrides |
| `apps/mobile/components/part-renderers.tsx` | Added `displayLabels` prop to `HomeworkRenderer`, resolved label with fallback |

## Test Coverage (34 tests, all passing)

### Shared Package — 27 tests
- **Resolver function (10 tests):** All fallback paths — item custom label, clinician default, system default, empty strings, null/undefined, whitespace-only
- **customLabel field (8 tests):** Valid on multiple item types, optional (absent is fine), max 50 chars, trim behavior
- **HomeworkItemTypeEnum (2 tests):** Accepts valid types, rejects invalid
- **SaveHomeworkLabelsSchema (7 tests):** Valid input, validation errors (invalid keys, over-50-char, empty-after-trim, missing field), defaults to empty object

### API Package — 7 tests
- Validation: invalid keys, over-50-char values, empty-after-trim, missing field
- Auth: unauthenticated (401), wrong role (403)
- Happy path: all 11 types accepted

## Implementation Details

### Label Resolution (Read-Time)
```
resolveHomeworkItemLabel(itemType, itemCustomLabel?, clinicianDefaults?):
  1. itemCustomLabel (non-empty) → return it
  2. clinicianDefaults[itemType] (non-empty) → return it
  3. HOMEWORK_TYPE_SYSTEM_LABELS[itemType] → return system default
```

### Data Storage
- **Clinician defaults:** `homeworkLabels Json?` on `ClinicianConfig` — stores only overrides, null = all system defaults
- **Part-level overrides:** `customLabel` optional field on each homework item in Part content JSON

### API Endpoints
- `PATCH /api/config/homework-labels` — saves clinician defaults (new)
- `GET /api/config` — already returns `homeworkLabels` (no change needed)
- `GET /api/participant/homework-instances` — now includes `displayLabels` map (enhanced)

## Verification Steps
1. Run shared tests: `npx vitest run packages/shared/src/__tests__/homework-labels.test.ts packages/shared/src/__tests__/homework-label-schemas.test.ts`
2. Run API tests: `npx vitest run packages/api/src/__tests__/config-homework-labels.test.ts`
3. Push schema: `npm run db:push` (adds nullable column, zero-downtime)
4. Start dev: `npm run dev` — settings page shows Homework Labels section, homework editor shows inline label editing
