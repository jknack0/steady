# Program Template Cloning — UX Design

## User Flows

### Flow 1: Assign from Program Page (Happy Path)

**Entry point:** Program detail page → "Assign to Client" button in header
**Success state:** Program cloned and assigned, toast confirmation, modal closed

**Steps:**
1. Clinician clicks "Assign to Client" on template program page
2. Assignment Modal opens (lg size) at Step 1: Pick Client
3. Client list loads with search bar, showing clinician's clients with status badges
4. Clinician searches/selects a client → "Next" button enables
5. Clinician clicks "Next" → Step 2: Customize Program loads
6. Full program tree displayed as expandable accordion — all modules/parts checked by default
7. Clinician unchecks unwanted modules (all child parts auto-uncheck) or individual parts
8. Summary line updates live: "[N] modules, [N] parts selected"
9. Clinician clicks "Assign" → button shows spinner + "Assigning..."
10. Success → toast "Program assigned to [Client Name]" → modal closes → enrollment list refreshes

### Flow 2: Assign from Client Profile

**Entry point:** Participant detail page → "Add Program" button in Overview tab
**Success state:** Same as Flow 1

**Steps:**
1. Clinician clicks "Add Program" on client profile page
2. Assignment Modal opens at Step 1: Pick Template (instead of Pick Client)
3. Template list loads showing published templates with title, description snippet, module count
4. Clinician selects a template → "Next" button enables
5. Step 2 is identical to Flow 1 — same customize tree, same behavior
6. Same success path

### Flow 3: Re-Assignment (Append)

**Entry point:** Either entry point, when client already has the template assigned
**Success state:** Modules appended, toast confirmation

**Steps:**
1. Clinician completes Step 1 (picks client + template)
2. API returns 409 conflict
3. Modal shows conflict state: "Program Already Assigned" with explanation
4. Three options: Cancel, View Existing (navigates to client profile), Add Modules
5. "Add Modules" → same customize tree (Step 2)
6. On save, calls append endpoint instead
7. Success → toast "[N] modules added to [Client Name]'s program" → modal closes

### Flow 4: Post-Assignment Editing

**Entry point:** Client profile → Programs section → "Edit" on a program card
**Success state:** Module/part removed, list updates

**Steps:**
1. Clinician clicks "Edit" on a client program card in the Overview tab
2. Card expands accordion-style showing modules with progress indicators and trash icons
3. Expanding a module shows its parts with individual trash icons
4. Clinician clicks trash on a module or part
5. Confirm dialog appears with context-aware copy:
   - Has progress: "This client has started this module. It will be hidden but preserved for audit purposes."
   - No progress: "This client hasn't started this module. It will be permanently removed."
6. Clinician confirms → item removed from list → toast "Module removed"

### Flow 5: Quick-Edit from Enrollment List

**Entry point:** Program template page → Enrollment section → "Edit" on participant row
**Success state:** Navigation to client profile

**Steps:**
1. Clinician views enrollment list on template program page
2. Each row shows participant name, status, date, and "Edit" link
3. Clinician clicks "Edit" → navigates to /participants/[id] (client profile page)

### Flow 6: Error — Network Failure

**Steps:**
1. Clinician completes customization and clicks "Assign"
2. Network request fails
3. Inline error banner appears below tree: "Failed to assign. Please try again."
4. "Assign" button re-enables for retry
5. All selections preserved — no data lost

### Flow 7: Edge Case — No Clients / No Templates

**Steps:**
1. Modal opens at Step 1
2. If no clients: "No clients found. Add a client first." with link to client management
3. If no templates: "No published templates available." — informational only
4. "Next" button remains disabled

## Component Specifications

### AssignmentModal
**Purpose:** Container for the full assignment flow — manages step state and entry-point context.

**States:**
| State | Appearance | Behavior |
|---|---|---|
| Step 1 (default) | Client or template list with search | Next disabled until selection |
| Step 2 | Program tree with checkboxes | Assign disabled if nothing selected |
| Conflict | Re-assignment prompt | Three action buttons |
| Saving | All inputs disabled, spinner on Assign | Back button disabled |
| Success | Modal auto-closes | Toast notification shown |
| Error | Inline error banner | Assign re-enabled for retry |

**Interactions:**
| Action | Feedback | Result | Error |
|---|---|---|---|
| Click "Next" | Step transition animation | Tree loads for Step 2 | — |
| Click "Back" | Step transition back | Return to Step 1, selection preserved | — |
| Click "Cancel" | Modal closes | No side effects | — |
| Click "Assign" | Button spinner + "Assigning..." | Success toast + close | Inline error banner |
| Press Escape | Modal closes | Same as Cancel | — |

### ParticipantPicker
**Purpose:** Searchable list for selecting a client.

**States:**
| State | Appearance | Behavior |
|---|---|---|
| Loading | 3-4 skeleton rows | Search disabled |
| Default | Client rows with name + status badge | Click to select, highlight selected |
| Search active | Filtered list | Updates on keystroke |
| No results | "No matches for '[query]'" | Clear search link |
| Empty | "No clients found. Add a client first." | Link to client management |
| Selected | Row highlighted with check icon | Next button enables |

### TemplatePicker
**Purpose:** Searchable list for selecting a program template (used when entering from client profile).

