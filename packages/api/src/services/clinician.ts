import { prisma } from "@steady/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { logger } from "../lib/logger";

// ── Error Classes ────────────────────────────────────

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

// ── Interfaces ────────────────────────────────────────

interface ParticipantFilters {
  search?: string;
  programId?: string;
  cursor?: string;
  limit?: number;
}

interface ParticipantRow {
  participantId: string;
  participantProfileId: string;
  enrollmentId: string;
  name: string;
  email: string;
  programId: string;
  programTitle: string;
  currentModule: { id: string; title: string } | null;
  homeworkStatus: "NOT_STARTED" | "PARTIAL" | "COMPLETE";
  homeworkRate: number;
  completedHomework: number;
  totalHomework: number;
  lastActive: string | null;
  statusIndicator: "green" | "amber" | "red";
  enrollmentStatus: string;
  rtm: { engagementDays: number; clinicianMinutes: number; status: string } | null;
}

interface ParticipantListResult {
  participants: ParticipantRow[];
  programs: Array<{ id: string; title: string }>;
  cursor: string | null;
}

interface TaskData {
  title: string;
  description?: string | null;
  dueDate?: string | null;
}

interface BulkActionResult {
  participantId: string;
  success: boolean;
  error?: string;
}

// ── getClinicianParticipants ─────────────────────────

