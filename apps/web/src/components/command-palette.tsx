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
        ? programs.filter((p) => p.title.toLowerCase().includes(q))
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
