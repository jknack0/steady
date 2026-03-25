# Single Check-in Per Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate multiple daily trackers into one check-in per client, with a field editor modal and trend charts in the client overview widget.

**Architecture:** Enforce a one-tracker-per-participant constraint at the API level. Update Zod schemas to require `participantId` and allow empty fields. Add a convenience `GET /participant/:id` endpoint. Extract chart rendering from `TrackerDataView` into a reusable `TrackerCharts` component. Build an `EditCheckinModal` for field management. Write a migration script to merge existing multi-tracker data.

**Tech Stack:** Express, Prisma, Zod, React 19, TanStack Query, Recharts, @dnd-kit, TypeScript strict

**Spec:** `docs/superpowers/specs/2026-03-25-single-checkin-design.md`

---

## File Map

### Shared Package (`packages/shared/`)

| File | Action | Purpose |
|---|---|---|
| `src/schemas/daily-tracker.ts` | **Modify** | Make `participantId` required, allow empty `fields` array, make `participantId` required in from-template schema |

### API Package (`packages/api/`)

| File | Action | Purpose |
|---|---|---|
| `src/routes/daily-trackers.ts` | **Modify** | Add 409 constraint on POST, add `GET /participant/:participantId` endpoint (before `/:id`), remove `programId` ownership path |
| `src/scripts/merge-trackers.ts` | **Create** | One-time migration script to merge multi-tracker participants |
| `src/__tests__/daily-trackers.test.ts` | **Modify** | Add tests for 409 constraint, new endpoint, schema changes |

### Web App (`apps/web/`)

| File | Action | Purpose |
|---|---|---|
| `src/components/tracker-charts.tsx` | **Create** | Extracted chart rendering from `TrackerDataView` — accepts pre-fetched trend data |
| `src/components/edit-checkin-modal.tsx` | **Create** | Field editor modal with add/remove/reorder fields |
| `src/components/client-widgets/client-trackers.tsx` | **Rewrite** | Fetch single check-in, show charts or empty state, Edit/Setup buttons |
| `src/hooks/use-daily-trackers.ts` | **Modify** | Add `useParticipantCheckin` hook for the new endpoint |
| `src/components/tracker-data-view.tsx` | **Modify** | Extract chart rendering into `TrackerCharts`, import it back |
| `src/app/(dashboard)/participants/[id]/page.tsx` | **Modify** | Simplify Trackers tab to single check-in view |

---

## Task 1: Schema Changes

**Files:**
- Modify: `packages/shared/src/schemas/daily-tracker.ts`
- Test: `packages/shared/src/__tests__/daily-tracker-schemas.test.ts` (existing file — add tests)

- [ ] **Step 1: Update `CreateDailyTrackerSchema`**

Make `participantId` required and allow empty `fields` array:

```typescript
// Change line 51 from:
participantId: z.string().optional(),
// To:
participantId: z.string(),

// Change line 53 from:
fields: z.array(CreateTrackerFieldSchema).min(1),
// To:
fields: z.array(CreateTrackerFieldSchema),
```

- [ ] **Step 2: Update `CreateTrackerFromTemplateSchema`**

Make `participantId` required:

```typescript
// Change line 60 from:
participantId: z.string().optional(),
// To:
participantId: z.string(),
```

- [ ] **Step 3: Write tests for the schema changes**

Add to the existing test file at `packages/shared/src/__tests__/daily-tracker-schemas.test.ts`:

```typescript
describe("CreateDailyTrackerSchema — single check-in changes", () => {
  it("requires participantId", () => {
    const result = CreateDailyTrackerSchema.safeParse({
      name: "Check-in",
      fields: [],
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty fields array", () => {
    const result = CreateDailyTrackerSchema.safeParse({
      name: "Check-in",
      participantId: "participant-1",
      fields: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("CreateTrackerFromTemplateSchema — single check-in changes", () => {
  it("requires participantId", () => {
    const result = CreateTrackerFromTemplateSchema.safeParse({
      templateKey: "mood-log",
    });
    expect(result.success).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `cd packages/shared && npx vitest run src/__tests__/daily-tracker-schemas.test.ts`

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/daily-tracker.ts packages/shared/src/__tests__/daily-tracker-schemas.test.ts
git commit -m "feat(shared): require participantId, allow empty fields for single check-in"
```

