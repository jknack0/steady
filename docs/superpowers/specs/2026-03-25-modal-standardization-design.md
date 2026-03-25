# Modal Standardization

**Date:** 2026-03-25
**Status:** Draft
**Scope:** Standardize all dialog/modal sizes across the web app with fixed-height tiers and consistent internal structure. Remove in-modal phone preview in favor of standalone preview modal.

## Problem

The app has 13+ modals with 6 different width classes and inconsistent height handling. Multi-step modals (create program, part editor, RTM enrollment) change height as content shifts, causing the modal to lurch up and down. Different modals use different widths for no clear reason. The experience feels janky.

The part editor's in-modal phone preview is cramped — a phone frame squeezed inside a dialog that's already constrained.

## Solution

A 3-tier size system (`sm`, `md`, `lg`) built into the base `DialogContent` component. `md` and `lg` tiers have **fixed heights** — content scrolls inside pinned header/footer structure. Every modal is assigned to a tier. Part editor preview tab replaced with a button that opens the standalone `PhonePreviewModal`.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Size system | 3 fixed tiers (sm/md/lg) | Covers all use cases without per-modal sizing. Matches patterns in Linear, Notion, Figma. |
| Height behavior | Fixed for md/lg, auto for sm | sm modals are short enough they never jump. md/lg need fixed height to prevent lurching. |
| Internal structure | Pinned header + scrolling body + pinned footer | Buttons never move. Content scrolls predictably. |
| Part editor preview | Remove tab, add button to open PhonePreviewModal | Full-size preview is better than cramped in-modal phone frame. |
| Default tier | sm (backward compat) | Existing modals without `size` prop keep exact same width (`max-w-lg`) and layout. |

## Size Tiers

| Tier | Width | Height | Layout |
|---|---|---|---|
| `sm` | `max-w-lg` (576px) | auto (shrink-to-fit) | Standard padding (`p-6`), retains existing `grid gap-4` layout |
| `md` | `max-w-lg` (576px) | `h-[65vh]` fixed | Flex column — pinned header, scrolling body, pinned footer |
| `lg` | `max-w-3xl` (768px) | `h-[80vh]` fixed | Same flex column structure |

## Modal Tier Assignments

| Modal | File | Current Size | New Tier |
|---|---|---|---|
| Bulk action confirm | `participants/page.tsx` | default (max-w-lg) | `sm` |
| Add client | `participants/page.tsx` | default (max-w-lg) | `sm` |
| Enroll in program | `participants/[id]/page.tsx` | max-w-md | `sm` |
| Homework PDF import | `part-editors/homework-editor.tsx` | max-w-md | `sm` |
| Homework add item | `part-editors/homework-editor.tsx` | max-w-md | `sm` |
| RTM time log | `rtm/page.tsx` | max-w-lg | `md` |
| Create program | `programs/create-program-dialog.tsx` | max-w-[650px] | `md` |
| RTM enrollment | `participants/[id]/page.tsx` | max-w-[550px] | `md` |
| Add check-in tracker | `participants/[id]/page.tsx` | max-w-xl | `md` |
| Homework response viewer | `homework-response-viewer.tsx` | max-w-2xl | `lg` |
| Create part | `part-editor-modal.tsx` | max-w-3xl | `lg` |
| Edit part | `part-editor-modal.tsx` | max-w-3xl | `lg` |

**Not changed:** PhonePreviewModal and MobilePreviewModal — both use custom portal-based rendering (`createPortal` to `document.body`), not the `DialogContent` component. They are unaffected by `DialogContent` changes.

## DialogContent Changes

### Size Prop

Add `size?: "sm" | "md" | "lg"` prop to `DialogContent` in `apps/web/src/components/ui/dialog.tsx`. Default: `"sm"`.

```typescript
const sizeClasses = {
  sm: "",                                            // 576px (inherits default max-w-lg), auto height, keeps grid gap-4 p-6
  md: "max-w-lg h-[65vh] !grid-none flex flex-col overflow-hidden p-0",   // 576px, fixed height
  lg: "max-w-3xl h-[80vh] !grid-none flex flex-col overflow-hidden p-0",  // 768px, fixed height
};
```

For `md` and `lg`:
- `p-0` removes container padding — internal components (`DialogHeader`, `DialogBody`, `DialogFooter`) handle their own padding
- `!grid-none` (or remove `grid` and `gap-4` from base classes via conditional) overrides the base `grid gap-4` layout since these tiers use `flex flex-col` instead
- This enables the pinned header/footer pattern

