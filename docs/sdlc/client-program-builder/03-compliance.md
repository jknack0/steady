# Client Program Builder -- Compliance Assessment

**Date:** 2026-03-30
**Assessor:** Claude Code (automated HIPAA compliance review)
**Feature Spec:** docs/sdlc/client-program-builder/02-spec.md
**Disclaimer:** This is technical guidance, not legal advice. Final compliance decisions should involve qualified legal counsel and a designated Privacy Officer.

---

## Overall Verdict

**PASS_WITH_CONDITIONS**

This feature follows established patterns in the codebase that already address most HIPAA requirements (audit middleware, role-based access, PII-safe logging, ownership verification). Two conditions must be met before production deployment.

---

## Regulatory Framework

| Regulation | Applicability |
|------------|--------------|
| HIPAA Privacy Rule (45 CFR 164.502-514) | **Applies.** Feature creates and links patient records (enrollment, program assignment) and creates new participant user accounts containing direct identifiers (name, email). |
| HIPAA Security Rule (45 CFR 164.312) | **Applies.** Feature introduces a new API endpoint that writes PHI (participant PII + enrollment status). Requires access controls, audit logging, and transmission security. |
| HIPAA Minimum Necessary (45 CFR 164.502(b)) | **Applies.** Client picker returns client names and emails to the clinician UI. Must be scoped to the clinician's own clients only. |
| HIPAA Breach Notification Rule | **Applies indirectly.** No new breach surface beyond what existing patterns cover, but the inline client creation flow creates new user accounts and must not leak data on failure. |

---

## Assessment by Requirement

### FR-1: Create for Client Option in Create Program Dialog

**Risk Level:** Low

**Assessment:** This is a UI-only change on the web clinician dashboard. The dialog collects a program title (not PHI) and a client selection (PHI -- patient identity). The existing (dashboard) route group requires authentication, and the dialog only appears for authenticated clinicians.

**Required Controls:**
- The dialog must not persist client selection or program title in browser storage (localStorage, sessionStorage). This is consistent with existing patterns -- the codebase does not use client-side storage for PHI.
- The dialog should clear state on close/unmount to prevent PHI leaking into the DOM after the interaction ends.

---

### FR-2: Client Picker with Inline Client Creation

**Risk Level:** Medium

**Assessment:** The client picker calls GET /api/clinician/clients, which is already protected by authenticate + requireRole("CLINICIAN", "ADMIN") middleware. The endpoint scopes results to the clinician's own ClinicianClient records -- this satisfies the Minimum Necessary standard.

The inline "Add New Client" form collects first name, last name, and email -- all direct identifiers under HIPAA. The existing POST /api/clinician/clients endpoint handles this with proper validation and conflict detection.

**Required Controls:**
- Client search filtering must remain client-side only (as specified in NFR-1). The API must never accept a search query parameter that could be used for patient discovery across clinicians.
- The POST /api/clinician/clients endpoint must continue to use the HIPAA-safe logger for error handling.

---

### FR-3: Program Creation (Backend)

**Risk Level:** Medium

**Assessment:** This is the core new endpoint. It creates a Program, Module, and Enrollment in a single transaction.

**Required Controls:**
- The new endpoint MUST verify ClinicianClient ownership before creating the program. Without it, any clinician could create programs for any participant, violating both the Privacy Rule and the Security Rule.
- The endpoint MUST NOT log the program title, client name, or email at INFO level. Use only resource IDs in log messages.
- Input validation via Zod schema is required.

---

### FR-4: Client Programs Tab Display

**Risk Level:** Low

**Assessment:** This modifies an existing query to include programs with self-referencing templateSourceId. The query is already scoped to the clinician's own programs via clinicianId filtering.

**Required Controls:**
- The query modification must maintain the existing clinicianId filter.
- The client name displayed must come from a JOIN through the enrollment/participant relationship, not from a separate unscoped query.

---

### FR-5: Promote to Template (Existing Flow)

**Risk Level:** Low

**Assessment:** No changes to the existing promote endpoint. The promote operation creates a new template program from a client program -- this strips the enrollment relationship, so the template does not contain patient-identifying linkage. Compliant by design.

**Required Controls:** None beyond existing controls.

---

## Required Controls Summary

1. **Ownership verification on program creation endpoint.** Verify clientId belongs to the authenticated clinician via ClinicianClient table. Return 403 if not.
2. **Zod input validation.** Validate title (.string().min(1).max(200)) and clientId (.string()). Apply via validate() middleware.
3. **No PHI in logs.** Use project logger utility, log only operation names and resource IDs.
4. **Transaction atomicity.** Program + Module + Enrollment + templateSourceId update in single prisma.$transaction().
5. **No client-side PHI persistence.** Dialog must not store client data in localStorage/sessionStorage/cookies.
6. **Maintain clinician-scoped queries.** Client Programs tab query must preserve clinicianId filter.

---

## Conditions for Approval

1. **Condition 1 -- Server-side ownership check.** Implementation must include ClinicianClient ownership verification, covered by an integration test confirming 403 for unauthorized attempts.
2. **Condition 2 -- Audit log coverage test.** Integration test must verify expected audit log entries (Program CREATE, Program UPDATE, Module CREATE, Enrollment CREATE).

---

## Notes

- Existing infrastructure is strong. The codebase demonstrates mature HIPAA patterns.
- Inline client creation uses secure password generation (crypto.randomUUID() + bcrypt hash).
- No PHI leaves the system boundary. No email notifications, PDF exports, or third-party API calls.
- Pre-existing issue: console.error in audit-middleware.ts line 141 should use the project logger utility.