export async function getClinicianParticipants(
  clinicianProfileId: string,
  filters: ParticipantFilters
): Promise<ParticipantListResult> {
  const { search, programId, cursor, limit } = filters;
  const take = Math.min(limit || 50, 100);

  // Get all programs owned by this clinician
  const programWhere: any = { clinicianId: clinicianProfileId };
  if (programId) {
    programWhere.id = programId;
  }

  const programs = await prisma.program.findMany({
    where: programWhere,
    select: { id: true, title: true },
  });

  const programIds = programs.map((p) => p.id);
  const programMap = new Map(programs.map((p) => [p.id, p.title]));

  if (programIds.length === 0) {
    return { participants: [], programs: [], cursor: null };
  }

  // Fetch all enrollments with participant data, progress, and activity
  const enrollments = await prisma.enrollment.findMany({
    where: {
      programId: { in: programIds },
      status: { in: ["ACTIVE", "PAUSED", "INVITED"] },
    },
    include: {
      participant: {
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          tasks: {
            where: { status: { not: "ARCHIVED" } },
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { updatedAt: true },
          },
          journalEntries: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: { updatedAt: true },
          },
        },
      },
      moduleProgress: {
        include: {
          module: { select: { id: true, title: true, sortOrder: true } },
        },
      },
      partProgress: {
        include: {
          part: { select: { id: true, type: true, moduleId: true } },
        },
      },
      program: {
        include: {
          modules: {
            orderBy: { sortOrder: "asc" },
            include: {
              parts: {
                where: { type: "HOMEWORK" },
                select: { id: true },
              },
            },
          },
        },
      },
    },
    orderBy: { enrolledAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = enrollments.length > take;
  const enrollmentPage = hasMore ? enrollments.slice(0, take) : enrollments;

  // Build participant rows
  const participants: ParticipantRow[] = enrollmentPage.map((enrollment) => {
    const user = enrollment.participant.user;
    const name = `${user.firstName} ${user.lastName}`.trim();

    // Current module
    const currentModuleProgress = enrollment.moduleProgress
      .filter((mp) => mp.status === "IN_PROGRESS" || mp.status === "UNLOCKED")
      .sort((a, b) => (a.module.sortOrder ?? 0) - (b.module.sortOrder ?? 0));
    const currentModule = currentModuleProgress[0]?.module || null;

    // Homework status
    const allHomeworkPartIds = enrollment.program.modules.flatMap((m) =>
      m.parts.map((p) => p.id)
    );
    const completedHomeworkIds = new Set(
      enrollment.partProgress
        .filter(
          (pp) =>
            pp.status === "COMPLETED" && pp.part.type === "HOMEWORK"
        )
        .map((pp) => pp.partId)
    );
    const totalHomework = allHomeworkPartIds.length;
    const completedHomework = allHomeworkPartIds.filter((id) =>
      completedHomeworkIds.has(id)
    ).length;
    const homeworkRate =
      totalHomework > 0 ? completedHomework / totalHomework : 0;
    const homeworkStatus =
      totalHomework === 0
        ? "NOT_STARTED"
        : homeworkRate >= 1
          ? "COMPLETE"
          : homeworkRate > 0
            ? "PARTIAL"
            : "NOT_STARTED";

    // Last active: most recent of task update, journal update, part progress
    const activityDates: Date[] = [];
    if (enrollment.participant.tasks[0]) {
      activityDates.push(new Date(enrollment.participant.tasks[0].updatedAt));
    }
    if (enrollment.participant.journalEntries[0]) {
      activityDates.push(
        new Date(enrollment.participant.journalEntries[0].updatedAt)
      );
    }
    const latestPartProgress = enrollment.partProgress
      .filter((pp) => pp.completedAt)
      .sort(
        (a, b) =>
          new Date(b.completedAt!).getTime() -
          new Date(a.completedAt!).getTime()
      )[0];
    if (latestPartProgress?.completedAt) {
      activityDates.push(new Date(latestPartProgress.completedAt));
    }
    const lastActive =
      activityDates.length > 0
        ? new Date(Math.max(...activityDates.map((d) => d.getTime())))
        : null;

    // Status indicator
    const now = new Date();
    const daysSinceActive = lastActive
      ? (now.getTime() - lastActive.getTime()) / 86400000
      : Infinity;

    let statusIndicator: "green" | "amber" | "red";
    if (daysSinceActive >= 7) {
      statusIndicator = "red";
    } else if (daysSinceActive >= 3 || homeworkRate < 0.8) {
      statusIndicator = "amber";
    } else {
      statusIndicator = "green";
    }

    return {
      participantId: user.id,
      participantProfileId: enrollment.participant.id,
      enrollmentId: enrollment.id,
      name,
      email: user.email,
      programId: enrollment.programId,
      programTitle: programMap.get(enrollment.programId) || "",
      currentModule: currentModule
        ? { id: currentModule.id, title: currentModule.title }
        : null,
      homeworkStatus,
      homeworkRate: Math.round(homeworkRate * 100),
      completedHomework,
      totalHomework,
      lastActive: lastActive?.toISOString() || null,
      statusIndicator,
      enrollmentStatus: enrollment.status,
      rtm: null as { engagementDays: number; clinicianMinutes: number; status: string } | null,
    };
  });

  // Enrich with RTM data
  const participantUserIds = participants.map((p) => p.participantId);
  if (participantUserIds.length > 0) {
    const rtmEnrollments = await prisma.rtmEnrollment.findMany({
      where: {
        clinicianId: clinicianProfileId,
        clientId: { in: participantUserIds },
        status: { in: ["ACTIVE", "PENDING_CONSENT"] },
      },
      include: {
        billingPeriods: {
          orderBy: { periodStart: "desc" },
          take: 3,
        },
      },
    });

    for (const rtm of rtmEnrollments) {
      const participant = participants.find((p) => p.participantId === rtm.clientId);
      if (!participant) continue;
      const activePeriod = rtm.billingPeriods.find(
        (bp) => bp.status === "ACTIVE" || bp.status === "THRESHOLD_MET"
      ) || rtm.billingPeriods[0];
      if (activePeriod) {
        participant.rtm = {
          engagementDays: activePeriod.engagementDays,
          clinicianMinutes: activePeriod.clinicianMinutes,
          status: activePeriod.engagementDays >= 16 ? "billable" : activePeriod.engagementDays >= 12 ? "approaching" : "tracking",
        };
      }
    }
  }

  // Include clients from ClinicianClient who don't have program enrollments
  const existingUserIds = new Set(participants.map((p) => p.participantId));
  const clinicianClients = await prisma.clinicianClient.findMany({
    where: {
      clinicianId: clinicianProfileId,
      status: { not: "DISCHARGED" },
      clientId: { notIn: [...existingUserIds] },
    },
    include: {
      client: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          participantProfile: { select: { id: true } },
        },
      },
    },
    take: 200,
  });

  for (const cc of clinicianClients) {
    const name = `${cc.client.firstName} ${cc.client.lastName}`.trim();
    participants.push({
      participantId: cc.client.id,
      participantProfileId: cc.client.participantProfile?.id || "",
      enrollmentId: "",
      name,
      email: cc.client.email,
      programId: "",
      programTitle: "",
      currentModule: null,
      homeworkStatus: "NOT_STARTED",
      homeworkRate: 0,
      completedHomework: 0,
      totalHomework: 0,
      lastActive: null,
      statusIndicator: "amber",
      enrollmentStatus: cc.status,
      rtm: null,
    });
  }

  // Enrich non-enrolled clients with RTM data
  if (clinicianClients.length > 0) {
    const newClientIds = clinicianClients.map((cc) => cc.clientId);
    const rtmEnrollments = await prisma.rtmEnrollment.findMany({
      where: {
        clinicianId: clinicianProfileId,
        clientId: { in: newClientIds },
        status: { in: ["ACTIVE", "PENDING_CONSENT"] },
      },
      include: {
        billingPeriods: {
          orderBy: { periodStart: "desc" },
          take: 3,
        },
      },
    });

    for (const rtm of rtmEnrollments) {
      const participant = participants.find((p) => p.participantId === rtm.clientId);
      if (!participant) continue;
      const activePeriod = rtm.billingPeriods.find(
        (bp) => bp.status === "ACTIVE" || bp.status === "THRESHOLD_MET"
      ) || rtm.billingPeriods[0];
      if (activePeriod) {
        participant.rtm = {
          engagementDays: activePeriod.engagementDays,
          clinicianMinutes: activePeriod.clinicianMinutes,
          status: activePeriod.engagementDays >= 16 ? "billable" : activePeriod.engagementDays >= 12 ? "approaching" : "tracking",
        };
      }
    }
  }

  // Apply search filter
  let filtered = participants;
  if (search) {
    const q = search.toLowerCase();
    filtered = participants.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q)
    );
  }

  return {
    participants: filtered,
    programs: programs.map((p) => ({ id: p.id, title: p.title })),
    cursor: hasMore ? enrollmentPage[enrollmentPage.length - 1].id : null,
  };
}

