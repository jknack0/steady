# Premium Shell UX Redesign

**Date:** 2026-03-24
**Status:** Approved
**Scope:** Web app (apps/web) — navigation, layout chrome, and page consistency

## Problem

The STEADY clinician dashboard feels too plain and empty. The sidebar and header lack visual richness, pages have inconsistent heading patterns, and important features (RTM) are buried. The goal is to elevate the app to a professional, polished feel (Linear/Notion-grade) while keeping the existing teal/warm color palette.

## Design Decisions

- **Direction:** Premium Shell — elevated sidebar with sections, command palette, richer header, consistent page headers
- **Palette:** Keep existing teal (`#5B8A8A`) primary with cream background (`hsl(37 33% 96%)`) and rose/sage/sky accents unchanged
- **Target feel:** Professional & polished SaaS tool

## Components

### 1. Sidebar Redesign

**Structure (top to bottom):**

1. **Brand block** — STEADY logo with gradient icon (`linear-gradient(135deg, #5B8A8A, #4A7272)`), subtitle "Clinical App Suite" replacing "CAS"
2. **Search trigger** — clickable bar: "Search..." text + `Cmd+K` shortcut badge. Opens command palette modal.
3. **Main section** — uppercase label "Main", items: Dashboard, Programs, Clients (with RTM alert badge), Sessions
4. **Billing section** — uppercase label "Billing", items: RTM (promoted from Clients badge to own nav item)
5. **User section** — avatar circle (initials with `linear-gradient(135deg, #89B4C8, #5B8A8A)`), clinician name, role text, three-dot menu dropdown containing Settings + Sign Out

**Visual treatment:**
- Background: subtle vertical gradient `#f8f6f3` → `#f2efea` (replaces flat white)
- Active nav item: teal fill with `box-shadow: 0 1px 2px rgba(91,138,138,0.2)`
- Nav text: `#5A5A5A` for inactive items (up from muted `#8A8A8A`)
- Section labels: `9px` uppercase, `letter-spacing: 0.5px`, color `#aaa`
- Border right: `1px solid #D4D0CB` (unchanged)

**Navigation changes:**
- Settings removed from main nav → moved to user menu dropdown
- RTM added as own nav item under "Billing" section
- Clients RTM badge remains (shows at-risk + approaching count) — intentionally dual: RTM nav item is for the billing dashboard, the Clients badge is a secondary "attention needed" signal visible while navigating to clients

**Files affected:**
- `apps/web/src/app/(dashboard)/layout.tsx` — complete sidebar rewrite
- Uses existing `apps/web/src/components/ui/dropdown-menu.tsx` (shadcn/ui) for the user section three-dot menu — no new component file needed for the dropdown primitive itself

### 2. Header Bar & Breadcrumbs

**Header bar:**
- White background (`bg-white`) with `border-b border-border`
- Height: `h-16` (unchanged)
- Left side: breadcrumb trail
- Right side: notification bell + mobile hamburger

**Breadcrumb system:**
- Auto-generated from route path using Next.js `usePathname()`
- Route segment mapping:
  - `dashboard` → "Dashboard"
  - `programs` → "Programs"
  - `participants` → "Clients"
  - `sessions` → "Sessions"
  - `rtm` → "RTM"
  - `settings` → "Settings"
  - `modules` → "Modules"
  - `trackers` → "Trackers"
  - `prepare` → "Prepare"
  - `superbill` → "Superbill"
  - `setup` → "Setup"
  - `[id]`, `[moduleId]`, `[trackerId]`, `[enrollmentId]`, `[periodId]` → fetch entity name via existing TanStack Query hooks. Loading state: show skeleton placeholder (`w-20 h-4 bg-muted animate-pulse rounded`) until resolved.
- Separator: chevron icon (`ChevronRight` from lucide-react)
- Current (last) segment: `text-foreground font-medium`, non-clickable
- Parent segments: `text-muted-foreground hover:text-foreground`, clickable links
- Styling: `text-sm`, `gap-2` between items

