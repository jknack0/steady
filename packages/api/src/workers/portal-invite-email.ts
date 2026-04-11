import type PgBoss from "pg-boss";
import { logger } from "../lib/logger";
import { processSendPortalInviteJob } from "../services/portal-invitations";

// ── pg-boss worker for portal invitation email delivery ────────────
// Replaces the legacy `send-invite-email` worker. Plaintext token is
// passed in the job payload (never persisted, never logged).
//
// Reference: docs/sdlc/client-web-portal-mvp/04-architecture.md AD-1, AD-7
// Implements: AC-2.1, AC-2.2, COND-23 (circuit breaker check on each send)

interface PortalInviteEmailJob {
  invitationId: string;
  plaintextToken: string;
}

export async function handlePortalInviteEmail(
  job: PgBoss.Job<PortalInviteEmailJob>
): Promise<void> {
  const { invitationId, plaintextToken } = job.data;
  await processSendPortalInviteJob({ invitationId, plaintextToken });
}

export async function registerPortalInviteEmailWorker(
  boss: PgBoss
): Promise<void> {
  await boss.work<PortalInviteEmailJob>(
    "send-portal-invite-email",
    async (jobs) => {
      for (const job of jobs) {
        try {
          await handlePortalInviteEmail(job);
        } catch (err) {
          // Re-throw to let pg-boss retry per its retry policy
          logger.warn(
            "Portal invite email job failed",
            `invitationId=${job.data.invitationId}`
          );
          throw err;
        }
      }
    }
  );
  logger.info("Registered send-portal-invite-email worker");
}
