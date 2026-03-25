"use client";

import { useMemo } from "react";
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { WIDGET_COMPONENTS } from "./dashboard-widgets";
import { normalizeDashboardLayout, WIDGET_REGISTRY } from "@steady/shared";
import type { DashboardLayoutItem } from "@steady/shared";

interface WidgetGridProps {
  layout: Array<{
    widgetId: string;
    visible: boolean;
    column?: "main" | "sidebar";
    order?: number;
    settings?: Record<string, unknown>;
  }>;
  isEditing: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dashboardData: any;
  onLayoutChange?: (layout: DashboardLayoutItem[]) => void;
}

function SortableWidget({
  item,
  isEditing,
  dashboardData,
}: {
  item: DashboardLayoutItem;
  isEditing: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dashboardData: any;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: item.widgetId,
      disabled: !isEditing,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const Component = WIDGET_COMPONENTS[item.widgetId];
  if (!Component) return null;

  return (
    <div ref={setNodeRef} style={style}>
      <Component
        widgetId={item.widgetId}
        column={item.column}
        settings={item.settings}
        isEditing={isEditing}
        dashboardData={dashboardData}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

export function WidgetGrid({
  layout,
  isEditing,
  dashboardData,
  onLayoutChange,
}: WidgetGridProps) {
  const registry = useMemo(() => Object.values(WIDGET_REGISTRY), []);
  const normalized = useMemo(
    () => normalizeDashboardLayout(layout, registry),
    [layout, registry]
  );

  const mainWidgets = useMemo(
    () =>
      normalized
        .filter((w) => w.visible && w.column === "main")
        .sort((a, b) => a.order - b.order),
    [normalized]
  );
  const sidebarWidgets = useMemo(
    () =>
      normalized
        .filter((w) => w.visible && w.column === "sidebar")
        .sort((a, b) => a.order - b.order),
    [normalized]
  );

  const statWidgets = mainWidgets.filter((w) =>
    w.widgetId.startsWith("stat_")
  );
  const contentWidgets = mainWidgets.filter(
    (w) => !w.widgetId.startsWith("stat_")
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!onLayoutChange) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const updated = [...normalized];
    const activeIdx = updated.findIndex((w) => w.widgetId === active.id);
    const overIdx = updated.findIndex((w) => w.widgetId === over.id);
    if (activeIdx === -1 || overIdx === -1) return;

    // Move active to over's position
    const [moved] = updated.splice(activeIdx, 1);
    updated.splice(overIdx, 0, moved);

    // If target is in a different column, update column
    const overItem = normalized.find((w) => w.widgetId === over.id);
    if (overItem && moved.column !== overItem.column) {
      moved.column = overItem.column;
    }

    // Reassign order values
    const reordered = updated.map((item, i) => ({ ...item, order: i }));
    onLayoutChange(reordered);
  }

  const grid = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {statWidgets.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SortableContext
              items={statWidgets.map((w) => w.widgetId)}
              strategy={verticalListSortingStrategy}
            >
              {statWidgets.map((widget) => (
                <SortableWidget
                  key={widget.widgetId}
                  item={widget}
                  isEditing={isEditing}
                  dashboardData={dashboardData}
                />
              ))}
            </SortableContext>
          </div>
        )}
        <SortableContext
          items={contentWidgets.map((w) => w.widgetId)}
          strategy={verticalListSortingStrategy}
        >
          {contentWidgets.map((widget) => (
            <SortableWidget
              key={widget.widgetId}
              item={widget}
              isEditing={isEditing}
              dashboardData={dashboardData}
            />
          ))}
        </SortableContext>
      </div>

      <div className="space-y-6">
        <SortableContext
          items={sidebarWidgets.map((w) => w.widgetId)}
          strategy={verticalListSortingStrategy}
        >
          {sidebarWidgets.map((widget) => (
            <SortableWidget
              key={widget.widgetId}
              item={widget}
              isEditing={isEditing}
              dashboardData={dashboardData}
            />
          ))}
        </SortableContext>
        {isEditing && sidebarWidgets.length === 0 && (
          <div className="rounded-lg border-2 border-dashed p-8 text-center text-sm text-muted-foreground">
            Drop widget here
          </div>
        )}
      </div>
    </div>
  );

  if (isEditing) {
    return (
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        {grid}
      </DndContext>
    );
  }

  return grid;
}
