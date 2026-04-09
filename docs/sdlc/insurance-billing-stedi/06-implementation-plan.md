# Insurance Billing & Claims via Stedi — Test Plan & Implementation Plan

## Test Strategy

**Framework:** Vitest (node environment for API, jsdom for web)
**API tests:** Supertest against Express app with mocked Prisma
**Schema tests:** Direct Zod schema validation
**External API:** Stedi client mocked in all tests (never call real Stedi in tests)
**Organization:** Tests organized by domain, each file independently runnable

## Test Plan

### Acceptance Criteria Coverage

| AC | Test File | Test Name | What It Verifies |
|----|-----------|-----------|-----------------|
| FR-1: Add insurance | `insurance.test.ts` | `creates insurance with valid data` | Upsert creates PatientInsurance |
| FR-1: Edit insurance | `insurance.test.ts` | `updates existing insurance` | PUT updates existing record |
| FR-1: Remove insurance | `insurance.test.ts` | `soft-deletes insurance` | Sets isActive=false |
| FR-1: View insurance | `insurance.test.ts` | `returns insurance for participant` | GET returns data |
| FR-1: Empty state | `insurance.test.ts` | `returns null when no insurance` | GET returns null |
| FR-2: Payer search | `insurance.test.ts` | Covered by eligibility tests (payer from Stedi) | Stedi payer search proxy |
| FR-3: Eligibility check | `insurance.test.ts` | `checks eligibility via Stedi` | POST triggers Stedi call |
| FR-3: No insurance | `insurance.test.ts` | `returns 404 when no insurance for eligibility` | Cannot check without insurance |
| FR-4: Claim submission | `claims.test.ts` | `creates claim for ATTENDED appointment` | POST creates claim |
| FR-4: Not ATTENDED | `claims.test.ts` | `rejects claim for non-ATTENDED appointment` | 400 if not ATTENDED |
| FR-4: No insurance | `claims.test.ts` | `rejects claim when no insurance` | 400 if no active insurance |
| FR-4: Duplicate claim | `claims.test.ts` | `rejects duplicate claim for appointment` | 409 if claim exists |
| FR-5: Diagnosis codes | `insurance.schema.test.ts` | `CreateClaimSchema requires diagnosisCodes` | At least 1 code required |
| FR-6: Claims list | `claims.test.ts` | `lists claims with cursor pagination` | GET returns paginated list |
| FR-6: Status filter | `claims.test.ts` | `filters claims by status` | Query param filters |
| FR-6: Claim detail | `claims.test.ts` | `returns claim with statusHistory` | GET /:id includes history |
| FR-6: Check status | `claims.test.ts` | `refreshes status for SUBMITTED claim` | POST refresh-status |
| FR-7: Resubmit rejected | `claims.test.ts` | `resubmits REJECTED claim` | PUT resubmit resets to DRAFT |
| FR-7: Cannot resubmit non-rejected | `claims.test.ts` | `rejects resubmit for non-REJECTED claim` | 409 for wrong status |
| FR-8: API key config | `stedi-config.test.ts` | `saves Stedi API key (owner only)` | PUT stores key |
| FR-8: Test connection | `stedi-config.test.ts` | `tests Stedi connection` | POST test endpoint |
| FR-8: Key masked | `stedi-config.test.ts` | `returns masked key` | GET shows last 4 only |
| FR-9: RTM nav removed | N/A (already done in layout.tsx) | Visual change only | |

### Compliance Coverage

| Condition | Test File | Test Name | What It Verifies |
|-----------|-----------|-----------|-----------------|
| COND-2: PHI encryption | `insurance.test.ts` | Verified via encryption middleware integration tests | subscriberId etc. encrypted |
| COND-3: Minimum necessary | `claims.test.ts` | `creates claim with only required fields` | No extra data in claim |
| COND-4: Claims scoped | `claims.test.ts` | `non-owner sees only own claims` / `owner sees all claims` | Ownership filtering |
| COND-5: State machine | `claims.test.ts` | `rejects invalid status transitions` | Multiple transition tests |
| COND-6: Response minimization | `claims.test.ts` | Stedi client response parsing (unit test in stedi-client) | Only required fields stored |
| COND-7: Audit logging | `insurance.test.ts` / `claims.test.ts` | Verified via runWithAuditUser mock calls | Audit context set |
| COND-9: Retention | `claims.test.ts` | `sets retentionExpiresAt on claim creation` | 7-year retention |
| COND-10: Key rotation | `stedi-config.test.ts` | `updates key immediately` / `non-owner cannot update` | No stale cache |

