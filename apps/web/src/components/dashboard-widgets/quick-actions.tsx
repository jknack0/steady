"use client";

import Link from "next/link";
import { BookOpen, Users, Calendar, Zap } from "lucide-react";
import { WidgetShell } from "./widget-shell";
import type { WidgetProps } from "./widget-shell";

interface QuickActionLink {
  label: string;
  path: string;
  icon?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  BookOpen,
  Users,
  Calendar,
  Zap,
};

const DEFAULT_LINKS: QuickActionLink[] = [
  { label: "Create Program", path: "/programs", icon: "BookOpen" },
  { label: "Add Client", path: "/participants", icon: "Users" },
  { label: "Schedule Session", path: "/sessions", icon: "Calendar" },
];

interface QuickActionsWidgetProps extends WidgetProps {
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function QuickActionsWidget({
  settings,
  isEditing,
  dragAttributes,
  dragListeners,
}: QuickActionsWidgetProps) {
  const links = (
    Array.isArray(settings.links) ? settings.links : DEFAULT_LINKS
  ) as QuickActionLink[];

  return (
    <WidgetShell
      title="Quick Actions"
      icon={Zap}
      isEditing={isEditing}
      dragAttributes={dragAttributes}
      dragListeners={dragListeners}
    >
      <div className="space-y-2">
        {links.map((link) => {
          const IconComponent = link.icon
            ? ICON_MAP[link.icon] ?? Zap
            : Zap;
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
