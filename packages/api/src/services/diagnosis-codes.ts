import { prisma } from "@steady/db";

export async function searchDiagnosisCodes(query: string, limit = 20) {
  const results = await prisma.diagnosisCode.findMany({
    where: {
      OR: [
        { code: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: [{ isCommon: "desc" }, { category: "asc" }, { code: "asc" }],
    take: limit,
  });
  return results;
}

export async function getRecentForParticipant(clinicianProfileId: string, participantId: string) {
  // Get diagnosis codes from recent claims for this participant
  const recentClaims = await prisma.insuranceClaim.findMany({
    where: {
      clinicianId: clinicianProfileId,
      participantId,
    },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { diagnosisCodes: true },
  });

  // Flatten and deduplicate codes
  const codeSet = new Set<string>();
  for (const claim of recentClaims) {
    for (const code of claim.diagnosisCodes) {
      codeSet.add(code);
    }
  }

  if (codeSet.size === 0) return [];

  // Fetch full diagnosis code records
  const codes = await prisma.diagnosisCode.findMany({
    where: { code: { in: Array.from(codeSet) } },
  });

  return codes;
}
