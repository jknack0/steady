# Feelings Wheel Check-in — Architecture

## System Overview

The Feelings Wheel feature adds a new `FEELINGS_WHEEL` field type to the existing Daily Tracker system. It threads through every layer of the stack identically to existing field types (SCALE, NUMBER, YES_NO, MULTI_CHECK, FREE_TEXT, TIME) — same Prisma enum, same Zod schemas, same tracker template system, same field renderer pattern on mobile, same field editor pattern on web, same trends API, same RTM engagement logging. The only net-new artifact is the static taxonomy constant and a dedicated emotion-trends aggregation in the trends endpoint.

```
Participant (mobile)          Clinician (web)
       |                            |
  FeelingWheelField            FeelingWheelFieldEditor
  (drill-down selector)        (configure maxSelections)
       |                            |
       v                            v
  POST /participant/             PUT /daily-trackers/:id
  daily-trackers/:id/entries       (fields array includes FEELINGS_WHEEL)
       |                            |
       v                            v
  submitTrackerEntry()      +--> DailyTrackerField (fieldType=FEELINGS_WHEEL, options={maxSelections:3})
  (upsert entry)            |    DailyTrackerEntry.responses[fieldId] = ["happy.optimistic.hopeful", ...]
       |                    |
       +-----> RTM engagement (existing fire-and-forget)
               |
               v
          GET /daily-trackers/:id/trends?userId=X
          --> emotionTrends: { emotionId: count }[] per period
               |
               v
          emotion_trends widget (client_overview page)
          + TrackerDataView emotion chips
```

No new database tables. No new API route files. No new Prisma models. The feature is an additive extension of existing patterns.

## Data Flow

1. **Clinician configures**: Adds a FEELINGS_WHEEL field to a tracker via the web field editor (or uses the "feelings-check-in" template). The field's `options` JSON stores `{ maxSelections: 3 }`.
2. **Participant fills in**: Mobile renders a drill-down wheel. Participant selects 1-3 emotions at any depth (primary/secondary/tertiary). Selections stored as dot-path string IDs (e.g., `"happy.optimistic.hopeful"`).
3. **Entry submitted**: `POST /participant/daily-trackers/:id/entries` upserts `DailyTrackerEntry`. The `responses` JSON field stores `{ [fieldId]: ["happy.optimistic.hopeful", "sad.lonely"] }`.
4. **Server-side validation**: Before persisting, validate each emotion ID against the taxonomy whitelist constant. Reject unknown IDs with 400.
5. **RTM engagement**: Existing `logRtmEngagement(userId, "DAILY_TRACKER_COMPLETED", ...)` fires automatically — no changes needed.
6. **Clinician views trends**: `GET /daily-trackers/:id/trends` returns a new `emotionTrends` object alongside existing `fieldTrends`. The web TrackerDataView and TrackerCharts components render emotion data as colored chips and bar charts.
7. **Dashboard widget**: The `emotion_trends` widget on `client_overview` fetches the same trends endpoint and renders a compact emotion frequency visualization.

## Schema Changes

### Prisma (`packages/db/prisma/schema.prisma`)

Single change — add one value to the existing enum:

```prisma
enum TrackerFieldType {
  SCALE
  NUMBER
  YES_NO
  MULTI_CHECK
  FREE_TEXT
  TIME
  FEELINGS_WHEEL   // <-- new
}
```

No new models, columns, or indexes. The `DailyTrackerField.options` column (Json?) already stores type-specific config. The `DailyTrackerEntry.responses` column (Json) already stores arbitrary per-field values.

After adding the enum value: `npm run db:generate && npm run db:push`.

### Zod (`packages/shared/src/schemas/daily-tracker.ts`)

**1. Extend `TrackerFieldTypeEnum`:**

```typescript
export const TrackerFieldTypeEnum = z.enum([
  "SCALE", "NUMBER", "YES_NO", "MULTI_CHECK", "FREE_TEXT", "TIME",
  "FEELINGS_WHEEL",  // <-- new
]);
```

**2. Add `FeelingWheelOptionsSchema`:**

```typescript
export const FeelingWheelOptionsSchema = z.object({
  maxSelections: z.number().int().min(1).max(10).default(3),
});
```

