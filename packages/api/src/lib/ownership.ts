import { prisma } from "@steady/db";

/** Verify clinician owns the program */
export async function verifyProgramOwnership(programId: string, clinicianProfileId: string) {
  return prisma.program.findFirst({
    where: { id: programId, clinicianId: clinicianProfileId },
  });
}

/** Verify an enrollment belongs to this clinician's programs */
export async function verifyEnrollmentOwnership(enrollmentId: string, clinicianProfileId: string) {
  return prisma.enrollment.findFirst({
    where: { id: enrollmentId, program: { clinicianId: clinicianProfileId } },
  });
}
