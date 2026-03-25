# Premium Shell UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the STEADY web app's navigation shell to a polished, premium SaaS feel — redesigned sidebar, breadcrumb header, consistent page headers, and a command palette.

**Architecture:** Four independent UI components (Sidebar, Breadcrumbs+Header, PageHeader, CommandPalette) that compose together in the dashboard layout. Each can be built and tested independently. The layout file (`apps/web/src/app/(dashboard)/layout.tsx`) is the integration point where all four mount.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui (Radix), TanStack Query, lucide-react, Vitest + React Testing Library (jsdom)

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `apps/web/src/components/page-header.tsx` | Reusable page header with title/subtitle/actions |
| `apps/web/src/components/breadcrumbs.tsx` | Auto-generated breadcrumb trail from route path |
| `apps/web/src/components/notification-bell.tsx` | Bell icon with red dot indicator |
| `apps/web/src/components/command-palette.tsx` | Cmd+K search-as-navigation modal |
| `apps/web/src/hooks/use-command-palette.ts` | Keyboard shortcut listener + open/close state |
| `apps/web/src/__tests__/page-header.test.tsx` | PageHeader tests |
| `apps/web/src/__tests__/breadcrumbs.test.tsx` | Breadcrumbs route mapping + rendering tests |
| `apps/web/src/__tests__/command-palette.test.tsx` | Command palette keyboard + search tests |

### Modified Files
| File | Changes |
|------|---------|
| `apps/web/src/app/(dashboard)/layout.tsx` | Complete rewrite — new sidebar, header, mount command palette |
| `apps/web/src/app/(dashboard)/dashboard/page.tsx` | Replace ad-hoc heading with `PageHeader` |
| `apps/web/src/app/(dashboard)/programs/page.tsx` | Replace ad-hoc heading with `PageHeader` |
| `apps/web/src/app/(dashboard)/participants/page.tsx` | Replace ad-hoc heading with `PageHeader` |
| `apps/web/src/app/(dashboard)/sessions/page.tsx` | Replace ad-hoc heading with `PageHeader` |
| `apps/web/src/app/(dashboard)/rtm/page.tsx` | Replace ad-hoc heading with `PageHeader` |
| `apps/web/src/app/(dashboard)/settings/page.tsx` | Replace ad-hoc heading with `PageHeader` |
| `apps/web/src/app/(dashboard)/setup/page.tsx` | Replace ad-hoc heading with `PageHeader` |
| `apps/web/src/app/(dashboard)/participants/[id]/page.tsx` | Replace heading + remove "Back to" link |
| `apps/web/src/app/(dashboard)/programs/[id]/page.tsx` | Replace heading + remove "Back to" link |
| `apps/web/src/app/(dashboard)/programs/[id]/modules/[moduleId]/page.tsx` | Replace heading + remove back link |
| `apps/web/src/app/(dashboard)/programs/[id]/trackers/[trackerId]/page.tsx` | Replace heading + remove back link |
| `apps/web/src/app/(dashboard)/sessions/[id]/prepare/page.tsx` | Replace heading + remove back link |
| `apps/web/src/app/(dashboard)/rtm/[enrollmentId]/page.tsx` | Replace heading + remove back link |
| `apps/web/src/app/(dashboard)/rtm/[enrollmentId]/superbill/[periodId]/page.tsx` | Replace heading + remove back link |
| `apps/web/src/app/globals.css` | Add sidebar gradient + command palette CSS custom properties |

---

## Task 1: PageHeader Component

**Files:**
- Create: `apps/web/src/components/page-header.tsx`
- Test: `apps/web/src/__tests__/page-header.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/page-header.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PageHeader } from "@/components/page-header";

describe("PageHeader", () => {
  it("renders title", () => {
    render(<PageHeader title="My Programs" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("My Programs");
  });

  it("renders subtitle when provided", () => {
    render(<PageHeader title="My Programs" subtitle="12 programs" />);
    expect(screen.getByText("12 programs")).toBeInTheDocument();
  });

  it("does not render subtitle when omitted", () => {
    const { container } = render(<PageHeader title="My Programs" />);
    expect(container.querySelector("p")).toBeNull();
  });

  it("renders actions slot", () => {
    render(
      <PageHeader title="My Programs" actions={<button>Create</button>} />
    );
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/c/Dev/steady && npx vitest run apps/web/src/__tests__/page-header.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write the PageHeader component**

Create `apps/web/src/components/page-header.tsx`:

```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 pb-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {actions && <div className="mt-3 md:mt-0">{actions}</div>}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/c/Dev/steady && npx vitest run apps/web/src/__tests__/page-header.test.tsx`
Expected: 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/page-header.tsx apps/web/src/__tests__/page-header.test.tsx
git commit -m "feat(web): add PageHeader component with tests"
```

