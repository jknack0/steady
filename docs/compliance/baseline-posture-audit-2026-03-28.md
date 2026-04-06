# HIPAA Baseline Posture Audit -- Steady with ADHD

**Date:** 2026-03-28
**Auditor:** Claude Code (technical guidance -- not legal advice)
**Scope:** Patient data storage/encryption, audit logging, email capabilities, authentication/authorization, patients page data model

---

## 1. Patient Data Storage and Encryption

### 1.1 Database Schema -- PHI Inventory

| Model | PHI Fields | PHI Type | Encrypted (Field-Level) |
|-------|-----------|----------|------------------------|
| User | email, firstName, lastName, passwordHash | Direct identifiers | No |
| JournalEntry | responses, freeformContent, regulationScore | Health data | No |
| Session | clinicianNotes, participantSummary | Clinical notes (high sensitivity) | No |
| PartProgress | responseData (assessment/intake responses) | Health data | No |
| HomeworkInstance | content, response | Health data | No |
| DailyTrackerEntry | responses (mood, symptoms) | Health data | No |
| RtmEnrollment | diagnosisCodes, payerName, subscriberId, groupNumber | Diagnoses + insurance | subscriberId, groupNumber: Yes |
| ClinicianBillingProfile | npiNumber, taxId, licenseNumber, practiceAddress, practicePhone | Provider PII + tax | npiNumber, taxId, licenseNumber: Yes |

### 1.2 Encryption Implementation

Files: packages/db/src/encryption-middleware.ts and packages/db/src/crypto.ts

Transparent Prisma middleware: encrypt on write, decrypt on read.

- Algorithm: AES-256-GCM (NIST-approved, authenticated encryption)
- IV: 12-byte random per operation (correct for GCM)
- Key: FIELD_ENCRYPTION_KEY env var, base64-encoded 32-byte key
- Dev fallback: Deterministic scrypt-derived key in non-production
- Format: enc:[iv]:[authTag]:[ciphertext] -- supports gradual migration from plaintext
- Middleware order: Encryption innermost, then audit (correct)

Currently encrypted: RtmEnrollment.subscriberId, RtmEnrollment.groupNumber, ClinicianBillingProfile.npiNumber, ClinicianBillingProfile.taxId, ClinicianBillingProfile.licenseNumber

Positive findings:
- AES-256-GCM provides confidentiality + integrity
- Random IV per operation prevents deterministic ciphertext attacks
- Transparent encrypt/decrypt via Prisma middleware is clean and maintainable
- enc: prefix supports incremental migration from plaintext data

### 1.3 Encryption Gaps

| Priority | Field | Rationale |
|----------|-------|-----------|
| Critical | Session.clinicianNotes | Clinical psychotherapy notes -- highest sensitivity |
| Critical | Session.participantSummary | Patient-authored clinical content |
| Critical | JournalEntry.freeformContent | Patient mental health narratives |
| Critical | JournalEntry.responses (JSON) | Structured health data |
| Critical | RtmEnrollment.diagnosisCodes (JSON) | ICD-10 diagnosis codes |
| High | PartProgress.responseData (JSON) | Assessment and intake form responses |
| High | HomeworkInstance.response (JSON) | Patient health-related responses |
| High | DailyTrackerEntry.responses (JSON) | Daily symptom/mood tracking |
| Medium | User.email | Direct identifier |
| Medium | ClinicianBillingProfile.practiceAddress, practicePhone | Provider PII |

Note: JSON columns require serializing to string before encryption. The existing middleware supports this with minor modifications.

### 1.4 Database-Level Encryption at Rest

Cannot verify from code whether PostgreSQL has disk-level encryption. Must confirm with infrastructure team.

---

## 2. Audit Logging

### 2.1 Current Implementation

File: packages/db/src/audit-middleware.ts

Prisma middleware with AsyncLocalStorage for user context. Logs all CREATE/UPDATE/DELETE mutations automatically.

What is logged: userId, action (CREATE/UPDATE/DELETE), resourceType, resourceId, metadata (changed field names only, never values), timestamp

What is NOT logged (HIPAA-safe design): Field values, request bodies, IP addresses, full error objects

Positive findings:
- Automatic mutation coverage without manual instrumentation
- Fire-and-forget (non-blocking) -- audit failures do not break the app
- AuditLog excluded from self-auditing (no recursion)
- Metadata contains only field names, never PHI values
- HIPAA-safe logger strips PII from error objects

