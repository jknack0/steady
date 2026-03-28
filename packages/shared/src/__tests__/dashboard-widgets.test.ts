import { describe, it, expect } from "vitest";
import {
  WIDGET_REGISTRY,
  getDashboardWidgets,
  getClientOverviewWidgets,
  type WidgetDefinition,
} from "../constants/dashboard-widgets";
import { normalizeDashboardLayout } from "../lib/normalize-layout";

describe("WIDGET_REGISTRY", () => {
  it("contains all 20 dashboard widgets", () => {
    const dashboardWidgets = getDashboardWidgets();
    expect(dashboardWidgets.length).toBe(20);
  });

  it("contains all 11 client overview widgets", () => {
    const clientWidgets = getClientOverviewWidgets();
    expect(clientWidgets.length).toBe(11);
  });

  it("includes emotion_trends widget on client_overview page", () => {
    const widget = WIDGET_REGISTRY["emotion_trends"];
    expect(widget).toBeDefined();
    expect(widget.page).toBe("client_overview");
    expect(widget.requiresModule).toBe("daily_tracker");
    expect(widget.defaultColumn).toBe("main");
    expect(widget.settingsSchema).not.toBeNull();
    if (widget.settingsSchema) {
      const result = widget.settingsSchema.safeParse(widget.defaultSettings);
      expect(result.success).toBe(true);
    }
  });

  it("every widget has required fields", () => {
    for (const widget of Object.values(WIDGET_REGISTRY)) {
      expect(widget.id).toBeTruthy();
      expect(widget.label).toBeTruthy();
      expect(widget.page).toMatch(/^(dashboard|client_overview)$/);
      expect(widget.defaultColumn).toMatch(/^(main|sidebar)$/);
      expect(widget.supportedColumns.length).toBeGreaterThan(0);
    }
  });

  it("widget defaultSettings match settingsSchema when present", () => {
    for (const widget of Object.values(WIDGET_REGISTRY)) {
      if (widget.settingsSchema) {
        const result = widget.settingsSchema.safeParse(widget.defaultSettings);
        expect(result.success).toBe(true);
      }
    }
  });
});

describe("normalizeDashboardLayout", () => {
  const registry = Object.values(WIDGET_REGISTRY);

  it("hydrates missing column, order, settings from legacy items", () => {
    const legacy = [
      { widgetId: "tracker_summary", visible: true },
      { widgetId: "homework_status", visible: false },
    ];
    const result = normalizeDashboardLayout(legacy, registry);
    expect(result[0].column).toBe("main");
    expect(result[0].order).toBe(0);
    expect(result[0].settings).toEqual({});
    expect(result[1].visible).toBe(false);
    expect(result[1].order).toBe(1);
  });

  it("preserves explicitly set fields", () => {
    const items = [
      { widgetId: "recent_submissions", visible: true, column: "main" as const, order: 5, settings: { itemCount: 3 } },
    ];
    const result = normalizeDashboardLayout(items, registry);
    expect(result[0].column).toBe("main");
    expect(result[0].order).toBe(5);
    expect(result[0].settings).toEqual({ itemCount: 3, daysBack: 7 });
  });

  it("handles unknown widget IDs gracefully", () => {
    const items = [{ widgetId: "nonexistent_widget", visible: true }];
    const result = normalizeDashboardLayout(items, registry);
    expect(result[0].column).toBe("main");
    expect(result[0].order).toBe(0);
  });
});
