# Program Template Cloning — Feature Specification

## Overview
Clinicians build standardized treatment programs, but each patient needs a tailored version. Currently, modifying a program affects all enrolled participants, creating data integrity and HIPAA concerns. This feature turns programs into reusable templates that get deep-copied per-client, with an inline customization flow during assignment. Client copies are fully independent and editable after assignment.

## Functional Requirements

### FR-1: Assign Program to Client (from Program Page)
Clinician views a template program, clicks "Assign to Client", selects a participant, and enters the customization flow.

**Acceptance Criteria:**
- GIVEN a clinician viewing a template program
  WHEN they click "Assign to Client"
  THEN they see a participant picker listing their clients

- GIVEN a clinician has selected a participant
  WHEN they confirm the selection
  THEN they see the full program tree (modules → parts) with toggles to include/exclude each module and part

- GIVEN a clinician in the customization view
  WHEN they uncheck a module
  THEN all parts under that module are also excluded

- GIVEN a clinician in the customization view
  WHEN they uncheck individual parts within a module (but not the module itself)
  THEN only those parts are excluded; the module remains

- GIVEN a clinician who has customized the tree
  WHEN they click "Save" / "Assign"
  THEN the system deep-copies the selected modules and parts into a new client-specific program, linked to the participant's enrollment

- GIVEN a clinician in the customization view
  WHEN they click "Cancel"
  THEN no copy is created and nothing changes for the client

### FR-2: Assign Program to Client (from Client Profile Page)
Clinician views a client's profile, clicks "Add Program", selects a template, and enters the same customization flow.

**Acceptance Criteria:**
- GIVEN a clinician viewing a client's profile
  WHEN they click "Add Program"
  THEN they see a template picker listing available program templates

- GIVEN a clinician has selected a template
  WHEN they confirm
  THEN they enter the same customization flow as FR-1 (program tree with include/exclude toggles)

### FR-3: Re-Assignment (Append Modules)
When assigning the same template to a client who already has a copy, new modules are appended.

**Acceptance Criteria:**
- GIVEN a client who already has modules A, B, C from a prior assignment of Template X
  WHEN the clinician assigns Template X again and keeps all modules
  THEN modules A, B, C, D, E are appended after the existing A, B, C (duplicates allowed)

- GIVEN a re-assignment flow
  WHEN the clinician is in the customization view
  THEN they can exclude modules/parts the same way as a first-time assignment

- GIVEN a re-assignment with daily trackers
  WHEN a tracker with the same name/config already exists on the client's program
  THEN that tracker is NOT duplicated (deduplication by name)

### FR-4: Post-Assignment Editing
Clinician can modify a client's program copy after assignment — add or remove modules and parts.

**Acceptance Criteria:**
- GIVEN a clinician viewing a client's profile
  WHEN they navigate to the client's program
  THEN they can remove modules or parts

- GIVEN a clinician removing a module/part the client has NOT started (no progress records)
  WHEN they confirm removal
  THEN the module/part is hard-deleted

- GIVEN a clinician removing a module/part the client HAS started (progress records exist)
  WHEN they confirm removal
  THEN the module/part is soft-deleted (preserved for audit trail)

### FR-5: Enrollment List Quick-Edit
The program template page shows enrolled participants with a link to edit their copy.

**Acceptance Criteria:**
- GIVEN a clinician viewing a template program's detail page
  WHEN they look at the enrollment/participant list
  THEN each participant entry has a link/button to edit that client's program copy

- GIVEN a clinician clicks edit on a participant's enrollment
  WHEN the page loads
  THEN they are taken to the client's program editor on the client profile page

### FR-6: Template Lineage Tracking
Client programs retain a reference to the source template.

**Acceptance Criteria:**
- GIVEN a client program created via assignment
  WHEN viewed on the client's profile
  THEN it displays which template it was cloned from (using existing `templateSourceId`)

## Non-Functional Requirements

### NFR-1: Performance
- Clone operation (program + modules + parts + trackers) must complete in under 3 seconds for programs with up to 20 modules and 200 parts.
- The customization tree view must render in under 1 second.
- Re-assignment append operation must complete in under 3 seconds.

### NFR-2: Security
- Only the owning clinician can assign, edit, or remove content from a client's program copy. Ownership verified server-side.
- All clone/assign/edit/delete operations are captured in the audit log (via existing Prisma audit middleware).
- No PHI is logged — only resource IDs and action types.

### NFR-3: Data Integrity
- Clone operations use a database transaction — if any part of the copy fails, nothing is committed.
- Soft-deleted modules/parts remain queryable for audit but are excluded from the client's active view.
- The original template is never modified by any assignment or client-edit operation.

## Scope

### In Scope
- Assign program template to client with inline customization (include/exclude modules and parts)
- Both entry points: from program page and from client profile page
- Deep copy of program → modules → parts → daily trackers on save
- Re-assignment appends modules; daily trackers are deduplicated
- Post-assignment editing (add/remove modules and parts) from client profile
- Hard delete for untouched content, soft delete for content with progress
- Enrollment list on program page links to client's program editor
- Template lineage tracking via existing `templateSourceId`

### Out of Scope
- Editing part content (text, videos, etc.) during assignment flow — structure only
- Template updates propagating to existing client copies
- Versioning or diffing between template and client copy
- Bulk assignment (assign to multiple clients at once)
- Client/participant-facing UI changes — this is clinician-side only
- Reordering modules or parts during the assignment flow

## Dependencies
- Existing `isTemplate` and `templateSourceId` fields on the Program model
- Existing `POST /:id/clone` endpoint logic (will be extended, not replaced)
- Existing Prisma audit middleware for automatic logging
- Existing `deletedAt` soft-delete pattern on the Part model

## Assumptions
- A program must have `isTemplate: true` to appear in the template picker for assignment
- Clinicians will mark programs as templates explicitly (existing flow)
- The Module model will need a `deletedAt` field added (currently only Part has soft delete)
- The participant must already exist in the system before assignment (no inline participant creation)
- A client can have multiple programs assigned (not limited to one)

## Glossary
- **Template**: A program with `isTemplate: true` — the master copy clinicians build and reuse
- **Client Program**: A deep-copied instance of a template, owned by and tailored for a specific participant
- **Assignment Flow**: The process of selecting a template, customizing it (include/exclude), and saving the client copy
- **Re-Assignment**: Assigning the same template again to a client who already has a copy — appends new modules
