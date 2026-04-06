import { prisma } from "@steady/db";
import type { ServiceCtx } from "../lib/practice-context";
import { getReviewForAppointment } from "./session-reviews";

export async function getSessionPrep(
  ctx: ServiceCtx,
  appointmentId: string,
): Promise<any | { error: "not_found" }> {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, practiceId: ctx.practiceId },
    include: {
      participant: { include: { user: true } },
      serviceCode: true,
      location: true,
    },
  });
  if (!appointment) return { error: "not_found" as const };
  if (!ctx.isAccountOwner && appointment.clinicianId !== ctx.clinicianProfileId) {
    return { error: "not_found" as const };
  }

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      participantId: appointment.participantId,
      program: { clinicianId: appointment.clinicianId },
      status: { in: ["ACTIVE", "PAUSED"] },
    },
    include: {
      program: { select: { id: true, title: true } },
    },
  });

  const [review, homeworkStatus, quickStats, lastSessionData] = await Promise.all([
    getReviewForAppointment(appointmentId),
    enrollment ? getHomeworkStatus(enrollment.id) : [],
    getQuickStats(appointment.participantId, appointment.clinicianId),
    getLastSessionNotes(appointment.clinicianId, appointment.participantId),
  ]);

  return {
    appointment: {
      id: appointment.id,
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      appointmentType: appointment.appointmentType,
      internalNote: appointment.internalNote,
      participantName: appointment.participant?.user
        ? `${appointment.participant.user.firstName ?? ""} ${appointment.participant.user.lastName ?? ""}`.trim()
        : null,
    },
    enrollment: enrollment
      ? { id: enrollment.id, programTitle: enrollment.program.title }
      : null,
    review,
    homeworkStatus,
    quickStats,
    lastSessionNotes: lastSessionData,
  };
}

async function getHomeworkStatus(enrollmentId: string) {
  const modules = await prisma.moduleProgress.findMany({
    where: { enrollmentId },
    include: {
      module: {
        include: {
          parts: {
            where: { type: "HOMEWORK", deletedAt: null },
            select: { id: true, title: true },
            take: 200,
          },
        },
      },
    },
    take: 200,
  });

  const partIds = modules.flatMap((m) => m.module.parts.map((p) => p.id));
  const progressRows = partIds.length > 0
    ? await prisma.partProgress.findMany({
        where: { enrollmentId, partId: { in: partIds } },
        select: { partId: true, status: true },
      })
    : [];
  const progressMap = new Map(progressRows.map((p) => [p.partId, p.status]));

  return modules.map((m) => ({
    moduleId: m.moduleId,
    moduleTitle: m.module.title,
    items: m.module.parts.map((p) => ({
      partId: p.id,
      title: p.title,
      completed: progressMap.get(p.id) === "COMPLETED",
    })),
  }));
}

async function getQuickStats(participantId: string, clinicianId: string) {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [tasksTotal, tasksCompleted, journalEntries] = await Promise.all([
    prisma.task.count({
      where: {
        participantId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.task.count({
      where: {
        participantId,
        status: "DONE",
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.journalEntry.count({
      where: {
        participantId,
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
  ]);

  return {
    tasksCompleted,
    tasksTotal,
    journalEntries,
    taskCompletionRate: tasksTotal > 0 ? Math.round((tasksCompleted / tasksTotal) * 100) : 0,
  };
}

async function getLastSessionNotes(clinicianId: string, participantId: string) {
  const participant = await prisma.participantProfile.findUnique({
    where: { id: participantId },
    select: { userId: true },
  });
  if (!participant) return null;

  const lastSession = await prisma.session.findFirst({
    where: {
      enrollment: {
        participantId,
        program: { clinicianId },
      },
      status: "COMPLETED",
    },
    orderBy: { scheduledAt: "desc" },
    select: {
      clinicianNotes: true,
      scheduledAt: true,
      moduleCompletedId: true,
    },
  });

  if (!lastSession) return null;
  return {
    notes: lastSession.clinicianNotes,
    date: lastSession.scheduledAt,
    moduleCompletedId: lastSession.moduleCompletedId,
  };
}
