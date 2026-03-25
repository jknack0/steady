"use client";

import { useState, useMemo, useCallback, type ComponentType } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { WIDGET_COMPONENTS } from "./dashboard-widgets";
import {
  normalizeDashboardLayout,
  WIDGET_REGISTRY,
  getDashboardWidgets,
  getClientOverviewWidgets,
} from "@steady/shared";
import type { DashboardLayoutItem, WidgetDefinition } from "@steady/shared";
import { X, Plus, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────

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
  enabledModules?: string[];
  page?: "dashboard" | "client_overview";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentRegistry?: Record<string, ComponentType<any>>;
}

// ── Sortable Widget Wrapper ──────────────────────

function SortableWidget({
  item,
  isEditing,
  dashboardData,
  registry,
  onRemove,
}: {
  item: DashboardLayoutItem;
  isEditing: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dashboardData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry: Record<string, ComponentType<any>>;
  onRemove?: (widgetId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.widgetId,
    disabled: !isEditing,
    data: { column: item.column },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const Component = registry[item.widgetId];
  if (!Component) return null;

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      {isEditing && (
        <div className="absolute -top-2 -right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onRemove?.(item.widgetId)}
            className="h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-sm hover:bg-destructive/90"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {isEditing && (
        <div
          className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 rounded p-0.5"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </div>
      )}
      <Component
        widgetId={item.widgetId}
        column={item.column}
        settings={item.settings}
        isEditing={isEditing}
        dashboardData={dashboardData}
      />
    </div>
  );
}

// ── Droppable Column ─────────────────────────────

function DroppableColumn({
  id,
  children,
  isEditing,
  className,
}: {
  id: string;
  children: React.ReactNode;
  isEditing: boolean;
  className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        className,
        isEditing && isOver && "ring-2 ring-primary/30 ring-inset rounded-lg"
      )}
    >
      {children}
    </div>
  );
}

// ── Add Widget Button ────────────────────────────

function AddWidgetButton({
  column,
  availableWidgets,
  onAdd,
}: {
  column: "main" | "sidebar";
  availableWidgets: WidgetDefinition[];
  onAdd: (widgetId: string, column: "main" | "sidebar") => void;
}) {
  if (availableWidgets.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="w-full border-dashed gap-2">
          <Plus className="h-4 w-4" />
          Add Widget
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="max-h-64 overflow-y-auto w-56">
        {availableWidgets.map((w) => (
          <DropdownMenuItem key={w.id} onClick={() => onAdd(w.id, column)}>
            <div>
              <p className="text-sm font-medium">{w.label}</p>
              <p className="text-xs text-muted-foreground">{w.description}</p>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ── Drag Overlay Content ─────────────────────────

function DragOverlayWidget({
  item,
  dashboardData,
  registry,
}: {
  item: DashboardLayoutItem;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dashboardData: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  registry: Record<string, ComponentType<any>>;
}) {
  const Component = registry[item.widgetId];
  if (!Component) return null;

  return (
    <div className="opacity-90 shadow-2xl rounded-lg ring-2 ring-primary">
      <Component
        widgetId={item.widgetId}
        column={item.column}
        settings={item.settings}
        isEditing={false}
        dashboardData={dashboardData}
      />
    </div>
  );
}

// ── Main Grid ────────────────────────────────────

export function WidgetGrid({
  layout,
  isEditing,
  dashboardData,
  onLayoutChange,
  enabledModules = [],
  page = "dashboard",
  componentRegistry,
}: WidgetGridProps) {
  const resolvedRegistry = componentRegistry ?? WIDGET_COMPONENTS;
  const widgetDefs = useMemo(() => Object.values(WIDGET_REGISTRY), []);
  const normalized = useMemo(
    () => normalizeDashboardLayout(layout, widgetDefs),
    [layout, widgetDefs]
  );

  const [activeId, setActiveId] = useState<string | null>(null);

  // Pointer sensor with activation distance to prevent accidental drags
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Split into columns
  const mainWidgets = useMemo(
    () => normalized.filter((w) => w.visible && w.column === "main").sort((a, b) => a.order - b.order),
    [normalized]
  );
  const sidebarWidgets = useMemo(
    () => normalized.filter((w) => w.visible && w.column === "sidebar").sort((a, b) => a.order - b.order),
    [normalized]
  );

  const statWidgets = mainWidgets.filter((w) => w.widgetId.startsWith("stat_"));
  const contentWidgets = mainWidgets.filter((w) => !w.widgetId.startsWith("stat_"));

  // Available widgets (not currently visible) for "+ Add Widget"
  const allPageWidgets = useMemo(
    () => (page === "dashboard" ? getDashboardWidgets() : getClientOverviewWidgets()),
    [page]
  );
  const availableWidgets = useMemo(
    () =>
      allPageWidgets.filter(
        (w) =>
          (w.requiresModule === null || enabledModules.includes(w.requiresModule)) &&
          !normalized.some((n) => n.widgetId === w.id && n.visible)
      ),
    [allPageWidgets, enabledModules, normalized]
  );

  // Active drag item for overlay
  const activeItem = useMemo(
    () => normalized.find((w) => w.widgetId === activeId) ?? null,
    [normalized, activeId]
  );

  // ── Handlers ───────────────────────────────────

  const handleRemove = useCallback(
    (widgetId: string) => {
      if (!onLayoutChange) return;
      const updated = normalized.map((w) =>
        w.widgetId === widgetId ? { ...w, visible: false } : w
      );
      onLayoutChange(updated);
    },
    [normalized, onLayoutChange]
  );

  const handleAdd = useCallback(
    (widgetId: string, column: "main" | "sidebar") => {
      if (!onLayoutChange) return;
      const existing = normalized.find((w) => w.widgetId === widgetId);
      const colItems = normalized.filter((w) => w.visible && w.column === column);
      const maxOrder = colItems.length > 0 ? Math.max(...colItems.map((w) => w.order)) + 1 : 0;

      let updated: DashboardLayoutItem[];
      if (existing) {
        updated = normalized.map((w) =>
          w.widgetId === widgetId ? { ...w, visible: true, column, order: maxOrder } : w
        );
      } else {
        const def = WIDGET_REGISTRY[widgetId];
        updated = [
          ...normalized,
          {
            widgetId,
            visible: true,
            column,
            order: maxOrder,
            settings: def ? { ...def.defaultSettings } : {},
          },
        ];
      }
      onLayoutChange(updated);
    },
    [normalized, onLayoutChange]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      if (!onLayoutChange) return;
      const { active, over } = event;
      if (!over) return;

      const activeWidgetId = active.id as string;
      const overId = over.id as string;

      // Determine target column
      let targetColumn: "main" | "sidebar" | null = null;
      if (overId === "main-column" || overId === "sidebar-column") {
        targetColumn = overId === "main-column" ? "main" : "sidebar";
      } else {
        const overWidget = normalized.find((w) => w.widgetId === overId);
        if (overWidget) targetColumn = overWidget.column;
      }

      if (!targetColumn) return;

      const activeWidget = normalized.find((w) => w.widgetId === activeWidgetId);
      if (!activeWidget || activeWidget.column === targetColumn) return;

      // Move to new column
      const updated = normalized.map((w) =>
        w.widgetId === activeWidgetId ? { ...w, column: targetColumn! } : w
      );
      onLayoutChange(updated);
    },
    [normalized, onLayoutChange]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveId(null);
      if (!onLayoutChange) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeWidgetId = active.id as string;
      const overWidgetId = over.id as string;

      const activeWidget = normalized.find((w) => w.widgetId === activeWidgetId);
      const overWidget = normalized.find((w) => w.widgetId === overWidgetId);

      if (!activeWidget) return;

      // Reorder within same column
      const column = activeWidget.column;
      const colItems = normalized
        .filter((w) => w.visible && w.column === column)
        .sort((a, b) => a.order - b.order);

      const oldIndex = colItems.findIndex((w) => w.widgetId === activeWidgetId);
      const newIndex = overWidget
        ? colItems.findIndex((w) => w.widgetId === overWidgetId)
        : colItems.length;

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(colItems, oldIndex, newIndex);
      const orderMap = new Map(reordered.map((w, i) => [w.widgetId, i]));

      const updated = normalized.map((w) => {
        const newOrder = orderMap.get(w.widgetId);
        return newOrder !== undefined ? { ...w, order: newOrder } : w;
      });

      onLayoutChange(updated);
    },
    [normalized, onLayoutChange]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // ── Render ─────────────────────────────────────

  function renderWidget(item: DashboardLayoutItem) {
    return (
      <SortableWidget
        key={item.widgetId}
        item={item}
        isEditing={isEditing}
        dashboardData={dashboardData}
        registry={resolvedRegistry}
        onRemove={isEditing ? handleRemove : undefined}
      />
    );
  }

  const grid = (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <DroppableColumn id="main-column" isEditing={isEditing} className="lg:col-span-2 space-y-6">
        {statWidgets.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SortableContext items={statWidgets.map((w) => w.widgetId)} strategy={verticalListSortingStrategy}>
              {statWidgets.map(renderWidget)}
            </SortableContext>
          </div>
        )}
        <SortableContext items={contentWidgets.map((w) => w.widgetId)} strategy={verticalListSortingStrategy}>
          {contentWidgets.map(renderWidget)}
        </SortableContext>
        {isEditing && (
          <AddWidgetButton column="main" availableWidgets={availableWidgets} onAdd={handleAdd} />
        )}
      </DroppableColumn>

      <DroppableColumn id="sidebar-column" isEditing={isEditing} className="space-y-6">
        <SortableContext items={sidebarWidgets.map((w) => w.widgetId)} strategy={verticalListSortingStrategy}>
          {sidebarWidgets.map(renderWidget)}
        </SortableContext>
        {isEditing && (
          <AddWidgetButton column="sidebar" availableWidgets={availableWidgets} onAdd={handleAdd} />
        )}
      </DroppableColumn>
    </div>
  );

  if (!isEditing) return grid;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {grid}
      <DragOverlay dropAnimation={null}>
        {activeItem && (
          <DragOverlayWidget
            item={activeItem}
            dashboardData={dashboardData}
            registry={resolvedRegistry}
          />
        )}
      </DragOverlay>
    </DndContext>
  );
}
