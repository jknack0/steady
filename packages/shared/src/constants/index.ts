/** Application-wide constants */
export * from "./cpt-codes";

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