// ── getParticipantDetail ─────────────────────────────

export async function getParticipantDetail(
  clinicianProfileId: string,
  participantId: string
) {
  // Look up participant by user ID or profile ID
  let participantProfile = await prisma.participantProfile.findUnique({
    where: { userId: participantId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!participantProfile) {
    participantProfile = await prisma.participantProfile.findUnique({
      where: { id: participantId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  if (!participantProfile) {
    return null;
  }

  // Get enrollments in this clinician's programs only
  const clinicianPrograms = await prisma.program.findMany({
    where: { clinicianId: clinicianProfileId },
    select: { id: true },
  });
  const clinicianProgramIds = clinicianPrograms.map((p) => p.id);

  const enrollments = await prisma.enrollment.findMany({
    where: {
      participantId: participantProfile.id,
      programId: { in: clinicianProgramIds },
    },
    include: {
      program: {
        select: {
          id: true,
          title: true,
          description: true,
          cadence: true,
        },
      },
      moduleProgress: {
        include: {
          module: {
            select: {
              id: true,
              title: true,
              sortOrder: true,
              estimatedMinutes: true,
            },
          },
        },
        orderBy: { module: { sortOrder: "asc" } },
      },
      partProgress: {
        include: {
          part: {
            select: {
              id: true,
              type: true,
              title: true,
              moduleId: true,
              content: true,
            },
          },
        },
      },
      sessions: {
        orderBy: { scheduledAt: "desc" },
        take: 20,
      },
    },
  });

  if (enrollments.length === 0) {
    return { notFound: "No enrollments found for this participant in your programs" as const };
  }

  // Recent shared journal entries
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      participantId: participantProfile.id,
      isSharedWithClinician: true,
    },
    orderBy: { entryDate: "desc" },
    take: 10,
  });

  // SMART goals: find parts of type SMART_GOALS with responses
  const smartGoalResponses = enrollments.flatMap((e) =>
    e.partProgress
      .filter(
        (pp) =>
          pp.part.type === "SMART_GOALS" &&
          pp.responseData &&
          pp.status === "COMPLETED"
      )
      .map((pp) => ({
        partTitle: pp.part.title,
        goals: pp.responseData,
        completedAt: pp.completedAt,
      }))
  );

  // Tasks pushed by clinician
  const clinicianTasks = await prisma.task.findMany({
    where: {
      participantId: participantProfile.id,
      sourceType: "CLINICIAN_PUSH",
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  // Build enrollment details
  const enrollmentDetails = enrollments.map((e) => {
    const currentModuleId = e.currentModuleId;
    const homeworkProgress = e.partProgress
      .filter((pp) => pp.part.type === "HOMEWORK")
      .map((pp) => ({
        partId: pp.part.id,
        partTitle: pp.part.title,
        moduleId: pp.part.moduleId,
        status: pp.status,
        completedAt: pp.completedAt,
      }));

    return {
      id: e.id,
      status: e.status,
      enrolledAt: e.enrolledAt,
      completedAt: e.completedAt,
      currentModuleId,
      program: e.program,
      moduleProgress: e.moduleProgress.map((mp) => ({
        moduleId: mp.module.id,
        moduleTitle: mp.module.title,
        sortOrder: mp.module.sortOrder,
        estimatedMinutes: mp.module.estimatedMinutes,
        status: mp.status,
        unlockedAt: mp.unlockedAt,
        completedAt: mp.completedAt,
      })),
      homeworkProgress,
      sessions: e.sessions.map((s) => ({
        id: s.id,
        scheduledAt: s.scheduledAt,
        status: s.status,
        clinicianNotes: s.clinicianNotes,
        participantSummary: s.participantSummary,
      })),
    };
  });

  return {
    participant: participantProfile.user,
    participantProfileId: participantProfile.id,
    enrollments: enrollmentDetails,
    journalEntries,
    smartGoals: smartGoalResponses,
    clinicianTasks,
  };
}

// ── pushTaskToParticipant ────────────────────────────

export async function pushTaskToParticipant(
  participantIdOrUserId: string,
  taskData: TaskData
) {
  // Resolve participant profile
  let profileId = participantIdOrUserId;
  const profileByUser = await prisma.participantProfile.findUnique({
    where: { userId: participantIdOrUserId },
  });
  if (profileByUser) profileId = profileByUser.id;

  const task = await prisma.task.create({
    data: {
      participantId: profileId,
      title: taskData.title.trim(),
      description: taskData.description || null,
      dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
      sourceType: "CLINICIAN_PUSH",
    },
  });

  return task;
}

// ── unlockModuleForParticipant ───────────────────────

export async function unlockModuleForParticipant(
  enrollmentId: string,
  moduleId: string
) {
  return prisma.$transaction(async (tx) => {
    const progress = await tx.moduleProgress.upsert({
      where: {
        enrollmentId_moduleId: { enrollmentId, moduleId },
      },
      create: {
        enrollmentId,
        moduleId,
        status: "UNLOCKED",
        unlockedAt: new Date(),
        customUnlock: true,
      },
      update: {
        status: "UNLOCKED",
        unlockedAt: new Date(),
        customUnlock: true,
      },
    });

    await tx.enrollment.update({
      where: { id: enrollmentId },
      data: { currentModuleId: moduleId },
    });

    return progress;
  });
}

// ── manageEnrollment ─────────────────────────────────

export async function manageEnrollment(
  enrollmentId: string,
  action: "pause" | "resume" | "drop" | "reset-progress"
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
  });

  if (!enrollment) {
    return null;
  }

  if (action === "pause") {
    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: "PAUSED" },
    });
  }

  if (action === "resume") {
    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: "ACTIVE" },
    });
  }

  if (action === "drop") {
    return prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { status: "DROPPED" },
    });
  }

  if (action === "reset-progress") {
    return prisma.$transaction(async (tx) => {
      // Delete all progress
      await tx.partProgress.deleteMany({ where: { enrollmentId } });
      await tx.moduleProgress.deleteMany({ where: { enrollmentId } });

      // Re-initialize first module
      const program = await tx.program.findUnique({
        where: { id: enrollment.programId },
        include: {
          modules: { orderBy: { sortOrder: "asc" }, select: { id: true } },
        },
      });

      const firstModuleId = program?.modules[0]?.id || null;

      if (firstModuleId) {
        await tx.moduleProgress.create({
          data: {
            enrollmentId,
            moduleId: firstModuleId,
            status: "UNLOCKED",
            unlockedAt: new Date(),
          },
        });
      }

      return tx.enrollment.update({
        where: { id: enrollmentId },
        data: {
          currentModuleId: firstModuleId,
          status: "ACTIVE",
          completedAt: null,
        },
      });
    });
  }

  // Invalid action — should not reach here with typed param, but handle gracefully
  throw new Error("Invalid action. Use: pause, resume, drop, reset-progress");
}

