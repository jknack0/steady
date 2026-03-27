import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import path from "path";

const TEST_DATABASE_URL =
  process.env.DATABASE_URL ||
  "postgresql://steady:steady_password@localhost:5432/steady_adhd_test";

export default async function globalSetup() {
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  // 1. Drop and recreate public schema for a clean slate
  const schemaPrisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
  try {
    await schemaPrisma.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await schemaPrisma.$executeRawUnsafe("CREATE SCHEMA IF NOT EXISTS public");
  } finally {
    await schemaPrisma.$disconnect();
  }

  // 2. Push Prisma schema
  const dbPackageDir = path.resolve(__dirname, "../../../../db");
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: dbPackageDir,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "pipe",
  });

  // 3. Seed minimal test data
  const seedPrisma = new PrismaClient({ datasourceUrl: TEST_DATABASE_URL });
  try {
    await seedPrisma.user.create({
      data: {
        id: "integ-clinician-user",
        email: "integ-clinician@test.local",
        passwordHash: "$2b$10$fakehashfakehashfakehashfakehashfakehashfakehashfa",
        role: "CLINICIAN",
        firstName: "Test",
        lastName: "Clinician",
      },
    });

    await seedPrisma.clinicianProfile.create({
      data: {
        id: "integ-clinician-profile",
        userId: "integ-clinician-user",
      },
    });

    await seedPrisma.user.create({
      data: {
        id: "integ-participant-user",
        email: "integ-participant@test.local",
        passwordHash: "$2b$10$fakehashfakehashfakehashfakehashfakehashfakehashfa",
        role: "PARTICIPANT",
        firstName: "Test",
        lastName: "Participant",
      },
    });

    await seedPrisma.participantProfile.create({
      data: {
        id: "integ-participant-profile",
        userId: "integ-participant-user",
      },
    });

    await seedPrisma.program.create({
      data: {
        id: "integ-program-1",
        clinicianId: "integ-clinician-profile",
        title: "Integration Test Program",
        description: "Used by integration tests",
        cadence: "WEEKLY",
        enrollmentMethod: "INVITE",
        sessionType: "ONE_ON_ONE",
        status: "PUBLISHED",
      },
    });

    await seedPrisma.module.create({
      data: {
        id: "integ-module-1",
        programId: "integ-program-1",
        title: "Integration Test Module",
        sortOrder: 0,
        unlockRule: "SEQUENTIAL",
      },
    });
  } finally {
    await seedPrisma.$disconnect();
  }
}