**States:**
| State | Appearance | Behavior |
|---|---|---|
| Loading | 3-4 skeleton cards | Search disabled |
| Default | Template cards with title, description, module count | Click to select |
| No results | "No matches for '[query]'" | Clear search link |
| Empty | "No published templates available." | Informational |
| Selected | Card highlighted with check icon | Next button enables |

### ProgramTreeSelect
**Purpose:** Checkbox tree for including/excluding modules and parts.

**States:**
| State | Appearance | Behavior |
|---|---|---|
| Loading | 3 skeleton accordion rows | — |
| All selected | All checkboxes checked | Default on load |
| Module unchecked | Module dimmed, parts greyed + unchecked | Parts not individually interactive |
| Module indeterminate | Dash icon in checkbox, some parts unchecked | Click module → checks all |
| Part unchecked | Part row dimmed, unchecked | Module shows indeterminate |
| Nothing selected | All unchecked, "0 modules selected" | Assign button disabled |
| Collapsed module | "▸ Module Name — 3/5 parts selected" | Click to expand |
| Expanded module | All parts visible with checkboxes | Click header to collapse |

**Interactions:**
| Action | Feedback | Result | Error |
|---|---|---|---|
| Check/uncheck module | Checkbox toggles, parts update | Summary count updates | — |
| Check/uncheck part | Checkbox toggles, module state updates | Summary count updates | — |
| Click module header | Expand/collapse animation | Parts shown/hidden | — |

### Client Program Card (Post-Assignment)
**Purpose:** Shows assigned program on client profile with inline editing.

**States:**
| State | Appearance | Behavior |
|---|---|---|
| Collapsed | Card with title, module count, date, "from template" link, Edit button | Click Edit to expand |
| Expanded | Accordion with modules, progress badges, trash icons | Modules expandable to show parts |
| Deleting | Confirm dialog open | Trash icon triggered it |
| Empty (all removed) | "No modules remaining" | Informational |

## Information Hierarchy

**Assignment Modal — Step 1:**
1. Modal title (what action / for whom) — most prominent
2. Search input — immediate access
3. Client/template list — primary content
4. Cancel / Next buttons — footer

**Assignment Modal — Step 2:**
1. "Customize for [Client Name]" — context
2. Instruction subtitle — "Uncheck modules or parts to exclude them"
3. Program tree — primary interactive content
4. Summary count — live feedback, bottom of tree
5. Back / Cancel / Assign — footer actions

**Client Program Card:**
1. Program title + lineage link — identity
2. Module count + assignment date — metadata
3. Edit button — action
4. (Expanded) Modules with progress indicators — detail
5. Trash icons — appear on hover, secondary action

## Content & Copy

| Element | Copy | Notes |
|---|---|---|
| Assign button (program page) | "Assign to Client" | Primary action in header |
| Add button (client page) | "Add Program" | Consistent with "add" pattern |
| Modal title (from program) | "Assign \"[Program Title]\"" | Shows what's being assigned |
| Modal title (from client) | "Add Program for [Client Name]" | Shows who receives it |
| Step 1 subtitle (clients) | "Select a client to assign this program to" | |
| Step 1 subtitle (templates) | "Select a program template to assign" | |
| Step 2 subtitle | "Uncheck modules or parts to exclude them" | Instruction |
| Summary line | "[N] modules, [N] parts selected" | Updates live |
| Assign button states | "Assign" → "Assigning..." | With spinner |
| Success toast (assign) | "Program assigned to [Client Name]" | |
| Success toast (append) | "[N] modules added to [Client Name]'s program" | |
| Conflict title | "Program Already Assigned" | |
| Conflict body | "[Client] already has \"[Program]\" assigned. Would you like to add more modules from this template?" | |
| Conflict note | "New modules will be added after the existing content in their program." | Sets expectations |
| View existing button | "View Existing" | Navigates to client profile |
| Add modules button | "Add Modules" | Proceeds to tree |
| Remove confirm (progress) | "This client has started this module. It will be hidden but preserved for audit purposes." | Soft delete |
| Remove confirm (no progress) | "This client hasn't started this module. It will be permanently removed." | Hard delete |
| Remove toast | "Module removed" / "Part removed" | |
| Empty clients | "No clients found. Add a client first." | With link |
| Empty templates | "No published templates available." | |
| Lineage label | "from template" | Subtle link on client program card |
| Network error | "Failed to assign. Please try again." | Inline banner |

## Accessibility Notes

- **Keyboard navigation:** Tab through client/template list → Enter to select → Tab to Next → Enter. In tree: Tab between modules, Space to toggle checkbox, Enter to expand/collapse, Arrow keys within expanded module to navigate parts.
- **Focus management:** On modal open, focus moves to search input (Step 1). On step transition, focus moves to first module checkbox (Step 2). On modal close, focus returns to trigger button.
- **Screen readers:** Checkboxes labeled with module/part title. Indeterminate state announced as "partially selected". Summary line is an aria-live region that updates when selections change. Conflict state announced as an alert role.
- **Confirm dialogs:** Focus trapped within dialog. Escape to cancel. Confirm button is not auto-focused to prevent accidental deletion.
- **Color:** Progress indicators use both color and text labels (not color alone). Status badges include text. Dimmed/excluded items use opacity, not color-only differentiation.
