import { prisma } from "@steady/db";
import type { ServiceCtx } from "../lib/practice-context";
import type { CreateLocationInput, UpdateLocationInput } from "@steady/shared";

export async function listLocations(ctx: ServiceCtx) {
  return prisma.location.findMany({
    where: { practiceId: ctx.practiceId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
}

export async function createLocation(ctx: ServiceCtx, input: CreateLocationInput) {
  return prisma.location.create({
    data: {
      practiceId: ctx.practiceId,
      name: input.name,
      type: input.type,
      addressLine1: input.addressLine1 ?? null,
      addressLine2: input.addressLine2 ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      postalCode: input.postalCode ?? null,
      timezone: input.timezone ?? null,
    },
  });
}

export async function updateLocation(
  ctx: ServiceCtx,
  id: string,
  patch: UpdateLocationInput,
): Promise<any | { error: "not_found" }> {
  const existing = await prisma.location.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };
  return prisma.location.update({
    where: { id },
    data: {
      ...(patch.name !== undefined ? { name: patch.name } : {}),
      ...(patch.type !== undefined ? { type: patch.type } : {}),
      ...(patch.addressLine1 !== undefined ? { addressLine1: patch.addressLine1 } : {}),
      ...(patch.addressLine2 !== undefined ? { addressLine2: patch.addressLine2 } : {}),
      ...(patch.city !== undefined ? { city: patch.city } : {}),
      ...(patch.state !== undefined ? { state: patch.state } : {}),
      ...(patch.postalCode !== undefined ? { postalCode: patch.postalCode } : {}),
      ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
    },
  });
}

export async function softDeleteLocation(
  ctx: ServiceCtx,
  id: string,
): Promise<
  { ok: true } | { error: "not_found" } | { error: "conflict"; message: string }
> {
  const existing = await prisma.location.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!existing) return { error: "not_found" };

  const referencing = await prisma.appointment.findFirst({
    where: {
      locationId: id,
      status: {
        notIn: ["CLIENT_CANCELED", "CLINICIAN_CANCELED", "LATE_CANCELED"] as any,
      },
    },
    select: { id: true },
  });
  if (referencing) {
    return {
      error: "conflict",
      message: "Cannot delete a location referenced by active appointments",
    };
  }

  await prisma.location.update({
    where: { id },
    data: { isActive: false },
  });
  return { ok: true };
}

export async function seedDefaultLocationsForPractice(practiceId: string): Promise<void> {
  const existing = await prisma.location.findFirst({
    where: { practiceId, isDefault: true },
    select: { id: true },
  });
  if (existing) return;

  await prisma.location.createMany({
    data: [
      {
        practiceId,
        name: "Main Office",
        type: "IN_PERSON" as any,
        isDefault: true,
        isActive: true,
      },
      {
        practiceId,
        name: "Telehealth",
        type: "VIRTUAL" as any,
        isDefault: true,
        isActive: true,
      },
    ],
    skipDuplicates: true,
  });
}
