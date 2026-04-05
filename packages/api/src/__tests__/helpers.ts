import jwt from "jsonwebtoken";
import type { AuthUser } from "../middleware/auth";
import { JWT_SECRET } from "../lib/env";

/**
 * Generate a valid auth token for testing.
 */
export function createTestToken(overrides: Partial<AuthUser> = {}): string {
  const user: AuthUser = {
    userId: "test-user-id",
    role: "CLINICIAN",
    clinicianProfileId: "test-clinician-profile-id",
    ...overrides,
  };
  return jwt.sign(user, JWT_SECRET, { expiresIn: "1h" });
}

/**
 * Auth header for supertest requests.
 */
export function authHeader(overrides: Partial<AuthUser> = {}): [string, string] {
  return ["Authorization", `Bearer ${createTestToken(overrides)}`];
}

/**
 * Auth header for participant supertest requests.
 */
export function participantAuthHeader(overrides: Partial<AuthUser> = {}): [string, string] {
  return authHeader({
    role: "PARTICIPANT",
    participantProfileId: "test-participant-profile-id",
    clinicianProfileId: undefined,
    ...overrides,
  });
}

/**
 * Create a mock program object.
 */
export function mockProgram(overrides: Record<string, any> = {}) {
  return {
    id: "program-1",
    clinicianId: "test-clinician-profile-id",
    title: "Test Program",
    description: "A test program",
    coverImageUrl: null,
    cadence: "WEEKLY",
    enrollmentMethod: "INVITE",
    enrollmentCode: null,
    sessionType: "ONE_ON_ONE",
    followUpCount: 0,
    isTemplate: false,
    templateSourceId: null,
    status: "DRAFT",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock module object.
 */
export function mockModule(overrides: Record<string, any> = {}) {
  return {
    id: "module-1",
    programId: "program-1",
    title: "Test Module",
    subtitle: null,
    summary: null,
    estimatedMinutes: null,
    sortOrder: 0,
    unlockRule: "SEQUENTIAL",
    unlockDelayDays: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock location object.
 */
export function mockLocation(overrides: Record<string, any> = {}) {
  return {
    id: "loc-1",
    practiceId: "practice-1",
    name: "Main Office",
    type: "IN_PERSON",
    addressLine1: null,
    addressLine2: null,
    city: null,
    state: null,
    postalCode: null,
    timezone: null,
    isDefault: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock service code object.
 */
export function mockServiceCode(overrides: Record<string, any> = {}) {
  return {
    id: "sc-1",
    practiceId: "practice-1",
    code: "90834",
    description: "Psychotherapy, 45 min",
    defaultDurationMinutes: 45,
    defaultPriceCents: 14000,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock appointment object.
 */
export function mockAppointment(overrides: Record<string, any> = {}) {
  const start = new Date("2026-05-01T14:00:00Z");
  const end = new Date("2026-05-01T14:45:00Z");
  return {
    id: "appt-1",
    practiceId: "practice-1",
    clinicianId: "test-clinician-profile-id",
    participantId: "pp-1",
    serviceCodeId: "sc-1",
    locationId: "loc-1",
    startAt: start,
    endAt: end,
    status: "SCHEDULED",
    appointmentType: "INDIVIDUAL",
    internalNote: null,
    cancelReason: null,
    statusChangedAt: null,
    createdById: "test-user-id",
    createdAt: new Date(),
    updatedAt: new Date(),
    serviceCode: mockServiceCode(),
    location: mockLocation(),
    participant: {
      id: "pp-1",
      user: { id: "u-pp-1", firstName: "Jane", lastName: "Doe", email: "jane@test.com" },
    },
    clinician: {
      id: "test-clinician-profile-id",
      user: { id: "test-user-id", firstName: "Dr.", lastName: "Smith", email: "dr@test.com" },
    },
    ...overrides,
  };
}

export function seedTwoPractices() {
  return {
    practiceA: "practice-A",
    practiceB: "practice-B",
    clinicianA: "clin-A",
    clinicianB: "clin-B",
    userA: "user-A",
    userB: "user-B",
  };
}

/**
 * Create a mock part object.
 */
export function mockPart(overrides: Record<string, any> = {}) {
  return {
    id: "part-1",
    moduleId: "module-1",
    type: "TEXT",
    title: "Test Part",
    sortOrder: 0,
    isRequired: true,
    content: { type: "TEXT", body: "<p>Hello</p>" },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a mock PatientInvitation object.
 */
export function mockInvitation(overrides: Record<string, any> = {}) {
  return {
    id: "invitation-1",
    clinicianId: "test-clinician-profile-id",
    code: "STEADY-AB12",
    patientName: "Jane Doe",
    patientEmail: "jane@example.com",
    patientEmailHash: "abc123hash",
    programId: null,
    status: "PENDING",
    emailSent: false,
    emailSendCount: 0,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    acceptedAt: null,
    acceptedByUserId: null,
    revokedAt: null,
    piiScrubbed: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
