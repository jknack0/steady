import { describe, it, expect } from "vitest";
import {
  SaveClinicianConfigSchema,
  SaveClientConfigSchema,
  SaveDashboardLayoutSchema,
  DashboardLayoutItemSchema,
} from "../schemas/config";

describe("DashboardLayoutItemSchema", () => {
  it("accepts full item with all fields", () => {
    const result = DashboardLayoutItemSchema.safeParse({
      widgetId: "stat_active_clients",
      visible: true,
      column: "main",
      order: 0,
      settings: { itemCount: 5 },
    });
    expect(result.success).toBe(true);
  });

  it("accepts legacy shape with only widgetId and visible (backward compat)", () => {
    const result = DashboardLayoutItemSchema.safeParse({
      widgetId: "tracker_summary",
      visible: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.column).toBe("main");
      expect(result.data.order).toBe(0);
      expect(result.data.settings).toEqual({});
    }
  });

  it("rejects invalid column value", () => {
    const result = DashboardLayoutItemSchema.safeParse({
      widgetId: "test",
      visible: true,
      column: "footer",
    });
    expect(result.success).toBe(false);
  });
});

describe("SaveClinicianConfigSchema", () => {
  it("accepts clientOverviewLayout", () => {
    const result = SaveClinicianConfigSchema.safeParse({
      providerType: "THERAPIST",
      enabledModules: ["daily_tracker"],
      dashboardLayout: [{ widgetId: "stat_active_clients", visible: true }],
      clientOverviewLayout: [
        { widgetId: "client_demographics", visible: true, column: "main", order: 0, settings: {} },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("caps layout array at 50 items", () => {
    const items = Array.from({ length: 51 }, (_, i) => ({
      widgetId: `widget_${i}`,
      visible: true,
    }));
    const result = SaveClinicianConfigSchema.safeParse({
      providerType: "THERAPIST",
      enabledModules: ["daily_tracker"],
      dashboardLayout: items,
    });
    expect(result.success).toBe(false);
  });
});

describe("SaveDashboardLayoutSchema", () => {
  it("accepts dashboardLayout only", () => {
    const result = SaveDashboardLayoutSchema.safeParse({
      dashboardLayout: [{ widgetId: "stat_active_clients", visible: true, column: "main", order: 0, settings: {} }],
    });
    expect(result.success).toBe(true);
  });

  it("accepts clientOverviewLayout only", () => {
    const result = SaveDashboardLayoutSchema.safeParse({
      clientOverviewLayout: [{ widgetId: "client_demographics", visible: true, column: "main", order: 0, settings: {} }],
    });
    expect(result.success).toBe(true);
  });
});

describe("SaveClientConfigSchema", () => {
  it("accepts clientOverviewLayout", () => {
    const result = SaveClientConfigSchema.safeParse({
      clientOverviewLayout: [
        { widgetId: "client_homework", visible: true, column: "main", order: 0, settings: {} },
      ],
    });
    expect(result.success).toBe(true);
  });
});
