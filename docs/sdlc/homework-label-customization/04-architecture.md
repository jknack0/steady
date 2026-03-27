# Homework Label Customization — Architecture

## Design Decisions

### 1. Read-time resolution, not write-time stamping

Labels are resolved at **read time** using a three-tier fallback: Part-level `customLabel` on the homework item -> Clinician default label from `ClinicianConfig` -> System default constant from `@steady/shared`. This means changing a clinician default instantly propagates to all homework items that have no part-level override, satisfying FR-2 (retroactive) without any backfill job.

### 2. Store `customLabel` on each homework item schema variant

Each of the homework item Zod schemas (ACTION, RESOURCE_REVIEW, etc.) gets an optional `customLabel` field. This is the **part-level override**. When a clinician sets a label directly on a homework item in the part editor, it is written here. This also satisfies FR-4: when a clinician removes their default, items that had no part-level override will fall back to the system default, and items that had a part-level override keep it.

### 3. Clinician defaults stored as JSON on existing `ClinicianConfig` model

A new `homeworkLabels` JSON column on `ClinicianConfig` stores a `Record<HomeworkItemType, string>` for the clinician's custom defaults. This follows the existing pattern where `defaultAssessments`, `dashboardLayout`, etc. are JSON columns on the same model. No new database table needed.

### 4. Label resolution lives in a shared pure function

The resolution function `resolveHomeworkItemLabel(item, clinicianDefaults)` lives in `@steady/shared` so both the web editor (for preview) and the API (for serving to mobile) use identical logic. The API applies it when serving homework instances to participants.

### 5. System defaults defined as a constant in `@steady/shared`

A `HOMEWORK_TYPE_SYSTEM_LABELS` constant maps each type to its human-readable default (matching the existing `ITEM_TYPES` array labels in the homework editor). This is the final fallback and never changes per-clinician.

## Data Model

### Schema Changes

**`packages/db/prisma/schema.prisma`** — Add one column to `ClinicianConfig`:

```prisma
model ClinicianConfig {
  // ... existing fields ...
  homeworkLabels       Json?            // Record<HomeworkItemType, string> — clinician default labels
  // ... rest unchanged ...
}
```

No new tables. No migration of existing data needed — `null` means "use system defaults for everything."

### Label Resolution Strategy

```
resolveHomeworkItemLabel(item, clinicianDefaults):
  1. If item.customLabel is a non-empty string -> return item.customLabel
  2. If clinicianDefaults[item.type] is a non-empty string -> return clinicianDefaults[item.type]
  3. Return HOMEWORK_TYPE_SYSTEM_LABELS[item.type]
```

- **Web editor**: Calls this for display/preview. The clinician defaults come from the config query the page already makes.
- **API -> Mobile**: The `getHomeworkInstances` service enriches each homework item with a resolved `displayLabel` field before returning to the participant. This keeps the mobile app stateless regarding config lookups.
- The resolution function is a **pure function** — no DB calls, no side effects. It receives pre-fetched data.

## API Design

### Endpoints

#### 1. PATCH `/api/config/homework-labels` — Save clinician homework label defaults

Saves only the homework labels portion of clinician config (follows the `PATCH /api/config/dashboard-layout` pattern for partial updates).

**Request:**
```json
{
  "homeworkLabels": {
    "ACTION": "To-Do",
    "JOURNAL_PROMPT": "Reflection",
    "BRING_TO_SESSION": "Session Prep"
  }
}
```

Omitted types revert to system defaults (the field stores only overrides). Sending an empty object `{}` clears all custom defaults.

**Response:** `{ success: true, data: <ClinicianConfig> }`

**Validation:** Each value must be `z.string().trim().min(1).max(50)`. Keys must be valid `HomeworkItemType` values. Zod schema enforced server-side.

**Auth:** `authenticate` + `requireRole("CLINICIAN")`. Ownership implicit (uses `req.user.clinicianProfileId`).

#### 2. GET `/api/config` — Existing endpoint, no change needed

Already returns the full `ClinicianConfig` row including any new `homeworkLabels` JSON column. The web settings page and homework editor already call this.

#### 3. GET `/api/participant/homework-instances` — Existing endpoint, enhanced response

The response shape for each instance gains a `displayLabels` map so the mobile app can render labels without its own config lookup:

```json
{
  "id": "...",
  "part": {
    "id": "...",
    "title": "Week 3 Homework",
    "content": {
      "type": "HOMEWORK",
      "items": [
        { "type": "ACTION", "customLabel": "To-Do", "description": "...", ... },
        { "type": "JOURNAL_PROMPT", "description": "...", ... }
      ]
    }
  },
  "displayLabels": {
    "0": "To-Do",
    "1": "Reflection"
  }
}
```

The `displayLabels` map is keyed by item index and contains the fully resolved label for each item. This is computed server-side so mobile needs zero config awareness.

