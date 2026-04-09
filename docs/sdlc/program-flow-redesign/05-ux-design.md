# Program Flow Redesign — UX Design

## Programs Page — Two-Tab Layout

### My Programs Tab (Default)
- Shows clinician's own programs (isTemplate: true, owned by them)
- Each card shows: title, module count, lineage ("from: [template name]" if cloned)
- Actions per card: "Assign to Client", "Edit"
- "Create Program" button at top
- Empty state: "No programs yet. Create one or browse the Template Library."

### Template Library Tab
- Shows seeded templates not owned by clinician
- Each card shows: title, description snippet, module count
- Actions per card: "Use Template", "Assign to Client"
- No create button — templates are read-only
- Empty state: "No templates available."

### Tab Behavior
- Tab state stored in URL query param (?tab=templates) for bookmarkability
- My Programs is the default active tab
- Switching tabs preserves scroll position

## Actions

### "Use Template"
- Calls POST /api/programs/:id/clone
- Creates a copy in My Programs with isTemplate: true
- Navigates to /programs/:newId (program editor)
- Toast: "Template added to My Programs"

### "Assign to Client" (from either tab)
- Opens existing AssignmentModal
- Same flow: pick client → customize tree → save
- Creates client copy (isTemplate: false)

### "Create Program"
- Creates blank program with isTemplate: true, status: PUBLISHED
- Navigates to program editor

### "Save as My Program" (client profile page)
- Button on client program cards in the participant detail page
- Calls POST /api/programs/:id/promote
- Clones structure only (no progress, no responses, no enrollment data)
- Toast: "Saved to My Programs"

## Removed UI Elements
- Status badge (DRAFT/PUBLISHED) removed from program cards and editor
- "Publish Program" / "Revert to Draft" toggle removed from editor settings panel
- "Publish this program to start enrolling clients" empty state removed from enrollment section
- PUBLISHED filter removed from invite patient modal program dropdown

## Card Design

### My Programs Card
```
┌──────────────────────────┐
│ Program Title             │
│ 8 modules                 │
│ from: CBT for Depression  │  ← lineage (subtle, only if cloned)
│                           │
│ [Assign to Client] [Edit] │
└──────────────────────────┘
```

### Template Library Card
```
┌──────────────────────────┐
│ Template Title            │
│ Description snippet...    │
│ 12 modules                │
│                           │
│ [Use Template] [Assign]   │
└──────────────────────────┘
```

### Client Program Card (on participant page)
```
┌──────────────────────────┐
│ Program Title             │
│ 6 modules · Assigned Mar 15 │
│ from: My CBT Program     │
│                           │
│ [Edit] [Save as My Program] │
└──────────────────────────┘
```