// ── bulkAction ───────────────────────────────────────

export async function bulkAction(
  clinicianProfileId: string,
  action: string,
  participantIds: string[],
  actionData?: Record<string, any>
): Promise<{ succeeded: number; failed: number; results: BulkActionResult[] }> {
  const results: BulkActionResult[] = [];

  for (const pid of participantIds) {
    try {
      // Resolve participant profile
      let profileId = pid;
      const profileByUser = await prisma.participantProfile.findUnique({
        where: { userId: pid },
      });
      if (profileByUser) profileId = profileByUser.id;

      if (action === "push-task") {
        const title = actionData?.title;
        if (!title?.trim()) {
          results.push({ participantId: pid, success: false, error: "Title required" });
          continue;
        }
        await prisma.task.create({
          data: {
            participantId: profileId,
            title: title.trim(),
            description: actionData?.description || null,
            sourceType: "CLINICIAN_PUSH",
          },
        });
        results.push({ participantId: pid, success: true });

      } else if (action === "unlock-next-module") {
        // Find active enrollment and next locked module
        const enrollment = await prisma.enrollment.findFirst({
          where: { participantId: profileId, status: "ACTIVE" },
          include: {
            moduleProgress: {
              include: { module: { select: { id: true, sortOrder: true } } },
            },
            program: {
              include: {
                modules: { orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true } },
              },
            },
          },
        });

        if (!enrollment) {
          results.push({ participantId: pid, success: false, error: "No active enrollment" });
          continue;
        }

        const progressMap = new Map(
          enrollment.moduleProgress.map((mp) => [mp.module.id, mp.status])
        );
        const nextLocked = enrollment.program.modules.find(
          (m) => !progressMap.has(m.id) || progressMap.get(m.id) === "LOCKED"
        );

        if (!nextLocked) {
          results.push({ participantId: pid, success: false, error: "No locked modules" });
          continue;
        }

        await prisma.moduleProgress.upsert({
          where: {
            enrollmentId_moduleId: { enrollmentId: enrollment.id, moduleId: nextLocked.id },
          },
          create: {
            enrollmentId: enrollment.id,
            moduleId: nextLocked.id,
            status: "UNLOCKED",
            unlockedAt: new Date(),
            customUnlock: true,
          },
          update: {
            status: "UNLOCKED",
            unlockedAt: new Date(),
            customUnlock: true,
          },
        });

        await prisma.enrollment.update({
          where: { id: enrollment.id },
          data: { currentModuleId: nextLocked.id },
        });

        results.push({ participantId: pid, success: true });

      } else if (action === "send-nudge") {
        // Create a gentle nudge task
        await prisma.task.create({
          data: {
            participantId: profileId,
            title: actionData?.message || "Your clinician sent you a nudge — check in when you can!",
            sourceType: "CLINICIAN_PUSH",
          },
        });
        results.push({ participantId: pid, success: true });

      } else {
        results.push({ participantId: pid, success: false, error: "Unknown action" });
      }
    } catch (err) {
      results.push({ participantId: pid, success: false, error: "Failed" });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return { succeeded, failed, results };
}

// ── addClient ─────────────────────────────────────────

interface AddClientData {
  email: string;
  firstName: string;
  lastName: string;
}

interface AddClientResult {
  clinicianClient: {
    id: string;
    clinicianId: string;
    clientId: string;
    status: string;
    invitedAt: Date;
    client: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
  isNewUser: boolean;
}

export async function addClient(
  clinicianProfileId: string,
  data: AddClientData
): Promise<AddClientResult> {
  const { email, firstName, lastName } = data;

  // 1. Check if user exists with this email
  let user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { participantProfile: true },
  });

  let isNewUser = false;

  if (user && user.role === "CLINICIAN") {
    throw new ConflictError("Cannot add a clinician as a client");
  }

  if (!user) {
    // Create a placeholder participant account
    const tempPassword = await bcrypt.hash(crypto.randomUUID(), 10);
    user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash: tempPassword,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: "PARTICIPANT",
        participantProfile: { create: {} },
      },
      include: { participantProfile: true },
    });
    isNewUser = true;
  }

  // 2. Check for existing ClinicianClient relationship
  const existing = await prisma.clinicianClient.findFirst({
    where: {
      clinicianId: clinicianProfileId,
      clientId: user.id,
    },
  });

  if (existing && existing.status !== "DISCHARGED") {
    throw new ConflictError("This client is already in your client list");
  }

  // 3. Create or update ClinicianClient record
  const clinicianClient = await prisma.clinicianClient.upsert({
    where: {
      clinicianId_clientId: {
        clinicianId: clinicianProfileId,
        clientId: user.id,
      },
    },
    create: {
      clinicianId: clinicianProfileId,
      clientId: user.id,
      status: "INVITED",
    },
    update: {
      status: "INVITED",
      invitedAt: new Date(),
      acceptedAt: null,
      dischargedAt: null,
    },
    include: {
      client: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
    },
  });

  // 4. Auto-create ClientConfig with defaults from ClinicianConfig
  const clinicianConfig = await prisma.clinicianConfig.findUnique({
    where: { clinicianId: clinicianProfileId },
  });

  if (clinicianConfig) {
    await prisma.clientConfig.upsert({
      where: {
        clientId_clinicianId: {
          clientId: user.id,
          clinicianId: clinicianProfileId,
        },
      },
      create: {
        clientId: user.id,
        clinicianId: clinicianProfileId,
        enabledModules: clinicianConfig.enabledModules ?? undefined,
        activeTrackers: undefined,
        activeAssessments: clinicianConfig.defaultAssessments ?? undefined,
      },
      update: {},
    });
  }

  return {
    clinicianClient: {
      id: clinicianClient.id,
      clinicianId: clinicianClient.clinicianId,
      clientId: clinicianClient.clientId,
      status: clinicianClient.status,
      invitedAt: clinicianClient.invitedAt,
      client: clinicianClient.client,
    },
    isNewUser,
  };
}

