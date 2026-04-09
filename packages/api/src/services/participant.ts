import { logger } from "../lib/logger";
import { prisma } from "@steady/db";
import { cancelHomeworkReminders } from "./notifications";
import {
  generateInstancesForEnrollment,
  getStreakData,
} from "./homework-instances";
import {
  CompleteHomeworkInstanceSchema,
  SaveHomeworkResponseSchema,
  resolveHomeworkItemLabel,
} from "@steady/shared";
import type { HomeworkItemType } from "@steady/shared";
import { logRtmEngagement } from "./rtm";
import { validateEmotionIds, VALID_EMOTION_IDS } from "@steady/shared";
import { NotFoundError, ConflictError } from "../lib/errors";

export { NotFoundError, ConflictError };

export class ValidationError extends Error {
  details?: Array<{ path: string; message: string }>;
  constructor(message: string, details?: Array<{ path: string; message: string }>) {
    super(message);
    this.name = "ValidationError";
    this.details = details;
  }
}

// ── 1. Accept Enrollment ─────────────────────────────

export async function acceptEnrollment(
  enrollmentId: string,
  participantProfileId: string
) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      participantId: participantProfileId,
      status: "INVITED",
    },
    include: {
      program: {
        include: {
          modules: {
            orderBy: { sortOrder: "asc" },
            select: { id: true },
          },
        },
      },
    },
  });

  if (!enrollment) {
    throw new NotFoundError("Invitation not found");
  }

  const firstModule = enrollment.program.modules[0];

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.enrollment.update({
      where: { id: enrollmentId },
      data: {
        status: "ACTIVE",
        currentModuleId: firstModule?.id || null,
      },
    });

    if (enrollment.program.modules.length > 0) {
      const progressData = enrollment.program.modules.map((mod, index) => ({
        enrollmentId: enrollment.id,
        moduleId: mod.id,
        status: index === 0 ? ("UNLOCKED" as const) : ("LOCKED" as const),
        ...(index === 0 ? { unlockedAt: new Date() } : {}),
      }));

      await tx.moduleProgress.createMany({
        data: progressData,
        skipDuplicates: true,
      });
    }

    return result;
  });

  // Generate homework instances for any recurring homework parts (fire-and-forget)
  generateInstancesForEnrollment(enrollment.id).catch((err) => {
    logger.error("Failed to generate homework instances on accept", err);
  });

  return updated;
}

// ── 2. Get Program With Progress ─────────────────────

export async function getProgramWithProgress(
  enrollmentId: string,
  participantProfileId: string
) {
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      participantId: participantProfileId,
      status: "ACTIVE",
    },
    include: {
      program: {
        include: {
          modules: {
            orderBy: { sortOrder: "asc" },
            include: {
              parts: {
                where: { deletedAt: null },
                orderBy: { sortOrder: "asc" },
                select: {
                  id: true,
                  type: true,
                  title: true,
                  isRequired: true,
                  content: true,
                  sortOrder: true,
                },
              },
            },
          },
        },
      },
      moduleProgress: true,
      partProgress: true,
    },
  });

  if (!enrollment) {
    throw new NotFoundError("Enrollment not found");
  }

  // Build progress maps
  const moduleProgressMap = new Map(
    enrollment.moduleProgress.map((mp) => [mp.moduleId, mp])
  );
  const partProgressMap = new Map(
    enrollment.partProgress.map((pp) => [pp.partId, pp])
  );

  // Assemble response with progress
  const modules = enrollment.program.modules.map((mod) => {
    const mp = moduleProgressMap.get(mod.id);
    return {
      id: mod.id,
      title: mod.title,
      sortOrder: mod.sortOrder,
      status: mp?.status || "LOCKED",
      unlockedAt: mp?.unlockedAt,
      completedAt: mp?.completedAt,
      parts: mod.parts.map((part) => {
        const pp = partProgressMap.get(part.id);
        return {
          ...part,
          progressStatus: pp?.status || "NOT_STARTED",
          completedAt: pp?.completedAt,
          responseData: pp?.responseData,
        };
      }),
    };
  });

  return {
    enrollmentId: enrollment.id,
    status: enrollment.status,
    currentModuleId: enrollment.currentModuleId,
    program: {
      id: enrollment.program.id,
      title: enrollment.program.title,
      description: enrollment.program.description,
      cadence: enrollment.program.cadence,
    },
    modules,
  };
}

