import { prisma } from "@steady/db";
import type { CreateOverrideInput } from "@steady/shared";

export async function createOverride(
  clinicianProfileId: string,
  enrollmentId: string,
  input: CreateOverrideInput,
): Promise<any | { error: "not_found" } | { error: "validation"; message: string }> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId },
    include: { program: { select: { clinicianId: true, id: true } } },
  });
  if (!enrollment || enrollment.program.clinicianId !== clinicianProfileId) {
    return { error: "not_found" as const };
  }

  if (input.overrideType === "HIDE_HOMEWORK_ITEM" && input.targetPartId) {
    const part = await prisma.part.findFirst({
      where: {
        id: input.targetPartId,
        module: { programId: enrollment.program.id },
        deletedAt: null,
      },
    });
    if (!part) {
      return { error: "validation" as const, message: "Target part not found in this program" };
    }
  }

  if (input.moduleId) {
    const mod = await prisma.module.findFirst({
      where: {
        id: input.moduleId,
        programId: enrollment.program.id,
        deletedAt: null,
      },
    });
    if (!mod) {
      return { error: "validation" as const, message: "Module not found in this program" };
    }
  }

  const override = await prisma.enrollmentOverride.create({
    data: {
      enrollmentId,
      overrideType: input.overrideType as any,
      moduleId: input.moduleId ?? null,
      targetPartId: input.targetPartId ?? null,
      payload: input.payload as any,
      createdById: clinicianProfileId,
    },
  });

  return override;
}

export async function listOverrides(
  clinicianProfileId: string,
  enrollmentId: string,
  moduleId?: string,
): Promise<any[] | { error: "not_found" }> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId },
    include: { program: { select: { clinicianId: true } } },
  });
  if (!enrollment || enrollment.program.clinicianId !== clinicianProfileId) {
    return { error: "not_found" as const };
  }

  return prisma.enrollmentOverride.findMany({
    where: {
      enrollmentId,
      ...(moduleId ? { moduleId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
}

export async function deleteOverride(
  clinicianProfileId: string,
  enrollmentId: string,
  overrideId: string,
): Promise<{ ok: true } | { error: "not_found" }> {
  const enrollment = await prisma.enrollment.findFirst({
    where: { id: enrollmentId },
    include: { program: { select: { clinicianId: true } } },
  });
  if (!enrollment || enrollment.program.clinicianId !== clinicianProfileId) {
    return { error: "not_found" as const };
  }

  const override = await prisma.enrollmentOverride.findFirst({
    where: { id: overrideId, enrollmentId },
  });
  if (!override) return { error: "not_found" as const };

  await prisma.enrollmentOverride.delete({ where: { id: overrideId } });
  return { ok: true };
}

export interface MergedModuleResult {
  parts: any[];
  clinicianNotes: Array<{ content: string; source: "override" }>;
}

export function applyOverrides(
  moduleParts: any[],
  overrides: any[],
): MergedModuleResult {
  if (overrides.length === 0) {
    return { parts: moduleParts, clinicianNotes: [] };
  }

  const hiddenPartIds = new Set(
    overrides
      .filter((o: any) => o.overrideType === "HIDE_HOMEWORK_ITEM")
      .map((o: any) => o.targetPartId),
  );

  let merged = moduleParts.filter((p: any) => !hiddenPartIds.has(p.id));

  const addedHomework = overrides
    .filter((o: any) => o.overrideType === "ADD_HOMEWORK_ITEM")
    .map((o: any) => ({
      id: `override-${o.id}`,
      type: "HOMEWORK",
      title: (o.payload as any).title ?? "Added Homework",
      description: (o.payload as any).description ?? null,
      itemType: (o.payload as any).itemType ?? "ACTION",
      source: "override" as const,
      overrideId: o.id,
    }));
  merged = [...merged, ...addedHomework];

  const addedResources = overrides
    .filter((o: any) => o.overrideType === "ADD_RESOURCE")
    .map((o: any) => ({
      id: `override-${o.id}`,
      type: "RESOURCE_LINK",
      title: (o.payload as any).title ?? "Resource",
      url: (o.payload as any).url ?? "",
      description: (o.payload as any).description ?? null,
      source: "override" as const,
      overrideId: o.id,
    }));
  merged = [...merged, ...addedResources];

  const notes = overrides
    .filter((o: any) => o.overrideType === "CLINICIAN_NOTE")
    .map((o: any) => ({
      content: (o.payload as any).content ?? "",
      source: "override" as const,
    }));

  return { parts: merged, clinicianNotes: notes };
}