// ── getClinicianClients ───────────────────────────────

interface ClientRow {
  id: string;
  clientId: string;
  name: string;
  email: string;
  status: string;
  invitedAt: string;
  acceptedAt: string | null;
  hasEnrollment: boolean;
  rtm: { engagementDays: number; clinicianMinutes: number; status: string } | null;
}

export async function getClinicianClients(
  clinicianProfileId: string
): Promise<ClientRow[]> {
  // Get all ClinicianClient records for this clinician
  const clinicianClients = await prisma.clinicianClient.findMany({
    where: {
      clinicianId: clinicianProfileId,
      status: { not: "DISCHARGED" },
    },
    include: {
      client: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          participantProfile: { select: { id: true } },
        },
      },
    },
    orderBy: { invitedAt: "desc" },
    take: 200,
  });

  if (clinicianClients.length === 0) {
    return [];
  }

  // Get clinician's program IDs
  const programs = await prisma.program.findMany({
    where: { clinicianId: clinicianProfileId },
    select: { id: true },
  });
  const programIds = programs.map((p) => p.id);

  // Get participant profile IDs for enrolled check
  const participantProfileIds = clinicianClients
    .map((cc) => cc.client.participantProfile?.id)
    .filter((id): id is string => !!id);

  // Check for active enrollments
  const activeEnrollments = programIds.length > 0 && participantProfileIds.length > 0
    ? await prisma.enrollment.findMany({
        where: {
          participantId: { in: participantProfileIds },
          programId: { in: programIds },
          status: { in: ["ACTIVE", "INVITED"] },
        },
        select: { participantId: true },
      })
    : [];

  const enrolledProfileIds = new Set(activeEnrollments.map((e) => e.participantId));

  // Get RTM data
  const clientUserIds = clinicianClients.map((cc) => cc.clientId);
  const rtmEnrollments = await prisma.rtmEnrollment.findMany({
    where: {
      clinicianId: clinicianProfileId,
      clientId: { in: clientUserIds },
      status: { in: ["ACTIVE", "PENDING_CONSENT"] },
    },
    include: {
      billingPeriods: {
        orderBy: { periodStart: "desc" },
        take: 3,
      },
    },
  });

  const rtmMap = new Map<string, { engagementDays: number; clinicianMinutes: number; status: string }>();
  for (const rtm of rtmEnrollments) {
    const activePeriod = rtm.billingPeriods.find(
      (bp) => bp.status === "ACTIVE" || bp.status === "THRESHOLD_MET"
    ) || rtm.billingPeriods[0];
    if (activePeriod) {
      rtmMap.set(rtm.clientId, {
        engagementDays: activePeriod.engagementDays,
        clinicianMinutes: activePeriod.clinicianMinutes,
        status: activePeriod.engagementDays >= 16 ? "billable" : activePeriod.engagementDays >= 12 ? "approaching" : "tracking",
      });
    }
  }

  // Build client rows
  return clinicianClients.map((cc) => {
    const name = `${cc.client.firstName} ${cc.client.lastName}`.trim();
    const participantProfileId = cc.client.participantProfile?.id;
    const hasEnrollment = participantProfileId ? enrolledProfileIds.has(participantProfileId) : false;

    return {
      id: cc.id,
      clientId: cc.clientId,
      name,
      email: cc.client.email,
      status: cc.status,
      invitedAt: cc.invitedAt.toISOString(),
      acceptedAt: cc.acceptedAt?.toISOString() ?? null,
      hasEnrollment,
      rtm: rtmMap.get(cc.clientId) ?? null,
    };
  });
}
