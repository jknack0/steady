# Sprint 17: Multi-Clinician Practice Management + Bulk Actions — UX Design

## Overview

Sprint 17 introduces two new UI surfaces: a Practice Dashboard page for practice owners and enhanced bulk action controls on the existing Participants page. The design follows Steady's existing visual language (shadcn/ui components, Tailwind theme tokens, sidebar navigation pattern).

---

## Practice Dashboard (`/practice`)

### Navigation

- New sidebar nav item "Practice" added to the Main section, after "Calendar"
- Only visible to users who are practice owners (determined by checking practice membership role)
- Icon: `Building2` from lucide-react

### Page Layout

```
+----------------------------------------------------------+
| Practice: [Practice Name]                    [Edit Name]  |
+----------------------------------------------------------+
|                                                           |
| [Stats Cards Row]                                         |
| +----------+ +----------+ +----------+ +----------+      |
| | Clinicians| | Programs | | Active   | | Upcoming |     |
| |     3     | |    12    | | Clients  | | Appts    |     |
| |           | |          | |    38    | |     7    |     |
| +----------+ +----------+ +----------+ +----------+      |
|                                                           |
| Team Members                             [Invite Button]  |
| +--------------------------------------------------------+|
| | Name          | Email           | Role    | Actions    ||
| | Dr. Smith     | dr@test.com     | Owner   |            ||
| | Dr. Jones     | jones@test.com  | Member  | [Remove]   ||
| +--------------------------------------------------------+|
|                                                           |
| All Participants                    [Search input]        |
| +--------------------------------------------------------+|
| | Name      | Clinician  | Program   | Status | Enrolled ||
| | Jane Doe  | Dr. Smith  | ADHD 101  | Active | Jan 15   ||
| | John Roe  | Dr. Jones  | Focus Pro | Active | Feb 2    ||
| +--------------------------------------------------------+|
| [Load More]                                               |
+----------------------------------------------------------+
```

### Stats Cards

- 4 cards in a responsive grid (1 col mobile, 2 col tablet, 4 col desktop)
- Each card: large number, label below, muted icon top-right
- Cards: Clinicians, Programs, Active Clients, Upcoming Appointments

### Member Management

- Table with member name, email, role badge, and remove button
- Owner row has no remove button (cannot remove self)
- Invite form: email input + "Invite" button, inline below the table
- Success toast on invite, error toast on failure (409 already member, 404 not found)
- Remove confirmation dialog: "Remove [Name] from [Practice]? They will lose access to practice templates and visibility."

### Practice Participant Table

- Columns: Name, Clinician, Program, Status, Enrolled Date
- Name links to `/participants/:id` detail page
- Search input filters by participant name or email
- Cursor pagination with "Load More" button at bottom
- Empty state: "No participants in this practice yet."

---

## Bulk Action Bar (Participants Page Enhancement)

### Current State

The participants page already has checkboxes and a floating bulk action bar with Unlock Next Module, Send Nudge, and Push Task buttons. Sprint 17 enhances this with:

### Enhancements

1. **Selection cap indicator**: When 50 participants are selected, show "50/50 max" and disable further checkbox selection
2. **Error handling**: If bulk action partially fails, show toast with "X succeeded, Y failed" summary
3. **Loading state**: Disable all buttons and show spinner during bulk action execution

### Confirmation Dialogs

Already implemented in current UI. No changes needed to the dialog pattern.

---

## Interaction Flows

### Invite Clinician Flow

1. Owner navigates to `/practice`
2. Scrolls to Team Members section
3. Types clinician email in invite input
4. Clicks "Invite"
5. System checks: clinician exists? Already a member?
6. Success: Member appears in table with "Member" role badge, toast "Clinician invited successfully"
7. Error: Toast with specific message ("Clinician not found", "Already a member")

### Remove Clinician Flow

1. Owner clicks "Remove" button on a member row
2. Confirmation dialog appears
3. Owner confirms
4. Member disappears from table, toast "Member removed"

### Practice Dashboard View Flow

1. Owner clicks "Practice" in sidebar
2. Stats cards load with practice-wide aggregates
3. Member table shows all clinicians
4. Participant table shows all participants with clinician attribution
5. Owner can search participants by name/email
6. Clicking a participant name navigates to their detail page

### Bulk Action Flow (existing, enhanced)

1. Clinician selects participants via checkboxes (max 50)
2. Floating action bar appears at bottom
3. Clinician clicks an action button
4. Confirmation dialog appears with action description and count
5. Clinician confirms
6. Action executes, results toast shown
7. Selection clears on success

---

## Responsive Behavior

- Stats cards: 1 column on mobile, 2 on tablet, 4 on desktop
- Tables: horizontal scroll on mobile
- Bulk action bar: full width on mobile, centered on desktop
- Invite form: stacks vertically on mobile

---

## Accessibility

- All interactive elements have accessible names
- Confirmation dialogs trap focus
- Table headers use semantic `<th>` elements
- Remove action requires explicit confirmation (no accidental clicks)
- Loading states announced to screen readers via aria-live regions