---

## Task 2: API — 409 Constraint + New Endpoint

**Files:**
- Modify: `packages/api/src/routes/daily-trackers.ts`
- Modify: `packages/api/src/__tests__/daily-trackers.test.ts`

- [ ] **Step 1: Write failing tests**

Add to `packages/api/src/__tests__/daily-trackers.test.ts`:

```typescript
describe("Single check-in constraint", () => {
  it("returns 409 when creating second tracker for same participant", async () => {
    // Mock: existing tracker found
    mockPrisma.dailyTracker.findFirst.mockResolvedValue({ id: "existing-tracker" });

    const res = await request(app)
      .post("/api/daily-trackers")
      .set(...authHeader())
      .send({
        name: "Second Check-in",
        participantId: "participant-1",
        fields: [],
      });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already exists");
  });

  it("returns 409 when creating from template for participant with existing tracker", async () => {
    mockPrisma.dailyTracker.findFirst.mockResolvedValue({ id: "existing-tracker" });

    const res = await request(app)
      .post("/api/daily-trackers/from-template")
      .set(...authHeader())
      .send({
        templateKey: "mood-log",
        participantId: "participant-1",
      });

    expect(res.status).toBe(409);
  });
});

describe("GET /api/daily-trackers/participant/:participantId", () => {
  it("returns the single check-in for a participant", async () => {
    mockPrisma.enrollment.findFirst.mockResolvedValue({ id: "enrollment-1" });
    mockPrisma.dailyTracker.findFirst.mockResolvedValue({
      id: "tracker-1",
      name: "Daily Check-in",
      fields: [{ id: "f1", label: "Mood", fieldType: "SCALE" }],
      _count: { entries: 5 },
    });

    const res = await request(app)
      .get("/api/daily-trackers/participant/participant-1")
      .set(...authHeader());

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe("tracker-1");
  });

  it("returns 404 when no check-in exists", async () => {
    mockPrisma.enrollment.findFirst.mockResolvedValue({ id: "enrollment-1" });
    mockPrisma.dailyTracker.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/daily-trackers/participant/participant-1")
      .set(...authHeader());

    expect(res.status).toBe(404);
  });

  it("returns 403 for unrelated clinician", async () => {
    mockPrisma.enrollment.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .get("/api/daily-trackers/participant/participant-1")
      .set(...authHeader());

    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd packages/api && npx vitest run src/__tests__/daily-trackers.test.ts`

- [ ] **Step 3: Add 409 constraint to POST /api/daily-trackers**

In `packages/api/src/routes/daily-trackers.ts`, in the POST `/` handler (around line 33), add before the `prisma.dailyTracker.create` call:

```typescript
// Check single check-in constraint
const existing = await prisma.dailyTracker.findFirst({
  where: { participantId },
});
if (existing) {
  res.status(409).json({ success: false, error: "Check-in already exists for this participant" });
  return;
}
```

- [ ] **Step 4: Add 409 constraint to POST /from-template**

Same check in the from-template handler (around line 80), add before `createTrackerFromTemplate`:

```typescript
if (participantId) {
  const existing = await prisma.dailyTracker.findFirst({
    where: { participantId },
  });
  if (existing) {
    res.status(409).json({ success: false, error: "Check-in already exists for this participant" });
    return;
  }
}
```

- [ ] **Step 5: Add GET /participant/:participantId endpoint**

Add this BEFORE the `GET /:id` route (before line 158) to avoid route conflicts:

```typescript
// GET /api/daily-trackers/participant/:participantId — Get single check-in
router.get("/participant/:participantId", async (req: Request, res: Response) => {
  try {
    const { participantId } = req.params;
    const clinicianId = req.user!.clinicianProfileId!;

    // Verify clinician has relationship with participant
    const enrollment = await prisma.enrollment.findFirst({
      where: {
        participant: { userId: participantId },
        program: { clinicianId },
      },
      select: { id: true },
    });

    if (!enrollment) {
      res.status(403).json({ success: false, error: "Not authorized to view this participant" });
      return;
    }

    const tracker = await prisma.dailyTracker.findFirst({
      where: { participantId },
      include: {
        fields: { orderBy: { sortOrder: "asc" } },
        _count: { select: { entries: true } },
      },
    });

    if (!tracker) {
      res.status(404).json({ success: false, error: "No check-in found for this participant" });
      return;
    }

    res.json({ success: true, data: tracker });
  } catch (err) {
    logger.error("Get participant check-in error", err);
    res.status(500).json({ success: false, error: "Failed to get check-in" });
  }
});
```

