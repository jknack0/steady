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
| Default tier | sm (backward compat) | Existing modals without `size` prop keep working. |

## Size Tiers

| Tier | Width | Height | Layout |
|---|---|---|---|
| `sm` | `max-w-md` (448px) | auto (shrink-to-fit) | Standard padding, no fixed structure required |
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

**Not changed:** PhonePreviewModal and MobilePreviewModal (custom portal-based, not Dialog component).

## DialogContent Changes

### Size Prop

Add `size?: "sm" | "md" | "lg"` prop to `DialogContent` in `apps/web/src/components/ui/dialog.tsx`. Default: `"sm"`.

```typescript
const sizeClasses = {
  sm: "max-w-md",                                    // 448px, auto height
  md: "max-w-lg h-[65vh] flex flex-col overflow-hidden p-0",   // 576px, fixed height
  lg: "max-w-3xl h-[80vh] flex flex-col overflow-hidden p-0",  // 768px, fixed height
};
```

For `md` and `lg`, `DialogContent` applies `p-0` so internal components handle their own padding. This enables the pinned header/footer pattern.

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

Update existing components to work as pinned sections:

- `DialogHeader`: add `shrink-0 px-6 pt-6 pb-4` (no flex-grow, stays at top)
- `DialogFooter`: add `shrink-0 px-6 py-4 border-t` (no flex-grow, stays at bottom)

These changes are additive — `sm` tier modals still use standard padding from `DialogContent` and don't need the flex structure.

## Part Editor Preview Change

### Remove Preview Tab

In `CreatePartModal` (`apps/web/src/components/part-editor-modal.tsx`):
- Remove the "Preview" tab from the tab list
- Remove the preview tab content (phone frame rendering)
- Tabs go from ["AI Generate", "Build Manually", "Preview"] to ["AI Generate", "Build Manually"]

In `EditPartModal`:
- Remove the "Preview" tab
- Tabs go from ["Edit", "Preview"] to just the editor (no tabs needed at all — simplify to plain editor)

### Add Preview Button

In both CreatePartModal and EditPartModal:
- Add a "Preview" button in the `DialogFooter` (or header area)
- Clicking it opens the standalone `PhonePreviewModal` with the current part data
- The editor dialog stays visible underneath the preview overlay
- The preview shows the part as it would appear on the mobile app

The `PhonePreviewModal` at `apps/web/src/components/phone-preview-modal.tsx` already supports rendering individual parts — it just needs to be called with the current part data.

## Migration Strategy

Each modal is updated independently. The changes are:

1. Add `size="sm|md|lg"` prop to the `<DialogContent>` tag
2. Remove custom `className` sizing (no more `sm:max-w-[650px] max-h-[85vh]` etc.)
3. For `md`/`lg`: wrap content in `<DialogHeader>`, `<DialogBody>`, `<DialogFooter>`
4. For `sm`: minimal changes — just add the `size` prop

No breaking changes. Modals without the `size` prop default to `sm` behavior (current default `max-w-lg` becomes `max-w-md` — a slight narrowing that's acceptable for simple dialogs).

## Testing Strategy

- **DialogContent:** Unit test for each size tier — verify correct classes applied
- **DialogBody:** Verify overflow-y-auto behavior
- **Part editor modals:** Verify preview tab is removed, preview button opens PhonePreviewModal
- **Visual regression:** Manual check of each modal to verify height stability during multi-step flows
- **Backward compat:** Modals without `size` prop still render correctly
