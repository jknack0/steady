import { logger } from "../lib/logger";
import { prisma } from "@steady/db";
import {
  scheduleSessionReminders,
  cancelSessionReminders,
  scheduleTaskReminder,
} from "./notifications";
import { logClinicianTime } from "./rtm";

// ── Types ────────────────────────────────────────────

interface ListClinicianSessionsFilters {
  status?: string;
  enrollmentId?: string;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
}

interface CompleteSessionData {
  clinicianNotes?: string;
  participantSummary?: string;
  moduleCompletedId?: string;
  tasksToAssign?: Array<{ title: string; description?: string; dueDate?: string }>;
}

interface UpdateSessionData {
  scheduledAt?: string;
  status?: string;
  videoCallUrl?: string;
  clinicianNotes?: string;
  participantSummary?: string;
}

// ── 1. Create Session ────────────────────────────────

export async function createSession(
  enrollmentId: string,
  scheduledAt: string,
  videoCallUrl?: string,
  durationMinutes: number = 60
) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      participant: {
        include: { user: { select: { id: true, firstName: true, lastName: true } } },
      },
      program: { select: { title: true } },
    },
  });

  if (!enrollment) {
    return null;
  }

  const startTime = new Date(scheduledAt);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60000);

  // Create session + calendar event atomically
  const [session] = await prisma.$transaction([
    prisma.session.create({
      data: {
        enrollmentId,
        scheduledAt: startTime,
        videoCallUrl: videoCallUrl || null,
        status: "SCHEDULED",
      },
    }),
    prisma.calendarEvent.create({
      data: {
        participantId: enrollment.participant.id,
        title: `Session: ${enrollment.program.title}`,
        startTime,
        endTime,
        eventType: "SESSION",
      },
    }),
  ]);

  // Auto-schedule 3 reminders (24h, 1h, 10min before)
  const participantUserId = enrollment.participant.user.id;
  scheduleSessionReminders(participantUserId, session.id, startTime).catch(
    (err) => logger.error("Failed to schedule session reminders", err)
  );

  return session;
}

// ── 2. List Clinician Sessions ───────────────────────