// ── 3. Mark Part Complete ────────────────────────────

export async function markPartComplete(
  enrollmentId: string,
  partId: string,
  participantProfileId: string,
  responseData?: unknown
) {
  // Verify enrollment belongs to participant
  const enrollment = await prisma.enrollment.findFirst({
    where: {
      id: enrollmentId,
      participantId: participantProfileId,
      status: "ACTIVE",
    },
  });

  if (!enrollment) {
    throw new NotFoundError("Enrollment not found");
  }

  // Verify part exists
  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: { module: true },
  });

  if (!part) {
    throw new NotFoundError("Part not found");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Upsert part progress
    const progress = await tx.partProgress.upsert({
      where: {
        enrollmentId_partId: {
          enrollmentId,
          partId,
        },
      },
      create: {
        enrollmentId,
        partId,
        status: "COMPLETED",
        completedAt: new Date(),
        responseData: (responseData ?? undefined) as any,
      },
      update: {
        status: "COMPLETED",
        completedAt: new Date(),
        responseData: (responseData ?? undefined) as any,
      },
    });

    // Check if all required parts in the module are completed
    const moduleParts = await tx.part.findMany({
      where: { moduleId: part.moduleId, isRequired: true },
      select: { id: true },
    });

    const completedParts = await tx.partProgress.findMany({
      where: {
        enrollmentId,
        partId: { in: moduleParts.map((p) => p.id) },
        status: "COMPLETED",
      },
    });

    const moduleCompleted = completedParts.length >= moduleParts.length;

    if (moduleCompleted) {
      await tx.moduleProgress.update({
        where: {
          enrollmentId_moduleId: {
            enrollmentId,
            moduleId: part.moduleId,
          },
        },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      });

      const nextModule = await tx.module.findFirst({
        where: {
          programId: part.module.programId,
          sortOrder: part.module.sortOrder + 1,
        },
      });

      if (nextModule) {
        await tx.moduleProgress.upsert({
          where: {
            enrollmentId_moduleId: {
              enrollmentId,
              moduleId: nextModule.id,
            },
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

    return { progress, moduleCompleted };
  });

  // Cancel homework reminders outside transaction (fire-and-forget, non-critical)
  if (part.type === "HOMEWORK") {
    cancelHomeworkReminders(enrollmentId, partId).catch(() => {});
  }

  return result;
}

// ── 4. Get Homework Instances ────────────────────────

export async function getHomeworkInstances(
  participantProfileId: string,
  filters: { date?: string; enrollmentId?: string }
) {
  const targetDate = filters.date ? new Date(filters.date) : new Date();
  targetDate.setUTCHours(0, 0, 0, 0);

  const enrollmentFilter: Record<string, unknown> = {
    participantId: participantProfileId,
    status: "ACTIVE",
  };
  if (filters.enrollmentId) {
    enrollmentFilter.id = filters.enrollmentId;
  }

  const enrollments = await prisma.enrollment.findMany({
    where: enrollmentFilter,
    select: { id: true },
  });

  const enrollmentIds = enrollments.map((e) => e.id);

  const instances = await prisma.homeworkInstance.findMany({
    where: {
      OR: [
        { enrollmentId: { in: enrollmentIds }, dueDate: targetDate },
        { participantId: participantProfileId, dueDate: targetDate },
      ],
      deletedAt: null,
    },
    include: {
      part: {
        select: {
          id: true,
          title: true,
          content: true,
          type: true,
          module: {
            select: {
              program: {
                select: { clinicianId: true },
              },
            },
          },
        },
      },
      enrollment: {
        select: {
          id: true,
          programId: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Resolve display labels for homework items
  // Collect unique clinician IDs to batch-fetch configs
  const clinicianIds = [
    ...new Set(instances.map((i) => i.part?.module?.program?.clinicianId).filter(Boolean)),
  ] as string[];

  const clinicianConfigs = clinicianIds.length > 0
    ? await prisma.clinicianConfig.findMany({
        where: { clinicianId: { in: clinicianIds } },
        select: { clinicianId: true, homeworkLabels: true },
      })
    : [];

  const configByClinicianId = new Map(
    clinicianConfigs.map((c) => [c.clinicianId, c.homeworkLabels as Record<string, string> | null])
  );

  const enrichedInstances = instances.map((instance) => {
    const content = instance.part?.content as any;
    const clinicianId = (instance.part as any)?.module?.program?.clinicianId;
    const clinicianDefaults = clinicianId
      ? (configByClinicianId.get(clinicianId) ?? undefined) as Partial<Record<HomeworkItemType, string>> | undefined
      : undefined;

    // Build displayLabels map: index -> resolved label
    const displayLabels: Record<string, string> = {};
    if (content?.items && Array.isArray(content.items)) {
      content.items.forEach((item: any, index: number) => {
        if (item.type) {
          const key = String(item.sortOrder ?? index);
          displayLabels[key] = resolveHomeworkItemLabel(
            item.type as HomeworkItemType,
            item.customLabel,
            clinicianDefaults
          );
        }
      });
    }

    // Strip the nested module.program to keep response shape clean
    const { module: _module, ...partWithoutModule } = (instance.part || {}) as any;

    return {
      ...instance,
      part: partWithoutModule,
      displayLabels,
    };
  });

  return enrichedInstances;
}

// ── 5a. Save Homework Response (Auto-save) ──────────

export async function saveHomeworkResponse(
  instanceId: string,
  participantProfileId: string,
  body: unknown
) {
  const instance = await prisma.homeworkInstance.findUnique({
    where: { id: instanceId },
    include: {
      enrollment: {
        select: { participantId: true },
      },
    },
  });

  if (!instance) throw new NotFoundError("Instance not found");
  const ownerMatch = instance.participantId === participantProfileId ||
    instance.enrollment?.participantId === participantProfileId;
  if (!ownerMatch) throw new NotFoundError("Instance not found");

  if (instance.status !== "PENDING") {
    throw new ConflictError("Can only save responses for pending instances");
  }

  const parsed = SaveHomeworkResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new ValidationError("Invalid response data", parsed.error.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    })));
  }

  // Deep-merge at the item-key level: incoming responses overwrite per-key
  const existing = (instance.response as Record<string, unknown>) || {};
  const merged = { ...existing, ...parsed.data.responses };

  const updated = await prisma.homeworkInstance.update({
    where: { id: instanceId },
    data: { response: merged as any },
  });

  return updated;
}

// ── 5b. Complete Homework Instance ────────────────────

export async function completeHomeworkInstance(
  instanceId: string,
  participantProfileId: string,
  body: unknown
) {
  const instance = await prisma.homeworkInstance.findUnique({
    where: { id: instanceId },
    include: {
      enrollment: {
        select: { participantId: true },
      },
    },
  });

  if (!instance) throw new NotFoundError("Instance not found");
  const ownerMatch2 = instance.participantId === participantProfileId ||
    instance.enrollment?.participantId === participantProfileId;
  if (!ownerMatch2) throw new NotFoundError("Instance not found");

  if (instance.status === "COMPLETED") {
    throw new ConflictError("Instance already completed");
  }

  // Allow completion of past instances up to 48h back
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 2);
  cutoff.setUTCHours(0, 0, 0, 0);

  if (instance.dueDate < cutoff) {
    throw new ValidationError("Cannot complete instances older than 48 hours");
  }

  const parsed = CompleteHomeworkInstanceSchema.safeParse(body);
  const response = parsed.success ? parsed.data.response : null;

  const updated = await prisma.homeworkInstance.update({
    where: { id: instanceId },
    data: {
      status: "COMPLETED",
      completedAt: new Date(),
      response: response ?? undefined,
    },
  });

  return updated;
}

// ── 6. Skip Homework Instance ────────────────────────

export async function skipHomeworkInstance(
  instanceId: string,
  participantProfileId: string
) {
  const instance = await prisma.homeworkInstance.findUnique({
    where: { id: instanceId },
    include: {
      enrollment: {
        select: { participantId: true },
      },
    },
  });

  if (!instance) throw new NotFoundError("Instance not found");
  const ownerMatch3 = instance.participantId === participantProfileId ||
    instance.enrollment?.participantId === participantProfileId;
  if (!ownerMatch3) throw new NotFoundError("Instance not found");

  if (instance.status !== "PENDING") {
    throw new ConflictError("Can only skip pending instances");
  }

  const updated = await prisma.homeworkInstance.update({
    where: { id: instanceId },
    data: { status: "SKIPPED" },
  });

  return updated;
}

// ── 7. Get Assigned Trackers ─────────────────────────

export async function getAssignedTrackers(
  participantProfileId: string,
  userId: string
) {
  const enrollments = await prisma.enrollment.findMany({
    where: { participantId: participantProfileId, status: "ACTIVE" },
    select: { id: true, programId: true },
  });

  const programIds = enrollments.map((e) => e.programId);
  const enrollmentIds = enrollments.map((e) => e.id);

  const trackers = await prisma.dailyTracker.findMany({
    where: {
      isActive: true,
      OR: [
        { programId: { in: programIds } },
        { enrollmentId: { in: enrollmentIds } },
        { participantId: participantProfileId },
      ],
    },
    include: {
      fields: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });

  // Check today's completion status for each tracker
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const todayEntries = await prisma.dailyTrackerEntry.findMany({
    where: {
      trackerId: { in: trackers.map((t) => t.id) },
      userId,
      date: today,
    },
    select: { trackerId: true },
  });

  const completedTrackerIds = new Set(todayEntries.map((e) => e.trackerId));

  return trackers.map((t) => ({
    ...t,
    completedToday: completedTrackerIds.has(t.id),
  }));
}

// ── 8. Submit Tracker Entry ──────────────────────────

export async function submitTrackerEntry(
  trackerId: string,
  userId: string,
  date: string,
  responses: unknown
) {
  // Validate FEELINGS_WHEEL field responses
  const responsesObj = responses as Record<string, unknown>;
  const tracker = await prisma.dailyTracker.findUnique({
    where: { id: trackerId },
    include: { fields: true },
  });

  if (tracker) {
    const feelingsFields = tracker.fields.filter(
      (f) => f.fieldType === "FEELINGS_WHEEL"
    );

    for (const field of feelingsFields) {
      const value = responsesObj[field.id];
      const options = field.options as { maxSelections?: number } | null;
      const maxSelections = options?.maxSelections ?? 3;

      // Skip validation if field is not present in responses and not required
      if (value === undefined || value === null) {
        if (field.isRequired) {
          throw new ValidationError(
            `Feelings wheel field "${field.label}" is required`
          );
        }
        continue;
      }

      if (!Array.isArray(value)) {
        throw new ValidationError(
          `Feelings wheel field "${field.label}" must be an array of emotion IDs`
        );
      }

      if (field.isRequired && value.length === 0) {
        throw new ValidationError(
          `Feelings wheel field "${field.label}" is required`
        );
      }

      if (value.length > maxSelections) {
        throw new ValidationError(
          `Feelings wheel field "${field.label}" exceeds maximum of ${maxSelections} selections`
        );
      }

      if (!validateEmotionIds(value as string[])) {
        const invalidIds = (value as string[]).filter(
          (id) => !VALID_EMOTION_IDS.has(id)
        );
        throw new ValidationError(
          `Invalid emotion IDs in "${field.label}": ${invalidIds.join(", ")}`
        );
      }
    }
  }

  const entryDate = new Date(date);
  entryDate.setUTCHours(0, 0, 0, 0);

  const entry = await prisma.dailyTrackerEntry.upsert({
    where: {
      trackerId_userId_date: {
        trackerId,
        userId,
        date: entryDate,
      },
    },
    create: {
      trackerId,
      userId,
      date: entryDate,
      responses: responses as any,
      completedAt: new Date(),
    },
    update: {
      responses: responses as any,
      completedAt: new Date(),
    },
  });

  // Log RTM engagement for daily tracker completion (fire-and-forget)
  logRtmEngagement(userId, "DAILY_TRACKER_COMPLETED", undefined, { trackerId });

  return entry;
}

// ── 9. Get Tracker Streak ────────────────────────────

export async function getTrackerStreak(
  trackerId: string,
  userId: string
) {
  const entries = await prisma.dailyTrackerEntry.findMany({
    where: {
      trackerId,
      userId,
    },
    orderBy: { date: "desc" },
    select: { date: true },
    take: 365,
  });

  let streak = 0;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  for (let i = 0; i < entries.length; i++) {
    const expected = new Date(today);
    expected.setUTCDate(expected.getUTCDate() - i);
    const expectedStr = expected.toISOString().split("T")[0];
    const entryStr = entries[i].date.toISOString().split("T")[0];

    if (entryStr === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  return { streak, totalEntries: entries.length };
}
