"use client";

import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

export interface WidgetProps {
  column: "main" | "sidebar";
  settings: Record<string, unknown>;
  isEditing: boolean;
}

interface WidgetShellProps {
  title: string;
  icon?: React.ElementType;
  isEditing: boolean;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
  dragAttributes?: Record<string, unknown>;
  dragListeners?: Record<string, unknown>;
}

export function WidgetShell({
  title,
  icon: Icon,
  isEditing,
  children,
  className,
  headerAction,
  dragAttributes,
  dragListeners,
}: WidgetShellProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-5",
        isEditing && "border-dashed border-muted-foreground/30",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h2 className="font-semibold flex-1">{title}</h2>
        {headerAction}
      </div>
      {children}
    </div>
  );
}
