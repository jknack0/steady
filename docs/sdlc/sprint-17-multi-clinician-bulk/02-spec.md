# Sprint 17: Multi-Clinician Practice Management + Bulk Actions — Feature Specification

## Overview

Extends the existing Practice infrastructure with clinician management (invite/remove), a practice owner dashboard with aggregate stats and practice-wide participant visibility, and enhanced bulk actions with practice-scoped authorization. No schema changes required — all models already exist.

## Glossary

| Term | Definition |
|------|-----------|
| **Practice** | Existing model — a group of clinicians sharing templates and visibility |
| **Practice Owner** | Clinician with PracticeMembership.role = OWNER |
| **Bulk Action** | An operation applied to multiple participants in a single request |
| **ServiceCtx** | Existing middleware-resolved context: practiceId, userId, clinicianProfileId, isAccountOwner |

---

## Functional Requirements

### FR-1: Practice Clinician Invite

**Acceptance Criteria:**
- **GIVEN** a practice owner
  **WHEN** they POST /api/practices/:id/invite with `{ email }`
  **THEN** the system finds the clinician by email, creates a PracticeMembership(role=CLINICIAN), returns 201
- **GIVEN** the email does not match any existing CLINICIAN user
  **WHEN** submitted
  **THEN** 404 "Clinician not found with that email"
- **GIVEN** the clinician is already a member
  **WHEN** submitted
  **THEN** 409 "Clinician is already a member"
- **GIVEN** a non-owner clinician
  **WHEN** they attempt to invite
  **THEN** 403 "Only practice owners can invite"
- **GIVEN** a successful invite
  **WHEN** committed
  **THEN** an audit log entry is written (CREATE, PracticeMembership)

### FR-2: Practice Clinician Removal

**Acceptance Criteria:**
- **GIVEN** a practice owner
  **WHEN** they DELETE /api/practices/:id/members/:memberId
  **THEN** the membership is deleted
- **GIVEN** the target membership has role OWNER
  **WHEN** deletion is attempted
  **THEN** 400 "Cannot remove the practice owner"
- **GIVEN** a non-owner clinician
  **WHEN** they attempt removal
  **THEN** 403
- **GIVEN** the memberId does not exist in this practice
  **WHEN** deletion is attempted
  **THEN** 404

### FR-3: Practice Stats (Owner Dashboard)

**Acceptance Criteria:**
- **GIVEN** a practice owner
  **WHEN** they GET /api/practices/:id/stats
  **THEN** returns aggregate stats: totalParticipants, totalPrograms, activeEnrollments, upcomingAppointments (next 7 days), averageCompletionRate
- **GIVEN** a non-owner clinician
  **WHEN** they request stats
  **THEN** 403
- **GIVEN** a practice with multiple clinicians
  **WHEN** stats are requested
  **THEN** stats aggregate across ALL clinicians in the practice

### FR-4: Practice-Wide Participant List

**Acceptance Criteria:**
- **GIVEN** a practice owner
  **WHEN** they GET /api/practices/:id/participants
  **THEN** returns cursor-paginated list of all participants across all clinicians, with clinician name, enrollment status, program title
- **GIVEN** more than 50 participants
  **WHEN** first page requested
  **THEN** returns up to 50 with a cursor for the next page
- **GIVEN** a non-owner clinician
  **WHEN** they request the list
  **THEN** 403
- **GIVEN** search query parameter
  **WHEN** provided
  **THEN** filters participants by name or email (case-insensitive)

### FR-5: Enhanced Bulk Unlock Modules

**Acceptance Criteria:**
- **GIVEN** a clinician with selected participants
  **WHEN** they POST /api/clinician/participants/bulk with action "unlock-next-module"
  **THEN** the next locked module is unlocked for each participant's active enrollment
- **GIVEN** more than 50 participant IDs
  **WHEN** submitted
  **THEN** 400 "Maximum 50 participants per bulk action"
- **GIVEN** a participant not owned by the clinician (no ClinicianClient link)
  **WHEN** included in bulk action
  **THEN** that participant is skipped with error in results