export async function listClinicianSessions(
  clinicianProfileId: string,
  filters: ListClinicianSessionsFilters
) {
  const { status, enrollmentId, startDate, endDate, cursor } = filters;
  const take = Math.min(filters.limit || 50, 100);

  const programs = await prisma.program.findMany({
    where: { clinicianId: clinicianProfileId },
    select: { id: true },
  });
  const programIds = programs.map((p) => p.id);

  const where: any = {
    enrollment: { programId: { in: programIds } },
  };
  if (status) where.status = status;
  if (enrollmentId) where.enrollmentId = enrollmentId;
  if (startDate || endDate) {
    where.scheduledAt = {};
    if (startDate) where.scheduledAt.gte = new Date(startDate);
    if (endDate) where.scheduledAt.lte = new Date(endDate);
  }

  const sessions = await prisma.session.findMany({
    where,
    include: {
      enrollment: {
        include: {
          participant: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
          },
          program: { select: { id: true, title: true } },
        },
      },
      moduleCompleted: { select: { id: true, title: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = sessions.length > take;
  const data = hasMore ? sessions.slice(0, take) : sessions;

  return {
    data: data.map((s) => ({
      id: s.id,
      scheduledAt: s.scheduledAt,
      status: s.status,
      videoCallUrl: s.videoCallUrl,
      clinicianNotes: s.clinicianNotes,
      participantSummary: s.participantSummary,
      participantId: s.enrollment.participant.user.id,
      participantName: `${s.enrollment.participant.user.firstName} ${s.enrollment.participant.user.lastName}`.trim(),
      participantEmail: s.enrollment.participant.user.email,
      programId: s.enrollment.program.id,
      programTitle: s.enrollment.program.title,
      enrollmentId: s.enrollmentId,
      moduleCompleted: s.moduleCompleted,
    })),
    cursor: hasMore ? data[data.length - 1].id : null,
  };
}

// ── 3. Get Upcoming Session ──────────────────────────

export async function getUpcomingSession(participantProfileId: string) {
  const enrollment = await prisma.enrollment.findFirst({
    where: { participantId: participantProfileId, status: "ACTIVE" },
    select: { id: true },
  });

  if (!enrollment) {
    return null;
  }

  const session = await prisma.session.findFirst({
    where: {
      enrollmentId: enrollment.id,
      status: "SCHEDULED",
      scheduledAt: { gte: new Date() },
    },
    include: {
      enrollment: {
        include: {
          program: { select: { title: true, clinicianId: true } },
        },
      },
    },
    orderBy: { scheduledAt: "asc" },
  });

  if (!session) {
    return null;
  }

  const clinician = await prisma.clinicianProfile.findUnique({
    where: { id: session.enrollment.program.clinicianId },
    include: { user: { select: { firstName: true, lastName: true } } },
  });

  return {
    id: session.id,
    scheduledAt: session.scheduledAt,
    videoCallUrl: session.videoCallUrl,
    programTitle: session.enrollment.program.title,
    clinicianName: clinician
      ? `${clinician.user.firstName} ${clinician.user.lastName}`.trim()
      : null,
  };
}

// ── 4. Get Session History ───────────────────────────

export async function getSessionHistory(
  participantProfileId: string,
  cursor?: string,
  limit?: number
) {
  const take = Math.min(limit || 20, 50);

  const enrollments = await prisma.enrollment.findMany({
    where: { participantId: participantProfileId },
    select: { id: true },
  });
  const enrollmentIds = enrollments.map((e) => e.id);

  if (enrollmentIds.length === 0) {
    return { data: [], cursor: null };
  }

  const sessions = await prisma.session.findMany({
    where: {
      enrollmentId: { in: enrollmentIds },
      status: { in: ["COMPLETED", "NO_SHOW"] },
    },
    include: {
      enrollment: {
        include: {
          program: { select: { title: true, clinicianId: true } },
        },
      },
      moduleCompleted: { select: { title: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: take + 1,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
  });

  const hasMore = sessions.length > take;
  const data = hasMore ? sessions.slice(0, take) : sessions;

  return {
    data: data.map((s) => ({
      id: s.id,
      scheduledAt: s.scheduledAt,
      status: s.status,
      participantSummary: s.participantSummary,
      programTitle: s.enrollment.program.title,
      moduleCompleted: s.moduleCompleted?.title || null,
    })),
    cursor: hasMore ? data[data.length - 1].id : null,
  };
}

// ── 5. Update Session ────────────────────────────────

export async function updateSession(sessionId: string, updates: UpdateSessionData) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      enrollment: {
        include: {
          participant: {
            include: { user: { select: { id: true } } },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  const data: any = {};
  if (updates.scheduledAt !== undefined) data.scheduledAt = new Date(updates.scheduledAt);
  if (updates.status !== undefined) data.status = updates.status;
  if (updates.videoCallUrl !== undefined) data.videoCallUrl = updates.videoCallUrl;
  if (updates.clinicianNotes !== undefined) data.clinicianNotes = updates.clinicianNotes;
  if (updates.participantSummary !== undefined) data.participantSummary = updates.participantSummary;

  const updated = await prisma.session.update({
    where: { id: sessionId },
    data,
  });

  if (updates.status === "CANCELLED") {
    cancelSessionReminders(session.id).catch(() => {});
  }

  if (updates.scheduledAt && updates.scheduledAt !== session.scheduledAt.toISOString()) {
    const participantUserId = session.enrollment.participant.user.id;
    await cancelSessionReminders(session.id);
    scheduleSessionReminders(participantUserId, session.id, new Date(updates.scheduledAt)).catch(() => {});
  }

  return updated;
}

// ── 6. Complete Session ──────────────────────────────

export async function completeSession(sessionId: string, data: CompleteSessionData) {
  const { clinicianNotes, participantSummary, moduleCompletedId, tasksToAssign } = data;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      enrollment: {
        include: {
          participant: {
            include: { user: { select: { id: true } } },
          },
          program: {
            include: {
              modules: { orderBy: { sortOrder: "asc" }, select: { id: true, sortOrder: true } },
            },
          },
        },
      },
    },
  });

  if (!session) {
    return { error: "not_found" as const };
  }

  if (session.status !== "SCHEDULED") {
    return { error: "conflict" as const };
  }

  const participantProfileId = session.enrollment.participant.id;
  const participantUserId = session.enrollment.participant.user.id;
  const enrollmentId = session.enrollmentId;

  // All writes in a single transaction
  const { updated, createdTasks } = await prisma.$transaction(async (tx) => {
    const updated = await tx.session.update({
      where: { id: sessionId },
      data: {
        status: "COMPLETED",
        clinicianNotes: clinicianNotes || null,
        participantSummary: participantSummary || null,
        moduleCompletedId: moduleCompletedId || null,
      },
    });

    // If a module was completed, mark it and unlock next
    if (moduleCompletedId) {
      await tx.moduleProgress.upsert({
        where: {
          enrollmentId_moduleId: { enrollmentId, moduleId: moduleCompletedId },
        },
        create: {
          enrollmentId,
          moduleId: moduleCompletedId,
          status: "COMPLETED",
          completedAt: new Date(),
        },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      const modules = session.enrollment.program.modules;
      const currentIdx = modules.findIndex((m) => m.id === moduleCompletedId);
      const nextModule = modules[currentIdx + 1];

      if (nextModule) {
        await tx.moduleProgress.upsert({
          where: {
            enrollmentId_moduleId: { enrollmentId, moduleId: nextModule.id },
          },
          create: {
            enrollmentId,
            moduleId: nextModule.id,
            status: "UNLOCKED",
            unlockedAt: new Date(),
          },
          update: {
            status: "UNLOCKED",
            unlockedAt: new Date(),
          },
        });

        await tx.enrollment.update({
          where: { id: enrollmentId },
          data: { currentModuleId: nextModule.id },
        });
      }
    }

    // Push tasks to participant
    const createdTasks: Array<{ id: string; title: string; dueDate: Date | null }> = [];
    if (Array.isArray(tasksToAssign) && tasksToAssign.length > 0) {
      for (const task of tasksToAssign) {
        if (!task.title?.trim()) continue;

        const created = await tx.task.create({
          data: {
            participantId: participantProfileId,
            title: task.title.trim(),
            description: task.description || null,
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            sourceType: "SESSION",
            sourceId: session.id,
          },
        });
        createdTasks.push(created);
      }
    }

    return { updated, createdTasks };
  });

  // Fire-and-forget side effects outside transaction
  cancelSessionReminders(session.id).catch(() => {});
  for (const task of createdTasks) {
    if (task.dueDate) {
      scheduleTaskReminder(participantUserId, task.id, task.title, task.dueDate).catch(() => {});
    }
  }

  // Auto-log interactive communication time for active RTM enrollments
  try {
    const rtmEnrollment = await prisma.rtmEnrollment.findFirst({
      where: {
        enrollmentId: session.enrollmentId,
        status: "ACTIVE",
      },
    });

    if (rtmEnrollment) {
      const activePeriod = await prisma.rtmBillingPeriod.findFirst({
        where: {
          rtmEnrollmentId: rtmEnrollment.id,
          status: { in: ["ACTIVE", "THRESHOLD_MET"] },
        },
        orderBy: { periodStart: "desc" },
      });

      if (activePeriod) {
        const now = new Date();
        const today = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;

        logClinicianTime({
          billingPeriodId: activePeriod.id,
          clinicianId: rtmEnrollment.clinicianId,
          activityType: "INTERACTIVE_COMMUNICATION",
          durationMinutes: 20,
          description: "In-session interactive communication (auto-logged)",
          activityDate: today,
          isInteractiveCommunication: true,
        }).catch((err) =>
          logger.error("Failed to auto-log RTM interactive communication time", err)
        );
      }
    }
  } catch (err) {
    logger.error("Failed to check RTM enrollment for session completion", err);
  }

  return { data: updated };
}

// ── 7. Get Session Prep Data ─────────────────────────

export async function getSessionPrepData(sessionId: string) {
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      enrollment: {
        include: {
          participant: {
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
              tasks: {
                where: { status: { not: "ARCHIVED" } },
                orderBy: { createdAt: "desc" },
                take: 10,
              },
              journalEntries: {
                where: { isSharedWithClinician: true },
                orderBy: { entryDate: "desc" },
                take: 5,
              },
            },
          },
          program: {
            include: {
              modules: {
                orderBy: { sortOrder: "asc" },
                include: {
                  parts: {
                    where: { type: "HOMEWORK" },
                    select: { id: true, title: true },
                  },
                },
              },
            },
          },
          moduleProgress: {
            include: { module: { select: { id: true, title: true, sortOrder: true } } },
          },
          partProgress: {
            where: { part: { type: "HOMEWORK" } },
            include: { part: { select: { id: true, title: true, moduleId: true } } },
          },
        },
      },
    },
  });

  if (!session) {
    return null;
  }

  // Last completed session notes
  const lastSession = await prisma.session.findFirst({
    where: {
      enrollmentId: session.enrollmentId,
      status: "COMPLETED",
      id: { not: session.id },
    },
    orderBy: { scheduledAt: "desc" },
    select: { clinicianNotes: true, scheduledAt: true, moduleCompletedId: true },
  });

  // Quick stats
  const participantId = session.enrollment.participant.id;
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  const [taskCount, completedTaskCount, journalCount] = await Promise.all([
    prisma.task.count({
      where: { participantId, createdAt: { gte: fourWeeksAgo }, status: { not: "ARCHIVED" } },
    }),
    prisma.task.count({
      where: { participantId, status: "DONE", createdAt: { gte: fourWeeksAgo } },
    }),
    prisma.journalEntry.count({
      where: { participantId, entryDate: { gte: fourWeeksAgo } },
    }),
  ]);

  // Homework status for current module
  const enrollment = session.enrollment;
  const currentModuleId = enrollment.currentModuleId;
  const completedPartIds = new Set(
    enrollment.partProgress
      .filter((pp) => pp.status === "COMPLETED")
      .map((pp) => pp.partId)
  );

  const homeworkByModule = enrollment.program.modules.map((mod) => ({
    moduleId: mod.id,
    moduleTitle: mod.title,
    homework: mod.parts.map((p) => ({
      partId: p.id,
      title: p.title,
      completed: completedPartIds.has(p.id),
    })),
  }));

  return {
    session: {
      id: session.id,
      scheduledAt: session.scheduledAt,
      status: session.status,
    },
    participant: {
      id: session.enrollment.participant.user.id,
      name: `${session.enrollment.participant.user.firstName} ${session.enrollment.participant.user.lastName}`.trim(),
    },
    program: { title: enrollment.program.title },
    currentModuleId,
    moduleProgress: enrollment.moduleProgress.map((mp) => ({
      moduleId: mp.module.id,
      title: mp.module.title,
      status: mp.status,
    })),
    homeworkByModule,
    recentTasks: enrollment.participant.tasks,
    recentJournal: enrollment.participant.journalEntries,
    lastSession: lastSession
      ? {
          notes: lastSession.clinicianNotes,
          date: lastSession.scheduledAt,
          moduleCompletedId: lastSession.moduleCompletedId,
        }
      : null,
    quickStats: {
      tasksCompleted: completedTaskCount,
      tasksTotal: taskCount,
      journalEntries: journalCount,
      taskCompletionRate: taskCount > 0 ? Math.round((completedTaskCount / taskCount) * 100) : 0,
    },
  };
}
