# Program Template Cloning — Compliance Assessment

## Verdict: PASS_WITH_CONDITIONS

## Data Classification

| Data Element | Category | Sensitivity |
|---|---|---|
| Program content (text, video URLs, checklists) | Clinical Treatment Content | Medium |
| Module/Part structure & titles | Clinical Treatment Content | Medium |
| Participant-to-Program assignment | PHI (treatment relationship) | High |
| Daily tracker configuration | Clinical Treatment Content | Medium |
| Enrollment records | PHI (treatment participation) | High |
| Audit log entries (action + resource IDs) | System Metadata | Low |

## Framework Assessments

### HIPAA
**Status:** Conditionally Compliant

| Requirement | Assessment | Notes |
|---|---|---|
| FR-1: Assign from Program Page | ⚠️ Needs Control | Participant picker exposes patient list — ensure scoped to owning clinician's clients only |
| FR-2: Assign from Client Profile | ✅ Compliant | Clinician already on their own client's page — inherits existing access controls |
| FR-3: Re-Assignment (Append) | ✅ Compliant | No new PHI exposure; appends to existing authorized relationship |
| FR-4: Post-Assignment Editing | ⚠️ Needs Control | Soft-delete for content with progress is correct; hard-delete for untouched content must still generate an audit log entry before deletion |
| FR-5: Enrollment List Quick-Edit | ⚠️ Needs Control | Displaying participant names on the template page — ensure only the owning clinician sees this list |
| FR-6: Template Lineage Tracking | ✅ Compliant | templateSourceId is a non-PHI reference (program ID, not patient ID) |

**Required Controls:**
1. Participant picker in FR-1 must be scoped to clinician's own clients via server-side filtering
2. Hard-delete operations (FR-4) must be captured in audit log BEFORE the delete executes
3. The enrollment list (FR-5) must enforce clinician ownership at the API level

### GDPR
**Status:** Compliant

| Requirement | Assessment | Notes |
|---|---|---|
| FR-1–FR-3: Clone operations | ✅ Compliant | Lawful basis: performance of a contract. Data minimization respected |
| FR-4: Post-Assignment Editing | ✅ Compliant | Soft-delete preserves records for data subject access requests |
| FR-6: Lineage Tracking | ✅ Compliant | templateSourceId does not constitute personal data processing |

No DPIA required — this feature reduces risk by isolating per-patient data.

### SOC 2
**Status:** Conditionally Compliant

| Principle | Assessment | Notes |
|---|---|---|
| Security | ⚠️ Needs Control | Clone operation creates new database records in bulk — must use transactions |
| Availability | ✅ Compliant | No new external dependencies; bounded by existing pagination patterns |
| Processing Integrity | ⚠️ Needs Control | Deep-copy must preserve data integrity — cloned parts must be identical to source; sort orders must be preserved |
| Confidentiality | ✅ Compliant | Ownership model ensures only authorized clinician accesses client programs |
| Privacy | ✅ Compliant | No new data collection; existing privacy controls inherited |

## Conditions for Approval

1. **[COND-1]: Server-side participant scoping** — The participant picker API endpoint must filter by clinician ownership (clinicianId match). Must not rely on client-side filtering alone. Must be in architecture.
2. **[COND-2]: Audit trail for hard deletes** — Verify that the existing Prisma audit middleware captures DELETE operations (not just UPDATE with deletedAt). If hard deletes bypass audit middleware, add explicit audit logging before the delete. Must be verified in QA.
3. **[COND-3]: Transaction atomicity for all clone operations** — All clone/append operations (first assignment and re-assignment) must use prisma.$transaction(). Partial clones must not be possible. Must be in architecture and verified in QA.
4. **[COND-4]: Sort order preservation** — Cloned modules and parts must preserve their sortOrder values to maintain treatment integrity. Re-assignment appended modules must have sort orders that follow existing content. Must be verified in QA.
