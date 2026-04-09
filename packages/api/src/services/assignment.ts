import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { deepCopyModules, deepCopyTrackers } from "../lib/deep-copy";

interface AssignmentSelections {
  excludedModuleIds: string[];
  excludedPartIds: string[];
}

export class AssignmentError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public data?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AssignmentError";
  }
}

/**
 * Assign a template program to a participant by deep-copying selected content.
 * Creates a new client-specific program + enrollment in a single transaction.
 */
export async function assignProgram(
  clinicianId: string,
  templateId: string,
  participantId: string,
  selections: AssignmentSelections,
  customTitle?: string
) {
  // 1. Verify program exists and is published (own program or a template)
  const template = await prisma.program.findFirst({
    where: {
      id: templateId,
      status: "PUBLISHED",
      OR: [
        { clinicianId },
        { isTemplate: true },
      ],
    },
    include: {
      modules: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        include: { parts: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } } },
      },
      dailyTrackers: {
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!template) {
    throw new AssignmentError("Template not found or not published", 404);
  }

  // 2. Verify participant is clinician's client (COND-1)
  const clientRelation = await prisma.clinicianClient.findFirst({
    where: {
      clinicianId,
      client: { participantProfile: { id: participantId } },
    },
  });

  if (!clientRelation) {
    throw new AssignmentError("Participant is not your client", 403);
  }

  // 3. Check for existing client program from same template
  const existingProgram = await prisma.program.findFirst({
    where: {
      clinicianId,
      templateSourceId: templateId,
      isTemplate: false,
      status: { not: "ARCHIVED" },
      enrollments: { some: { participantId } },
    },
  });

  if (existingProgram) {
    throw new AssignmentError("Client already has this program assigned", 409, {
      clientProgramId: existingProgram.id,
    });
  }

  // 4. Deep-copy in transaction (COND-3)
  const excludedModules = new Set(selections.excludedModuleIds);
  const excludedParts = new Set(selections.excludedPartIds);

  const result = await prisma.$transaction(async (tx) => {
    // Create client program
    const newProgram = await tx.program.create({
      data: {
        clinicianId,
        title: customTitle || template.title,
        description: template.description,
        category: template.category,
        durationWeeks: template.durationWeeks,
        coverImageUrl: template.coverImageUrl,
        cadence: template.cadence,
        enrollmentMethod: template.enrollmentMethod,
        sessionType: template.sessionType,
        followUpCount: template.followUpCount,
        isTemplate: false,
        templateSourceId: template.id,
        status: "PUBLISHED",
      },
    });

    // Clone modules and parts (excluding excluded — COND-4)
    await deepCopyModules(tx, template.modules, newProgram.id, {
      excludedModuleIds: excludedModules,
      excludedPartIds: excludedParts,
    });

    // Clone daily trackers + fields
    await deepCopyTrackers(tx, template.dailyTrackers, newProgram.id, clinicianId);

    // Create enrollment
    const enrollment = await tx.enrollment.create({
      data: {
        participantId,
        programId: newProgram.id,
        status: "ACTIVE",
      },
    });

    return { program: newProgram, enrollment };
  });

  return result;
}

/**
 * Re-assign a template — append modules to an existing client program.
 * Deduplicates daily trackers by name.
 */
export async function appendModules(
  clinicianId: string,
  clientProgramId: string,
  templateId: string,
  selections: AssignmentSelections
) {
  // 1. Verify program exists and is published (own program or a template)
  const template = await prisma.program.findFirst({
    where: {
      id: templateId,
      status: "PUBLISHED",
      OR: [
        { clinicianId },
        { isTemplate: true },
      ],
    },
    include: {
      modules: {
        where: { deletedAt: null },
        orderBy: { sortOrder: "asc" },
        include: { parts: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" } } },
      },
      dailyTrackers: {
        include: { fields: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });

  if (!template) {
    throw new AssignmentError("Template not found or not published", 404);
  }

  // 2. Verify client program ownership
  const clientProgram = await prisma.program.findFirst({
    where: {
      id: clientProgramId,
      clinicianId,
      isTemplate: false,
    },
    include: {
      modules: { where: { deletedAt: null }, select: { sortOrder: true } },
      dailyTrackers: { select: { name: true } },
    },
  });

  if (!clientProgram) {
    throw new AssignmentError("Client program not found", 404);
  }

  // 3. Get max sortOrder for offset (COND-4)
  const maxSortOrder = clientProgram.modules.reduce(
    (max, m) => Math.max(max, m.sortOrder),
    -1
  );

  const excludedModules = new Set(selections.excludedModuleIds);
  const excludedParts = new Set(selections.excludedPartIds);
  const existingTrackerNames = new Set(clientProgram.dailyTrackers.map((t) => t.name));

  // 4. Append in transaction (COND-3)
  let appendedCount = 0;

  await prisma.$transaction(async (tx) => {
    appendedCount = await deepCopyModules(tx, template.modules, clientProgramId, {
      excludedModuleIds: excludedModules,
      excludedPartIds: excludedParts,
      sortOrderOffset: maxSortOrder,
    });

    // Clone daily trackers — deduplicate by name
    await deepCopyTrackers(tx, template.dailyTrackers, clientProgramId, clinicianId, existingTrackerNames);
  });

  // Return updated program summary
  const updatedProgram = await prisma.program.findUnique({
    where: { id: clientProgramId },
    include: { _count: { select: { modules: { where: { deletedAt: null } } } } },
  });

  return {
    program: {
      id: clientProgramId,
      title: clientProgram.title,
      moduleCount: updatedProgram?._count.modules ?? 0,
    },
    appendedModules: appendedCount,
  };
}