### Service Layer

#### New: `resolveHomeworkLabelsForInstance` in `packages/api/src/services/participant.ts`

Called within the existing `getHomeworkInstances` function after fetching instances. For each instance:

1. Look up the clinician who owns the program (via `enrollment.program.clinicianId` — already available or a single join away).
2. Fetch `clinicianConfig.homeworkLabels` (batch all clinician IDs from the result set into one query).
3. For each homework item, call the shared `resolveHomeworkItemLabel` function.
4. Attach `displayLabels` map to the response.

Optimization: Since homework instances for a participant typically belong to one clinician, this is usually one extra DB query for the clinician config, which can be cached in-request.

#### New: `saveHomeworkLabels` in `packages/api/src/services/config.ts`

```typescript
export async function saveHomeworkLabels(
  clinicianProfileId: string,
  homeworkLabels: Record<string, string>
): Promise<ClinicianConfig> {
  return prisma.clinicianConfig.update({
    where: { clinicianId: clinicianProfileId },
    data: { homeworkLabels: homeworkLabels as any },
  });
}
```

Follows the exact same pattern as `saveDashboardLayout`.

## Shared Package Changes

### Zod Schemas

#### `packages/shared/src/schemas/part.ts` — Add `customLabel` to homework items

Add `customLabel` as an optional field to each homework item schema:

```typescript
const homeworkItemLabelField = z.string().trim().min(1).max(50).optional();
```

Then add to each variant:

```typescript
const HomeworkActionSchema = z.object({
  type: z.literal("ACTION"),
  customLabel: homeworkItemLabelField,  // <-- new
  description: z.string().min(1),
  // ... rest unchanged
});
```

Repeat for all 11 homework item type schemas (ACTION, RESOURCE_REVIEW, JOURNAL_PROMPT, BRING_TO_SESSION, FREE_TEXT_NOTE, CHOICE, WORKSHEET, RATING_SCALE, TIMER, MOOD_CHECK, HABIT_TRACKER).

This is backward-compatible — `optional()` means existing data without `customLabel` parses fine.

#### `packages/shared/src/schemas/config.ts` — Add homework labels schema

```typescript
export const HomeworkItemTypeEnum = z.enum([
  "ACTION",
  "RESOURCE_REVIEW",
  "JOURNAL_PROMPT",
  "BRING_TO_SESSION",
  "FREE_TEXT_NOTE",
  "CHOICE",
  "WORKSHEET",
  "RATING_SCALE",
  "TIMER",
  "MOOD_CHECK",
  "HABIT_TRACKER",
]);

const HomeworkLabelValueSchema = z.string().trim().min(1).max(50);

export const SaveHomeworkLabelsSchema = z.object({
  homeworkLabels: z.record(HomeworkItemTypeEnum, HomeworkLabelValueSchema).default({}),
});

export type HomeworkItemType = z.infer<typeof HomeworkItemTypeEnum>;
export type SaveHomeworkLabelsInput = z.infer<typeof SaveHomeworkLabelsSchema>;
```

#### `packages/shared/src/constants/homework-labels.ts` — System defaults and resolver

```typescript
import type { HomeworkItemType } from "../schemas/config";

export const HOMEWORK_TYPE_SYSTEM_LABELS: Record<HomeworkItemType, string> = {
  ACTION: "Action Item",
  RESOURCE_REVIEW: "Resource Review",
  JOURNAL_PROMPT: "Journal Prompt",
  BRING_TO_SESSION: "Bring-to-Session",
  FREE_TEXT_NOTE: "Free Text Note",
  CHOICE: "Choice",
  WORKSHEET: "Worksheet",
  RATING_SCALE: "Rating Scale",
  TIMER: "Timer",
  MOOD_CHECK: "Mood Check",
  HABIT_TRACKER: "Habit Tracker",
};

export function resolveHomeworkItemLabel(
  itemType: HomeworkItemType,
  itemCustomLabel?: string | null,
  clinicianDefaults?: Partial<Record<HomeworkItemType, string>> | null,
): string {
  if (itemCustomLabel && itemCustomLabel.trim().length > 0) {
    return itemCustomLabel;
  }
  const clinicianDefault = clinicianDefaults?.[itemType];
  if (clinicianDefault && clinicianDefault.trim().length > 0) {
    return clinicianDefault;
  }
  return HOMEWORK_TYPE_SYSTEM_LABELS[itemType];
}
```

## Frontend (Web)

### Settings Page

**File:** `apps/web/src/app/(dashboard)/settings/page.tsx`

Add a new Card section between "Default Client Settings" and "Save Button":

```
Homework Labels
Customize how homework item types appear to your clients.
Default labels apply to all homework items unless overridden on individual items.

[ ACTION          ] [  Action Item         ] [ Reset ]
[ RESOURCE_REVIEW ] [  Resource Review     ] [ Reset ]
[ JOURNAL_PROMPT  ] [  Journal Prompt      ] [ Reset ]
...
```