- **GIVEN** a practice owner
  **WHEN** they bulk-act on participants of other clinicians in their practice
  **THEN** the action succeeds (owner has practice-wide authority)

### FR-6: Enhanced Bulk Send Nudge

**Acceptance Criteria:**
- **GIVEN** a clinician with selected participants
  **WHEN** they POST /api/clinician/participants/bulk with action "send-nudge" and optional message
  **THEN** a nudge task is created for each participant
- **GIVEN** a message longer than 500 characters
  **WHEN** submitted
  **THEN** message is truncated to 500 characters
- **GIVEN** each successful nudge
  **WHEN** committed
  **THEN** an audit log entry is written per participant (never logs message content)

### FR-7: Enhanced Bulk Push Task

**Acceptance Criteria:**
- **GIVEN** a clinician with selected participants
  **WHEN** they POST /api/clinician/participants/bulk with action "push-task" and `{ title, description?, dueDate? }`
  **THEN** the task is created for each participant with sourceType CLINICIAN_PUSH
- **GIVEN** title is empty
  **WHEN** submitted
  **THEN** that participant is skipped with "Title required" error

---

## API Surface

### New Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/practices/:id/stats` | Owner only | Practice aggregate stats |
| GET | `/api/practices/:id/participants` | Owner only | Practice-wide participant list |

### Existing Endpoints (already implemented, enhanced with validation)

| Method | Path | Auth | Enhancement |
|--------|------|------|-------------|
| POST | `/api/practices/:id/invite` | Owner only | Already exists — add audit logging |
| DELETE | `/api/practices/:id/members/:memberId` | Owner only | Already exists |
| POST | `/api/clinician/participants/bulk` | CLINICIAN | Add max-50 cap, per-participant audit logging |

### Response Shapes

**Practice Stats:**
```json
{
  "success": true,
  "data": {
    "totals": {
      "clinicians": 3,
      "programs": 12,
      "publishedPrograms": 8,
      "enrollments": 45,
      "activeParticipants": 38,
      "upcomingAppointments": 7
    },
    "clinicianStats": [
      {
        "clinicianId": "...",
        "name": "Dr. Smith",
        "role": "OWNER",
        "totalPrograms": 5,
        "publishedPrograms": 3,
        "totalEnrollments": 20,
        "activeParticipants": 15
      }
    ]
  }
}
```

**Practice Participants:**
```json
{
  "success": true,
  "data": [
    {
      "participantId": "...",
      "name": "Jane Doe",
      "email": "jane@example.com",
      "clinicianName": "Dr. Smith",
      "clinicianId": "...",
      "programTitle": "ADHD Mastery",
      "enrollmentStatus": "ACTIVE",
      "enrolledAt": "2026-01-15T00:00:00Z"
    }
  ],
  "cursor": "..."
}
```

---

## Permissions

| Actor | Can do |
|-------|--------|
| Practice Owner | Invite/remove clinicians, view stats, view all participants, bulk-act on any practice participant |
| Staff Clinician | Bulk-act on own participants only |
| Participant | Nothing new |
| Admin | Same as practice owner |

---

## Non-Functional Requirements

### NFR-1: Performance
- Practice stats endpoint: <500ms p95 for practices with 10 clinicians, 100 programs
- Practice participants: <300ms p95 for first page of 50
- Bulk actions: <2s for 50 participants

### NFR-2: Security & HIPAA
- Practice-wide participant visibility is permitted treatment disclosure under 45 CFR 164.506
- All bulk actions generate per-participant audit log entries
- Audit logs never contain message/task content
- Cross-practice access returns 404

### NFR-3: Testing
- API route tests: ~20 tests for practice management, ~15 for bulk actions
- Coverage remains >80% on packages/api

---

## Dependencies

- Existing: Practice, PracticeMembership models, requirePracticeCtx middleware, clinician bulk action service
- No new npm packages

## Out of Scope

- Invitation email delivery
- Clinician-to-clinician participant transfer
- Practice-level permissions beyond OWNER/CLINICIAN
- Bulk action undo