**3. Extend `CreateTrackerFieldSchema` superRefine** with FEELINGS_WHEEL validation branch.

**4. Widen `options` union** to include `FeelingWheelOptionsSchema`.

**5. Add `FeelingWheelResponseSchema`** for server-side entry validation:

```typescript
export const FeelingWheelResponseSchema = z.array(z.string().max(100)).min(1).max(10);
```

## Taxonomy Design

### Location

`packages/shared/src/constants/feelings-wheel.ts`, re-exported from `packages/shared/src/constants/index.ts`.

### Structure

```typescript
export interface EmotionCategory {
  id: string;           // "happy"
  label: string;        // "Happy"
  color: string;        // "#8FAE8B"
  children: {
    id: string;         // "happy.optimistic"
    label: string;      // "Optimistic"
    children: {
      id: string;       // "happy.optimistic.hopeful"
      label: string;    // "Hopeful"
    }[];
  }[];
}

export const FEELINGS_WHEEL: EmotionCategory[] = [
  {
    id: "happy", label: "Happy", color: "#8FAE8B",
    children: [
      { id: "happy.optimistic", label: "Optimistic", children: [
        { id: "happy.optimistic.hopeful", label: "Hopeful" },
        { id: "happy.optimistic.inspired", label: "Inspired" },
      ]},
      // ... remaining secondary/tertiary entries
    ],
  },
  // sad, angry, fearful, disgusted, surprised, bad
];
```

### Helper Functions

```typescript
/** Flat lookup map: emotionId -> Emotion. Built once at import time. */
export const EMOTION_MAP: Map<string, Emotion>;

/** Validate that all IDs in an array exist in the taxonomy. */
export function validateEmotionIds(ids: string[]): boolean;

/** Get the primary (tier-1) category for any emotion ID. */
export function getPrimaryEmotion(emotionId: string): string;

/** Get the display label for an emotion ID. */
export function getEmotionLabel(emotionId: string): string | undefined;

/** Get the color for an emotion ID (inherits from primary). */
export function getEmotionColor(emotionId: string): string;

/** Get all IDs in the taxonomy as a Set (for whitelist validation). */
export const VALID_EMOTION_IDS: Set<string>;
```

The flat `EMOTION_MAP` is derived from the tree at module load time (~130 emotions).

## API Design

### Modified Endpoint: `GET /daily-trackers/:id/trends`

Extend the existing trends endpoint to handle FEELINGS_WHEEL fields.

**Response shape** (additions in bold):

```typescript
{
  success: true,
  data: {
    fields: [...],          // existing — now includes FEELINGS_WHEEL fields
    fieldTrends: {...},     // existing — SCALE/NUMBER only
    emotionTrends: {        // NEW
      [fieldId: string]: {
        byEmotion: Array<{ emotionId: string; label: string; color: string; count: number }>,
        byPrimary: Array<{ emotionId: string; label: string; color: string; count: number }>,
        timeline: Array<{ date: string; emotions: string[] }>,
      }
    },
    completionRate: 0.87,   // existing
    totalDays: 30,          // existing
    completedDays: 26,      // existing
    streak: 5,              // existing
  }
}
```

**Max lookback enforcement**: Cap `startDate` to 90 days before `endDate` (compliance recommendation).

### Modified Endpoint: `POST /participant/daily-trackers/:id/entries`

**Server-side validation** added in `submitTrackerEntry()`:

1. Load the tracker's fields.
2. For each FEELINGS_WHEEL field, validate `responses[fieldId]` is a `string[]` where every element exists in `VALID_EMOTION_IDS`.
3. Validate `responses[fieldId].length <= field.options.maxSelections`.
4. Reject with 400 if validation fails.

Validation happens in the service layer (not middleware) because it requires loading field definitions from the database.

## Component Architecture

### Mobile (Expo)

**New component: `FeelingWheelField`**

Added to the existing field renderer switch block.

```
FeelingWheelField
  props: { field, value: string[], onChange: (ids: string[]) => void }
  |
  +-- CategoryRing (7 primary emotion buttons, arranged in a grid)
  |     onPress -> drills into secondary tier
  |
  +-- SecondaryList (shows children of selected primary)
  |     onPress -> drills into tertiary tier OR selects
  |
  +-- TertiaryList (shows children of selected secondary)
  |     onPress -> selects emotion
  |
  +-- SelectedChips (horizontal scroll of selected emotions with remove button)
       shows count badge: "2/3 selected"
```

