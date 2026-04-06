# Client Program Builder — UX Design

## User Flows

### Flow 1: Create a Custom Program for a Client (Happy Path)

**Entry point:** Programs page → "Create Program" button
**Success state:** Program editor with one empty module, client enrolled

**Steps:**
1. Clinician clicks "Create Program" — dialog opens showing two action cards ("Start from Scratch", "Create for Client") and template cards below
2. Clinician clicks "Create for Client" — dialog transitions to form with title input and client picker
3. Clinician types a program title (e.g., "Anxiety Management Plan")
4. Clinician clicks client dropdown — sees searchable list of their active clients
5. Clinician selects a client — dropdown closes, selected name shown
6. Clinician clicks "Create Program" — button shows spinner + "Creating..."
7. Dialog closes, router navigates to `/programs/{newProgramId}`
8. Clinician lands in program editor with one empty "Module 1"

### Flow 2: Create Program with New Client (Inline Creation)

**Entry point:** "Create for Client" form → client picker
**Success state:** New client created and auto-selected

**Steps:**
1. Clinician opens client dropdown, clicks "+ Add New Client"
2. Dropdown is replaced by inline fields: First Name, Last Name, Email
3. Clinician fills in all three fields, clicks "Add Client"
4. Button shows spinner while creating
5. On success: client is created, auto-selected, inline form collapses back to the main form with new client shown
6. Clinician continues with step 6 of Flow 1

### Flow 3: Error — Client Email Belongs to Clinician

**Steps:**
1. Clinician is in the "Add New Client" inline form
2. Enters an email that belongs to a clinician account
3. Clicks "Add Client"
4. Inline error appears below email field: "This email belongs to a clinician account"
5. Clinician corrects the email or clicks "Cancel" to return to the dropdown

### Flow 4: Error — API Failure on Program Creation

**Steps:**
1. Clinician fills in title and client, clicks "Create Program"
2. API returns 500
3. Button returns to "Create Program" (ready state)
4. Toast notification appears: "Something went wrong. Please try again."
5. Clinician can retry immediately

## Component Specifications

### Create Program Dialog — Initial View

**Purpose:** Entry point for all program creation flows

**Layout:**
```
┌─────────────────────────────────────────────┐
│  Create Program                          ✕  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │  📄              │  │  👤              │  │
│  │  Start from      │  │  Create for     │  │
│  │  Scratch         │  │  Client         │  │
│  │                  │  │                  │  │
│  │  Build a new     │  │  Build a custom │  │
│  │  program         │  │  program for a  │  │
│  │  template        │  │  specific client│  │
│  └─────────────────┘  └─────────────────┘  │
│                                             │
│  ── Or start from a template ────────────  │
│                                             │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │ CBT for         │  │ DBT Skills      │  │
│  │ Depression      │  │ Training        │  │
│  │ 12 modules      │  │ 12 modules      │  │
│  └─────────────────┘  └─────────────────┘  │
│  ...                                        │
└─────────────────────────────────────────────┘
```

### Create for Client Form

**Purpose:** Collect program title and client selection

**Layout:**
```
┌─────────────────────────────────────────────┐
│  ← Create for Client                    ✕  │
├─────────────────────────────────────────────┤
│                                             │
│  Program Title                              │
│  ┌─────────────────────────────────────┐   │
│  │ e.g. Anxiety Management Plan        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Client                                     │
│  ┌─────────────────────────────────────┐   │
│  │ Select a client...              ▼   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│                        ┌─────────────────┐ │
│                        │ Create Program  │ │
│                        └─────────────────┘ │
└─────────────────────────────────────────────┘
```

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Default | Title empty, client unselected, button disabled | Title auto-focuses |
| Ready | Both fields filled, button primary blue | Click submits |
| Loading | Button shows spinner + "Creating..." | All fields disabled |
| Error | Button returns to Ready, toast shown | User can retry |

### Client Picker

**Purpose:** Select an existing client or create a new one inline

