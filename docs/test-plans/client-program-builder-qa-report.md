# Client Program Builder -- QA Test Report

**Date:** 2026-03-30
**Branch:** dev
**Test File:** packages/api/src/__tests__/create-for-client.test.ts

---

## Test Execution

All 7 tests pass. No flaky tests, no warnings.

```
Test Files  1 passed (1)
     Tests  7 passed (7)
  Duration  1.85s
```

---

## Acceptance Criteria Coverage

### FR-1: Create for Client Dialog (UI)

| AC | Description | Coverage |
|----|-------------|----------|
| FR-1.1 | Dialog shows two options | Frontend-only, not testable via API |
| FR-1.2 | Form shows title + client picker | Frontend-only |
| FR-1.3 | Submit creates program, redirects | API creation covered; redirect is frontend |

Verdict: FR-1 is a frontend concern. API-side creation is covered.

### FR-2: Client Picker with Inline Client Creation

| AC | Description | Coverage |
|----|-------------|----------|
| FR-2.1 | Searchable list of active clients | Existing endpoint, tested elsewhere |
| FR-2.2 | Add New Client inline | Existing endpoint, tested elsewhere |
| FR-2.3 | Reject clinician email | Existing endpoint behavior |

Verdict: FR-2 relies on pre-existing endpoints. No new backend code to test.

### FR-3: Program Creation (Backend) -- Core Feature

| AC | Description | Test Case | Status |
|----|-------------|-----------|--------|
| FR-3.1 | Program with isTemplate false, PUBLISHED, self-ref templateSourceId | creates a program with module and enrollment for a valid client | COVERED |
| FR-3.2 | Module with title Module 1 and sortOrder 0 | Same test | PARTIALLY COVERED (mock creates module but test does not assert module fields) |
| FR-3.3 | Enrollment with status ACTIVE | Same test | COVERED |
| FR-3.4 | 403 when client not owned by clinician | returns 403 when client does not belong to clinician | COVERED |

Verdict: All FR-3 acceptance criteria have test coverage. Minor gap on module field assertions.

### FR-4: Client Programs Tab Display

| AC | Description | Coverage |
|----|-------------|----------|
| FR-4.1 | Program appears in Client Programs tab | Not tested for this creation path |
| FR-4.2 | Program does NOT appear in My Programs tab | Not tested |

Verdict: Coverage gap. Query logic looks correct on code review but lacks integration test.

### FR-5: Promote to Template

| AC | Description | Coverage |
|----|-------------|----------|
| FR-5.1 | Promote creates template copy | Existing endpoint, tested in program test suite |

Verdict: Out of scope. Existing tests cover this.

---

## Compliance Condition Verification

### Condition 1: Server-side ownership check with 403 test

STATUS: PASS

The route performs clinicianClient.findFirst with clinicianId and status not DISCHARGED before any creation. Test returns-403-when-client-does-not-belong-to-clinician mocks findFirst returning null and asserts 403.

### Condition 2: Audit log coverage test

STATUS: FAIL -- NOT IMPLEMENTED

The compliance document requires an integration test verifying audit log entries for Program CREATE, Program UPDATE, Module CREATE, and Enrollment CREATE. No test references audit logs. The audit middleware runs via Prisma middleware so operations ARE audited in production, but tests use mocked Prisma so the middleware never fires.

Recommendation: Add a non-mocked integration test, or formally document that the generic Prisma audit middleware test suite covers all CREATE/UPDATE operations and update compliance conditions accordingly.

---

## Edge Cases Tested

| No | Edge Case | Test | Status |
|----|-----------|------|--------|
| 1 | Missing title | returns 400 when title is missing | COVERED |
| 2 | Missing clientId | returns 400 when clientId is missing | COVERED |
| 3 | No authentication | returns 401 without auth | COVERED |
| 4 | Participant role | returns 403 for participant role | COVERED |
| 5 | Client has no participant profile | returns 400 when client has no participant profile | COVERED |
| 6 | Client belongs to different clinician | returns 403 when client does not belong to clinician | COVERED |

### Edge Cases NOT Tested

| No | Edge Case | Risk | Recommendation |
|----|-----------|------|----------------|
| 7 | DISCHARGED client status | Medium | Route filters status not DISCHARGED. No test verifies 403 for a discharged client. |
| 8 | Title at max length (200 chars) | Low | Schema enforces max but no boundary test. |
| 9 | Title with only whitespace | Low | z.string().min(1) does not trim. A title of spaces passes validation. |
| 10 | Transaction failure / rollback | Low | No test for DB error during transaction. |
| 11 | Duplicate programs for same client | Low | No test confirming multiple programs allowed. |
| 12 | Empty string clientId | Low | Schema requires min(1) but no explicit test. |

---

## Issues Found

### HIGH: Compliance Condition 2 not met

Severity: High (compliance blocker)
Description: The compliance assessment requires an integration test verifying audit log entries for Program CREATE, Program UPDATE, Module CREATE, and Enrollment CREATE. This test does not exist.
Impact: Cannot satisfy compliance sign-off conditions as written.
Recommendation: Add audit log verification or formally document that the generic Prisma audit middleware test suite satisfies this requirement.

### MEDIUM: No test for DISCHARGED client rejection

Severity: Medium
Description: The route correctly filters status not DISCHARGED, but no test exercises this path. If this filter is removed, no test catches the regression.
Recommendation: Add a test where the client has DISCHARGED status, verifying 403.

### LOW: Module creation not asserted in response

Severity: Low
Description: Happy-path test verifies program and enrollment but does not assert module title or sortOrder.
Recommendation: Assert tx.module.create mock call arguments or include module in response.

### LOW: FR-4 client programs tab query untested

Severity: Low
Description: The GET /api/programs/client-programs query correctly picks up self-referencing programs, but no test verifies this for the new creation path.
Recommendation: Add a test to the programs test suite.

---

## Summary Table

| Category | Pass | Fail | N/A |
|----------|------|------|-----|
| FR-3 Acceptance Criteria | 4 | 0 | 0 |
| Compliance Conditions | 1 | 1 | 0 |
| Security (auth/authz) | 3 | 0 | 0 |
| Validation | 2 | 0 | 0 |
| Edge Cases | 6 covered | 0 | 6 untested |

---

## Verdict

**PASS_WITH_NOTES**

The core backend feature is well-tested with 7 tests covering the happy path, authentication, authorization, validation, and key edge cases. The implementation correctly uses a Prisma transaction, verifies client ownership, filters discharged clients, and sets the self-referencing templateSourceId.

Two items prevent a clean PASS:

1. Compliance Condition 2 (audit log test) is not met. Must be addressed before production -- either add the test or formally document that generic audit middleware coverage satisfies the requirement.
2. DISCHARGED client rejection has no dedicated test. The code handles it correctly but the behavior is unprotected against regression.

Status: IN_REVIEW
