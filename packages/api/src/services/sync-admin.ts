import { prisma } from "@steady/db";
import { logger } from "../lib/logger";

/**
 * Dev-only: Wipe admin@admin.com's data and replace with a fresh copy of kevin.barr@steady.com's.
 * This lets admin be a disposable mirror for debugging without affecting kevin's state.
 */
export async function syncKevinToAdmin() {
  if (process.env.NODE_ENV === "production") return;
  const sourceEmail = process.env.ADMIN_SYNC_SOURCE_EMAIL;
  if (!sourceEmail) return;
  const kevinUser = await prisma.user.findFirst({ where: { email: sourceEmail } });
  const kevinProfile = await prisma.clinicianProfile.findFirst({ where: { userId: kevinUser?.id } });
  const adminUser = await prisma.user.findFirst({ where: { email: "admin@admin.com" } });
  const adminProfile = await prisma.clinicianProfile.findFirst({ where: { userId: adminUser?.id } });

  if (!kevinProfile || !adminProfile) return;

  // 1. Wipe admin's data
  const adminProgramIds = (
    await prisma.program.findMany({ where: { clinicianId: adminProfile.id }, select: { id: true } })
  ).map((p) => p.id);

  if (adminProgramIds.length > 0) {
    const enrollmentIds = (
      await prisma.enrollment.findMany({
        where: { programId: { in: adminProgramIds } },
        select: { id: true },
      })
    ).map((e) => e.id);

    if (enrollmentIds.length > 0) {
      await prisma.homeworkInstance.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
      await prisma.partProgress.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
      await prisma.moduleProgress.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
      await prisma.session.deleteMany({ where: { enrollmentId: { in: enrollmentIds } } });
      await prisma.enrollment.deleteMany({ where: { id: { in: enrollmentIds } } });
    }
    await prisma.dailyTracker.deleteMany({ where: { programId: { in: adminProgramIds } } });
    await prisma.program.deleteMany({ where: { id: { in: adminProgramIds } } });
  }
  await prisma.clinicianClient.deleteMany({ where: { clinicianId: adminProfile.id } });
  await prisma.clientConfig.deleteMany({ where: { clinicianId: adminProfile.id } });

  // 2. Clone kevin's programs
  const programs = await prisma.program.findMany({
    where: { clinicianId: kevinProfile.id },
    include: {
      modules: { orderBy: { sortOrder: "asc" }, include: { parts: { orderBy: { sortOrder: "asc" } } } },
      dailyTrackers: { include: { fields: { orderBy: { sortOrder: "asc" } } } },
    },
  });

  const programIdMap: Record<string, string> = {};
  const moduleIdMaps: Record<string, Record<string, string>> = {};

  for (const prog of programs) {
    const newProg = await prisma.program.create({
      data: {
        clinicianId: adminProfile.id,
        title: prog.title,
        description: prog.description,
        category: prog.category,
        durationWeeks: prog.durationWeeks,
        coverImageUrl: prog.coverImageUrl,
        cadence: prog.cadence,
        enrollmentMethod: prog.enrollmentMethod,
        sessionType: prog.sessionType,
        followUpCount: prog.followUpCount,
        isTemplate: prog.isTemplate,
        templateSourceId: prog.templateSourceId,
        status: prog.status,
      },
    });
    programIdMap[prog.id] = newProg.id;
    moduleIdMaps[prog.id] = {};

    for (const mod of prog.modules) {
      const newMod = await prisma.module.create({
        data: {
          programId: newProg.id,
          title: mod.title,
          subtitle: mod.subtitle,
          summary: mod.summary,
          estimatedMinutes: mod.estimatedMinutes,
          sortOrder: mod.sortOrder,
          unlockRule: mod.unlockRule,
          unlockDelayDays: mod.unlockDelayDays,
          deletedAt: mod.deletedAt,
        },
      });
      moduleIdMaps[prog.id][mod.id] = newMod.id;

      if (mod.parts.length > 0) {
        await prisma.part.createMany({
          data: mod.parts.map((pt) => ({
            moduleId: newMod.id,
            type: pt.type,
            title: pt.title,
            sortOrder: pt.sortOrder,
            isRequired: pt.isRequired,
            content: pt.content as any,
            deletedAt: pt.deletedAt,
          })),
        });
      }
    }

    for (const tracker of prog.dailyTrackers) {
      const newTracker = await prisma.dailyTracker.create({
        data: {
          programId: newProg.id,
          createdById: adminProfile.id,
          name: tracker.name,
          description: tracker.description,
          reminderTime: tracker.reminderTime,
          isActive: tracker.isActive,
        },
      });
      if (tracker.fields.length > 0) {
        await prisma.dailyTrackerField.createMany({
          data: tracker.fields.map((f) => ({
            trackerId: newTracker.id,
            label: f.label,
            fieldType: f.fieldType,
            sortOrder: f.sortOrder,
            isRequired: f.isRequired,
            options: f.options as any,
          })),
        });
      }
    }
  }

  // 3. Clone client relationships
  const clientRels = await prisma.clinicianClient.findMany({ where: { clinicianId: kevinProfile.id } });
  for (const rel of clientRels) {
    await prisma.clinicianClient.create({
      data: { clinicianId: adminProfile.id, clientId: rel.clientId, status: rel.status, notes: rel.notes },
    });
  }

  // 4. Clone enrollments + progress
  const enrollments = await prisma.enrollment.findMany({
    where: { program: { clinicianId: kevinProfile.id } },
    include: { moduleProgress: true },
  });

  for (const enr of enrollments) {
    const newProgramId = programIdMap[enr.programId];
    if (!newProgramId) continue;
    const modMap = moduleIdMaps[enr.programId] || {};

    const newEnr = await prisma.enrollment.create({
      data: {
        participantId: enr.participantId,
        programId: newProgramId,
        status: enr.status,
        enrolledAt: enr.enrolledAt,
        completedAt: enr.completedAt,
        currentModuleId: enr.currentModuleId ? modMap[enr.currentModuleId] || null : null,
      },
    });

    for (const mp of enr.moduleProgress) {
      const newModId = modMap[mp.moduleId];
      if (!newModId) continue;
      await prisma.moduleProgress.create({
        data: {
          enrollmentId: newEnr.id,
          moduleId: newModId,
          status: mp.status,
          unlockedAt: mp.unlockedAt,
          completedAt: mp.completedAt,
          customUnlock: mp.customUnlock,
        },
      });
    }
  }

  // 5. Clone client configs
  const clientConfigs = await prisma.clientConfig.findMany({ where: { clinicianId: kevinProfile.id } });
  for (const cc of clientConfigs) {
    await prisma.clientConfig.create({
      data: {
        clinicianId: adminProfile.id,
        clientId: cc.clientId,
        clientOverviewLayout: cc.clientOverviewLayout as any,
        enabledModules: cc.enabledModules as any,
        activeTrackers: cc.activeTrackers as any,
        activeAssessments: cc.activeAssessments as any,
        activeMedications: cc.activeMedications as any,
        customConfig: cc.customConfig as any,
      },
    });
  }

  // 6. Sync clinician config
  const kevinConfig = await prisma.clinicianConfig.findUnique({ where: { clinicianId: kevinProfile.id } });
  if (kevinConfig) {
    await prisma.clinicianConfig.upsert({
      where: { clinicianId: adminProfile.id },
      create: {
        clinicianId: adminProfile.id,
        enabledModules: kevinConfig.enabledModules as any,
        dashboardLayout: kevinConfig.dashboardLayout as any,
        clientOverviewLayout: kevinConfig.clientOverviewLayout as any,
      },
      update: {
        enabledModules: kevinConfig.enabledModules as any,
        dashboardLayout: kevinConfig.dashboardLayout as any,
        clientOverviewLayout: kevinConfig.clientOverviewLayout as any,
      },
    });
  }

  logger.info("Admin sync complete — mirrored source clinician");
}