Each row shows:
- The type name (read-only, muted text)
- An Input field with the current label (placeholder = system default)
- A "Reset" button that clears the custom label (returns to system default)

**State management:** Add `homeworkLabels` to the page's form state (type `Record<string, string>`). Populate from `config.homeworkLabels` on load. On save, include it in the existing `PUT /api/config` call or the new `PATCH /api/config/homework-labels` endpoint.

**Alternative (simpler):** Extend the existing `PUT /api/config` and `SaveClinicianConfigSchema` to accept `homeworkLabels` as an optional field. This avoids a new endpoint entirely — the save button already calls `PUT /api/config`. This is the recommended approach.

### Homework Editor

**File:** `apps/web/src/components/part-editors/homework-editor.tsx`

For each homework item in the list, add a small inline label override field:

1. In the collapsible header of each item (where `typeConfig.label` is shown), show the **resolved label** instead of the hardcoded `typeConfig.label`.
2. Add a pencil/edit icon next to the label. Clicking it reveals an inline Input field to set `customLabel`.
3. The Input placeholder shows the resolved default (clinician default or system default).
4. Clearing the field removes the `customLabel` from the item, reverting to the clinician/system default.

The editor needs access to the clinician config to resolve labels. Since the editor already runs inside the dashboard, it can use the existing `useClinicianConfig` hook.

The `onChange` callback already propagates content changes up. Adding `customLabel` to an item flows through the same path since it is part of the item schema.

## Mobile

### Part Renderer

**File:** `apps/mobile/components/part-renderers.tsx`

In the `HomeworkRenderer` function, replace the hardcoded type label:

```tsx
// Before:
<Text ...>{item.type.replace(/_/g, " ")}</Text>

// After:
<Text ...>{displayLabels?.[String(item.sortOrder ?? index)] ?? item.type.replace(/_/g, " ")}</Text>
```

The `HomeworkRenderer` props gain an optional `displayLabels?: Record<string, string>` prop, passed down from the screen that fetches homework instances. The screen already receives the full instance response, which now includes `displayLabels`.

This is a minimal change — one prop addition, one line of display logic. If `displayLabels` is not provided (backward compatibility), it falls back to the existing `type.replace(/_/g, " ")` behavior.

## Migration Strategy

### Database Migration

Single Prisma migration adding `homeworkLabels Json?` to `clinician_configs`. Nullable column, no default needed. Zero-downtime deploy — existing rows get `null`, which the resolver correctly interprets as "no custom defaults."

```sql
ALTER TABLE "clinician_configs" ADD COLUMN "homeworkLabels" JSONB;
```

### No Data Backfill Needed

- Existing homework items have no `customLabel` field — the schema addition is optional, so existing JSON content is valid without it.
- Existing clinician configs have `null` for `homeworkLabels` — the resolver returns system defaults.
- The system is immediately functional after deploy with all labels showing system defaults.

### Rollback Plan

If the column needs to be removed, drop it. The frontend and API will gracefully handle `null`/missing `homeworkLabels` since all code uses the resolver with fallbacks.

## Risks and Mitigations

### 1. Extra DB query on participant homework fetch

**Risk:** Fetching clinician config for label resolution adds a query to `getHomeworkInstances`.

**Mitigation:** Homework instances already join through `enrollment -> program` to get program data. The clinicianId is available from that join. A single `findUnique` on `clinician_configs` (indexed by `clinicianId` via `@unique`) is negligible. For a participant with one clinician (the common case), this is exactly one extra indexed lookup.

### 2. Stale labels in homework instance responses if clinician changes defaults mid-session

**Risk:** If a clinician changes their default labels while a participant has the app open, the participant sees stale labels until next fetch.

**Mitigation:** This is acceptable UX. TanStack Query's stale/refetch behavior on the mobile side will pick up changes on next focus/navigation. Labels are cosmetic, not functional.

### 3. JSON column size for `homeworkLabels`

**Risk:** Unbounded JSON.

**Mitigation:** The Zod schema caps at 11 keys (the enum), each value max 50 chars. Maximum possible payload is ~1KB. No concern.

### 4. Schema evolution: adding new homework item types

**Risk:** If a new homework item type is added, it needs a system default label.

**Mitigation:** `HOMEWORK_TYPE_SYSTEM_LABELS` and `HomeworkItemTypeEnum` are the single source of truth. Adding a type requires updating both (already the case for the discriminated union). The resolver falls back gracefully for unknown types.

### 5. Backward compatibility of homework item JSON content

**Risk:** Existing Part records have `content.items[]` without `customLabel`. Adding it to the Zod schema must not break parsing.

**Mitigation:** The field is `z.string().trim().min(1).max(50).optional()` — `optional()` means existing data without the field passes validation. No data migration needed.
