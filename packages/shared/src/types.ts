/** Roles within the STEADY system */
export type UserRole = "clinician" | "participant" | "admin";

/** Status of a participant in the study */
export type ParticipantStatus = "enrolled" | "active" | "completed" | "withdrawn";

/** Base user type shared across web and mobile */
export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  createdAt: Date;
  updatedAt: Date;
}

/** API response wrapper */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
