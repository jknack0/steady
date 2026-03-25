# Modal Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Standardize all dialog/modal sizes to 3 fixed tiers (sm/md/lg), add a `DialogBody` scrolling component, and replace the in-modal phone preview with a standalone `PartPreviewModal`.

**Architecture:** Add a `size` prop to the existing shadcn `DialogContent` component. `sm` preserves current behavior (backward compat). `md` and `lg` apply fixed heights with flex-column layout for pinned header/scrolling body/pinned footer. Then migrate each modal to its assigned tier. Separately, create `PartPreviewModal` and remove the preview tab from part editor modals.

**Tech Stack:** React 19, TypeScript, Radix UI Dialog, Tailwind CSS, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-25-modal-standardization-design.md`

---

## File Map

### Modified Files

| File | Action | Purpose |
|---|---|---|
| `apps/web/src/components/ui/dialog.tsx` | **Modify** | Add `size` prop to `DialogContent`, add `DialogBody` component, update exports |
| `apps/web/src/components/part-editor-modal.tsx` | **Modify** | Apply `size="lg"`, remove preview tabs, add preview button, use `DialogBody` |
| `apps/web/src/components/homework-response-viewer.tsx` | **Modify** | Apply `size="lg"`, use `DialogBody` |
| `apps/web/src/app/(dashboard)/programs/create-program-dialog.tsx` | **Modify** | Apply `size="md"`, use `DialogBody` |
| `apps/web/src/app/(dashboard)/participants/page.tsx` | **Modify** | Both dialogs get `size="sm"` (minimal) |
| `apps/web/src/app/(dashboard)/participants/[id]/page.tsx` | **Modify** | Enroll dialog → `sm`, RTM enrollment → `md`, Tracker dialog → `md` |
| `apps/web/src/app/(dashboard)/rtm/page.tsx` | **Modify** | Time log dialog → `size="md"` |
| `apps/web/src/app/(dashboard)/rtm/[enrollmentId]/page.tsx` | **Modify** | Time log dialog → `size="sm"` |
| `apps/web/src/components/part-editors/homework-editor.tsx` | **Modify** | PDF import + add item dialogs → `size="sm"` |

### New Files

| File | Purpose |
|---|---|
| `apps/web/src/components/part-preview-modal.tsx` | Standalone part preview in phone frame (portal-based, accepts raw part data) |

---

## Task 1: Add Size Prop and DialogBody to dialog.tsx

**Files:**
- Modify: `apps/web/src/components/ui/dialog.tsx`

- [ ] **Step 1: Add `size` prop and conditional classes to `DialogContent`**

Change the `DialogContent` component to accept a `size` prop. The base classes (`grid`, `gap-4`, `p-6`, `max-w-lg`) stay for `sm`. For `md`/`lg`, override with flex layout and fixed height.

```typescript
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    size?: "sm" | "md" | "lg";
  }
