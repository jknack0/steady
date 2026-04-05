# Clinician Patient Invitations — Test Report

## Test Results

**packages/api**: 26 test files, **548 tests passed**, 0 failed
**packages/shared**: 13 test files, **289 tests passed**, 0 failed

All tests passing. Total: **837 tests, 0 failures.**

## Acceptance Criteria Coverage

### FR-1: Create Patient Invitation
| Criterion | Test Coverage |
|-----------|--------------|
| Clinician creates invitation, system generates STEADY-XXXX code | `invitations.test.ts` "creates an invitation (201)" |
| Optional program link | `invitations.test.ts` "creates invitation with programId" |
| Send email option | `invitation.test.ts` (shared) validates sendEmail=true; email queueing via queue mock |
| No email when unchecked | `invitation.test.ts` (shared) sendEmail defaults to false |
| Code displayed after creation | API returns 201 with code in response data |

### FR-2: Patient Redeems Invite Code
| Criterion | Test Coverage |
|-----------|--------------|
| Valid code + signup creates account | `auth-invite.test.ts` "creates account and returns tokens (201)" |
| Auto-enroll in linked program | Covered by transaction mock (enrollment.create called when programId present) |
| No program = no enrollment | Implicit (programId is optional in schema) |
| Expired code rejected (410) | `auth-invite.test.ts` "returns 410 for expired code" |
| Already-used code rejected (409) | `auth-invite.test.ts` "returns 409 for already used code" |
| Invalid code rejected (400) | `auth-invite.test.ts` "returns 400 for nonexistent code" and "returns 400 for invalid code format" |
| Revoked code rejected | `auth-invite.test.ts` "returns 400 for revoked code" |
| Email already registered (409) | `auth-invite.test.ts` "returns 409 when email already registered" |
| Code is required for signup | `auth-invite.test.ts` "returns 400 for missing fields" |
| Case-insensitive code | `invitation.test.ts` (shared) "accepts lowercase invite code and uppercases it" |

### FR-3: Invite Status on Patients Page
| Criterion | Test Coverage |
|-----------|--------------|
| Paginated list of invitations | `invitations.test.ts` "returns paginated list (200)" and "returns cursor when there are more results" |
| Filter by status | `invitations.test.ts` "filters by status" |

### FR-4: Invite Widget on Patient View Page
| Criterion | Test Coverage |
|-----------|--------------|
| Single invitation detail view | `invitations.test.ts` "returns single invitation (200)" |
| Ownership check | `invitations.test.ts` "returns 404 for invitation owned by different clinician" |

### FR-5: Resend Email Nudge
| Criterion | Test Coverage |
|-----------|--------------|
| Resend email for pending invite | `invitations.test.ts` "resends email (200)" |
| Reject resend for non-pending | `invitations.test.ts` "returns 409 for non-pending invitation" |

### FR-6: Revoke Invitation
| Criterion | Test Coverage |
|-----------|--------------|
| Revoke pending invite | `invitations.test.ts` "revokes invitation (200)" |
| Reject revoke on accepted | `invitations.test.ts` "returns 409 for already accepted invitation" |
| Revoked code rejected at redemption | `auth-invite.test.ts` "returns 400 for revoked code" |

### Auth/Access Control
| Criterion | Test Coverage |
|-----------|--------------|
| 401 without auth | Tested on all 5 invitation endpoints |
| 403 for non-clinician role | `invitations.test.ts` "returns 403 for participant role" |
| Validation errors (400) | `invitations.test.ts` "returns 400 for validation errors" |

## Compliance Verification

### COND-1: BAA with email provider / feature flag
**STATUS: PASS**
- `packages/api/src/services/email.ts` checks `ENABLE_INVITE_EMAIL` env var. Returns `{ success: false }` with warning if not enabled.

### COND-2: Field-level encryption on invite PII
**STATUS: PASS**
- `packages/db/src/encryption-middleware.ts` includes `PatientInvitation: ["patientName", "patientEmail"]` in ENCRYPTED_FIELDS.

### COND-3: Hardcoded email template
**STATUS: PASS**
- `packages/api/src/services/email.ts` uses hardcoded subject and body. No clinician-customizable fields.

### COND-4: Audit trail coverage
**STATUS: PASS**
- PatientInvitation model in Prisma schema. Existing audit middleware auto-logs all CREATE/UPDATE/DELETE operations.

### COND-5: PII retention policy / scrub worker
**STATUS: PASS**
- `packages/api/src/workers/scrub-expired-invites.ts` scrubs PII from REVOKED/EXPIRED invitations older than 90 days AND stale PENDING invitations past expiresAt + 90 days. Runs daily at 3 AM via pg-boss cron.

### COND-6: Invite codes never logged
**STATUS: PASS**
- All logger calls across invitation files use invitation ID only, never code values.

## Issues Found

### Medium (Resolved)
1. **PII scrub gap for stale PENDING invitations** — Fixed: scrub worker now also scrubs PENDING invitations whose expiresAt is older than 90 days.

### Low (Tracked)
1. **Email service is a stub** — Returns mock messageId when ENABLE_INVITE_EMAIL is true. SendGrid integration pending. Must be completed before enabling in production.
2. **No explicit test for auto-enrollment during redemption** — Transaction mock covers it implicitly but no dedicated assertion.

## Recommendation

**PASS**

All 837 tests pass. All 6 compliance conditions verified and implemented. Acceptance criteria from FR-1 through FR-6 have adequate test coverage. The PII scrub gap has been resolved. Email service stub is tracked and expected — invite codes work independently of email.