---

## Task 2: Breadcrumbs Component

**Files:**
- Create: `apps/web/src/components/breadcrumbs.tsx`
- Test: `apps/web/src/__tests__/breadcrumbs.test.tsx`

**Context:** The breadcrumb component reads `usePathname()` and maps route segments to labels. Dynamic segments (like `[id]`) are UUIDs — for v1, show a skeleton placeholder. Entity name resolution requires per-page context that's complex to wire globally, so we'll use a simple approach: static labels for known segments, and a truncated ID fallback for dynamic segments. Pages can optionally pass overrides via a React context.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/breadcrumbs.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock next/navigation before importing component
vi.mock("next/navigation", () => ({
  usePathname: vi.fn(),
}));

// Mock next/link to render a plain anchor
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

import { Breadcrumbs, segmentToLabel } from "@/components/breadcrumbs";
import { usePathname } from "next/navigation";

describe("segmentToLabel", () => {
  it("maps known segments to labels", () => {
    expect(segmentToLabel("dashboard")).toBe("Dashboard");
    expect(segmentToLabel("participants")).toBe("Clients");
    expect(segmentToLabel("programs")).toBe("Programs");
    expect(segmentToLabel("sessions")).toBe("Sessions");
    expect(segmentToLabel("rtm")).toBe("RTM");
    expect(segmentToLabel("modules")).toBe("Modules");
    expect(segmentToLabel("trackers")).toBe("Trackers");
    expect(segmentToLabel("prepare")).toBe("Prepare");
    expect(segmentToLabel("superbill")).toBe("Superbill");
    expect(segmentToLabel("setup")).toBe("Setup");
    expect(segmentToLabel("settings")).toBe("Settings");
  });

  it("returns null for UUID-like segments", () => {
    expect(segmentToLabel("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBeNull();
  });
});

describe("Breadcrumbs", () => {
  it("renders single segment", () => {
    vi.mocked(usePathname).mockReturnValue("/dashboard");
    render(<Breadcrumbs />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders nested segments with links", () => {
    vi.mocked(usePathname).mockReturnValue("/programs/some-uuid/modules/another-uuid");
    render(<Breadcrumbs />);
    // "Programs" should be a link
    const programsLink = screen.getByRole("link", { name: "Programs" });
    expect(programsLink).toHaveAttribute("href", "/programs");
    // "Modules" should be the last known label (non-link, current)
    expect(screen.getByText("Modules")).toBeInTheDocument();
  });

  it("skips UUID segments in display", () => {
    vi.mocked(usePathname).mockReturnValue("/participants/some-uuid");
    render(<Breadcrumbs />);
    expect(screen.getByText("Clients")).toBeInTheDocument();
    expect(screen.queryByText("some-uuid")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/c/Dev/steady && npx vitest run apps/web/src/__tests__/breadcrumbs.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write the Breadcrumbs component**

Create `apps/web/src/components/breadcrumbs.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  programs: "Programs",
  participants: "Clients",
  sessions: "Sessions",
  rtm: "RTM",
  settings: "Settings",
  modules: "Modules",
  trackers: "Trackers",
  prepare: "Prepare",
  superbill: "Superbill",
  setup: "Setup",
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function segmentToLabel(segment: string): string | null {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (UUID_REGEX.test(segment)) return null;
  // Unknown non-UUID segments: capitalize
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  // Build breadcrumb items, skipping UUID segments
  const items: BreadcrumbItem[] = [];
  let pathSoFar = "";

  for (const segment of segments) {
    pathSoFar += `/${segment}`;
    const label = segmentToLabel(segment);
    if (label) {
      items.push({ label, href: pathSoFar });
    }
  }

  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <span key={item.href} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            )}
            {isLast ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <Link
                href={item.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/c/Dev/steady && npx vitest run apps/web/src/__tests__/breadcrumbs.test.tsx`
Expected: 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/breadcrumbs.tsx apps/web/src/__tests__/breadcrumbs.test.tsx
git commit -m "feat(web): add Breadcrumbs component with route-to-label mapping"
```

---

## Task 3: Notification Bell Component

**Files:**
- Create: `apps/web/src/components/notification-bell.tsx`

**Context:** v1 is just a bell icon with a red dot. No dropdown, no polling. The red dot is wired to the RTM dashboard's at-risk + approaching count (already fetched by `useRtmDashboard` in the sidebar's RtmBadge). We reuse that same hook.

- [ ] **Step 1: Write the NotificationBell component**

Create `apps/web/src/components/notification-bell.tsx`:

```tsx
"use client";

import { Bell } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRtmDashboard } from "@/hooks/use-rtm";

export function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const { data } = useRtmDashboard(isAuthenticated);
  const hasNotifications =
    ((data?.summary.clientsApproaching ?? 0) +
      (data?.summary.clientsAtRisk ?? 0)) > 0;

  return (
    <button
      className="relative rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      aria-label="Notifications"
    >
      <Bell className="h-4.5 w-4.5" />
      {hasNotifications && (
        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
      )}
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/notification-bell.tsx
git commit -m "feat(web): add NotificationBell component with RTM alert indicator"
```

---

## Task 4: Sidebar + Header Redesign (Layout Rewrite)

**Files:**
- Modify: `apps/web/src/app/(dashboard)/layout.tsx`
- Modify: `apps/web/src/app/globals.css`

**Context:** This is the biggest task. We rewrite the `Sidebar` function, the header section, and add CSS custom properties for the sidebar gradient. The `RtmBadge` component stays. `UserDisplay` and `LogoutButton` are replaced by the new user section with dropdown.

- [ ] **Step 1: Add sidebar CSS to globals.css**

Add to `apps/web/src/app/globals.css` before the closing of the `:root` block (after the `--steady-warm-500` line):

```css
    /* ── Sidebar Shell ── */
    --sidebar-gradient-from: #f8f6f3;
    --sidebar-gradient-to: #f2efea;
    --sidebar-section-label: #aaaaaa;
    --sidebar-nav-text: #5A5A5A;
    --sidebar-active-shadow: 0 1px 2px rgba(91, 138, 138, 0.2);
```

- [ ] **Step 2: Rewrite layout.tsx**

Replace the entire contents of `apps/web/src/app/(dashboard)/layout.tsx` with:

```tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { QueryProvider } from "@/lib/query-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Calendar,
  Activity,
  Menu,
  Settings,
  LogOut,
  MoreVertical,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useRtmDashboard } from "@/hooks/use-rtm";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { NotificationBell } from "@/components/notification-bell";
import { CommandPalette } from "@/components/command-palette";
import { useCommandPalette } from "@/hooks/use-command-palette";

// ── Nav Config ──────────────────────────────────────

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/programs", label: "Programs", icon: BookOpen },
  { href: "/participants", label: "Clients", icon: Users },
  { href: "/sessions", label: "Sessions", icon: Calendar },
];

const billingNavItems = [
  { href: "/rtm", label: "RTM", icon: Activity },
];

// ── RTM Badge ───────────────────────────────────────

function RtmBadge() {
  const { isAuthenticated } = useAuth();
  const { data } = useRtmDashboard(isAuthenticated);
  const count =
    (data?.summary.clientsApproaching ?? 0) +
    (data?.summary.clientsAtRisk ?? 0);
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-100 text-red-600 text-[10px] font-semibold h-5 min-w-5 px-1.5">
      {count}
    </span>
  );
}

// ── Nav Section ─────────────────────────────────────

function NavSection({
  label,
  items,
}: {
  label: string;
  items: typeof mainNavItems;
}) {
  const pathname = usePathname();

  return (
    <div>
      <div className="px-3 py-2">
        <span
          className="text-[9px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--sidebar-section-label)" }}
        >
          {label}
        </span>
      </div>
      {items.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent hover:text-accent-foreground"
            )}
            style={
              isActive
                ? { boxShadow: "var(--sidebar-active-shadow)" }
                : { color: "var(--sidebar-nav-text)" }
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
            {item.href === "/participants" && <RtmBadge />}
          </Link>
        );
      })}
    </div>
  );
}

