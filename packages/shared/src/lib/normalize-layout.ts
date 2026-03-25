import type { WidgetDefinition } from "../constants/dashboard-widgets";
import type { DashboardLayoutItem } from "../schemas/config";

export interface PartialDashboardLayoutItem {
  widgetId: string;
  visible: boolean;
  column?: "main" | "sidebar";
  order?: number;
  settings?: Record<string, unknown>;
}

export function normalizeDashboardLayout(
  layout: PartialDashboardLayoutItem[],
  registry: WidgetDefinition[]
): DashboardLayoutItem[] {
  return layout.map((item, index) => {
    const widget = registry.find((w) => w.id === item.widgetId);
    return {
      widgetId: item.widgetId,
      visible: item.visible,
      column: item.column ?? widget?.defaultColumn ?? "main",
      order: item.order ?? index,
      settings: { ...(widget?.defaultSettings ?? {}), ...(item.settings ?? {}) },
    };
  });
}
