import { prisma } from "@steady/db";
import {
  DEFAULT_REVIEW_TEMPLATE,
  type UpsertReviewTemplateInput,
} from "@steady/shared";

export async function getOrDefaultTemplate(programId: string) {
  const template = await prisma.reviewTemplate.findUnique({
    where: { programId },
  });
  if (template) return template;
  return {
    id: null,
    programId,
    questions: DEFAULT_REVIEW_TEMPLATE.questions,
    barriers: DEFAULT_REVIEW_TEMPLATE.barriers,
    createdAt: null,
    updatedAt: null,
  };
}

export async function upsertTemplate(
  clinicianProfileId: string,
  programId: string,
  input: UpsertReviewTemplateInput,
): Promise<any | { error: "not_found" }> {
  const program = await prisma.program.findFirst({
    where: { id: programId, clinicianId: clinicianProfileId },
  });
  if (!program) return { error: "not_found" as const };

  const template = await prisma.reviewTemplate.upsert({
    where: { programId },
    create: {
      programId,
      questions: input.questions as any,
      barriers: input.barriers as any,
    },
    update: {
      questions: input.questions as any,
      barriers: input.barriers as any,
    },
  });
  return template;
}
