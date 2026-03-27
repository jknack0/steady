# Homework Label Customization — UX Design

## User Flows

### Flow 1: Settings Page — Set Default Labels

**Entry point:** Clinician navigates to Settings page, scrolls to "Homework Labels" card
**Success state:** Custom labels saved, applied to all non-overridden homework items

**Wireframe:**
```
┌─────────────────────────────────────────────────────────────┐
│  Homework Labels                                            │
│  Customize how homework types appear to your clients.       │
│                                                             │
│  Type              Your Label                               │
│  ─────────────     ──────────────────────────────  ───────  │
│  Action Item       [ Weekly Practice            ]  [ Reset ]│
│  Resource Review   [                            ]  [ Reset ]│
│  Journal Prompt    [ Reflection                 ]  [ Reset ]│
│  Bring-to-Session  [                            ]  [ Reset ]│
│  Free Text Note    [                            ]  [ Reset ]│
│  Choice            [                            ]  [ Reset ]│
│  Worksheet         [                            ]  [ Reset ]│
│  Rating Scale      [                            ]  [ Reset ]│
│  Timer             [                            ]  [ Reset ]│
│  Mood Check        [                            ]  [ Reset ]│
│  Habit Tracker     [                            ]  [ Reset ]│
│                                                             │
│  Labels apply to all homework items unless you override     │
│  them on individual items.                                  │
└─────────────────────────────────────────────────────────────┘
```

**Design decisions:**
- "Type" column shows **system default label** (human-readable), not the enum value
- Empty inputs have system default as placeholder text (greyed out)
- Reset button only enabled when a custom label is set
- Saves with the existing page-level Save button (no separate save action)

**Steps:**
1. Clinician sees all 11 types listed with current labels (custom or placeholder defaults)
2. Clinician clicks into an input field and types their preferred label
3. Character count appears as they approach 50 chars (`42/50`)
4. Clinician clicks the page's existing Save button
5. Toast: "Settings saved" (existing pattern)

### Flow 2: Homework Editor — Per-Item Label Override

**Entry point:** Clinician editing a homework part, viewing the item list
**Success state:** Individual item has a custom label that overrides the default

