# Sprint 19: Appointment Entity + Clinician Calendar — QA Test Plan & Report

> **Status:** Initial test plan (pre-implementation). This document will be updated with verification results after engineering completes.

## Verdict: PENDING — awaiting implementation

## Test File Layout

```
packages/api/src/__tests__/
  appointments.test.ts              # ~45 integration tests (primary FR coverage + COND)
  appointments.service.test.ts      # ~12 unit tests (detectConflicts, serializers, guards)
  appointments-audit.test.ts        # ~8 audit-specific assertions (COND-4/5/6)
  locations.test.ts                 # ~14 integration tests
  service-codes.test.ts             # ~8 integration tests (incl. seed idempotency)
  participants-search.test.ts       # ~6 integration tests (COND-9)
  helpers.ts                        # EXTEND with appointment-domain helpers

packages/shared/src/__tests__/
  appointment.schema.test.ts        # ~10 schema unit tests
  location.schema.test.ts           # ~5 schema unit tests
  service-code.schema.test.ts       # ~3 schema unit tests

apps/web/src/__tests__/appointments/
  Calendar.test.tsx                 # ~4 tests — view switching, empty state, filters URL
  AppointmentModal.test.tsx         # ~8 tests — create, edit, terminal, validation, conflict banner
  AppointmentStatusPopover.test.tsx # ~5 tests — status change, cancellation reason, optimistic rollback
  ClientSearchSelect.test.tsx       # ~4 tests — debounce, min length, add-new flow
  useAppointments.test.ts           # ~3 tests — hook cache keys, invalidation
```

**Total new tests:** ~135 (the "~70" figure in the spec referred to API tests only; full system including schema + web brings the count higher).

## Test Helpers to Add (`packages/api/src/__tests__/helpers.ts`)

```ts
// Appointment domain helpers
export async function mockLocation(practiceId: string, overrides?: Partial<Location>): Promise<Location>;
export async function mockServiceCode(practiceId: string, overrides?: Partial<ServiceCode>): Promise<ServiceCode>;
export async function mockAppointment(params: {
  practiceId: string; clinicianId: string; participantId: string;
  serviceCodeId: string; locationId: string; createdById: string;
  startAt?: Date; endAt?: Date; status?: AppointmentStatus;
}): Promise<Appointment>;

// Multi-tenant setup
export async function seedTwoPractices(): Promise<{
  practiceA: { practice, owner, clinician, participant, serviceCode, location, ownerToken, clinicianToken };
  practiceB: { practice, owner, clinician, participant, serviceCode, location, ownerToken };
}>;

// Cross-tenant assertion
export async function assertCrossTenant404(opts: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  url: string;
  tokenForOtherTenant: string;
  body?: unknown;
}): Promise<void>;
```

## Coverage Targets (CLAUDE.md NFR-5d)

- `packages/api`: >80% line coverage maintained
- `packages/shared`: >80% line coverage maintained
- Every acceptance criterion (FR-1..FR-18 ACs) → ≥1 test
- Every mandatory condition (COND-1..COND-14) → ≥1 dedicated test
- Web coverage: critical flows only (not a blocker)

---

## Acceptance Criteria → Test Traceability

### FR-1: Appointment creation
| AC | Test |
|---|---|
| Happy path create | `appointments.test.ts > POST /appointments > creates appointment with SCHEDULED status` |
| Missing required fields → 400 | `... > rejects missing fields with 400` |
| endAt <= startAt → 400 | `... > rejects endAt <= startAt` |
| Cross-tenant serviceCodeId → 404 | `... > returns 404 for cross-tenant serviceCode` |
| Cross-tenant locationId → 404 | `... > returns 404 for cross-tenant location` |
| Cross-tenant participantId → 404 | `... > returns 404 for cross-tenant participant` |
| Audit log on create | `appointments-audit.test.ts > writes audit row on create` |
| Default type INDIVIDUAL | `... > defaults appointmentType to INDIVIDUAL` |
| GROUP type → 400 | `... > rejects GROUP appointment type` |