- [ ] **Step 6: Run tests**

Run: `cd packages/api && npx vitest run src/__tests__/daily-trackers.test.ts`

- [ ] **Step 7: Commit**

```bash
git add packages/api/src/routes/daily-trackers.ts packages/api/src/__tests__/daily-trackers.test.ts
git commit -m "feat(api): add single check-in constraint and participant endpoint

409 on creating second tracker for same participant.
GET /participant/:id returns the single check-in with auth check."
```

---

## Task 3: Extract TrackerCharts Component

**Files:**
- Create: `apps/web/src/components/tracker-charts.tsx`
- Modify: `apps/web/src/components/tracker-data-view.tsx`

- [ ] **Step 1: Create `TrackerCharts` component**

Extract the chart rendering from `TrackerDataView` into a standalone component that accepts pre-fetched data. Read `apps/web/src/components/tracker-data-view.tsx` fully first.

The new component accepts:
```typescript
interface TrackerChartsProps {
  fields: Array<{ id: string; label: string; fieldType: string; options: any }>;
  fieldTrends: Record<string, Array<{ date: string; value: number }>>;
  completionRate: number;
  completedDays: number;
  totalDays: number;
  streak: number;
  compact?: boolean; // true for widget use — smaller charts, fewer labels
}
```

Extract the chart colors array, the stats grid (streak, completion rate, metrics count), and the per-field `LineChart` rendering from `TrackerDataView` (lines ~90-160) into this component. When `compact` is true, use height 100 instead of 160, hide axis labels, show sparkline-style.

- [ ] **Step 2: Update `TrackerDataView` to use `TrackerCharts`**

Import `TrackerCharts` and use it in `TrackerDataView`, replacing the inline chart JSX. This ensures no behavior change for existing users of `TrackerDataView`.

- [ ] **Step 3: Verify build**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/tracker-charts.tsx apps/web/src/components/tracker-data-view.tsx
git commit -m "feat(web): extract TrackerCharts from TrackerDataView for widget reuse"
```

---

## Task 4: Rewrite client_trackers Widget

**Files:**
- Rewrite: `apps/web/src/components/client-widgets/client-trackers.tsx`
- Modify: `apps/web/src/hooks/use-daily-trackers.ts`

- [ ] **Step 1: Add `useParticipantCheckin` hook**

Add to `apps/web/src/hooks/use-daily-trackers.ts`:

```typescript
export function useParticipantCheckin(participantId: string | undefined) {
  return useQuery({
    queryKey: ["participant-checkin", participantId],
    queryFn: () => api.get(`/api/daily-trackers/participant/${participantId}`),
    enabled: !!participantId,
  });
}
```

- [ ] **Step 2: Rewrite `client-trackers.tsx`**

Replace the current implementation with:

1. Fetch single check-in via `useParticipantCheckin(participantId)`
2. If no check-in (404): show "No check-in set up" + "Set Up Check-in" button
3. If check-in exists with entries: fetch trends via existing `useTrackerTrends` hook, render `TrackerCharts` (main) or stats (sidebar)
4. If check-in exists but no entries: show field list + "Waiting for first entry"
5. Add "Edit" button that opens `EditCheckinModal` (created in Task 5)

The widget should import `TrackerCharts` from `@/components/tracker-charts`.

For sidebar: show streak + completion rate as numbers only — no Recharts.

- [ ] **Step 3: Verify build**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/client-widgets/client-trackers.tsx apps/web/src/hooks/use-daily-trackers.ts
git commit -m "feat(web): rewrite client_trackers widget with charts and single check-in

Fetch single check-in via new endpoint. Show TrackerCharts in main
column, stats in sidebar. Setup/edit buttons for managing fields."
```

---

## Task 5: Edit Check-in Modal

**Files:**
- Create: `apps/web/src/components/edit-checkin-modal.tsx`

- [ ] **Step 1: Build the modal**

Create `apps/web/src/components/edit-checkin-modal.tsx`. This is a `size="md"` dialog with:

- Local state: clone of the tracker's fields array
- Field list with drag-to-reorder (`@dnd-kit/sortable`), type badge, delete (X) button per field
- "Add Field" section at bottom:
  - Type dropdown (SCALE, NUMBER, YES_NO, MULTI_CHECK, FREE_TEXT, TIME)
  - Label input
  - Type-specific options: min/max inputs for SCALE, comma-separated choices for MULTI_CHECK
  - "Add" button
- Footer: "Save" + "Cancel"
- On Save: calls `useUpdateDailyTracker` with the fields array
- On success: invalidate `["participant-checkin", participantId]` query key

Props:
```typescript
interface EditCheckinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackerId: string;
  participantId: string;
  fields: Array<{
    id?: string;
    label: string;
    fieldType: string;
    options: any;
    sortOrder: number;
    isRequired: boolean;
  }>;
}
```

Use the existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogBody`, `DialogFooter` components with `size="md"`.

- [ ] **Step 2: Verify build**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/edit-checkin-modal.tsx
git commit -m "feat(web): add EditCheckinModal for managing check-in fields

Modal with drag-to-reorder fields, add new field form with
type-specific options, and save/cancel buttons."
```

---

## Task 6: Simplify Trackers Tab

**Files:**
- Modify: `apps/web/src/app/(dashboard)/participants/[id]/page.tsx`

- [ ] **Step 1: Read the current Trackers tab**

Read the participant detail page, specifically the Trackers tab section (starts around line 1753). Understand the current multi-tracker list, add dialog, and TrackerDataView usage.

- [ ] **Step 2: Simplify to single check-in view**

Replace the Trackers tab content:
1. Fetch single check-in via `useParticipantCheckin`
2. If no check-in: show setup flow (template picker or start blank)
3. If check-in exists: show full `TrackerDataView` for that one tracker
4. Add "Edit Fields" button that opens `EditCheckinModal`
5. Remove: multi-tracker list, "Add Check-in" button, per-tracker pause/resume/delete

- [ ] **Step 3: Remove DailyTrackerSection from programs page**