// ── Search Trigger ──────────────────────────────────

function SearchTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="mx-3 mt-3 mb-1 flex items-center justify-between rounded-lg border bg-white/80 px-3 py-2 text-sm text-muted-foreground hover:bg-white transition-colors"
    >
      <span className="flex items-center gap-2">
        <Search className="h-3.5 w-3.5" />
        Search...
      </span>
      <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
        <span className="text-xs">&#8984;</span>K
      </kbd>
    </button>
  );
}

// ── User Section ────────────────────────────────────

function UserSection() {
  const { user, logout } = useAuth();
  const router = useRouter();

  if (!user) return null;

  const initials =
    (user.firstName?.[0] ?? "") + (user.lastName?.[0] ?? "");

  return (
    <div className="border-t p-3" style={{ borderColor: "var(--sidebar-gradient-to)" }}>
      <div className="flex items-center gap-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, #89B4C8, #5B8A8A)",
          }}
        >
          {initials.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            Clinician
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-48">
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ── Sidebar ─────────────────────────────────────────

function Sidebar({
  className,
  onSearchClick,
}: {
  className?: string;
  onSearchClick: () => void;
}) {
  return (
    <div
      className={cn("flex h-full flex-col border-r", className)}
      style={{
        background:
          "linear-gradient(180deg, var(--sidebar-gradient-from), var(--sidebar-gradient-to))",
      }}
    >
      {/* Brand */}
      <div className="flex h-16 items-center border-b px-5" style={{ borderColor: "#e8e4de" }}>
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: "linear-gradient(135deg, #5B8A8A, #4A7272)",
              boxShadow: "0 1px 3px rgba(91,138,138,0.3)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 12h4l3-9 4 18 3-9h4" />
            </svg>
          </div>
          <div>
            <div className="text-base font-bold text-foreground leading-none">
              STEADY
            </div>
            <div className="text-[10px] text-muted-foreground leading-tight">
              Clinical App Suite
            </div>
          </div>
        </Link>
      </div>

      {/* Search trigger */}
      <SearchTrigger onClick={onSearchClick} />

      {/* Navigation */}
      <nav className="flex-1 space-y-4 px-2 py-3">
        <NavSection label="Main" items={mainNavItems} />
        <NavSection label="Billing" items={billingNavItems} />
      </nav>

      {/* User */}
      <UserSection />
    </div>
  );
}

// ── Layout ──────────────────────────────────────────

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const commandPalette = useCommandPalette();

  return (
    <QueryProvider>
      <ProtectedRoute>
        <div className="flex h-screen overflow-hidden">
          {/* Desktop sidebar */}
          <Sidebar
            className="hidden w-64 lg:flex"
            onSearchClick={commandPalette.open}
          />

          {/* Mobile sidebar overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="fixed inset-0 bg-black/50"
                onClick={() => setSidebarOpen(false)}
              />
              <div className="fixed inset-y-0 left-0 z-50 w-64">
                <Sidebar onSearchClick={() => {
                  setSidebarOpen(false);
                  commandPalette.open();
                }} />
              </div>
            </div>
          )}

          {/* Main content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Header */}
            <header className="flex h-16 items-center justify-between border-b bg-white px-6">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <Breadcrumbs />
              </div>
              <div className="flex items-center gap-1">
                <NotificationBell />
              </div>
            </header>

            {/* Page content */}
            <main className="flex-1 overflow-y-auto p-6">{children}</main>
          </div>

          {/* Command Palette */}
          <CommandPalette
            isOpen={commandPalette.isOpen}
            onClose={commandPalette.close}
          />
        </div>
      </ProtectedRoute>
    </QueryProvider>
  );
}
```

- [ ] **Step 3: Verify the app compiles**

Run: `cd /mnt/c/Dev/steady && npx turbo run build --filter=web -- --no-lint 2>&1 | tail -20`

Note: This may fail until Task 5 (CommandPalette + hook) is complete. If so, temporarily comment out the CommandPalette import/usage and the useCommandPalette import, verify compilation, then uncomment after Task 5. Alternatively, create stub files first (see Task 5 Step 1).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/(dashboard)/layout.tsx apps/web/src/app/globals.css
git commit -m "feat(web): redesign sidebar and header with premium shell"
```

