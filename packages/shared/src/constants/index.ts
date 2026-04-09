/** Application-wide constants */
export * from "./cpt-codes";
export * from "./modules";
export * from "./dashboard-widgets";
export { normalizeDashboardLayout, type PartialDashboardLayoutItem } from "../lib/normalize-layout";
export * from "./provider-presets";
export * from "./homework-labels";
export * from "./feelings-wheel";

export const APP_NAME = "STEADY with ADHD";

export const USER_ROLES = {
  CLINICIAN: "clinician",
  PARTICIPANT: "participant",
  ADMIN: "admin",
} as const;

export const PARTICIPANT_STATUSES = {
  ENROLLED: "enrolled",
  ACTIVE: "active",
  COMPLETED: "completed",
  WITHDRAWN: "withdrawn",
} as const;
