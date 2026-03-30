# Client Program Builder — Feature Specification

## Overview
Clinicians can only create programs for clients by cloning existing templates or programs. When no template fits, they need a blank-canvas option. This feature adds a "Create for Client" flow to the Create Program dialog — clinician names the program, picks or creates a client, and lands in the program editor with one empty module and an active enrollment, all in one step.

## Functional Requirements

### FR-1: "Create for Client" Option in Create Program Dialog
The existing Create Program dialog gains a mode toggle. When "Create for Client" is selected, the form shows: program title (required), client picker (required), and a submit button.

**Acceptance Criteria:**
- GIVEN a clinician on the Programs page
  WHEN they click "Create Program"
  THEN the dialog shows two options: "Create Program" (existing flow) and "Create for Client"

- GIVEN a clinician selects "Create for Client"
  WHEN the form is displayed
  THEN it shows a title field and a client picker

- GIVEN a clinician fills in a title and selects a client
  WHEN they submit
  THEN a new program is created, they are redirected to the program editor for that program

### FR-2: Client Picker with Inline Client Creation
The client picker shows the clinician's existing clients (from ClinicianClient). It also includes an "Add New Client" option that expands an inline form for first name, last name, and email.

**Acceptance Criteria:**
- GIVEN a clinician in the "Create for Client" form
  WHEN they open the client picker
  THEN they see a searchable list of their existing active clients

- GIVEN a clinician clicks "Add New Client"
  WHEN they enter first name, last name, and email and confirm
  THEN a new participant user and ClinicianClient record are created, and that client is selected in the picker

- GIVEN a clinician enters an email that belongs to an existing clinician account
  WHEN they try to add the client
  THEN they see an error: "This email belongs to a clinician account"

### FR-3: Program Creation (Backend)
The API creates a blank program with one empty module and an active enrollment for the selected client. The program is marked as a client program using a self-referencing `templateSourceId`.

**Acceptance Criteria:**
- GIVEN a valid title, client ID, and authenticated clinician
  WHEN the API receives a "create for client" request
  THEN it creates a program with `isTemplate: false`, `status: "PUBLISHED"`, and `templateSourceId` set to the program's own ID

- GIVEN the program is created
  THEN one module is created with title "Module 1" and `sortOrder: 0`

- GIVEN the program is created
  THEN an enrollment is created with `status: "ACTIVE"` linking the client's participant profile to the program

- GIVEN the client ID does not belong to the clinician's clients
  WHEN the request is made
  THEN the API returns 403

### FR-4: Client Programs Tab Display
Programs with a self-referencing `templateSourceId` appear in the Client Programs tab alongside programs created via the assignment flow.

**Acceptance Criteria:**
- GIVEN a program was created via "Create for Client"
  WHEN the clinician views the Client Programs tab
  THEN the program appears with the client's name displayed

- GIVEN a program was created via "Create for Client"
  WHEN the clinician views the My Programs tab
  THEN the program does NOT appear

### FR-5: Promote to Template (Existing Flow)
The existing promote endpoint handles converting a client program to a template. No changes needed, but verified for this new creation path.

**Acceptance Criteria:**
- GIVEN a program created via "Create for Client"
  WHEN the clinician uses the promote-to-template action
  THEN a new template program is created in My Programs with the same content

## Non-Functional Requirements

### NFR-1: Performance
- Program creation (with module + enrollment) completes in under 500ms
- Client picker loads within 200ms for up to 100 clients
- Client search filters results as the clinician types (client-side filtering)

### NFR-2: Security
- Only authenticated clinicians can create client programs
- Clinician can only select their own clients (ClinicianClient relationship verified server-side)
- Inline client creation validates email uniqueness and rejects clinician emails
- Audit log captures the program creation event (existing Prisma audit middleware handles this)

### NFR-3: Data Integrity
- Program, module, and enrollment are created in a single Prisma transaction — all or nothing
- Self-referencing `templateSourceId` is set atomically (create program, then update with own ID, all in transaction)

## Scope

### In Scope
- "Create for Client" mode in the Create Program dialog
- Client picker with search + inline "Add New Client"
- New API endpoint for creating a blank client program
- Self-referencing `templateSourceId` convention for client programs
- Update client-programs list query to include self-referencing programs
- One pre-created empty module ("Module 1")
- Active enrollment on creation

### Out of Scope
- Auto-generating multiple modules (e.g., "create 8 weeks")
- Bulk creation for multiple clients
- Changes to the existing template assignment flow
- AI-assisted program building
- Mobile app changes (CAS/web only)
- New participant-facing behavior (client sees program via existing enrollment flow)

### Dependencies
- Existing Create Program dialog
- Existing client list API (`GET /api/clinician/clients`)
- Existing program editor page
- Existing promote endpoint (`POST /api/programs/:id/promote`)
- Existing Prisma audit middleware

### Assumptions
- The clinician has at least added the client before (or will use inline creation)
- The program editor works for programs with zero parts in a module (empty state)
- The self-referencing `templateSourceId` pattern won't break existing queries