### 2.2 Audit Logging Gaps

| ID | Issue | HIPAA Ref | Severity |
|----|-------|-----------|----------|
| A-001 | READ operations not audited. Middleware only captures mutations. | 164.312(b) | Critical |
| A-002 | IP address not captured. Important for breach investigation. | 164.312(b) | High |
| A-003 | No user agent or session ID. Would strengthen forensics. | 164.312(b) | Medium |
| A-004 | console.error in audit failure path (line 141). Should use HIPAA-safe logger. | Best practice | Low |
| A-005 | Dead ACTION_MAP variable (lines 40-48). Incorrect mapping never used. | Code quality | Low |
| A-006 | Bulk operations log resourceId as "bulk" with only count. | 164.312(b) | Medium |

### 2.3 Audit Log Retention

No automated retention policy. Retains indefinitely (meets 6-year HIPAA minimum) but needs documented policy.

---

## 3. Email Sending Capabilities

### 3.1 Current State: No Email Infrastructure

There is no email sending capability in the codebase. Search for sendgrid, nodemailer, smtp, resend, postmark, mailgun, ses found zero matches.

The participants page UI says "They will receive an email to set up their account" -- this is aspirational copy, no email is sent.

### 3.2 Current Invitation Flow

POST /api/clinician/clients:
1. If email not found, placeholder User created with bcrypt(crypto.randomUUID()) as password
2. ClinicianClient record created with status INVITED
3. ClientConfig auto-created from clinician defaults
4. No notification sent to the patient

Same in enrollment creation (routes/enrollments.ts): placeholder with bcrypt(Math.random().toString(36)) -- cryptographically weak.

### 3.3 Implications for Invitations Feature

- Need transactional email service with signed BAA
- Email content must never contain PHI beyond minimum necessary
- Need secure invitation tokens (time-limited, single-use, hashed in DB)
- Must replace placeholder password pattern

---

## 4. Authentication and Authorization

### 4.1 Authentication Flow

| Component | Implementation | Assessment |
|-----------|---------------|------------|
| Access token | JWT, 30-min expiry | Good -- short-lived |
| Refresh token | 48-byte random, 7-day expiry, DB-backed | Good |
| Token rotation | Single-use with family-based reuse detection | Excellent |
| Password hashing | bcrypt cost factor 12 | Good |
| Rate limiting | Login 5/15min, Register 3/hour, Refresh 30/15min | Good |
| Web token storage | localStorage | Risk -- see AUTH-001 |
| Mobile token storage | Expo Secure Store | Good |

Positive findings:
- Refresh token reuse detection invalidates entire family on replay
- Logout revokes entire token family
- Generic login errors prevent user enumeration
- Per-email rate limiting prevents credential stuffing

### 4.2 Authorization Patterns

- Role-based: requireRole("CLINICIAN"), requireRole("PARTICIPANT"), requireRole("ADMIN")
- Resource ownership: clinician routes verify clinicianProfileId owns the program
- Cross-tenant isolation: programs scoped to clinicianId
- Audit context: runWithAuditUser() in authenticate middleware

### 4.3 Findings

| ID | Issue | HIPAA Ref | Severity |
|----|-------|-----------|----------|
| AUTH-001 | JWT in localStorage. Vulnerable to XSS. Should use httpOnly secure cookies. | 164.312(d) | High |
| AUTH-002 | No session inactivity timeout. Auto-refresh creates infinite sessions. Need 15-min idle timer. | 164.312(a)(2)(iii) | Critical |
| AUTH-003 | Weak placeholder passwords. Math.random() has ~52 bits entropy. No way for invited user to set password. | 164.312(d) | High |
| AUTH-004 | No Cache-Control: no-store headers. PHI responses may be cached. | 164.312(e)(1) | High |
| AUTH-005 | pushTask lacks ownership check. Any clinician can push tasks to any participant by ID. | 164.312(a)(1) | High |
| AUTH-006 | unlockModule lacks ownership check. enrollmentId not verified against clinician. | 164.312(a)(1) | High |
| AUTH-007 | Bulk action lacks ownership check. participantIds not filtered to clinician scope. | 164.312(a)(1) | High |

---

## 5. Patients Page Data Model

### 5.1 Dual Data Model

Model 1 (Enrollment-based): Program -> Enrollment -> ParticipantProfile -> User. Scoped by program.clinicianId.