### FR-2: Appointment retrieval
| AC | Test |
|---|---|
| Own appointment → full object | `GET /appointments/:id > returns clinician view with internalNote` |
| Cross-tenant → 404 | `... > returns 404 for other practice's appointment` |
| Non-existent ID → 404 | `... > returns 404 for unknown id` |
| Account owner → practice-wide | `... > account owner can view any appointment in practice` |

### FR-3: Listing (calendar query)
| AC | Test |
|---|---|
| Date-range overlap query | `GET /appointments > returns appointments overlapping range` |
| Cursor pagination, 100/page | `... > returns cursor when >100 results` |
| Cursor next page | `... > cursor returns next page` |
| Missing range → 400 | `... > rejects missing startAt/endAt` |
| >62 day range → 400 (COND-14) | `... > rejects range >62 days` |
| locationId filter | `... > filters by locationId` |
| Status multi-filter | `... > filters by multi-value status` |
| clinicianId by non-owner → 404 | `... > returns 404 when non-owner queries other clinician` |
| clinicianId by owner → works | `... > account owner can query other clinician` |

### FR-4: Editing
| AC | Test |
|---|---|
| PATCH mutable fields | `PATCH /appointments/:id > updates mutable fields` |
| Strip immutable fields | `... > ignores participantId/practiceId/clinicianId in body` |
| endAt<=startAt → 400 | `... > rejects invalid time range` |
| Non-owner → 404 | `... > returns 404 for non-owner` |
| Terminal status + note edit → 200 | `... > allows internalNote edit on terminal status` |
| Terminal status + time edit → 409 | `... > rejects scheduling change on terminal status` |
| Audit on update | `appointments-audit.test.ts > writes UPDATE audit with changedFields` |

### FR-5: Status transitions
| AC | Test |
|---|---|
| SCHEDULED → ATTENDED | `POST /appointments/:id/status > transitions SCHEDULED to ATTENDED` |
| All transitions allowed | `... > allows any-to-any transition` |
| Invalid status → 400 | `... > rejects invalid status value` |
| cancelReason persisted | `... > persists cancelReason on cancellation` |
| statusChangedAt server-set | `... > sets statusChangedAt to now` |
| Future ATTENDED allowed | `... > allows marking future appointment ATTENDED` |
| Audit from/to metadata | `appointments-audit.test.ts > writes status transition with from/to` |

### FR-6: Deletion (hard delete guard)
| AC | Test |
|---|---|
| Happy path delete | `DELETE /appointments/:id > deletes SCHEDULED <24h appointment` |
| Non-SCHEDULED → 409 | `... > rejects non-SCHEDULED status` |
| >24h old → 409 | `... > rejects >24h old appointment` |
| Linked Session → 409 | `... > rejects delete when linked session exists` |
| Non-owner → 404 | `... > returns 404 for non-owner` |
| Audit on delete | `appointments-audit.test.ts > writes DELETE audit` |

### FR-7: Conflict detection (warn-only)
| AC | Test |
|---|---|
| Overlap returns conflicts array | `POST /appointments > returns conflicts: [id] on overlap` |
| No conflicts | `... > returns conflicts: [] when no overlap` |
| Canceled excluded | `appointments.service.test.ts > detectConflicts excludes canceled statuses` |
| No-show excluded | `... > detectConflicts excludes NO_SHOW` |
| Cross-practice isolation | `... > detectConflicts never returns cross-practice ids` |

### FR-8: Location management
| AC | Test |
|---|---|
| Default locations seeded | `locations.test.ts > seeds Main Office + Telehealth on first access` |
| POST by account owner | `POST /locations > creates location for account owner` |
| PATCH | `PATCH /locations/:id > updates location` |
| Soft-delete (no refs) | `DELETE /locations/:id > soft-deletes when unused` |
| Soft-delete blocked by refs → 409 | `... > returns 409 when referenced by active appointment` |
| GET by clinician | `GET /locations > returns active locations` |
| Non-owner POST/PATCH/DELETE → 403 | `... > non-owner gets 403 on writes` |