**Layout — Dropdown Open:**
```
┌─────────────────────────────────────────┐
│ 🔍 Search clients...                   │
├─────────────────────────────────────────┤
│  Sarah Mitchell                         │
│  sarah.mitchell@example.com             │
├─────────────────────────────────────────┤
│  James Rodriguez                        │
│  james.rodriguez@example.com            │
├─────────────────────────────────────────┤
│  Emily Chen                             │
│  emily.chen@example.com                 │
├─────────────────────────────────────────┤
│  + Add New Client                       │
└─────────────────────────────────────────┘
```

**Layout — Empty State (no clients):**
```
┌─────────────────────────────────────────┐
│  No clients yet                         │
│  + Add New Client                       │
└─────────────────────────────────────────┘
```

**Layout — Add New Client Inline:**
```
│  First Name          Last Name              │
│  ┌────────────────┐  ┌────────────────┐    │
│  │                 │  │                │    │
│  └────────────────┘  └────────────────┘    │
│  Email                                      │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌────────┐  ┌──────────────┐              │
│  │ Cancel │  │ Add Client   │              │
│  └────────┘  └──────────────┘              │
```

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Closed | Shows selected client name or "Select a client..." | Click opens dropdown |
| Open | Searchable list of clients | Type to filter, click to select |
| Loading | Skeleton list | While fetching clients |
| Empty | "No clients yet" + Add New Client | Only inline creation available |
| Add New | Inline form replaces dropdown | Cancel returns to dropdown |
| Adding | "Add Client" shows spinner | Fields disabled during creation |
| Add Error | Inline error below relevant field | "This email belongs to a clinician account" or "This client is already in your client list" |

**Interactions:**

| Action | Feedback | Result | Error |
|--------|----------|--------|-------|
| Click dropdown | Opens with search focused | Client list visible | — |
| Type in search | List filters client-side | Matching clients shown | No matches: "No clients found" + Add New Client |
| Click a client | Dropdown closes | Client name shown in field | — |
| Click "+ Add New Client" | Inline form appears | First name field focused | — |
| Click "Cancel" (inline) | Form collapses | Returns to dropdown | — |
| Click "Add Client" | Spinner on button | Client created, auto-selected | Inline error message |

## Information Hierarchy

1. **Most prominent:** The two action cards ("Start from Scratch" / "Create for Client") — these are the primary choices
2. **Secondary:** Template cards below the action cards — the "browse and pick" path
3. **In the form:** Title is first (most important decision), client is second
4. **Tucked away:** "Add New Client" is at the bottom of the client list — it's an escape hatch, not the primary path

## Content & Copy

| Element | Copy | Notes |
|---------|------|-------|
| Action card title | "Create for Client" | Short, action-oriented |
| Action card description | "Build a custom program for a specific client" | Explains the difference from "Start from Scratch" |
| Title placeholder | "e.g. Anxiety Management Plan" | Gives a concrete example |
| Client dropdown placeholder | "Select a client..." | Standard select pattern |
| Search placeholder | "Search clients..." | Brief |
| Add New Client link | "+ Add New Client" | Plus icon signals creation |
| Submit button (disabled) | "Create Program" | Same label as existing flow |
| Submit button (loading) | "Creating..." | With spinner |
| Error toast (403) | "This client is not in your client list" | Explains why it failed |
| Error toast (500) | "Something went wrong. Please try again." | Generic, with retry hint |
| Error toast (network) | "Connection lost. Please try again." | Network-specific |
| Inline error (clinician email) | "This email belongs to a clinician account" | Matches existing error copy |
| Inline error (duplicate) | "This client is already in your client list" | Matches existing error copy |
| Empty client list | "No clients yet" | Simple, non-judgmental |

## Accessibility Notes

- **Keyboard navigation:** Tab order: back arrow → title input → client picker → submit button. Arrow keys navigate within the client dropdown. Escape closes the dropdown or dialog.
- **Screen reader:** Client picker announced as "Client, combobox." Each client option announced as "Name, email." Add New Client announced as a button.
- **Focus management:** Title input auto-focuses when "Create for Client" view opens. After selecting a client, focus returns to the submit button. After inline client creation success, focus returns to the client picker showing the new selection.
- **Color contrast:** Error messages use the existing destructive red from the design system. Disabled button maintains 4.5:1 contrast ratio per existing shadcn/ui patterns.

## Open Questions

- None — all questions were resolved during ideation and spec phases.