Model 2 (Direct client): ClinicianClient (clinicianId, clientId). Status: INVITED | ACTIVE | PAUSED | DISCHARGED. Independent of enrollment.

Participants page merges both: enrollments first, then ClinicianClient for unenrolled clients.

### 5.2 addClient Service (services/clinician.ts lines 871-979)

1. Lookup user by email (case-insensitive, trimmed)
2. Block if user is CLINICIAN role
3. Create placeholder User + ParticipantProfile if not found
4. Upsert ClinicianClient with INVITED status
5. Auto-create ClientConfig from clinician defaults

No email, no invitation token, no way for patient to claim the account.

### 5.3 Findings

| ID | Issue | HIPAA Ref | Severity |
|----|-------|-----------|----------|
| PAT-001 | Email in patient list table. May exceed minimum necessary for list view. | 164.502(b) | Low |
| PAT-002 | Search runs client-side on full dataset. Transmits more PHI than needed. | 164.502(b) | Medium |
| PAT-003 | Hard take: 200 cap without cursor pagination. | Usability | Low |

---

## Summary of Findings

### Critical (Must Fix Before New Feature)

| ID | Issue | Remediation |
|----|-------|-------------|
| A-001 | READ operations not audited | Add read audit logging for PHI-containing models |
| AUTH-002 | No session inactivity timeout | Implement 15-min idle timer that triggers logout |

### High (Should Fix Soon)

| ID | Issue | Remediation |
|----|-------|-------------|
| AUTH-001 | JWT in localStorage (XSS risk) | Migrate to httpOnly secure cookies |
| AUTH-003 | Weak placeholder passwords | Implement proper invitation token flow |
| AUTH-004 | No Cache-Control headers | Add no-store middleware for /api/ routes |
| AUTH-005 | pushTask lacks ownership check | Verify clinician-patient relationship |
| AUTH-006 | unlockModule lacks ownership check | Verify enrollment belongs to clinician |
| AUTH-007 | Bulk action lacks ownership check | Filter to clinician scope |
| A-002 | No IP in audit logs | Extend audit context |
| ENC | Clinical notes, journals, diagnoses unencrypted | Add to ENCRYPTED_FIELDS map |

### Medium

| ID | Issue | Remediation |
|----|-------|-------------|
| A-003 | No user agent/session in audit | Extend audit context |
| A-006 | Bulk ops lose audit granularity | Log individual IDs |
| PAT-002 | Search client-side on full dataset | Push to DB WHERE clause |

### Low

| ID | Issue | Remediation |
|----|-------|-------------|
| A-004 | console.error in audit failure | Replace with logger |
| A-005 | Dead ACTION_MAP variable | Remove dead code |
| PAT-001 | Email in list view | Move to detail page only |
| PAT-003 | Hard take limit on clients | Add cursor pagination |

---

## Positive Findings

1. AES-256-GCM field-level encryption with proper IV handling and transparent Prisma middleware
2. Automatic audit logging of all mutations via Prisma middleware with AsyncLocalStorage
3. Audit metadata never contains PHI values -- only field names
4. HIPAA-safe logger strips PII from error objects, limits stack traces to non-production
5. Refresh token rotation with reuse detection -- strong anti-theft pattern
6. Rate limiting on auth endpoints with per-email tracking
7. Resource ownership verification on most clinician routes
8. Soft delete for Parts (deletedAt) preserving audit trail
9. bcrypt cost factor 12 for password hashing
10. Expo Secure Store for mobile tokens

---

## Relevance to Clinician Patient Invitations Feature

1. No email infrastructure exists. Need transactional email service with signed BAA.
2. Placeholder password pattern must be replaced. Need invitation token flow (time-limited, single-use, hashed).
3. Invitation emails must not contain PHI beyond minimum necessary.
4. Audit logging of invitation events (sent, opened, accepted, expired) is required.
5. ClinicianClient model has right structure but needs invitation token field and expiry.
6. READ audit logging should be in place before adding new PHI-accessing features.
7. Session timeout must be implemented before expanding clinician dashboard.

---

Recommendation: Address AUTH-002 (session timeout), AUTH-003 (placeholder passwords), AUTH-005/006/007 (ownership checks), and encryption gaps before or concurrently with the invitation feature. The invitation feature should introduce email infrastructure (with BAA) and the invitation token flow.

Final compliance decisions should involve qualified legal counsel and a designated Privacy Officer.

---

Status: FINDINGS_READY