### FR-9: Service codes
| AC | Test |
|---|---|
| 15 default codes seeded | `service-codes.test.ts > seeds 15 codes on first access` |
| Seed idempotent | `... > seeding twice does not duplicate` |
| GET returns active | `GET /service-codes > returns active codes ordered by code` |
| POST/PATCH/DELETE → 405 | `... > writes return 405` |
| Inactive code hidden | `... > excludes inactive codes from list` |
| Inactive code in appointment → 400 | `appointments.test.ts > rejects creating with inactive service code` |

### FR-10: Participant enrollment decoupling
| AC | Test |
|---|---|
| Appointment with un-enrolled participant | `appointments.test.ts > creates appointment with participant having no enrollments` |
| Create client without enrollment | `participants-search.test.ts > POST /participants creates profile without enrollment` |
| Existing queries handle empty enrollments | (Audited during engineering; regression tests in existing suites) |

### FR-11: Session–Appointment linkage
| AC | Test |
|---|---|
| Migration adds nullable appointmentId | `appointments.test.ts > Session has nullable appointmentId column` (schema reflection or integration) |
| Existing Sessions have NULL | (verified via migration test) |
| Delete appointment → Session.appointmentId = NULL | `appointments.test.ts > Session.appointmentId set to null when appointment deleted (COND-12)` |

### FR-12: Internal note field
| AC | Test |
|---|---|
| Note persisted | `appointments.test.ts > persists internalNote up to 500 chars` |
| >500 chars → 400 | `... > rejects internalNote >500 chars` |
| Never exposed to participant | `appointments.service.test.ts > toParticipantView strips internalNote (COND-7)` |
| Clipped preview in UI | `AppointmentCard.test.tsx > clips internalNote preview to 80 chars` |

### FR-13: Calendar UI day/week/month
| AC | Test |
|---|---|
| Week view default | `Calendar.test.tsx > loads week view of current week` |
| Toggle to day | `... > switches to day view` |
| Toggle to month | `... > switches to month view` |
| Prev/Next/Today | `... > navigation buttons update date range` |
| Click empty slot → modal | `... > opens create modal on empty slot click` |
| Click card → edit modal | `... > opens edit modal on card click` |
| Card displays all fields | `AppointmentCard.test.tsx > renders client, time, code, location, status, note` |
| Empty state CTA | `Calendar.test.tsx > shows empty state CTA when no appointments` |

### FR-14: Calendar filters
| AC | Test |
|---|---|
| Multi-select filters | `Calendar.test.tsx > applies location and status filters` |
| URL sync | `... > encodes filters to query params` |
| Clear filters | `... > clears filters on button click` |
| Account owner clinician filter | `... > account owner sees clinician filter` |

### FR-15: Create/Edit modal
| AC | Test |
|---|---|
| All fields present | `AppointmentModal.test.tsx > renders all required fields in create mode` |
| Searchable client dropdown | `ClientSearchSelect.test.tsx > searches after 2 chars with debounce` |
| Add new client inline | `... > opens add-new panel and creates client` |
| Edit mode prefills | `AppointmentModal.test.tsx > prefills fields in edit mode` |
| Edit client read-only | `... > client field is read-only in edit mode` |
| Terminal status only-note | `... > disables all fields except internalNote on terminal status` |
| Dirty close confirm | `... > shows discard confirm when dirty` |
| Conflict banner after save | `... > shows conflict banner when response has conflicts` |

### FR-16: Status quick actions
| AC | Test |
|---|---|
| Popover opens on badge | `AppointmentStatusPopover.test.tsx > opens on badge click` |
| Cancellation reveals reason | `... > shows cancelReason input for cancellation statuses` |
| Optimistic update | `... > updates card color optimistically` |
| Rollback on error | `... > rolls back on API error` |

### FR-17: Time zone handling
| AC | Test |
|---|---|
| Store UTC | `appointment.schema.test.ts > accepts ISO with TZ and coerces` |
| Return UTC | `appointments.test.ts > returns startAt/endAt as ISO Z` |
| Display in clinician TZ | `Calendar.test.tsx > renders times in clinician timezone` |

### FR-18: Audit logging
| AC | Test |
|---|---|
| Audit on all mutations | `appointments-audit.test.ts > CREATE/UPDATE/DELETE all write audit rows` |
| changedFields present | `... > audit metadata contains changedFields array` |
| Status from/to metadata | `... > status transition audit includes from and to` |
| runWithAuditUser context | `... > audit row has userId from JWT` |

