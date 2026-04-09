"use client";

import Link from "next/link";
import { WidgetShell } from "@/components/dashboard-widgets";
import type { WidgetProps } from "@/components/dashboard-widgets";
import { Zap, Calendar, BookOpen, ClipboardList } from "lucide-react";

interface QuickActionLink {
  label: string;
  path: string;
  icon?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Calendar,
  BookOpen,
  ClipboardList,
  Zap,
};

const DEFAULT_LINKS: QuickActionLink[] = [
  { label: "Schedule Appointment", path: "/appointments", icon: "Calendar" },
  { label: "Assign Homework", path: "/programs", icon: "ClipboardList" },
];

interface ClientQuickActionsProps extends WidgetProps {
  widgetId: string;
  dashboardData?: unknown;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function ClientQuickActionsWidget({
  settings,
  isEditing,
  dragAttributes,
  dragListeners,
}: ClientQuickActionsProps) {
  const links = (
    Array.isArray(settings.links) ? settings.links : DEFAULT_LINKS
  ) as QuickActionLink[];

  return (
    <WidgetShell title="Quick Actions" icon={Zap} isEditing={isEditing} dragAttributes={dragAttributes} dragListeners={dragListeners}>
      <div className="space-y-2">
        {links.map((link) => {
          const IconComponent = link.icon ? ICON_MAP[link.icon] ?? Zap : Zap;
          return (
            <Link
              key={link.path}
              href={link.path}
              className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors"
            >
              <IconComponent className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{link.label}</span>
            </Link>
          );
        })}
      </div>
    </WidgetShell>
  );
}
