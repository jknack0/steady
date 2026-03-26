"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
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

// Matches CUIDs (e.g. cmn4wp4l7000bj5kl...) and UUIDs
const ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CUID_REGEX = /^c[a-z0-9]{20,}$/i;

function isId(segment: string): boolean {
  return ID_REGEX.test(segment) || CUID_REGEX.test(segment);
}

export function segmentToLabel(segment: string): string | null {
  if (SEGMENT_LABELS[segment]) return SEGMENT_LABELS[segment];
  if (isId(segment)) return null;
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

interface BreadcrumbItem {
  label: string;
  href: string;
}

/**
 * Resolves resource names for ID segments in the path.
 * Expects paths like /programs/:id/modules/:moduleId
 */
function useResolvedBreadcrumbs(segments: string[]): { items: BreadcrumbItem[]; isLoading: boolean } {
  // Extract IDs by context
  const programIdx = segments.indexOf("programs");
  const moduleIdx = segments.indexOf("modules");
  const participantIdx = segments.indexOf("participants");

  const programId = programIdx >= 0 && programIdx + 1 < segments.length && isId(segments[programIdx + 1])
    ? segments[programIdx + 1] : null;
  const moduleId = moduleIdx >= 0 && moduleIdx + 1 < segments.length && isId(segments[moduleIdx + 1])
    ? segments[moduleIdx + 1] : null;
  const participantId = participantIdx >= 0 && participantIdx + 1 < segments.length && isId(segments[participantIdx + 1])
    ? segments[participantIdx + 1] : null;

  // Fetch program (gives us program title)
  const { data: program, isLoading: programLoading } = useQuery({
    queryKey: ["program-breadcrumb", programId],
    queryFn: () => api.get<{ id: string; title: string }>(`/api/programs/${programId}`),
    enabled: !!programId,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch modules for the program (gives us module title)
  const { data: modules, isLoading: modulesLoading } = useQuery({
    queryKey: ["modules-breadcrumb", programId],
    queryFn: () => api.get<{ id: string; title: string }[]>(`/api/programs/${programId}/modules`),
    enabled: !!programId && !!moduleId,
    staleTime: 5 * 60 * 1000,
  });

  const moduleName = modules?.find((m) => m.id === moduleId)?.title;

  // Build a map of ID segment -> display name
  const nameMap: Record<string, string> = {};
  if (programId && program) nameMap[programId] = program.title;
  if (moduleId && moduleName) nameMap[moduleId] = moduleName;
  // Participant names could be added here if needed

  // Build breadcrumb items
  const items: BreadcrumbItem[] = [];
  let pathSoFar = "";

  for (const segment of segments) {
    pathSoFar += `/${segment}`;

    if (isId(segment)) {
      const name = nameMap[segment];
      if (name) {
        items.push({ label: name, href: pathSoFar });
      }
      // Skip IDs we can't resolve (don't show raw IDs)
    } else if (SEGMENT_LABELS[segment]) {
      items.push({ label: SEGMENT_LABELS[segment], href: pathSoFar });
    } else if (segment !== "modules" || !moduleId) {
      // Skip "Modules" label when we have a specific module (redundant)
      items.push({ label: segment.charAt(0).toUpperCase() + segment.slice(1), href: pathSoFar });
    }
  }

  return {
    items,
    isLoading: (!!programId && programLoading) || (!!moduleId && modulesLoading),
  };
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  const { items } = useResolvedBreadcrumbs(segments);

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
