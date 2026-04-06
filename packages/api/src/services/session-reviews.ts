import { prisma } from "@steady/db";
import { type SubmitReviewInput, DEFAULT_REVIEW_TEMPLATE } from "@steady/shared";
import { getOrDefaultTemplate } from "./review-templates";

export async function submitReview(
  participantProfileId: string,
  appointmentId: string,
  input: SubmitReviewInput,
): Promise<any | { error: "not_found" }> {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, participantId: participantProfileId },
  });
  if (!appointment) return { error: "not_found" as const };

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      participantId: participantProfileId,
      program: { clinicianId: appointment.clinicianId },
      status: { in: ["ACTIVE", "PAUSED"] },
    },
  });
  if (!enrollment) return { error: "not_found" as const };

  const review = await prisma.sessionReview.upsert({
    where: {
      appointmentId_enrollmentId: {
        appointmentId,
        enrollmentId: enrollment.id,
      },
    },
    create: {
      appointmentId,
      enrollmentId: enrollment.id,
      participantId: participantProfileId,
      responses: input.responses as any,
      barriers: input.barriers,
      submittedAt: new Date(),
    },
    update: {
      responses: input.responses as any,
      barriers: input.barriers,
      submittedAt: new Date(),
    },
  });

  return review;
}

export async function getReviewForAppointment(
  appointmentId: string,
): Promise<any | null> {
  return prisma.sessionReview.findFirst({
    where: { appointmentId },
  });
}

export async function getReviewWithTemplate(
  participantProfileId: string,
  appointmentId: string,
): Promise<
  | { review: any | null; template: any }
  | { error: "not_found" }
> {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, participantId: participantProfileId },
    include: {
      clinician: { select: { id: true } },
    },
  });
  if (!appointment) return { error: "not_found" as const };

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      participantId: participantProfileId,
      program: { clinicianId: appointment.clinicianId },
      status: { in: ["ACTIVE", "PAUSED"] },
    },
    include: { program: { select: { id: true } } },
  });

  const programId = enrollment?.program?.id;
  const template = programId
    ? await getOrDefaultTemplate(programId)
    : {
        id: null,
        programId: null,
        questions: DEFAULT_REVIEW_TEMPLATE.questions,
        barriers: DEFAULT_REVIEW_TEMPLATE.barriers,
        createdAt: null,
        updatedAt: null,
      };

  const review = enrollment
    ? await prisma.sessionReview.findFirst({
        where: {
          appointmentId,
          enrollmentId: enrollment.id,
          participantId: participantProfileId,
        },
      })
    : null;

  return { review, template };
}
