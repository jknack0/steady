"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { X, Search, Settings2, GripVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  WIDGET_REGISTRY,
  getDashboardWidgets,
  getClientOverviewWidgets,
} from "@steady/shared";
import type { DashboardLayoutItem, WidgetDefinition } from "@steady/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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

// ── Types ──────────────────────────────────────────

interface CustomizePanelProps {
  layout: DashboardLayoutItem[];
  enabledModules: string[];
  onSave: (layout: DashboardLayoutItem[]) => void;
  onClose: () => void;
  isSaving: boolean;
  page?: "dashboard" | "client_overview";
  clientName?: string;
}

// ── Sortable Widget Item ───────────────────────────

function SortableWidgetItem({
  item,
  definition,
  onToggle,
  onSettingsChange,
  expandedSettings,
  onToggleSettings,
}: {
  item: DashboardLayoutItem;
  definition: WidgetDefinition;
  onToggle: (widgetId: string, visible: boolean) => void;
  onSettingsChange: (widgetId: string, key: string, value: unknown) => void;
  expandedSettings: string | null;
  onToggleSettings: (widgetId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.widgetId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const hasSettings =
    definition.settingsSchema !== null &&
    Object.keys(definition.defaultSettings).length > 0;
  const isExpanded = expandedSettings === item.widgetId;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border bg-card transition-shadow",
        isDragging && "shadow-lg opacity-80 z-50"
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          type="button"
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="flex-1 text-sm font-medium truncate">
          {definition.label}
        </span>

        {hasSettings && (
          <button
            type="button"
            onClick={() => onToggleSettings(item.widgetId)}
            className={cn(
              "p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-colors",
              isExpanded && "bg-accent text-foreground"
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
          </button>
        )}

        <Switch
          checked={item.visible}
          onCheckedChange={(checked) => onToggle(item.widgetId, checked)}
        />
      </div>

      {/* Inline settings */}
      {isExpanded && hasSettings && (
        <div className="border-t px-3 py-2 space-y-2 bg-muted/50">
          {Object.entries(item.settings).map(([key, value]) => {
            if (typeof value === "number") {
              return (
                <div key={key} className="flex items-center justify-between gap-2">
                  <label className="text-xs text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, " $1").trim()}
                  </label>
                  <Input
                    type="number"
                    value={value}
                    onChange={(e) =>
                      onSettingsChange(
                        item.widgetId,
                        key,
                        parseInt(e.target.value, 10) || 0
                      )
                    }
                    className="h-7 w-20 text-xs"
                  />
                </div>
              );
            }
            if (Array.isArray(value)) {
              return (
                <div key={key} className="text-xs text-muted-foreground">
                  {value.length} {key} configured
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}

// ── Available (disabled) Widget Item ───────────────

function AvailableWidgetItem({
  item,
  definition,
  onToggle,
}: {
  item: DashboardLayoutItem;
  definition: WidgetDefinition;
  onToggle: (widgetId: string, visible: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card opacity-60">
      <span className="flex-1 text-sm truncate">{definition.label}</span>
      <Switch
        checked={false}
        onCheckedChange={() => onToggle(item.widgetId, true)}
      />
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────

export function CustomizePanel({
  layout,
  enabledModules,
  onSave,
  onClose,
  isSaving,
  page = "dashboard",
  clientName,
}: CustomizePanelProps) {
  // Clone layout into local state on mount
  const [localLayout, setLocalLayout] = useState<DashboardLayoutItem[]>(() =>
    layout.map((item) => ({ ...item, settings: { ...item.settings } }))
  );
  const [search, setSearch] = useState("");
  const [expandedSettings, setExpandedSettings] = useState<string | null>(null);

  // Auto-save with debounce when layout changes
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLayoutRef = useRef(JSON.stringify(layout));

  useEffect(() => {
    const currentStr = JSON.stringify(localLayout);
    if (currentStr === initialLayoutRef.current) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      onSave(localLayout);
      initialLayoutRef.current = currentStr;
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [localLayout, onSave]);

  // Get available widget definitions for this page, filtered by enabled modules
  const availableWidgets = useMemo(() => {
    const widgets =
      page === "dashboard"
        ? getDashboardWidgets()
        : getClientOverviewWidgets();

    return widgets.filter(
      (w) =>
        w.requiresModule === null || enabledModules.includes(w.requiresModule)
    );
  }, [page, enabledModules]);

  // Ensure all available widgets exist in local layout
  useEffect(() => {
    setLocalLayout((prev) => {
      const existing = new Set(prev.map((item) => item.widgetId));
      const missing = availableWidgets.filter(
        (w) => !existing.has(w.id)
      );
      if (missing.length === 0) return prev;

      const maxOrder = prev.reduce(
        (max, item) => Math.max(max, item.order),
        0
      );
      return [
        ...prev,
        ...missing.map((w, i) => ({
          widgetId: w.id,
          visible: false,
          column: w.defaultColumn as "main" | "sidebar",
          order: maxOrder + i + 1,
          settings: { ...w.defaultSettings },
        })),
      ];
    });
  }, [availableWidgets]);

  // Filter by search
  const filteredWidgetIds = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return new Set(availableWidgets.map((w) => w.id));
    return new Set(
      availableWidgets
        .filter(
          (w) =>
            w.label.toLowerCase().includes(term) ||
            w.description.toLowerCase().includes(term)
        )
        .map((w) => w.id)
    );
  }, [search, availableWidgets]);

  // Split into enabled and available, respecting search filter
  const availableWidgetIds = useMemo(
    () => new Set(availableWidgets.map((w) => w.id)),
    [availableWidgets]
  );

  const enabledItems = useMemo(
    () =>
      localLayout
        .filter(
          (item) =>
            item.visible &&
            availableWidgetIds.has(item.widgetId) &&
            filteredWidgetIds.has(item.widgetId)
        )
        .sort((a, b) => a.order - b.order),
    [localLayout, availableWidgetIds, filteredWidgetIds]
  );

  const disabledItems = useMemo(
    () =>
      localLayout
        .filter(
          (item) =>
            !item.visible &&
            availableWidgetIds.has(item.widgetId) &&
            filteredWidgetIds.has(item.widgetId)
        )
        .sort((a, b) => a.order - b.order),
    [localLayout, availableWidgetIds, filteredWidgetIds]
  );

  // Toggle widget visibility
  const handleToggle = useCallback(
    (widgetId: string, visible: boolean) => {
      setLocalLayout((prev) =>
        prev.map((item) =>
          item.widgetId === widgetId ? { ...item, visible } : item
        )
      );
    },
    []
  );

  // Update a setting value
  const handleSettingsChange = useCallback(
    (widgetId: string, key: string, value: unknown) => {
      setLocalLayout((prev) =>
        prev.map((item) =>
          item.widgetId === widgetId
            ? { ...item, settings: { ...item.settings, [key]: value } }
            : item
        )
      );
    },
    []
  );

  // Toggle settings expansion
  const handleToggleSettings = useCallback(
    (widgetId: string) => {
      setExpandedSettings((prev) => (prev === widgetId ? null : widgetId));
    },
    []
  );

  // Handle drag-end for reordering
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      setLocalLayout((prev) => {
        const visibleSorted = prev
          .filter((item) => item.visible && availableWidgetIds.has(item.widgetId))
          .sort((a, b) => a.order - b.order);

        const oldIndex = visibleSorted.findIndex(
          (item) => item.widgetId === active.id
        );
        const newIndex = visibleSorted.findIndex(
          (item) => item.widgetId === over.id
        );

        if (oldIndex === -1 || newIndex === -1) return prev;

        // Reorder
        const reordered = [...visibleSorted];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        // Build new order map
        const orderMap = new Map<string, number>();
        reordered.forEach((item, i) => {
          orderMap.set(item.widgetId, i);
        });

        return prev.map((item) => {
          const newOrder = orderMap.get(item.widgetId);
          return newOrder !== undefined
            ? { ...item, order: newOrder }
            : item;
        });
      });
    },
    [availableWidgetIds]
  );

  // Reset to defaults
  const handleResetToDefault = useCallback(() => {
    setLocalLayout(
      layout.map((item) => ({ ...item, settings: { ...item.settings } }))
    );
  }, [layout]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30"
        onClick={onClose}
      />

      {/* Panel — offset by header height (h-16 = 64px) */}
      <div
        className={cn(
          "fixed top-16 right-0 z-50 h-[calc(100vh-4rem)] w-full sm:w-80 bg-background border-l shadow-xl",
          "flex flex-col animate-in slide-in-from-right duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="text-lg font-semibold">Customize</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Per-client banner */}
        {clientName && (
          <div className="px-4 py-2 border-b bg-muted/50 flex items-center justify-between gap-2">
            <span className="text-sm text-muted-foreground">
              Customizing for <span className="font-medium text-foreground">{clientName}</span>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetToDefault}
              className="text-xs h-7"
            >
              Reset to default
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="px-4 py-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search widgets..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4">
          {/* Enabled widgets */}
          {enabledItems.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Enabled
              </h3>
              <DndContext
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={enabledItems.map((item) => item.widgetId)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1.5">
                    {enabledItems.map((item) => {
                      const def = WIDGET_REGISTRY[item.widgetId];
                      if (!def) return null;
                      return (
                        <SortableWidgetItem
                          key={item.widgetId}
                          item={item}
                          definition={def}
                          onToggle={handleToggle}
                          onSettingsChange={handleSettingsChange}
                          expandedSettings={expandedSettings}
                          onToggleSettings={handleToggleSettings}
                        />
                      );
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {/* Available (disabled) widgets */}
          {disabledItems.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Available
              </h3>
              <div className="space-y-1.5">
                {disabledItems.map((item) => {
                  const def = WIDGET_REGISTRY[item.widgetId];
                  if (!def) return null;
                  return (
                    <AvailableWidgetItem
                      key={item.widgetId}
                      item={item}
                      definition={def}
                      onToggle={handleToggle}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {enabledItems.length === 0 && disabledItems.length === 0 && search && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No widgets match &ldquo;{search}&rdquo;
            </p>
          )}
        </div>

        {/* Footer — auto-save status */}
        {isSaving && (
          <div className="flex items-center justify-center gap-2 px-4 py-2 border-t text-sm text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving...
          </div>
        )}
      </div>
    </>
  );
}
