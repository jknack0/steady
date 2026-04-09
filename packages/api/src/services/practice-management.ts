import { prisma } from "@steady/db";
import { logger } from "../lib/logger";

interface PracticeStatsResult {
  totals: {
    clinicians: number;
    programs: number;
    publishedPrograms: number;
    enrollments: number;
    activeParticipants: number;
    upcomingAppointments: number;
  };
  clinicianStats: Array<{
    clinicianId: string;
    name: string;
    role: string;
    totalPrograms: number;
    publishedPrograms: number;
    totalEnrollments: number;
    activeParticipants: number;
  }>;
}

interface PracticeParticipantRow {
  participantId: string;
  name: string;
  email: string;
  clinicianName: string;
  clinicianId: string;
  programTitle: string;
  enrollmentStatus: string;
  enrolledAt: string;
}

interface PaginatedResult {
  data: PracticeParticipantRow[];
  cursor: string | null;
}

export async function getPracticeStats(
  practiceId: string,
): Promise<PracticeStatsResult> {
  // Get all clinicians in practice
  const members = await prisma.practiceMembership.findMany({
    where: { practiceId },
    include: {
      clinician: {
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      },
    },
    take: 200,
  });

  const clinicianIds = members.map((m) => m.clinicianId);

  // Get programs per clinician
  const programs = await prisma.program.findMany({
    where: { clinicianId: { in: clinicianIds } },
    select: {
      id: true,
      clinicianId: true,
      status: true,
      _count: { select: { enrollments: true } },
    },
    take: 1000,
  });

  // Count active enrollments across practice
  const activeEnrollmentCount = await prisma.enrollment.count({
    where: {
      program: { clinicianId: { in: clinicianIds } },
      status: "ACTIVE",
    },
  });

  // Count unique active participants
  const activeParticipants = await prisma.enrollment.findMany({
    where: {
      program: { clinicianId: { in: clinicianIds } },
      status: "ACTIVE",
    },
    select: { participantId: true },
    distinct: ["participantId"],
    take: 10000,
  });

  // Count upcoming appointments (next 7 days)
  const now = new Date();
  const sevenDaysOut = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  let upcomingAppointments = 0;
  try {
    upcomingAppointments = await prisma.appointment.count({
      where: {
        practiceId,
        status: "SCHEDULED",
        startAt: { gte: now, lte: sevenDaysOut },
      },
    });
  } catch {
    // Appointments table may not exist in test environment
  }

  // Build per-clinician stats
  const clinicianStats = members.map((m) => {
    const clinPrograms = programs.filter((p) => p.clinicianId === m.clinicianId);
    const totalEnrollments = clinPrograms.reduce(
      (sum, p) => sum + p._count.enrollments,
      0,
    );

    return {
      clinicianId: m.clinicianId,
      name:
        `${m.clinician.user.firstName} ${m.clinician.user.lastName}`.trim(),
      role: m.role,
      totalPrograms: clinPrograms.length,
      publishedPrograms: clinPrograms.filter((p) => p.status === "PUBLISHED")
        .length,
      totalEnrollments,
      activeParticipants: 0, // Populated below
    };
  });

  // Count active participants per clinician
  for (const stat of clinicianStats) {
    const clinActive = await prisma.enrollment.findMany({
      where: {
        program: { clinicianId: stat.clinicianId },
        status: "ACTIVE",
      },
      select: { participantId: true },
      distinct: ["participantId"],
      take: 10000,
    });
    stat.activeParticipants = clinActive.length;
  }

  const totals = {
    clinicians: members.length,
    programs: programs.length,
    publishedPrograms: programs.filter((p) => p.status === "PUBLISHED").length,
    enrollments: activeEnrollmentCount,
    activeParticipants: activeParticipants.length,
    upcomingAppointments,
  };

  return { totals, clinicianStats };
}

export async function getPracticeParticipants(
  practiceId: string,
  query: { cursor?: string; limit?: number; search?: string },
): Promise<PaginatedResult> {
  // Get all clinician IDs in this practice
  const members = await prisma.practiceMembership.findMany({
    where: { practiceId },
    select: { clinicianId: true },
    take: 200,
  });
  const clinicianIds = members.map((m) => m.clinicianId);

  if (clinicianIds.length === 0) {
    return { data: [], cursor: null };
  }

  const take = Math.min(query.limit ?? 50, 50);

  // Build search filter
  const searchFilter = query.search
    ? {
        participant: {
          user: {
            OR: [
              {
                firstName: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
              {
                lastName: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
              {
                email: {
                  contains: query.search,
                  mode: "insensitive" as const,
                },
              },
            ],
          },
        },
      }
    : {};

  const enrollments = await prisma.enrollment.findMany({
    where: {
      program: { clinicianId: { in: clinicianIds } },
      ...searchFilter,
    },
    include: {
      participant: {
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      program: {
        include: {
          clinician: {
            include: {
              user: {
                select: { firstName: true, lastName: true },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
    take: take + 1,
    ...(query.cursor
      ? { skip: 1, cursor: { id: query.cursor } }
      : {}),
  });

  const hasMore = enrollments.length > take;
  const items = hasMore ? enrollments.slice(0, take) : enrollments;

  const data: PracticeParticipantRow[] = items.map((e) => ({
    participantId: e.participantId,
    name:
      `${e.participant.user.firstName} ${e.participant.user.lastName}`.trim(),
    email: e.participant.user.email,
    clinicianName:
      `${e.program.clinician.user.firstName} ${e.program.clinician.user.lastName}`.trim(),
    clinicianId: e.program.clinicianId,
    programTitle: e.program.title,
    enrollmentStatus: e.status,
    enrolledAt: e.enrolledAt.toISOString(),
  }));

  return {
    data,
    cursor: hasMore ? items[items.length - 1].id : null,
  };
}
