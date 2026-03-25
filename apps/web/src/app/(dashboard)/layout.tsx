"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QueryProvider } from "@/lib/query-provider";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useRtmDashboard } from "@/hooks/use-rtm";

function RtmBadge() {
  const { isAuthenticated } = useAuth();
  const { data } = useRtmDashboard(isAuthenticated);
  const count =
    (data?.summary.clientsApproaching ?? 0) +
    (data?.summary.clientsAtRisk ?? 0);
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold h-5 min-w-5 px-1.5">
      {count}
    </span>
  );
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/programs", label: "My Programs", icon: BookOpen },
  { href: "/participants", label: "Clients", icon: Users },
  { href: "/sessions", label: "Sessions", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

function LogoutButton() {
  const { logout } = useAuth();
  return (
    <button
      onClick={logout}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
    >
      <LogOut className="h-4 w-4" />
      Sign Out
    </button>
  );
}

function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full flex-col border-r bg-background", className)}>
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/programs" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12h4l3-9 4 18 3-9h4" />
            </svg>
          </div>
          <span className="text-lg font-bold text-foreground tracking-tight">STEADY</span>
          <span className="text-xs text-muted-foreground">CAS</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {item.href === "/participants" && <RtmBadge />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <LogoutButton />
      </div>
    </div>
  );
}

function UserDisplay() {
  const { user } = useAuth();
  return (
    <span className="text-sm text-muted-foreground">
      {user ? `${user.firstName} ${user.lastName}` : ""}
    </span>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <QueryProvider>
      <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <Sidebar className="hidden w-64 lg:flex" />

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-64 z-50">
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <header className="flex h-16 items-center justify-between border-b px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="ml-auto flex items-center gap-4">
              <UserDisplay />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
    </QueryProvider>
  );
}