Check if `DailyTrackerSection` is used on program detail pages. If so, remove its usage (but don't delete the component file — it may be imported elsewhere). Search for imports:

```bash
grep -r "DailyTrackerSection" apps/web/src/ --include="*.tsx"
```

Remove any usage found.

- [ ] **Step 4: Verify build**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/app/(dashboard)/participants/[id]/page.tsx"
git commit -m "feat(web): simplify Trackers tab to single check-in view

Show one check-in with TrackerDataView. Edit Fields button opens
EditCheckinModal. Remove multi-tracker UI."
```

---

## Task 7: Migration Script

**Files:**
- Create: `packages/api/src/scripts/merge-trackers.ts`

- [ ] **Step 1: Write the migration script**

```typescript
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function mergeTrackers() {
  // Find participants with >1 tracker (only participant-scoped, not program-only)
  const participants = await prisma.dailyTracker.groupBy({
    by: ["participantId"],
    where: { participantId: { not: null } },
    _count: true,
    having: { participantId: { _count: { gt: 1 } } },
  });

  console.log(`Found ${participants.length} participants with multiple trackers`);

  for (const p of participants) {
    const participantId = p.participantId!;
    console.log(`\nProcessing participant: ${participantId}`);

    try {
      await prisma.$transaction(async (tx) => {
        // Get all trackers for this participant, ordered by entry count
        const trackers = await tx.dailyTracker.findMany({
          where: { participantId },
          include: {
            fields: { orderBy: { sortOrder: "asc" } },
            _count: { select: { entries: true } },
          },
          orderBy: { createdAt: "asc" },
        });

        // Sort by entry count desc — primary has most entries
        trackers.sort((a, b) => (b._count.entries - a._count.entries));
        const primary = trackers[0];
        const others = trackers.slice(1);

        console.log(`  Primary: ${primary.id} (${primary.name}, ${primary._count.entries} entries)`);
        console.log(`  Merging ${others.length} other trackers`);

        // Build dedup key for primary's fields
        const primaryFieldKeys = new Set(
          primary.fields.map(f => `${f.label}|${f.fieldType}|${JSON.stringify(f.options)}`)
        );

        let maxSortOrder = primary.fields.length > 0
          ? Math.max(...primary.fields.map(f => f.sortOrder))
          : -1;

        // Track old→new field ID mapping for entry remapping
        const fieldIdMap = new Map<string, string>();

        for (const other of others) {
          // Merge unique fields
          for (const field of other.fields) {
            const key = `${field.label}|${field.fieldType}|${JSON.stringify(field.options)}`;
            if (!primaryFieldKeys.has(key)) {
              maxSortOrder++;
              const newField = await tx.dailyTrackerField.create({
                data: {
                  trackerId: primary.id,
                  label: field.label,
                  fieldType: field.fieldType,
                  options: field.options,
                  sortOrder: maxSortOrder,
                  isRequired: field.isRequired,
                },
              });
              fieldIdMap.set(field.id, newField.id);
              primaryFieldKeys.add(key);
              console.log(`  Added field: ${field.label} (${field.fieldType})`);
            } else {
              // Map to existing primary field with same key
              const matchingPrimary = primary.fields.find(
                pf => `${pf.label}|${pf.fieldType}|${JSON.stringify(pf.options)}` === key
              );
              if (matchingPrimary) fieldIdMap.set(field.id, matchingPrimary.id);
            }
          }

          // Merge entries
          const entries = await tx.dailyTrackerEntry.findMany({
            where: { trackerId: other.id },
          });

          for (const entry of entries) {
            // Remap response keys
            const remappedResponses: Record<string, any> = {};
            for (const [oldFieldId, value] of Object.entries(entry.responses as Record<string, any>)) {
              const newFieldId = fieldIdMap.get(oldFieldId) || oldFieldId;
              remappedResponses[newFieldId] = value;
            }

            // Check if primary already has entry for this date
            const existingEntry = await tx.dailyTrackerEntry.findUnique({
              where: {
                trackerId_userId_date: {
                  trackerId: primary.id,
                  userId: entry.userId,
                  date: entry.date,
                },
              },
            });

            if (existingEntry) {
              // Merge responses
              const merged = { ...(existingEntry.responses as Record<string, any>), ...remappedResponses };
              await tx.dailyTrackerEntry.update({
                where: { id: existingEntry.id },
                data: { responses: merged },
              });
            } else {
              await tx.dailyTrackerEntry.create({
                data: {
                  trackerId: primary.id,
                  userId: entry.userId,
                  date: entry.date,
                  responses: remappedResponses,
                  completedAt: entry.completedAt,
                },
              });
            }
          }

          console.log(`  Migrated ${entries.length} entries from ${other.name}`);

          // Delete the non-primary tracker (cascade deletes fields + entries)
          await tx.dailyTracker.delete({ where: { id: other.id } });
          console.log(`  Deleted tracker: ${other.id} (${other.name})`);
        }

        console.log(`  ✓ Merged ${others.length} trackers into ${primary.id}`);
      });
    } catch (err) {
      console.error(`  ✗ Failed for participant ${participantId}:`, err);
      // Continue to next participant
    }
  }

  console.log("\nMigration complete.");
  await prisma.$disconnect();
}

mergeTrackers();
```

- [ ] **Step 2: Commit**

```bash
git add packages/api/src/scripts/merge-trackers.ts
git commit -m "feat(api): add one-time migration script to merge multi-tracker participants

Each participant's merge runs in a transaction. Fields deduped by
label+type+options. Entries remapped and merged by date."
```

---

## Task 8: Final Verification

- [ ] **Step 1: Run all tests**

```bash
cd packages/shared && npx vitest run src/__tests__/daily-tracker-schemas.test.ts
cd packages/api && npx vitest run src/__tests__/daily-trackers.test.ts
```

- [ ] **Step 2: Run typecheck**

```bash
cd apps/web && npx tsc --noEmit
```

- [ ] **Step 3: Manual smoke test**

1. Open a participant detail page — Trackers tab shows single check-in view
2. Click "Edit Fields" — modal opens with field list
3. Add a field, reorder, save — fields update
4. Check client overview widget — shows trend charts (or empty state)
5. Sidebar column — shows stats only, no charts
6. Try creating second tracker via API — should get 409

- [ ] **Step 4: Commit if cleanup needed**

```bash
git add <changed files>
git commit -m "chore: cleanup single check-in implementation"
```