>(({ className, children, size = "sm", ...props }, ref) => {
  const baseClasses =
    "fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg";

  const sizeClasses = {
    sm: "max-w-lg grid gap-4 p-6",
    md: "max-w-lg h-[65vh] flex flex-col overflow-hidden p-0",
    lg: "max-w-3xl h-[80vh] flex flex-col overflow-hidden p-0",
  };

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(baseClasses, sizeClasses[size], className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;
```

- [ ] **Step 2: Add `DialogBody` component**

Add after `DialogContent`:

```typescript
const DialogBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex-1 overflow-y-auto px-6 py-4", className)}
    {...props}
  />
));
DialogBody.displayName = "DialogBody";
```

- [ ] **Step 3: Update exports**

Replace the export block:

```typescript
export {
  Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger,
  DialogContent, DialogHeader, DialogBody, DialogFooter, DialogTitle, DialogDescription,
};
```

- [ ] **Step 4: Verify build**

Run: `cd apps/web && npx tsc --noEmit`
Expected: No type errors. All existing modals continue working since default is `sm` which preserves current behavior.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/dialog.tsx
git commit -m "feat(web): add size tiers and DialogBody to dialog component

Add size prop (sm/md/lg) to DialogContent. sm preserves existing
behavior. md/lg apply fixed heights with flex layout for pinned
header/scrolling body/pinned footer. Add DialogBody component."
```

---

## Task 2: Migrate sm-tier Modals

**Files:**
- Modify: `apps/web/src/app/(dashboard)/participants/page.tsx` (lines 384, 444)
- Modify: `apps/web/src/app/(dashboard)/participants/[id]/page.tsx` (line 167)
- Modify: `apps/web/src/components/part-editors/homework-editor.tsx` (lines 1346, 1384)
- Modify: `apps/web/src/app/(dashboard)/rtm/[enrollmentId]/page.tsx` (line 918)

These are the simplest changes — just add `size="sm"` and remove any custom sizing classNames.

- [ ] **Step 1: Update participants/page.tsx**

Line 384: `<DialogContent>` → `<DialogContent size="sm">`
Line 444: `<DialogContent>` → `<DialogContent size="sm">`

No other changes needed — these already use the default `max-w-lg`.

- [ ] **Step 2: Update participants/[id]/page.tsx enroll dialog**

Line 167: `<DialogContent className="sm:max-w-md">` → `<DialogContent size="sm">`

Remove the `className` — `sm` tier uses `max-w-lg` which is slightly wider than `max-w-md` but more consistent.

- [ ] **Step 3: Update homework-editor.tsx dialogs**

Line 1346: `<DialogContent className="sm:max-w-md">` → `<DialogContent size="sm">`
Line 1384: `<DialogContent className="sm:max-w-md">` → `<DialogContent size="sm">`

- [ ] **Step 4: Update rtm/[enrollmentId]/page.tsx**

Line 918: `<DialogContent className="sm:max-w-md">` → `<DialogContent size="sm">`

- [ ] **Step 5: Verify build**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/(dashboard)/participants/page.tsx" "apps/web/src/app/(dashboard)/participants/[id]/page.tsx" apps/web/src/components/part-editors/homework-editor.tsx "apps/web/src/app/(dashboard)/rtm/[enrollmentId]/page.tsx"
git commit -m "feat(web): migrate simple dialogs to sm size tier

Bulk action, add client, enroll, homework PDF import, homework add
item, and RTM time log dialogs all use size=sm."
```

---

## Task 3: Migrate md-tier Modals

**Files:**
- Modify: `apps/web/src/app/(dashboard)/rtm/page.tsx` (line 243)
- Modify: `apps/web/src/app/(dashboard)/programs/create-program-dialog.tsx` (line 119)
- Modify: `apps/web/src/app/(dashboard)/participants/[id]/page.tsx` (lines 951, 1915)

These need `size="md"` plus restructuring content into `DialogHeader`/`DialogBody`/`DialogFooter` with pinned-section classes.

- [ ] **Step 1: Update rtm/page.tsx time log dialog**

Line 243: `<DialogContent className="sm:max-w-lg">` → `<DialogContent size="md">`

Read the dialog's internal structure and wrap content sections:
- Header content → `<DialogHeader className="shrink-0 px-6 pt-6 pb-4">`
- Form fields → `<DialogBody>`
- Action buttons → `<DialogFooter className="shrink-0 px-6 py-4 border-t">`

Import `DialogBody` from `@/components/ui/dialog`.

- [ ] **Step 2: Update create-program-dialog.tsx**

Line 119: `<DialogContent className="sm:max-w-[650px] max-h-[85vh] flex flex-col">` → `<DialogContent size="md">`

This dialog already has a flex-col structure. Re-wrap:
- Title area → `<DialogHeader className="shrink-0 px-6 pt-6 pb-4">`
- Template list / form → `<DialogBody>`
- Buttons → `<DialogFooter className="shrink-0 px-6 py-4 border-t">`

- [ ] **Step 3: Update RTM enrollment dialog in participants/[id]/page.tsx**

Line 951: `<DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">` → `<DialogContent size="md">`

Restructure with `DialogHeader`/`DialogBody`/`DialogFooter`. The `overflow-y-auto` moves from `DialogContent` to `DialogBody` (which has it by default).

- [ ] **Step 4: Update add check-in tracker dialog in participants/[id]/page.tsx**

Line 1915: `<DialogContent className="sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col p-0">` → `<DialogContent size="md">`

This already uses `flex flex-col p-0` — just change the sizing to use the tier. Wrap internal sections with `DialogHeader`/`DialogBody`/`DialogFooter`.

- [ ] **Step 5: Verify build**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/app/(dashboard)/rtm/page.tsx" "apps/web/src/app/(dashboard)/programs/create-program-dialog.tsx" "apps/web/src/app/(dashboard)/participants/[id]/page.tsx"
git commit -m "feat(web): migrate form dialogs to md size tier

RTM time log, create program, RTM enrollment, and add check-in
tracker dialogs use size=md with pinned header/footer structure."
```

---

## Task 4: Migrate lg-tier Modals (Part Editor + Homework Viewer)

**Files:**
- Modify: `apps/web/src/components/part-editor-modal.tsx` (lines 272, 546)
- Modify: `apps/web/src/components/homework-response-viewer.tsx` (line 65)

- [ ] **Step 1: Update homework-response-viewer.tsx**

Line 65: `<DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">` → `<DialogContent size="lg">`

Read the file to see the internal structure. Restructure with `DialogHeader`/`DialogBody`/`DialogFooter`. Import `DialogBody`.

- [ ] **Step 2: Update CreatePartModal in part-editor-modal.tsx**

Line 272: `<DialogContent className="sm:max-w-3xl w-full max-h-[85vh] h-[85vh] overflow-hidden flex flex-col p-0">` → `<DialogContent size="lg">`

The modal already uses flex-col and p-0. Re-wrap internal sections using `DialogHeader`/`DialogBody`/`DialogFooter` with pinned classes. Import `DialogBody`.

- [ ] **Step 3: Update EditPartModal in part-editor-modal.tsx**

Line 546: `<DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">` → `<DialogContent size="lg">`

Same restructuring as CreatePartModal.

- [ ] **Step 4: Verify build**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/part-editor-modal.tsx apps/web/src/components/homework-response-viewer.tsx
git commit -m "feat(web): migrate editor dialogs to lg size tier

Part editor (create + edit) and homework response viewer dialogs
use size=lg with pinned header/footer structure."
```

---

## Task 5: Create PartPreviewModal

**Files:**
- Create: `apps/web/src/components/part-preview-modal.tsx`

- [ ] **Step 1: Create the component**

This is a portal-based fullscreen phone preview that accepts a raw part object (no API call). Modeled after `PhonePreviewModal` but simplified.

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { RNPartContentRenderer } from "@/components/mobile-preview/RNPartRenderers";
import { DEVICES } from "@/components/mobile-preview/devices";
import { DeviceFrame } from "@/components/mobile-preview/DeviceFrame";

type DeviceKey = keyof typeof DEVICES;

interface PartPreviewModalProps {
  open: boolean;
  onClose: () => void;
  part: {
    type: string;
    title: string;
    content: any;
  };
}

export function PartPreviewModal({ open, onClose, part }: PartPreviewModalProps) {
  const [device, setDevice] = useState<DeviceKey>("iphone-15");

  // Escape key closes modal
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  if (!open) return null;

  const deviceConfig = DEVICES[device];

  return createPortal(
    // z-[60] so this sits above z-50 Dialog when part editor is open underneath
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      {/* Controls */}
      <div className="relative z-10 flex items-center gap-3 mb-4">
        {(Object.keys(DEVICES) as DeviceKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setDevice(key)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              device === key
                ? "bg-white text-black"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {DEVICES[key].name}
          </button>
        ))}
        <button
          onClick={onClose}
          className="ml-4 p-2 rounded-full bg-white/10 text-white/70 hover:bg-white/20"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Phone frame — use DeviceFrame with deviceConfig object, not key string */}
      <div className="relative z-10">
        <DeviceFrame device={deviceConfig}>
          <div className="p-4 overflow-y-auto" style={{ maxHeight: deviceConfig.height }}>
            <h2 className="text-lg font-semibold mb-3">{part.title}</h2>
            <RNPartContentRenderer part={{ type: part.type, content: part.content }} />
          </div>
        </DeviceFrame>
      </div>
    </div>,
    document.body
  );
}
```

**Important implementation notes:**
- `RNPartContentRenderer` takes a single `part` prop object (`{ type, content }`), NOT separate `type`/`content` props
- `DeviceFrame` takes a `DeviceConfig` object (via `device` prop), NOT a device key string — pass `deviceConfig` not `device`
- `DEVICES[key].name` is the display label (not `.label` which doesn't exist)
- The `z-[60]` is intentional so this renders above the z-50 Dialog underneath
- Read `apps/web/src/components/phone-preview-modal.tsx` for the `ScaledPhone` responsive scaling pattern — adopt it if the basic approach above doesn't scale well on small viewports

- [ ] **Step 2: Verify build**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/part-preview-modal.tsx
git commit -m "feat(web): add PartPreviewModal for standalone part preview

Portal-based phone frame preview that accepts a raw part object.
No API call needed — renders in-memory part data directly."
```

---

## Task 6: Remove Preview Tabs from Part Editor Modals

**Depends on:** Task 5 (PartPreviewModal must exist before this task imports it)

**Files:**
- Modify: `apps/web/src/components/part-editor-modal.tsx`

This is the most complex task. Read the full file first to understand the tab structure.

- [ ] **Step 1: Update CreatePartModal**

Read lines 193-450 of `part-editor-modal.tsx` to understand the current tab structure.

Changes:
1. Remove "Preview" from the tab list (keep "AI Generate" and "Build Manually" only)
2. Remove the preview tab content panel (the phone frame rendering)
3. Add `previewOpen` state: `const [previewOpen, setPreviewOpen] = useState(false)`
4. Add a "Preview" button in the footer area (where action buttons are)
5. Remove the `mode === "preview"` conditional from footer rendering — footer should always be visible in manual mode
6. Render `<PartPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} part={{ type: selectedType, title, content }} />` outside the dialog

Import `PartPreviewModal` from `@/components/part-preview-modal`.

- [ ] **Step 2: Update EditPartModal**

Read lines 454-642 to understand the current structure.

Changes:
1. Remove the `editMode` state (`"edit" | "preview"`) entirely
2. Remove the tab bar (Edit/Preview tabs)
3. Show the editor directly — no tabs needed
4. Wire the existing `onPreview` prop to open `PartPreviewModal`
5. Add `previewOpen` state
6. Footer layout: "Preview" button (secondary, `variant="outline"`) on the left, "Done" button (primary) on the right
7. Render `<PartPreviewModal>` outside the dialog

- [ ] **Step 3: Verify build**

Run: `cd apps/web && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/part-editor-modal.tsx
git commit -m "feat(web): replace in-modal preview tab with standalone PartPreviewModal

Remove Preview tabs from CreatePartModal and EditPartModal.
Add Preview button in footer that opens full-screen PartPreviewModal.
EditPartModal simplified from tabbed to plain editor."
```

---

## Task 7: Final Verification

- [ ] **Step 1: Run typecheck**

Run: `cd /mnt/c/Dev/steady && npx turbo run typecheck --filter=@steady/web`
Expected: No type errors

- [ ] **Step 2: Manual smoke test**

Check each modal in the browser:

**sm tier (auto height, should feel unchanged):**
1. Participants page → bulk action dialog
2. Participants page → add client dialog
3. Participant detail → enroll in program
4. Homework editor → PDF import
5. Homework editor → add item

**md tier (65vh fixed, content scrolls):**
6. RTM page → time log dialog → verify height stays fixed
7. Programs page → create program → switch between templates and form → NO height change
8. Participant detail → RTM enrollment → scroll through ICD-10 codes → NO height change
9. Participant detail → add check-in tracker → switch between AI/template/custom → NO height change

**lg tier (80vh fixed, content scrolls):**
10. Part editor → create new part → switch between AI and manual → NO height change
11. Part editor → edit existing part → verify NO tab bar, just editor
12. Part editor → click Preview button → standalone phone preview opens
13. Homework response viewer → verify scrollable content

- [ ] **Step 3: Commit if any cleanup needed**

```bash
git add <changed files>
git commit -m "chore: cleanup modal standardization"
```