**Display state** — resolved label shown in header:
```
┌─────────────────────────────────────────────────────────┐
│  ≡  Weekly Practice  ✎                       ▼  ✕      │
│  ─────────────────────────────────────────────────────  │
│  Description: [Complete the breathing exercise...]      │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

**Edit state** — after clicking pencil icon:
```
┌─────────────────────────────────────────────────────────┐
│  ≡  [ Mindfulness Exercise     ] ✓  ↩        ▼  ✕      │
│  ─────────────────────────────────────────────────────  │
│  Description: [Complete the breathing exercise...]      │
│  ...                                                    │
└─────────────────────────────────────────────────────────┘
```

**Interaction elements:**
- **✓ (checkmark):** Confirms the override, collapses back to display mode
- **↩ (reset):** Clears the custom label, reverts to resolved default
- **Input placeholder:** Shows the resolved default (clinician default or system default)
- **Escape key:** Cancels edit, reverts to previous value

**Steps:**
1. Header shows resolved label (part override → clinician default → system default) with subtle pencil icon
2. Click pencil → input appears inline, focused, pre-filled with current custom label (or empty with default as placeholder)
3. Type a custom label → auto-saves with the part content (same debounced auto-save as other fields)
4. Click ✓ or press Enter → collapses back to display mode showing the new label
5. Click ↩ → clears `customLabel`, display reverts to resolved default

**Visual indicator:** If an item has a part-level override, the label shows in italic with a small "customized" dot so the clinician knows this item deviates from their default.

### Flow 3: Mobile — Participant Views Custom Labels

Purely display — no interaction design needed.

```
┌──────────────────────────────────┐
│  ☐  Weekly Practice              │
│     Complete the breathing       │
│     exercise daily this week     │
│                                  │
│  ☐  Reflection                   │
│     Write about one moment       │
│     where you felt focused       │
└──────────────────────────────────┘
```

Labels replace the raw type name. No "customized" indicator on mobile — participants don't need to know it was renamed.

## Component Specifications

### Settings — Label Input Row

**Purpose:** Let clinicians set a custom default label for a homework type

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Default (no custom) | Empty input, system default as placeholder | Type to set custom label |
| Custom label set | Input shows custom value, Reset button enabled | Edit to change, Reset to clear |
| Typing | Input focused, character counter appears at 40+ chars | Live validation |
| At limit | Counter shows `50/50` in amber | Input stops accepting characters |
| Over limit (paste) | Counter shows `53/50` in red, field outlined red | Save button disabled until fixed |
| Saving | Existing page save spinner | Input remains editable |
| Save error | Existing error toast | Values remain in form, user can retry |
| Reset clicked | Input clears, placeholder reappears, Reset disables | Included in next save |

**Interactions:**

| Action | Feedback | Result | Error |
|--------|----------|--------|-------|
| Type in input | Character counter at 40+ | Value staged for save | Over 50: red counter, save blocked |
| Click Reset | Input clears, placeholder appears | Custom label removed | — |
| Click page Save | Save spinner | Toast "Settings saved" | Error toast, form preserved |

### Homework Editor — Inline Override

**Purpose:** Let clinicians override the label for a single homework item

**States:**

| State | Appearance | Behavior |
|-------|-----------|----------|
| Display (no override) | Resolved label + pencil icon | Click pencil to edit |
| Display (overridden) | Custom label in italic + pencil icon + small dot | Click pencil to edit |
| Editing | Inline input + ✓ + ↩ buttons | Type, Enter/✓ to confirm, Escape/↩ to cancel |
| Empty input | Placeholder shows resolved default | Confirming empty = reset to default |

**Interactions:**

| Action | Feedback | Result | Error |
|--------|----------|--------|-------|
| Click pencil | Input appears, focused | Edit mode | — |
| Type + Enter/✓ | Input collapses, label updates | customLabel saved via auto-save | Over 50: validation prevents confirm |
| Click ↩ | Input clears, collapses | Reverts to resolved default | — |
| Press Escape | Input collapses | Cancels, restores previous value | — |

## Information Hierarchy

**Settings page:**
1. **Most prominent:** The input fields — what the clinician is here to edit
2. **Secondary:** The type name column — context for what they're renaming
3. **Tertiary:** The Reset buttons — utility, not primary action
4. **Background:** Footer hint about per-item overrides — informational

**Homework editor:**
1. **Most prominent:** The resolved label in the item header — what participants will see
2. **Secondary:** The pencil icon — discoverable but not intrusive
3. **Tertiary:** The customized indicator (dot/italic) — subtle signal, not a call to action

## Content & Copy

| Element | Copy | Notes |
|---------|------|-------|
| Card title | "Homework Labels" | |
| Card description | "Customize how homework types appear to your clients." | |
| Footer hint | "Labels apply to all homework items unless you override them on individual items." | Subtle, muted text |
| Input placeholder | The system default label (e.g., "Action Item") | Greyed out |
| Reset button | "Reset" | Disabled when no custom label |
| Character counter | "42/50" | Only shows at 40+ chars |
| Validation error | "Label must be 50 characters or less" | Inline under field |
| Editor pencil tooltip | "Customize label" | On hover |
| Editor reset tooltip | "Reset to default" | On hover |

## Accessibility Notes

- **Settings inputs:** Each input has `aria-label="Custom label for [Type Name]"` — screen readers announce what type they're editing
- **Reset buttons:** `aria-label="Reset [Type Name] to default"` with `aria-disabled` when no custom label
- **Character counter:** `aria-live="polite"` so screen readers announce count changes
- **Editor pencil icon:** `role="button"` with `aria-label="Edit label for this homework item"`
- **Editor inline input:** Focus trapped in edit mode — Tab goes to ✓ then ↩, Escape cancels
- **Keyboard navigation:** All settings rows navigable via Tab. Editor pencil activatable via Enter/Space.
