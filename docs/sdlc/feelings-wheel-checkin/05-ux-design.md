# Feelings Wheel Check-in — UX Design

## Design Principles

1. **Speed over completeness.** ADHD participants often abandon multi-step inputs. The entire feelings selection must be achievable in under 10 seconds — fewer taps than typing a text response. Depth is optional: selecting "Sad" alone is a valid entry.
2. **Recognition over recall.** Participants choose from visible, color-coded emotion labels rather than recalling vocabulary. The taxonomy does the cognitive work.
3. **Consistent with existing field patterns.** The FEELINGS_WHEEL field type slots into the same card-per-field layout used by SCALE, YES_NO, MULTI_CHECK, etc. on mobile. On web, it follows the same FieldValue renderer switch pattern and SortableFieldEditor option panel pattern.
4. **Clinical utility first.** Clinicians need to spot emotional patterns over time, not admire a pretty wheel. Data views prioritize scannable chips and trendable bar charts over decorative radial graphics.
5. **Accessible by default.** All interactions are achievable via screen reader and keyboard. Color is never the sole differentiator — every emotion chip includes its text label.

---

## Mobile — Participant Experience

### Feelings Wheel Field

The field appears as a standard tracker card in the ScrollView, identical in outer structure to ScaleField or MultiCheckField. The card header shows the field label (e.g., "How are you feeling?") with the optional required asterisk.

#### Layout

The field has four visual layers, rendered sequentially as the participant drills in:

**Layer 1: CategoryRing (always visible)**
- Seven pill-shaped buttons arranged in two rows (4 top, 3 bottom, centered).
- Each pill: 80px wide, 40px tall, border-radius 20px, filled with the category's color at 15% opacity, 2px border in the category's full color, label centered in PlusJakartaSans_600SemiBold at 13px.
- Layout: `flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8`.
- Colors: Happy #8FAE8B, Sad #6B8DB2, Angry #C75C5C, Fearful #9B7DB8, Disgusted #7BAB7E, Surprised #E8B960, Bad #8B8B8B.

**Layer 2: SecondaryList (appears below CategoryRing on category tap)**
- Slides in with a 200ms spring animation.
- Displayed as a vertical list of touchable rows inside a rounded container (background: category color at 8%, border-radius 12px, 12px padding).
- Each row: full width, 44px touch target, 14px PlusJakartaSans_500Medium text in #2D2D2D, left-aligned. A small 8px circle of the category color sits to the left of the label.
- Header row shows the selected primary emotion in bold with a chevron-down icon and a "Tap to refine" hint in 11px muted text. Tapping the header collapses back to Layer 1.

**Layer 3: TertiaryList (appears below SecondaryList on secondary tap)**
- Same spring animation, nested inside the secondary container.
- Displayed as horizontal wrap of smaller chips (height 32px, border-radius 16px, background: category color at 12%, 12px horizontal padding).
- Each chip: 12px PlusJakartaSans_400Regular text.
- A "back" arrow chip at the start returns to the secondary list.

**Layer 4: SelectedChips (always visible when selections exist, pinned above CategoryRing)**
- Horizontal row of selected emotion chips, scrollable if needed.
- Each chip: category color background at full opacity, white text, 13px PlusJakartaSans_600SemiBold, border-radius 16px, height 32px, X icon on the right for removal.
- Text shows the leaf emotion label (not the full path), colored by the parent category.
- Counter badge (e.g., "2/3") in 10px muted text right-aligned above the chips.

#### Interaction Flow

