import { describe, it, expect } from "vitest";
import { PROVIDER_PRESETS } from "../constants/provider-presets";
import { WIDGET_REGISTRY } from "../constants/dashboard-widgets";

describe("PROVIDER_PRESETS", () => {
  it("all presets have dashboardLayout as DashboardLayoutItem[]", () => {
    for (const preset of Object.values(PROVIDER_PRESETS)) {
      expect(Array.isArray(preset.dashboardLayout)).toBe(true);
      for (const item of preset.dashboardLayout) {
        expect(item).toHaveProperty("widgetId");
        expect(item).toHaveProperty("visible");
        expect(item).toHaveProperty("column");
        expect(item).toHaveProperty("order");
        expect(item).toHaveProperty("settings");
      }
    }
  });

  it("all presets have clientOverviewLayout", () => {
    for (const preset of Object.values(PROVIDER_PRESETS)) {
      expect(Array.isArray(preset.clientOverviewLayout)).toBe(true);
      expect(preset.clientOverviewLayout.length).toBeGreaterThan(0);
    }
  });

  it("all widget IDs in presets exist in registry", () => {
    for (const preset of Object.values(PROVIDER_PRESETS)) {
      for (const item of preset.dashboardLayout) {
        expect(WIDGET_REGISTRY[item.widgetId]).toBeDefined();
      }
      for (const item of preset.clientOverviewLayout) {
        expect(WIDGET_REGISTRY[item.widgetId]).toBeDefined();
      }
    }
  });
});
