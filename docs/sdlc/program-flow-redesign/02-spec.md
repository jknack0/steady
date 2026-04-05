# Program Flow Redesign — Feature Specification

## Overview
The Programs page is being redesigned from a flat list into a two-tab view: Template Library (seeded read-only templates) and My Programs (clinician's own programs). Templates can be cloned into My Programs for customization, or assigned directly to clients. Client programs can be promoted back to My Programs via "Save as My Program." The DRAFT/PUBLISHED status distinction is removed — programs are either active or archived.

## Functional Requirements

### FR-1: Programs Page — Two-Tab Layout
The Programs page has two tabs: "Template Library" and "My Programs."

**Acceptance Criteria:**
- GIVEN a clinician navigating to /programs
  WHEN the page loads
  THEN they see two tabs: "Template Library" and "My Programs"

- GIVEN a clinician on the Programs page
  WHEN they click a tab
  THEN the content switches to that tab's list

- GIVEN a clinician on the Programs page
  WHEN they first arrive
  THEN "My Programs" is the default active tab

### FR-2: Template Library Tab
Shows seeded templates not owned by the clinician. Read-only — no editing.

**Acceptance Criteria:**
- GIVEN a clinician on the Template Library tab
  WHEN the list loads
  THEN they see all published templates NOT owned by them (seeded templates owned by admin)

- GIVEN a clinician viewing a template in the library
  WHEN they look at a template card
  THEN they see the title, description, and module count

- GIVEN a clinician viewing a template
  WHEN they look at available actions
  THEN they see "Use Template" and "Assign to Client"

### FR-3: Use Template (Clone into My Programs)
Clinician clones a seeded template into their own program library.

**Acceptance Criteria:**
- GIVEN a clinician on the Template Library tab
  WHEN they click "Use Template" on a template
  THEN a new program is created in My Programs with the same title, modules, parts, and daily trackers

- GIVEN a newly cloned program
  WHEN it appears in My Programs
  THEN it shows a lineage indicator of which template it came from (via templateSourceId)

- GIVEN a newly cloned program
  WHEN the clinician views it
  THEN it is fully editable (title, modules, parts — everything)

### FR-4: My Programs Tab
Shows programs owned by the clinician. Fully editable.

**Acceptance Criteria:**
- GIVEN a clinician on the My Programs tab
  WHEN the list loads
  THEN they see only programs they own that are NOT client copies (isTemplate: true, clinicianId matches)

- GIVEN a clinician on the My Programs tab
  WHEN they click a program
  THEN they go to the program editor (existing functionality)

- GIVEN a clinician on the My Programs tab
  WHEN they look at available actions per program
  THEN they see "Assign to Client" and "Edit"

### FR-5: Create Program from Scratch
Clinician creates a new blank program in My Programs.

**Acceptance Criteria:**
- GIVEN a clinician on the My Programs tab
  WHEN they click "Create Program"
  THEN a new blank program is created and they're taken to the editor

- GIVEN a newly created program
  WHEN it's saved
  THEN it appears in My Programs with isTemplate: true

### FR-6: Assign to Client (from either tab)
Both Template Library and My Programs support assigning directly to a client.

**Acceptance Criteria:**
- GIVEN a clinician on the Template Library tab
  WHEN they click "Assign to Client" on a template
  THEN the existing AssignmentModal opens (pick client → customize tree → save)

- GIVEN a clinician on the My Programs tab
  WHEN they click "Assign to Client" on their program
  THEN the same AssignmentModal opens

- GIVEN a successful assignment from either tab
  WHEN the clone is created
  THEN the client copy has isTemplate: false and templateSourceId pointing to the source

### FR-7: Save as My Program (from Client's Program)
Clinician promotes a client's program into their own library.

**Acceptance Criteria:**
- GIVEN a clinician viewing a client's program on the client profile page
  WHEN they click "Save as My Program"
  THEN a new program is created in My Programs with the same title, modules, and parts

- GIVEN a "Save as My Program" operation
  WHEN the copy is created
  THEN client progress, responses, and enrollment data are NOT included — structure only

- GIVEN a promoted program
  WHEN it appears in My Programs
  THEN it is fully editable and has isTemplate: true

### FR-8: Remove DRAFT/PUBLISHED Status Distinction
Programs no longer have a meaningful draft/published lifecycle.

**Acceptance Criteria:**
- GIVEN any program creation (clone, create from scratch, promote)
  WHEN the program is created
  THEN its status defaults to "PUBLISHED" (field kept for backward compatibility)

- GIVEN the program editor
  WHEN the clinician views the program
  THEN there is no draft/published toggle or status indicator

- GIVEN API endpoints that previously filtered by status: "PUBLISHED"
  WHEN they query programs
  THEN they no longer require PUBLISHED status (except ARCHIVED is still filtered out)

## Non-Functional Requirements

### NFR-1: Performance
- Template Library loads in under 1 second (bounded list of seeded templates)
- My Programs list loads in under 1 second with cursor pagination
- "Use Template" clone operation completes in under 3 seconds
- "Save as My Program" completes in under 3 seconds

### NFR-2: Security
- Template Library is read-only — clinicians cannot edit or delete seeded templates
- My Programs enforces clinician ownership on all operations
- Client program promotion ("Save as My Program") excludes all client data (progress, responses, enrollment)
- All operations captured in audit log

### NFR-3: Data Integrity
- Clone operations use database transactions
- The `status` field remains in the schema for backward compatibility but is no longer used as a gate
- Existing ARCHIVED programs remain filtered out of all lists

## Scope

### In Scope
- Two-tab Programs page (Template Library + My Programs)
- "Use Template" to clone a seeded template into My Programs
- "Assign to Client" from both tabs (uses existing AssignmentModal)
- "Create Program" from scratch in My Programs
- "Save as My Program" from a client's program on the client profile page
- Lineage tracking (templateSourceId) on cloned programs
- Remove DRAFT/PUBLISHED toggle from UI
- Stop filtering by PUBLISHED status in API queries
- Sidebar nav still shows one "Programs" item

### Out of Scope
- Template marketplace or cross-practice sharing
- Editing seeded templates directly
- Versioning or diffing between programs
- Bulk assignment
- Migrating existing client enrollments that point directly at templates (legacy data)
- Removing the `status` field from the schema

## Dependencies
- Existing program clone infrastructure (POST /:id/clone)
- Existing AssignmentModal and assign/append endpoints
- Existing program editor page
- Seeded templates created under admin clinician profile during seed

## Assumptions
- Seeded templates are identifiable by not being owned by the current clinician (owned by admin)
- All clinician-created programs should have isTemplate: true going forward
- New programs default to status: "PUBLISHED" for backward compatibility
- The existing program editor works for My Programs without modification
- Client copies continue to use isTemplate: false

## Glossary
- **Seeded Template**: A program created during database seeding, owned by the admin clinician. Read-only for all other clinicians. Browsable in the Template Library.
- **My Program**: A program owned by the clinician — created from scratch, cloned from a template, or promoted from a client's program. Fully editable. Lives in the My Programs tab.
- **Client Copy**: A per-client clone of a template or My Program, created during assignment. Has isTemplate: false. Managed from the client's profile page.
- **Promote / Save as My Program**: The action of cloning a client's program structure (without progress data) into the clinician's My Programs library.
