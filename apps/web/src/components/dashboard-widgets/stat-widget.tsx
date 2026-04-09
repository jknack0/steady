"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Users, Calendar, TrendingUp, AlertTriangle } from "lucide-react";
import type { WidgetProps } from "./widget-shell";

const STAT_CONFIGS: Record<
  string,
  {
    icon: React.ElementType;
    dataKey: string;
    label: string;
    href?: string;
    format?: (val: number) => string;
    color?: (val: number) => string;
  }
> = {
  stat_active_clients: {
    icon: Users,
    dataKey: "totalClients",
    label: "Active Clients",
    href: "/participants",
  },
  stat_sessions_today: {
    icon: Calendar,
    dataKey: "todaySessionCount",
    label: "Sessions Today",
    href: "/appointments",
  },
  stat_homework_rate: {
    icon: TrendingUp,
    dataKey: "weekHomeworkRate",
    label: "Homework Rate",
    format: (v) => `${v}%`,
    color: (v) =>
      v >= 70 ? "text-green-600" : v >= 40 ? "text-amber-600" : "text-red-500",
  },
  stat_overdue_count: {
    icon: AlertTriangle,
    dataKey: "overdueCount",
    label: "Overdue",
    color: (v) => (v > 0 ? "text-red-500" : "text-green-600"),
  },
};

interface StatWidgetProps extends WidgetProps {
  widgetId: string;
  dashboardData: { stats: Record<string, number> };
}

export function StatWidget({
  widgetId,
  dashboardData,
}: StatWidgetProps) {
  const config = STAT_CONFIGS[widgetId];
  if (!config) return null;

  const value = dashboardData.stats[config.dataKey] ?? 0;
  const displayValue = config.format ? config.format(value) : value;
  const colorClass = config.color?.(value);

  const content = (
    <div
      className={cn(
        "rounded-lg border p-4 transition-colors",
        config.href && "hover:border-primary/30 hover:shadow-sm"
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <config.icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{config.label}</span>
      </div>
      <p className={cn("text-2xl font-bold", colorClass)}>{displayValue}</p>
    </div>
  );

  return config.href ? <Link href={config.href}>{content}</Link> : content;
}
