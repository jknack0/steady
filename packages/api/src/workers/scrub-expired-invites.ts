import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import type PgBoss from "pg-boss";

/**
 * pg-boss scheduled job handler for scrubbing PII from expired/revoked invitations.
 * COND-5: Scrubs name/email from unredeemed invites older than 90 days.
 */
export async function handleScrubExpiredInvites(): Promise<void> {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  try {
    const invitations = await prisma.patientInvitation.findMany({
      where: {
        status: { in: ["REVOKED", "EXPIRED"] },
        piiScrubbed: false,
        createdAt: { lt: ninetyDaysAgo },
      },
      select: { id: true },
      take: 500,
    });

    if (invitations.length === 0) {
      logger.info("PII scrub: no invitations to scrub");
      return;
    }

    const ids = invitations.map((inv) => inv.id);

    // Batch update — scrub PII fields
    for (const id of ids) {
      await prisma.patientInvitation.update({
        where: { id },
        data: {
          patientName: "[scrubbed]",
          patientEmail: "[scrubbed]",
          patientEmailHash: "[scrubbed]",
          piiScrubbed: true,
        },
      });
    }

    logger.info("PII scrub completed", `scrubbed=${ids.length} invitations`);
  } catch (err) {
    logger.error("PII scrub job failed", err);
  }
}

/**
 * Register the PII scrub scheduled job with pg-boss.
 * Runs daily.
 */
export async function registerScrubExpiredInvitesWorker(boss: PgBoss): Promise<void> {
  await boss.schedule("scrub-expired-invites", "0 3 * * *"); // 3 AM daily
  await boss.work("scrub-expired-invites", async () => {
    await handleScrubExpiredInvites();
  });
  logger.info("Registered scrub-expired-invites scheduled worker");
}
