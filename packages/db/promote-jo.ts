import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const jo = await prisma.user.findUnique({
    where: { email: "jo@jo.com" },
    include: { participantProfile: true, clinicianProfile: true },
  });

  if (!jo) {
    console.log("User jo@jo.com not found.");
    return;
  }

  // Ensure Jo has a clinician profile
  let clinician = jo.clinicianProfile;
  if (!clinician) {
    clinician = await prisma.clinicianProfile.create({
      data: {
        userId: jo.id,
        practiceName: "Jo Clinic",
        licenseType: "MD",
        timezone: jo.participantProfile?.timezone ?? "America/New_York",
      },
    });
    console.log(`Created clinicianProfile ${clinician.id} for Jo.`);
  } else {
    console.log(`Jo already has clinicianProfile ${clinician.id}.`);
  }

  // Update user role to CLINICIAN
  await prisma.user.update({ where: { id: jo.id }, data: { role: "CLINICIAN" } });
  console.log("Updated Jo role to CLINICIAN.");

  // Reassign programs titled Client Alpha/Beta/Gamma to Jo
  const clientNames = ["Client Alpha", "Client Beta", "Client Gamma"];
  const programs = await prisma.program.findMany({ where: { title: { in: clientNames } } });

  for (const p of programs) {
    await prisma.program.update({ where: { id: p.id }, data: { clinicianId: clinician.id } });
    console.log(`Reassigned program '${p.title}' (${p.id}) to Jo clinician ${clinician.id}`);
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