1. Participant sees 7 primary emotion pills. They tap "Sad."
2. CategoryRing: "Sad" pill becomes fully filled (solid #6B8DB2, white text). Other pills fade to 40% opacity.
3. SecondaryList slides in below showing: Lonely, Vulnerable, Despair, Guilty, Depressed, Hurt.
4. Participant can:
   - **(a) Tap "Lonely"** — a chip "Lonely" (colored Sad blue) appears in SelectedChips. TertiaryList for Lonely slides in showing: Isolated, Abandoned.
   - **(b) Tap a tertiary "Isolated"** — replaces the "Lonely" chip with "Isolated" (still Sad blue). Maximum depth reached.
   - **(c) Tap the "Sad" header row** — collapses back, and "Sad" itself is added as a primary-level selection.
   - **(d) Tap another primary pill** — collapses the Sad drill-down, opens the new category.
5. Attempting to add beyond maxSelections triggers a gentle shake animation on the counter badge and a light haptic.
6. Removing a chip: tap the X on any SelectedChip. Haptic feedback on removal.
7. The field's value is an array of dot-path strings: `["sad.lonely.isolated", "happy.optimistic", "angry"]`.

#### States

| State | Visual |
|---|---|
| **Empty** | All 7 pills at full opacity, no SelectedChips row, no drill-down open |
| **Category selected, drilling** | Selected pill filled solid, others faded. SecondaryList open |
| **1-3 selections made, wheel closed** | SelectedChips row visible. All 7 pills at full opacity |
| **Max selections reached** | Counter shows "3/3". Adding without removing shows shake feedback |
| **Pre-filled (editing existing entry)** | SelectedChips pre-populated from saved response |
| **Disabled (already submitted today)** | Entire card at 60% opacity, touch events disabled, "Submitted" badge |

#### Visual Design

- **Typography**: Label: 14px PlusJakartaSans_600SemiBold #5A5A5A. Pill text: 13px SemiBold. Secondary list: 14px Medium. Tertiary chips: 12px Regular.
- **Spacing**: CategoryRing has 8px gap. SecondaryList has 12px top margin. SelectedChips has 12px bottom margin. Consistent with 16px card padding.
- **Shadows**: None on chips (flat design matching existing fields). Drill-down container is inline, not a popover.

#### Accessibility

- **VoiceOver/TalkBack**: Each primary pill has accessibilityLabel "Select [emotion] category" and accessibilityRole "button". Secondary rows: "Select [emotion], subcategory of [parent]". Tertiary chips: "Select [emotion], subcategory of [parent], category [grandparent]".
- **Selected state**: accessibilityState={{ selected: true }} on active pills and chips.
- **SelectedChips removal**: Each chip's X button has accessibilityLabel "Remove [emotion]".
- **Counter**: accessibilityLabel "[n] of [max] emotions selected".
- **Minimum touch targets**: All interactive elements at least 44px in the tap dimension.
- **Motion**: Respect `AccessibilityInfo.isReduceMotionEnabled`. When true, skip animations.

---

## Web — Clinician Experience

### Field Editor

When a clinician selects "Feelings Wheel" from the field type dropdown in the SortableFieldEditor:

**Type dropdown addition:**
```
{ value: "FEELINGS_WHEEL", label: "Feelings Wheel" }
```

**Options panel:**
A single configuration row:

| Control | Default | Description |
|---|---|---|
| Max Selections | `3` | Number input, min 1, max 5. Label: "Max selections". Helper text: "How many emotions can the participant select per check-in?" |

Second column shows a read-only preview: 7 primary categories as small colored dots with labels.

### Data View

In the `FieldValue` component, add a case for `"FEELINGS_WHEEL"`:

Each emotion string renders as a Badge component:
- Background: primary category's color at 15% opacity
- Text color: primary category's full color
- Border: 1px solid category color at 30% opacity
- Text: leaf emotion label, capitalized (e.g., "Isolated", "Optimistic")
- Size: `text-[10px]` matching existing Badge usage
- Tooltip: full path, human-readable (e.g., "Sad > Lonely > Isolated")
- Layout: `flex flex-wrap gap-1`

### Emotion Trends Widget

**Chart type: Stacked bar chart (Recharts BarChart)**

- X-axis: dates (last 30 days)
- Y-axis: count of selections (0 to maxSelections)
- Each bar segmented by primary category using the 7 category colors
- Bar width proportional, 4px gap between bars
- Corner radius on top segment: 2px

**Layout:**
- Container: `rounded-lg border p-4` (or `p-2` compact)
- Header: field label left, legend right (7 colored circles with labels)
- Chart height: 160px (100px compact)

**Tooltip:** Shows date and lists each selected emotion with colored dot.

**Summary row (below chart, non-compact):**
Top 5 most-selected emotions as Badges with count numbers.

**Color constants:**
```typescript
const FEELINGS_COLORS: Record<string, string> = {
  happy: "#8FAE8B",
  sad: "#6B8DB2",
  angry: "#C75C5C",
  fearful: "#9B7DB8",
  disgusted: "#7BAB7E",
  surprised: "#E8B960",
  bad: "#8B8B8B",
};
```

### Tracker Charts

After existing `chartableFields.map(...)`, add a section for feelings fields:

```
const feelingsFields = fields.filter(f => f.fieldType === "FEELINGS_WHEEL");
```

For each: stacked bar chart + top-emotions summary row. Compact mode: bar chart only, no summary, no legend, 100px height.

---

## Error States & Edge Cases

| Scenario | Handling |
|---|---|
| **0 emotions on required field** | Field card border turns #D4A0A0 with "Please select at least one emotion" message below CategoryRing |
| **Exceeds maxSelections** | No selection made. Counter shakes, medium haptic. No toast or modal |
| **Empty/unrecognizable dot-path in saved data** | Skip during rendering, log warning. Do not crash |
| **Taxonomy version mismatch** | Fall back to displaying raw leaf segment as plain gray text |
| **Field deleted after entries exist** | Existing behavior: entries retain data, field no longer renders |
| **No entries yet for feelings field** | "No emotion data yet" centered in chart container |
| **Only primary-level selections** | Fully valid. Bar chart counts "happy" same as "happy.optimistic.hopeful" |
| **Motor difficulties** | All targets 44px+. Horizontal pills avoid fine-motor precision of radial wheel |

---

## Animation & Micro-interactions

| Trigger | Animation | Duration | Easing |
|---|---|---|---|
| **Tap primary pill** | Scale 1.0→0.95→1.0. Fill 15%→100%. Others fade to 40% | Scale: 100ms. Fill: 150ms. Fade: 200ms | Spring / easeOut |
| **SecondaryList appears** | translateY 20→0, opacity 0→1 | 200ms | Spring |
| **TertiaryList appears** | translateY 12→0, opacity 0→1 | 180ms | Spring |
| **Chip added** | Scale 0→1 with overshoot. Adjacent chips shift | 250ms | Spring |
| **Chip removed** | Scale 1→0, opacity 1→0. Gap closes | 200ms | easeIn |
| **Max selections shake** | translateX: 0→-4→4→-2→2→0 | 300ms | Linear keyframes |
| **Drill-down collapse** | translateY 0→12, opacity 1→0 | 150ms | easeIn |
| **Haptic: selection** | ImpactFeedbackStyle.Light | Instant | — |
| **Haptic: removal** | ImpactFeedbackStyle.Light | Instant | — |
| **Haptic: max exceeded** | ImpactFeedbackStyle.Medium | Instant | — |
| **Reduced motion** | All animations instant (0ms). Haptics still fire | 0ms | None |

**Web animations:** CSS `transition: opacity 150ms ease` for hover states only. No spring physics.