---

## Task 5: Command Palette + Hook

**Files:**
- Create: `apps/web/src/hooks/use-command-palette.ts`
- Create: `apps/web/src/components/command-palette.tsx`
- Test: `apps/web/src/__tests__/command-palette.test.tsx`

**Context:** The existing API only has search for participants (`GET /api/clinician/participants?search=...`). Programs don't have a search param. For v1, the command palette will: (1) filter static page results client-side, (2) search participants via the existing API, (3) list programs client-side from the existing `usePrograms` hook (which loads all programs — bounded list). No new API endpoints needed.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/__tests__/command-palette.test.tsx`:

```tsx
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { useCommandPalette } from "@/hooks/use-command-palette";

describe("useCommandPalette", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts closed", () => {
    const { result } = renderHook(() => useCommandPalette());
    expect(result.current.isOpen).toBe(false);
  });

  it("opens and closes", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it("toggles on Cmd+K", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true })
      );
    });
    expect(result.current.isOpen).toBe(true);
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", metaKey: true })
      );
    });
    expect(result.current.isOpen).toBe(false);
  });

  it("toggles on Ctrl+K", () => {
    const { result } = renderHook(() => useCommandPalette());
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
      );
    });
    expect(result.current.isOpen).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /mnt/c/Dev/steady && npx vitest run apps/web/src/__tests__/command-palette.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Write the hook**

Create `apps/web/src/hooks/use-command-palette.ts`:

```ts
"use client";

