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
