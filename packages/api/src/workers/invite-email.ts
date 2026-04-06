import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { sendInviteEmail } from "../services/email";
import type PgBoss from "pg-boss";

interface InviteEmailJob {
  invitationId: string;
}

/**
 * pg-boss handler for `send-invite-email` jobs.
 * Looks up invitation, sends email, updates record.
 * COND-6: Never logs the invite code.
 */
export async function handleInviteEmail(job: PgBoss.Job<InviteEmailJob>): Promise<void> {
  const { invitationId } = job.data;

  const invitation = await prisma.patientInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    logger.warn("Invite email job: invitation not found", `invitationId=${invitationId}`);
    return;
  }

  if (invitation.status !== "PENDING") {
    logger.info("Invite email job: invitation no longer pending, skipping", `invitationId=${invitationId}`);
    return;
  }

  const result = await sendInviteEmail(invitation.patientEmail, invitation.code);

  if (result.success) {
    await prisma.patientInvitation.update({
      where: { id: invitationId },
      data: {
        emailSent: true,
        emailSendCount: { increment: 1 },
      },
    });
    logger.info("Invite email sent successfully", `invitationId=${invitationId}`);
  } else {
    logger.warn("Invite email send failed", `invitationId=${invitationId}`);
  }
}

/**
 * Register the invite email worker with pg-boss.
 */
export async function registerInviteEmailWorker(boss: PgBoss): Promise<void> {
  await boss.work<InviteEmailJob>("send-invite-email", async (jobs) => {
    for (const job of jobs) {
      await handleInviteEmail(job);
    }
  });
  logger.info("Registered send-invite-email worker");
}