import { useState, useEffect, useCallback } from "react";

export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { isOpen, open, close };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /mnt/c/Dev/steady && npx vitest run apps/web/src/__tests__/command-palette.test.tsx`
Expected: 4 tests PASS

- [ ] **Step 5: Write the CommandPalette component**

Create `apps/web/src/components/command-palette.tsx`:

```tsx
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Calendar,
  Activity,
  Settings,
  Search,
} from "lucide-react";
import { usePrograms } from "@/hooks/use-programs";
import { useClinicianParticipants } from "@/hooks/use-clinician-participants";
import { cn } from "@/lib/utils";

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  label: string;
  sublabel?: string;
  href: string;
  icon: React.ElementType;
  group: string;
}

const PAGE_ITEMS: PaletteItem[] = [
  { id: "page-dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, group: "Pages" },
  { id: "page-programs", label: "Programs", href: "/programs", icon: BookOpen, group: "Pages" },
  { id: "page-clients", label: "Clients", href: "/participants", icon: Users, group: "Pages" },
  { id: "page-sessions", label: "Sessions", href: "/sessions", icon: Calendar, group: "Pages" },
  { id: "page-rtm", label: "RTM", href: "/rtm", icon: Activity, group: "Pages" },
  { id: "page-settings", label: "Settings", href: "/settings", icon: Settings, group: "Pages" },
];

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Data sources
  const debouncedQuery = useDebounce(query, 300);
  const { data: programs } = usePrograms();
  const { data: participantsData } = useClinicianParticipants(
    debouncedQuery.length >= 2 ? { search: debouncedQuery } : undefined
  );

  // Build results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    const items: PaletteItem[] = [];

    // Pages (always, filtered)
    const filteredPages = q
      ? PAGE_ITEMS.filter((p) => p.label.toLowerCase().includes(q))
      : PAGE_ITEMS;
    items.push(...filteredPages);

    // Programs (client-side filter)
    if (programs) {
      const filteredPrograms = q
        ? programs.filter((p: any) => p.title.toLowerCase().includes(q))
        : programs.slice(0, 5);
      for (const p of filteredPrograms.slice(0, 5)) {
        items.push({
          id: `program-${p.id}`,
          label: p.title,
          sublabel: p.status?.toLowerCase(),
          href: `/programs/${p.id}`,
          icon: BookOpen,
          group: "Programs",
        });
      }
    }

    // Participants (API-searched when debounced query >= 2 chars)
    if (participantsData?.participants && q.length >= 2) {
      for (const p of participantsData.participants.slice(0, 5)) {
        items.push({
          id: `client-${p.participantId}`,
          label: p.name,
          sublabel: p.email,
          href: `/participants/${p.participantId}`,
          icon: Users,
          group: "Clients",
        });
      }
    }

    return items.slice(0, 10);
  }, [query, debouncedQuery, programs, participantsData]);

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      // Focus input after render
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + results.length) % results.length);
      } else if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        router.push(results[activeIndex].href);
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, activeIndex, router, onClose]);

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [results.length]);

  if (!isOpen) return null;

  // Group results for display
  const groups: Record<string, PaletteItem[]> = {};
  for (const item of results) {
    if (!groups[item.group]) groups[item.group] = [];
    groups[item.group].push(item);
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="fixed left-1/2 top-[20%] w-full max-w-lg -translate-x-1/2">
        <div className="mx-4 overflow-hidden rounded-xl border bg-white shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b px-4 py-3">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search pages, programs, clients..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd className="rounded border bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-72 overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </p>
            ) : (
              Object.entries(groups).map(([group, items]) => (
                <div key={group}>
                  <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </div>
                  {items.map((item) => {
                    const globalIndex = results.indexOf(item);
                    return (
                      <button
                        key={item.id}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                          globalIndex === activeIndex
                            ? "bg-accent text-accent-foreground"
                            : "text-foreground hover:bg-accent/50"
                        )}
                        onClick={() => {
                          router.push(item.href);
                          onClose();
                        }}
                        onMouseEnter={() => setActiveIndex(globalIndex)}
                      >
                        <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="truncate">{item.label}</span>
                          {item.sublabel && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {item.sublabel}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Verify build compiles**

Run: `cd /mnt/c/Dev/steady && npx turbo run build --filter=web -- --no-lint 2>&1 | tail -20`

Check `useClinicianParticipants` hook signature — it may accept different params. Read `apps/web/src/hooks/use-clinician-participants.ts` and adjust the import/usage if needed. The hook likely accepts `{ search?: string, programId?: string }`.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/hooks/use-command-palette.ts apps/web/src/components/command-palette.tsx apps/web/src/__tests__/command-palette.test.tsx
git commit -m "feat(web): add command palette with Cmd+K navigation"
```

---

## Task 6: Roll Out PageHeader to All Pages

**Files:**
- Modify: all 15 `page.tsx` files under `(dashboard)/`

**Context:** Each page currently has its own ad-hoc heading. Replace with `PageHeader`. For detail pages, also remove "Back to X" links (breadcrumbs handle that now). For pages with inline-editable titles (program detail, module editor), keep the editable input but wrap it in a layout consistent with `PageHeader` spacing — don't force those pages to use the static `PageHeader` component.

This task is best done page by page. Here's the pattern for each:

- [ ] **Step 1: Dashboard page**

In `apps/web/src/app/(dashboard)/dashboard/page.tsx`, replace the header block:

```tsx
// Before:
<div>
  <h1 className="text-2xl font-bold">
    {greeting}, {user?.firstName}
  </h1>
  <p className="text-sm text-muted-foreground">
    Here&apos;s what&apos;s happening with your clients today.
  </p>
</div>

// After:
import { PageHeader } from "@/components/page-header";
// ...
<PageHeader
  title={`${greeting}, ${user?.firstName}`}
  subtitle={`${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · ${data.stats.todaySessionCount} sessions today`}
/>
```

- [ ] **Step 2: Programs page**

In `apps/web/src/app/(dashboard)/programs/page.tsx`, replace:

```tsx
// Before:
<div className="mb-8 flex items-center justify-between">
  <div>
    <h1 className="text-3xl font-bold">My Programs</h1>
    <p className="text-muted-foreground mt-1">
      Create and manage your clinical programs
    </p>
  </div>
  <Button onClick={() => setDialogOpen(true)}>
    <Plus className="mr-2 h-4 w-4" />
    Create Program
  </Button>
</div>

// After:
import { PageHeader } from "@/components/page-header";
// ...
<PageHeader
  title="My Programs"
  subtitle={programs ? `${programs.length} programs` : undefined}
  actions={
    <Button onClick={() => setDialogOpen(true)}>
      <Plus className="mr-2 h-4 w-4" />
      Create Program
    </Button>
  }
/>
```

- [ ] **Step 3: Participants page**

Read `apps/web/src/app/(dashboard)/participants/page.tsx` and replace its heading block similarly. The heading is likely `<h1>Clients</h1>` with an "Add Client" button. Replace with:

```tsx
<PageHeader
  title="Clients"
  subtitle={`${data?.length ?? 0} active clients`}
  actions={<Button onClick={() => setAddDialogOpen(true)}>...</Button>}
/>
```

Remove the subtitle/description `<p>` tag if present.

- [ ] **Step 4: Sessions page**

Replace heading in `apps/web/src/app/(dashboard)/sessions/page.tsx`. Keep the view toggle and status filter as `actions` slot content.

- [ ] **Step 5: RTM page**

Replace heading in `apps/web/src/app/(dashboard)/rtm/page.tsx`.

- [ ] **Step 6: Settings page**

Replace heading in `apps/web/src/app/(dashboard)/settings/page.tsx` with `<PageHeader title="Settings" />`.

- [ ] **Step 7: Setup page**

Replace heading in `apps/web/src/app/(dashboard)/setup/page.tsx` with `<PageHeader title="Welcome to STEADY" subtitle="Let's get your account set up" />`.

- [ ] **Step 8: Detail pages — remove "Back to" links**

For each of these pages, remove the `<Link>` or `<button>` that renders "Back to X" with an `ArrowLeft` icon. Breadcrumbs now handle navigation. Apply `PageHeader` where the title is static (not inline-editable):

- `participants/[id]/page.tsx` — remove back link, add `<PageHeader title={clientName} subtitle={email} />`
- `sessions/[id]/prepare/page.tsx` — remove back link, add `<PageHeader title="Prepare for Session" subtitle={...} />`
- `rtm/[enrollmentId]/page.tsx` — remove back link, add `<PageHeader title={clientName} subtitle="RTM Enrollment" />`
- `rtm/[enrollmentId]/superbill/[periodId]/page.tsx` — remove back link, add `<PageHeader title="Superbill" subtitle={...} />`

For editor pages with inline-editable titles, just remove the back link and ensure consistent top spacing (the editable title already serves as the page header):

- `programs/[id]/page.tsx` — remove "Back to Programs" link only
- `programs/[id]/modules/[moduleId]/page.tsx` — remove back link only
- `programs/[id]/trackers/[trackerId]/page.tsx` — remove back link only

- [ ] **Step 9: Verify build compiles**

Run: `cd /mnt/c/Dev/steady && npx turbo run build --filter=web -- --no-lint 2>&1 | tail -20`

- [ ] **Step 10: Commit**

```bash
git add apps/web/src/app/
git commit -m "feat(web): roll out PageHeader to all dashboard pages, remove back links"
```

---

## Task 7: Verify Mobile Responsiveness + Final Integration

**Files:** None new — verification only.

- [ ] **Step 1: Run all web tests**

Run: `cd /mnt/c/Dev/steady && npx vitest run --project web 2>&1 | tail -30`

If no vitest project config, try: `cd /mnt/c/Dev/steady/apps/web && npx vitest run`

Fix any failures.

- [ ] **Step 2: Manual verification checklist**

Start dev server: `cd /mnt/c/Dev/steady && npm run dev`

Verify in browser:
1. Sidebar renders with gradient background, section labels, user avatar
2. Search trigger in sidebar opens command palette
3. Cmd+K opens command palette from anywhere
4. Command palette shows Pages, Programs, Clients results
5. Arrow keys + Enter navigate in command palette
6. Escape closes command palette
7. Breadcrumbs show correct trail on nested pages (e.g., Programs > Modules)
8. Breadcrumbs skip UUID segments
9. Notification bell shows red dot when RTM alerts exist
10. PageHeader renders consistently on all list pages
11. "Back to X" links are removed from all detail pages
12. Mobile: hamburger menu opens sidebar overlay
13. Mobile: sidebar overlay closes on backdrop click
14. Settings accessible via user dropdown (three-dot menu)
15. RTM appears as own nav item under "Billing"

- [ ] **Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix(web): integration fixes for premium shell"
```
