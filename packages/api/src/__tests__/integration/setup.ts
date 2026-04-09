import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

// ── Database URL ─────────────────────────────────────
const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://steady:steady_password@localhost:5432/steady_adhd_test";

// Override DATABASE_URL so Prisma (and the app via @steady/db) connect to test DB
process.env.DATABASE_URL = TEST_DATABASE_URL;

// Ensure JWT_SECRET is set for token generation
process.env.JWT_SECRET = process.env.JWT_SECRET || "integration-test-secret";

const JWT_SECRET = process.env.JWT_SECRET;

// ── Prisma Client (direct, not from @steady/db) ─────
export const testPrisma = new PrismaClient({
  datasourceUrl: TEST_DATABASE_URL,
});

// ── Test Data IDs ───────────────────────────────────
export const TEST_IDS = {
  clinicianUserId: "integ-clinician-user",
  clinicianProfileId: "integ-clinician-profile",
  participantUserId: "integ-participant-user",
  participantProfileId: "integ-participant-profile",
  programId: "integ-program-1",
  moduleId: "integ-module-1",
};

// ── Token Helpers ───────────────────────────────────
export function clinicianToken(): string {
  return jwt.sign(
    {
      userId: TEST_IDS.clinicianUserId,
      role: "CLINICIAN",
      clinicianProfileId: TEST_IDS.clinicianProfileId,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export function clinicianAuthHeader(): [string, string] {
  return ["Authorization", `Bearer ${clinicianToken()}`];
}

export function participantToken(): string {
  return jwt.sign(
    {
      userId: TEST_IDS.participantUserId,
      role: "PARTICIPANT",
      participantProfileId: TEST_IDS.participantProfileId,
    },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
}

export function participantAuthHeader(): [string, string] {
  return ["Authorization", `Bearer ${participantToken()}`];
}
