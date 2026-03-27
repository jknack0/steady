# Feature Spec: Homework Item Type Label Customization

**Status: READY_FOR_IMPLEMENTATION**

## Summary

Clinicians can customize the display names of homework item types to match their therapeutic vocabulary. For example, a clinician might rename "Action Item" to "Steady Work" or "Journal Prompt" to "Reflection." This is a per-clinician branding setting stored in the existing `ClinicianConfig` model as a nullable JSON column. Custom labels flow from clinician config through the API to the participant's mobile app via the existing resolved config endpoint. If no custom label is set for a given type, the system default is used.

## User Stories

- As a clinician, I want to customize the display names of homework item types so that the language in my programs matches my therapeutic approach and resonates with my participants.
- As a clinician, I want to see my custom labels reflected in the homework editor so I know exactly what my participants will see.
- As a participant, I want to see the homework labels my clinician has chosen so the language feels consistent with my sessions.
- As a clinician, I want sensible defaults so I only need to customize the labels I care about.
- As a clinician, I want to reset a label back to its default without clearing all my other customizations.

## Acceptance Criteria

- [ ] The settings page (`/settings`) includes a new "Homework Labels" card where clinicians can edit the display name for each of the 6 homework item types.
- [ ] Each label input shows the default label as placeholder text so the clinician knows what the default is.
- [ ] Empty or cleared inputs fall back to the system default label (no blank labels ever reach the participant).
- [ ] Custom labels are persisted in the `ClinicianConfig` model as a JSON column (`homeworkItemLabels`).
- [ ] The `PUT /api/config` endpoint accepts an optional `homeworkItemLabels` field (a partial record of type-to-label mappings).
- [ ] The `GET /api/participant/config` (resolved config) endpoint returns a `homeworkItemLabels` field containing the merged result: custom labels override defaults, omitted types use defaults. All types are always present in the response.
- [ ] The web homework editor (`homework-editor.tsx`) reads custom labels from clinician config and displays them instead of hardcoded defaults in the "Add item" type picker.
- [ ] The mobile app receives custom labels via the participant config endpoint and stores them for use wherever homework item type names are displayed.
- [ ] Labels are validated: each must be 1-50 characters (trimmed), keys must be valid homework item type enum values.
- [ ] Invalid homework item type keys are rejected with a 400 validation error.
- [ ] The feature works correctly for clinicians who have not set any custom labels (all defaults apply).

## Technical Approach

### Data Model Changes

**`ClinicianConfig` model** (`packages/db/prisma/schema.prisma`) — add one nullable JSON column:

```prisma
model ClinicianConfig {
  // ... existing fields ...
  homeworkItemLabels  Json?    // Partial<Record<HomeworkItemType, string>>
}
```

No migration script needed — `prisma db push` adds the nullable column with no impact on existing rows. No new tables. No new indexes.

### Shared Constants

Add to `packages/shared` (e.g., `src/constants/homework.ts` or inline in existing file):

```typescript
export const DEFAULT_HOMEWORK_ITEM_LABELS: Record<string, string> = {
  ACTION: "Action Item",
  RESOURCE_REVIEW: "Resource Review",
  JOURNAL_PROMPT: "Journal Prompt",
  BRING_TO_SESSION: "Bring to Session",
  FREE_TEXT_NOTE: "Free Text Note",
  CHOICE: "Choice",
};
```

This becomes the single source of truth, replacing hardcoded label strings in `homework-editor.tsx`.

### Zod Schema Changes

**`packages/shared/src/schemas/config.ts`** — add to `SaveClinicianConfigSchema`:

```typescript
const HomeworkItemTypeEnum = z.enum([
  "ACTION", "RESOURCE_REVIEW", "JOURNAL_PROMPT", "BRING_TO_SESSION",
  "FREE_TEXT_NOTE", "CHOICE",
]);

const HomeworkItemLabelsSchema = z.record(
  HomeworkItemTypeEnum,
  z.string().trim().min(1).max(50)
).optional();
```

### API Changes

**No new endpoints.** All changes fit within existing config routes.

1. **`PUT /api/config`** — The `saveClinicianConfig` service passes `homeworkItemLabels` through in the Prisma `upsert`.

2. **`GET /api/participant/config`** — The `resolveClientConfig` function merges defaults with overrides:

```typescript
const homeworkItemLabels = {
  ...DEFAULT_HOMEWORK_ITEM_LABELS,
  ...(clinicianConfig?.homeworkItemLabels as Record<string, string> | null),
};
```

### Frontend Changes (Web)

| File | Change |
|---|---|
| `apps/web/src/app/(dashboard)/settings/page.tsx` | Add "Homework Labels" card with input fields per type |
| `apps/web/src/components/part-editors/homework-editor.tsx` | Replace hardcoded `ITEM_TYPES` labels with custom labels from config |
| `apps/web/src/hooks/use-config.ts` | Add `homeworkItemLabels` to config type |

### Frontend Changes (Mobile)

The mobile app receives labels via `GET /api/participant/config`. Store in config state for use wherever homework item type names are displayed.

## Edge Cases

| Edge Case | Expected Behavior |
|---|---|
| Clinician clears a label input | Field omitted from saved JSON. Default label applies. |
| Clinician has never set custom labels | `homeworkItemLabels` is `null`. All defaults apply. |
| Invalid homework item type key | Zod rejects with 400. |
| Label exceeds 50 characters | Zod rejects with 400. Frontend enforces `maxLength={50}`. |
| Label is only whitespace | `z.string().trim().min(1)` rejects it. |
| Config saved without `homeworkItemLabels` | Existing labels preserved (field is optional). |
| `homeworkItemLabels: {}` | All custom labels cleared; defaults apply. |

## Out of Scope

- Per-program or per-participant label overrides (this is per-clinician only)
- Renaming the "Homework" part type itself
- Icon customization (only text labels)
- Practice-level label defaults
- Localization / i18n

## Open Questions

1. **Should custom labels appear in push notifications?** If homework reminder notifications reference item types by name, the notification worker would need to resolve clinician config. Recommend deferring to follow-up.

## Key Files Reference

| File | Role |
|---|---|
| `packages/db/prisma/schema.prisma` | `ClinicianConfig` model — add column |
| `packages/shared/src/schemas/config.ts` | Zod schema — add field |
| `packages/api/src/services/config.ts` | Save + resolve functions |
| `packages/api/src/routes/config.ts` | Route handlers (no new routes) |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | Settings UI |
| `apps/web/src/components/part-editors/homework-editor.tsx` | Hardcoded labels to replace |
| `apps/web/src/hooks/use-config.ts` | Config type |