**Notification bell:**
- `Bell` icon from lucide-react
- Red dot indicator (`w-2 h-2 bg-red-500 rounded-full`) positioned top-right when count > 0
- Count sourced from a simple API endpoint (existing notification system)
- Click opens dropdown panel (placeholder for v1 — shows "No new notifications" static message)
- v1: bell icon + red dot indicator only. Dot visibility wired to a boolean from the existing notification count. No polling — piggybacks on the dashboard's existing 60s refetch. Full notification dropdown UI is out of scope.

**What this replaces:**
- `UserDisplay` component removed from header (name moves to sidebar)
- Ad-hoc "Back to X" links on individual pages replaced by global breadcrumbs

**Files affected:**
- `apps/web/src/app/(dashboard)/layout.tsx` — header section rewrite
- New: `apps/web/src/components/breadcrumbs.tsx`
- New: `apps/web/src/components/notification-bell.tsx`

### 3. PageHeader Component

**Consistent page header used on every dashboard page.**

```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
```

**Layout:**
- Title left-aligned, actions right-aligned on desktop
- Actions stack below title on mobile (`flex-col` below `md:` breakpoint)
- Title: `text-2xl font-bold text-foreground`
- Subtitle: `text-sm text-muted-foreground mt-1`
- Bottom spacing: `pb-6`

**Usage per page:**
- Dashboard: title="Good morning, Dr. Smith", subtitle="Monday, March 24 · 3 sessions today"
- Programs: title="My Programs", subtitle="{count} programs", actions=Create Program button
- Clients: title="Clients", subtitle="{count} active clients", actions=Add Client button
- Sessions: title="Sessions", actions=view toggle + status filter
- RTM: title="Remote Therapeutic Monitoring", subtitle=summary stats
- Settings: title="Settings"
- Client detail: title="{client name}", subtitle="{email}"
- Program detail: title="{program name}", subtitle="{status} · {module count} modules"
- Module editor: title="{module name}", subtitle="in {program name}"
- Tracker detail: title="{tracker name}", subtitle="in {program name}"
- Session prep: title="Prepare for Session", subtitle="{client name} · {date}"
- RTM detail: title="{client name}", subtitle="RTM Enrollment"
- Superbill: title="Superbill", subtitle="{client name} · {billing period dates}"
- Setup: title="Welcome to STEADY", subtitle="Let's get your account set up"

**Files affected:**
- New: `apps/web/src/components/page-header.tsx`
- Modified: every `page.tsx` under `(dashboard)/` to use `PageHeader` instead of ad-hoc headings

### 4. Command Palette (Cmd+K)

**Minimal v1 — search-as-navigation.**

**Trigger:**
- `Cmd+K` (Mac) / `Ctrl+K` (Windows) global keyboard shortcut
- Click on sidebar search trigger bar

**UI:**
- Modal overlay with backdrop blur
- Search input at top with auto-focus
- Results list below, grouped by type: Pages, Programs, Clients
- Each result: icon + name + type badge
- Arrow keys navigate, Enter selects, Escape closes
- Max 10 results shown

**Search behavior:**
- "Pages" results are static — match against the 6 nav destinations
- "Programs" and "Clients" hit existing API list endpoints with search query
- Debounce: 300ms on keystroke
- Prefix matching (not fuzzy) — sufficient for v1

**Files affected:**
- New: `apps/web/src/components/command-palette.tsx`
- New: `apps/web/src/hooks/use-command-palette.ts` (keyboard shortcut listener + state)
- Modified: `apps/web/src/app/(dashboard)/layout.tsx` — mount CommandPalette component

## Out of Scope

- Full notification system (bell is wired to count only, dropdown is placeholder)
- Sidebar collapse/icon-only mode
- Command palette actions (only navigation in v1)
- Recent items or favorites in command palette
- Dark mode
- Any changes to page content, editors, or data tables
- Mobile app changes

## Testing

- **Breadcrumbs:** Unit test for route-to-label mapping function. Integration test that breadcrumbs render correct segments for nested routes.
- **PageHeader:** Snapshot test for rendering with/without subtitle and actions.
- **Command palette:** Unit test for keyboard shortcut registration. Integration test for search results rendering with mocked API responses.
- **Sidebar:** Visual regression test that nav items render correctly with active states.
- **Layout:** Verify mobile hamburger still works, sidebar overlay still functions.
