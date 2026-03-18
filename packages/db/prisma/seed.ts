import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

async function main() {
  // Create a test clinician user
  const user = await prisma.user.upsert({
    where: { email: "clinician@steady.dev" },
    update: {},
    create: {
      email: "clinician@steady.dev",
      passwordHash: "dev-only-not-a-real-hash",
      firstName: "Dr.",
      lastName: "Dev",
      role: "CLINICIAN",
      clinicianProfile: {
        create: {
          practiceName: "STEADY Dev Clinic",
          licenseType: "PhD",
        },
      },
    },
    include: { clinicianProfile: true },
  });

  // Generate a long-lived dev token (7 days)
  const token = jwt.sign(
    {
      userId: user.id,
      role: user.role,
      clinicianProfileId: user.clinicianProfile!.id,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

  console.log("\n=== Dev Clinician Created ===");
  console.log(`Email: ${user.email}`);
  console.log(`User ID: ${user.id}`);
  console.log(`Clinician Profile ID: ${user.clinicianProfile!.id}`);
  console.log(`\n=== Dev Token (7 day expiry) ===`);
  console.log(token);
  console.log(`\nPaste this into your browser console:`);
  console.log(`localStorage.setItem("token", "${token}")`);
  console.log(`\nThen refresh the page.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