**Interaction model**:
- Tap primary → shows secondary children
- Tap secondary → shows tertiary children (or select directly)
- Tap tertiary → selects it
- Users can select at any tier depth — flexible
- Back button returns to parent tier
- Selected emotions as colored chips at bottom
- When maxSelections reached, remaining options dim
- Haptic feedback on selection/deselection

### Web (Next.js)

**1. Field Editor**: Add FEELINGS_WHEEL to FIELD_TYPES array, show maxSelections input.

**2. Data View**: Render FEELINGS_WHEEL responses as colored Badge components with tooltips showing full path.

**3. Tracker Charts**: Add emotion frequency bar chart (Recharts BarChart) colored by primary category.

**4. Dashboard Widget**: `emotion_trends` in WIDGET_REGISTRY, renders compact emotion frequency view.

## Integration Points

| System | Integration | Changes Required |
|---|---|---|
| **Prisma enum** | `TrackerFieldType` | Add `FEELINGS_WHEEL` value |
| **Zod validation** | `CreateTrackerFieldSchema`, `TrackerFieldTypeEnum` | Add type, options schema, superRefine branch |
| **Tracker templates** | `tracker-templates.ts` | Add `feelings-check-in` template |
| **Trends API** | `daily-trackers.ts` GET `/:id/trends` | Add `emotionTrends` aggregation |
| **Entry submission** | service `submitTrackerEntry` | Add server-side emotion ID validation |
| **Mobile form** | `tracker/[trackerId]/index.tsx` | Add FeelingWheelField renderer case |
| **Web field editor** | `trackers/[trackerId]/page.tsx` | Add FEELINGS_WHEEL to FIELD_TYPES, maxSelections input |
| **Web data view** | `tracker-data-view.tsx` | Add FEELINGS_WHEEL case with colored chips |
| **Web charts** | `tracker-charts.tsx` | Add emotion frequency bar chart |
| **Widget registry** | `dashboard-widgets.ts` | Add `emotion_trends` widget definition |
| **RTM engagement** | Existing `logRtmEngagement` | No changes needed |
| **Audit logging** | Existing Prisma middleware | No changes needed |

## Migration Strategy

1. **Database migration**: `prisma db push` adds `FEELINGS_WHEEL` to the `TrackerFieldType` enum. Purely additive — existing trackers unaffected.
2. **Backward compatibility**: Existing entries in `DailyTrackerEntry.responses` unaffected. New field type only appears when explicitly added.
3. **Deployment**: Atomic via Turborepo. No existing functionality breaks if layers deploy in any order — enum value is unused until all layers are in place.
4. **Template**: Added to in-memory `TEMPLATES` array. No database seeding required.
5. **Rollback**: Remove template, remove from Zod enum (blocks creation), clean up fields via data script if needed.

## Technical Decisions

| Decision | Rationale |
|---|---|
| **Dot-path string IDs** (`"happy.optimistic.hopeful"`) | Human-readable, self-describing hierarchy, trivially parseable for tier extraction via `split(".")` |
| **Static constant, not DB table** | Immutable reference data (~130 entries). Zero query overhead, instant validation, shared across API and frontends |
| **String array in responses JSON** | Matches existing pattern (MULTI_CHECK already stores string[]). No schema migration needed |
| **Service-layer validation** (not Zod middleware) | Requires knowledge of field definitions and taxonomy constant |
| **Extend existing trends endpoint** | Keeps API surface small. Additive and non-breaking |
| **No separate widget data endpoint** | Widget calls same trends endpoint. Per-client, bounded query |
| **maxSelections default of 3** | Clinical guidance: 1-3 emotions captures intent without overwhelm. Configurable 1-10 |
| **Flexible depth selection** | Some participants lack vocabulary for tertiary. getPrimaryEmotion() enables roll-up regardless of depth |
| **Color per primary category** | 7 distinct colors. Secondary/tertiary inherit parent's color for consistency |
