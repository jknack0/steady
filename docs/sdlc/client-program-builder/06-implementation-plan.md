# Client Program Builder — Implementation Plan

## Summary
Implemented the full "Create for Client" feature across 3 packages: shared (schema), API (endpoint + tests), and web (dialog + picker + hooks).

## Files Changed

| File | Action | Description |
|------|--------|-------------|
| `packages/shared/src/schemas/program.ts` | Modified | Added `CreateProgramForClientSchema` (title + clientId) and type export |
| `packages/api/src/routes/programs.ts` | Modified | Added `POST /api/programs/for-client` with ownership check, transaction, self-ref templateSourceId |
| `packages/api/src/__tests__/create-for-client.test.ts` | Created | 7 unit tests: happy path, 403 ownership, 400 validation (title, clientId), 401 no auth, 403 participant role, 400 no participant profile |
| `apps/web/src/components/client-picker.tsx` | Created | Searchable client dropdown with inline "Add New Client" form |
| `apps/web/src/app/(dashboard)/programs/create-program-dialog.tsx` | Modified | Added "for-client" view with title input + client picker, 3-view dialog (templates/blank/for-client) |
| `apps/web/src/hooks/use-programs.ts` | Modified | Added `useCreateProgramForClient` mutation hook |
| `apps/web/src/hooks/use-clinician-participants.ts` | Modified | Added `useClinicianClients` query hook, `ClinicianClient` interface, updated `useAddClient` cache invalidation |

## API Endpoint

`POST /api/programs/for-client`
- **Auth:** authenticate + requireRole("CLINICIAN")
- **Validation:** Zod schema (title: 1-200 chars, clientId: non-empty string)
- **Ownership:** ClinicianClient lookup, 403 if not found or DISCHARGED
- **Transaction:** Program create → self-ref templateSourceId update → Module create ("Module 1") → Enrollment create (ACTIVE)
- **Response:** 201 with program and enrollment data

## Compliance Controls Addressed

1. Ownership verification — ClinicianClient lookup before transaction
2. Zod validation — CreateProgramForClientSchema via validate() middleware
3. No PHI in logs — logger.error with operation name only
4. Transaction atomicity — single prisma.$transaction()
5. No client-side PHI — React useState only, cleared on dialog close
6. Clinician-scoped queries — existing clinicianId filter preserved

## Test Results

All 592 tests pass (29 test files), including 7 new tests in `create-for-client.test.ts`.