For `sm`: no additional classes. The existing `DialogContent` base styles (`grid gap-4 p-6 max-w-lg`) are preserved exactly as-is. No visual change for any modal that doesn't pass `size`.

### New: DialogBody Component

Add `DialogBody` to the dialog component file:

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
```

### Updated: DialogHeader and DialogFooter

**No changes to existing `DialogHeader` and `DialogFooter` components.** Their current styles work fine for `sm` tier modals with the existing `grid gap-4 p-6` layout.

For `md` and `lg` tiers, the consuming modal adds pinned-section classes via `className` on the component:

```tsx
<DialogContent size="md">
  <DialogHeader className="shrink-0 px-6 pt-6 pb-4">
    <DialogTitle>Title</DialogTitle>
  </DialogHeader>
  <DialogBody>
    {/* scrollable content */}
  </DialogBody>
  <DialogFooter className="shrink-0 px-6 py-4 border-t">
    <Button>Action</Button>
  </DialogFooter>
</DialogContent>
```

This avoids double-padding in `sm` tier modals (which keep `p-6` on the container) while giving `md`/`lg` modals the pinned structure they need (since container has `p-0`).

### New Export

Add `DialogBody` to the export block at the bottom of `dialog.tsx`:

```typescript
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogBody,      // ← new
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
```

## Part Editor Preview Change

### Remove Preview Tab

In `CreatePartModal` (`apps/web/src/components/part-editor-modal.tsx`):
- Remove the "Preview" tab from the tab list
- Remove the preview tab content (phone frame rendering)
- Tabs go from ["AI Generate", "Build Manually", "Preview"] to ["AI Generate", "Build Manually"]

In `EditPartModal`:
- Remove the "Preview" tab and the `editMode` state (`"edit" | "preview"`) — no longer needed
- Simplify to a plain editor (no tab bar at all)
- The existing `onPreview` prop on the interface becomes the callback that opens `PartPreviewModal`
- Footer layout: existing "Duplicate" and "Delete" buttons stay in the header area. Footer has "Preview" button (secondary) on the left and "Done" button (primary) on the right
- Remove the `mode === "preview"` conditional from the footer rendering logic in `CreatePartModal` as well — footer should always be visible when in manual/edit mode

### Add Preview Button

In both CreatePartModal and EditPartModal:
- Add a "Preview" button in the `DialogFooter`
- Clicking it opens a new `PartPreviewModal` with the current in-memory part data
- The editor dialog stays visible underneath the preview overlay

### New: PartPreviewModal Component

`PhonePreviewModal` requires a `programId` and fetches from the API — it cannot render an unsaved/in-progress part. Create a new lightweight `PartPreviewModal` (`apps/web/src/components/part-preview-modal.tsx`) that:

- Accepts a raw part object (`{ type, title, content }`) — no API call needed
- Renders the same portal-based fullscreen phone frame as `PhonePreviewModal` (backdrop, device selector, scaled phone)
- Uses the existing `InlinePhonePreview` helper from `part-editor-modal.tsx` (or the mobile part renderers) to render the part content inside the phone frame
- Supports the same device options (iPhone SE, iPhone 15) and escape-to-close behavior

This is a ~50-line wrapper that reuses existing rendering infrastructure without coupling to the program API.

## Migration Strategy

Each modal is updated independently. The changes are:

1. Add `size="sm|md|lg"` prop to the `<DialogContent>` tag
2. Remove custom `className` sizing (no more `sm:max-w-[650px] max-h-[85vh]` etc.)
3. For `md`/`lg`: wrap content in `<DialogHeader>`, `<DialogBody>`, `<DialogFooter>`
4. For `sm`: minimal changes — just add the `size` prop

No breaking changes. Modals without the `size` prop default to `sm` which preserves the existing `max-w-lg` width, `grid gap-4` layout, and `p-6` padding exactly as-is. Zero visual change for any modal that doesn't opt in.

## Testing Strategy

- **DialogContent:** Unit test for each size tier — verify correct classes applied (`sm` gets no extra classes, `md`/`lg` get fixed height + flex)
- **DialogBody:** Verify overflow-y-auto behavior
- **PartPreviewModal:** Verify it renders a raw part object in the phone frame without API calls
- **Part editor modals:** Verify preview tab is removed, preview button opens `PartPreviewModal`, footer always visible in edit mode
- **Visual regression:** Manual check of each modal to verify height stability during multi-step flows
- **Backward compat:** Modals without `size` prop render identically to before (same width, padding, layout)