### Adversarial Coverage

| Scenario | Test File | Test Name | What It Verifies |
|----------|-----------|-----------|-----------------|
| Unauth access | All test files | `returns 401 without auth` | Auth required |
| Participant access | `insurance.test.ts` | `returns 403 for participant role` | Role check |
| Non-owner key update | `stedi-config.test.ts` | `rejects non-owner API key update` | Owner-only |
| Wrong participant ownership | `insurance.test.ts` | `returns 404 for unowned participant` | ClinicianClient check |
| Invalid claim transition | `claims.test.ts` | Multiple state machine tests | PAID→DRAFT etc. blocked |
| Schema injection | `insurance.schema.test.ts` | `rejects oversized strings` | max() bounds |

## Domain → Test File Mapping

| Domain | Test Files | Test Count |
|--------|-----------|------------|
| Patient Insurance + Eligibility | `packages/api/src/__tests__/insurance.test.ts` | ~18 |
| Claims Lifecycle | `packages/api/src/__tests__/claims.test.ts` | ~22 |
| Stedi Configuration | `packages/api/src/__tests__/stedi-config.test.ts` | ~12 |
| Zod Schemas | `packages/shared/src/__tests__/insurance.schema.test.ts` | ~16 |

## Implementation Plan

### Phase 1: Data Model + Schemas (Foundation)
1. Add Prisma models: PatientInsurance, InsuranceClaim, ClaimStatusHistory, DiagnosisCode + enums
2. Add stediApiKey field to Practice model
3. Add encrypted fields to encryption middleware
4. Run `prisma db push` + `prisma generate`
5. Create Zod schemas: insurance.ts, claim.ts, diagnosis-code.ts in `@steady/shared`
6. Seed ICD-10 diagnosis codes (~500 mental health codes)

### Phase 2: Services (Business Logic)
1. `stedi-client.ts` — HTTP client for all Stedi API calls
2. `stedi-config.ts` — Practice API key get/set/test
3. `patient-insurance.ts` — Insurance CRUD + eligibility caching
4. `claims.ts` — Claim lifecycle + state machine + 837P payload builder
5. `diagnosis-codes.ts` — ICD-10 search + recent codes per participant
6. Register pg-boss workers: `stedi-claim-submit`, `stedi-status-poll`

### Phase 3: Routes (API Endpoints)
1. `routes/insurance.ts` — Insurance CRUD + eligibility
2. `routes/claims.ts` — Claims CRUD + status + resubmit
3. `routes/payers.ts` — Payer search proxy
4. `routes/diagnosis-codes.ts` — ICD-10 search
5. Extend `routes/config.ts` — Stedi key management
6. Register all routes in `app.ts`

### Phase 4: Frontend (Web UI)
1. Hooks: use-insurance, use-claims, use-diagnosis-codes, use-payers
2. Insurance tab on participant detail page
3. Eligibility card component
4. Claim submission dialog (auto-prompt after ATTENDED)
5. ICD-10 diagnosis code picker
6. Claims dashboard page
7. Claim detail page with status timeline
8. Stedi config section in Practice Settings
9. Add "Claims" to sidebar nav

### Phase 5: Verification
1. Run all test suites — all tests must pass
2. Manual smoke test of full flows
3. Verify compliance conditions (encryption, audit logs, access control)

## Summary

- Total test files: 4
- Total tests: ~68
- AC coverage: 22/22 (FR-9 is visual-only, already done)
- Compliance coverage: 8/10 (COND-1 and COND-8 are legal/process gates, not testable in code)
- Adversarial tests: 6+
