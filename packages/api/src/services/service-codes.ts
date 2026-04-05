import { prisma } from "@steady/db";
import { SERVICE_CODE_SEED } from "@steady/shared";
import type { ServiceCtx } from "../lib/practice-context";

export async function listServiceCodes(ctx: ServiceCtx) {
  return prisma.serviceCode.findMany({
    where: { practiceId: ctx.practiceId, isActive: true },
    orderBy: { code: "asc" },
  });
}

export async function seedServiceCodesForPractice(practiceId: string): Promise<void> {
  const existing = await prisma.serviceCode.findFirst({
    where: { practiceId },
    select: { id: true },
  });
  if (existing) return;

  await prisma.serviceCode.createMany({
    data: SERVICE_CODE_SEED.map((s) => ({
      practiceId,
      code: s.code,
      description: s.description,
      defaultDurationMinutes: s.defaultDurationMinutes,
      defaultPriceCents: s.defaultPriceCents,
      isActive: true,
    })),
    skipDuplicates: true,
  });
}

export async function getServiceCodeOrThrow(ctx: ServiceCtx, id: string) {
  const sc = await prisma.serviceCode.findFirst({
    where: { id, practiceId: ctx.practiceId },
  });
  if (!sc) throw new Error("Service code not found");
  return sc;
}