---

## Compliance Conditions → Test Traceability

| Condition | Test |
|---|---|
| **COND-1** Tenant isolation at service layer | `appointments.test.ts > assertCrossTenant404 applied to all 11 endpoints` — 11 tests |
| **COND-2** Cross-tenant 404 (not 403) | Same 11 tests assert response code is 404, not 403 |
| **COND-3** Auth on every endpoint | `appointments.test.ts > 401 without token, 403 with participant token` — 22 assertions (2 per endpoint) |
| **COND-4** Audit coverage on every mutation | `appointments-audit.test.ts > writes audit row for create/update/delete/status` |
| **COND-5** Audit PHI-free | `appointments-audit.test.ts > internalNote update audit has no PHI values` |
| **COND-6** Audit context propagation | `appointments-audit.test.ts > audit row userId matches JWT userId` + `> no audit rows on 401 request` |
| **COND-7** Participant view strips PHI | `appointments.service.test.ts > toParticipantView omits internalNote, cancelReason, createdById, statusChangedAt` |
| **COND-8** Logs contain no PHI | `appointments.test.ts > smoke log test with known-PHI payload greps logger output for zero matches` |
| **COND-9** Search rate limit + min length + hashed audit | `participants-search.test.ts` — 3 dedicated tests |
| **COND-10** Server-only timestamps | `appointments.test.ts > PATCH with bogus statusChangedAt ignores input, uses server now` |
| **COND-11** Hard delete guards | `appointments.test.ts > 4 delete guard tests (happy, wrong status, >24h, linked session)` |
| **COND-12** Session FK SetNull | `appointments.test.ts > delete appointment nullifies linked Session.appointmentId` |
| **COND-13** Zod strict parsing | `appointment.schema.test.ts > unknown fields stripped` + route-level `extra field silently ignored` |
| **COND-14** 62-day range cap | `appointments.test.ts > GET /appointments > rejects range >62 days` |

---

## Adversarial Tests (malicious user mindset)

| Attack | Test |
|---|---|
| JWT forgery (tampered payload) | Existing auth suite — not new; confirm covered |
| SQL injection in search query | `participants-search.test.ts > SQL payload in q does not break query` |
| XSS in internalNote | `appointments.test.ts > internalNote is stored verbatim` + web renders via React (auto-escaped) |
| Huge body DoS | `appointments.test.ts > 501-char internalNote → 400` |
| Rapid-fire create spam | `participants-search.test.ts > 31st search in 60s → 429` |
| Time zone confusion (DST edge) | `appointments.service.test.ts > overlap detection across DST boundary` |
| Negative date range (endAt < startAt in query) | `appointments.test.ts > returns empty array or 400` |
| Status transition race (two clients changing simultaneously) | Acknowledged — last-write-wins is acceptable for sprint 19; audit log is source of truth |
| Concurrent delete + edit | Prisma default optimistic locking; acknowledged as low risk |

---

## Test Infrastructure Notes

- Tests run against `steady_adhd_test` database with `prisma db push --force-reset` between test files (existing pattern).
- `authenticate` middleware mocked via `createTestToken` helper (existing).
- Audit context already flows via `runWithAuditUser` — tests inspect `AuditLog` rows directly via prisma.
- Web tests use MSW for API mocking (existing setup).

## Coverage Gate

```bash
# Before sign-off, run:
npx vitest run --coverage packages/api packages/shared
# Require: api.lines >= 80, shared.lines >= 80
```

## Sign-off Criteria

QA will sign off only when:
1. All ~135 tests are implemented and GREEN
2. `packages/api` + `packages/shared` coverage ≥80%
3. Every FR acceptance criterion maps to a passing test
4. Every COND-1..COND-14 maps to a passing test
5. No critical or high issues open
6. `turbo run test` passes across all packages
7. `turbo run lint` and `turbo run typecheck` pass
8. Verification evidence (test output) is appended to this document

**Signed:** QA Engineer
**Date:** 2026-04-05 (plan)
**Verification date:** (pending)
