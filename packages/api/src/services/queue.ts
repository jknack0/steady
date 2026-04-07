import PgBoss from "pg-boss";
import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { markOverdueInvoices } from "./billing";
import { generateAllSeriesAppointments } from "./recurring-series";
import { processReminders } from "./appointment-reminders";

let boss: PgBoss | null = null;

export async function getQueue(): Promise<PgBoss> {
  if (boss) return boss;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for job queue");
  }

  boss = new PgBoss(databaseUrl);
  await boss.start();

  // Register overdue invoice cron job — runs daily at 6:00 AM UTC
  await boss.schedule("invoice-overdue-check", "0 6 * * *");
  await boss.work("invoice-overdue-check", async () => {
    try {
      const count = await markOverdueInvoices();
      logger.info(`Overdue invoice cron completed, marked ${count} invoices`);
    } catch (err) {
      logger.error("Overdue invoice cron failed", err);
    }
  });

  // Register recurring series generation cron job — runs daily at 1:00 AM UTC
  await boss.schedule("recurring-series-generate", "0 1 * * *");
  await boss.work("recurring-series-generate", async () => {
    try {
      await generateAllSeriesAppointments();
    } catch (err) {
      logger.error("Recurring series generation cron failed", err);
    }
  });

  // Register appointment reminder processing cron — runs every 5 minutes
  await boss.schedule("process-appointment-reminders", "*/5 * * * *");
  await boss.work("process-appointment-reminders", async () => {
    try {
      const result = await processReminders();
      if (result.sent > 0 || result.failed > 0) {
        logger.info(`Reminder cron completed: ${result.sent} sent, ${result.failed} failed`);
      }
    } catch (err) {
      logger.error("Reminder processing cron failed", err);
    }
  });

  // Register claim submission worker
  await boss.work("stedi-claim-submit", async (job: any) => {
    try {
      const { claimId } = job.data as { claimId: string };
      const claim = await prisma.insuranceClaim.findUnique({
        where: { id: claimId },
        include: {
          patientInsurance: true,
          participant: { select: { user: { select: { firstName: true, lastName: true, id: true } } } },
          clinician: {
            select: {
              billingProfile: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
          practice: { select: { id: true, name: true, stediApiKeyEncrypted: true } },
        },
      });

      if (!claim || claim.status !== "DRAFT" || !claim.practice.stediApiKeyEncrypted) {
        return;
      }

      const { submitClaim, isStediError } = await import("./stedi-client");

      // Build minimum-necessary 837P payload (COND-3)
      const payload = {
        tradingPartnerServiceId: claim.patientInsurance.payerId,
        submitter: { organizationName: claim.practice.name },
        receiver: { organizationName: claim.patientInsurance.payerName },
        subscriber: {
          memberId: claim.patientInsurance.subscriberId,
          firstName: claim.participant.user.firstName,
          lastName: claim.participant.user.lastName,
          groupNumber: claim.patientInsurance.groupNumber || undefined,
        },
        providers: [{
          npi: claim.clinician.billingProfile?.npiNumber || "",
          firstName: claim.clinician.user.firstName,
          lastName: claim.clinician.user.lastName,
        }],
        claimInformation: {
          placeOfServiceCode: claim.placeOfServiceCode,
          diagnosisCodes: claim.diagnosisCodes.map((code, i) => ({
            code,
            qualifierCode: i === 0 ? "ABK" : "ABF",
          })),
          serviceLines: [{
            procedureCode: claim.serviceCode,
            chargeAmountCents: claim.servicePriceCents,
            serviceDate: claim.dateOfService.toISOString().split("T")[0],
          }],
        },
      };

      const result = await submitClaim(
        claim.practice.stediApiKeyEncrypted,
        payload,
        claim.stediIdempotencyKey,
      );

      if (isStediError(result)) {
        await prisma.insuranceClaim.update({
          where: { id: claimId },
          data: { retryCount: { increment: 1 } },
        });

        if ((claim.retryCount + 1) < 3) {
          throw new Error(`Stedi submission failed: ${result.message}`); // pg-boss will retry
        }
        logger.error("Claim submission failed after max retries", result.message);
        return;
      }

      await prisma.insuranceClaim.update({
        where: { id: claimId },
        data: {
          status: "SUBMITTED",
          stediTransactionId: result.transactionId,
          submittedAt: new Date(),
        },
      });

      await prisma.claimStatusHistory.create({
        data: {
          claimId,
          fromStatus: "DRAFT",
          toStatus: "SUBMITTED",
          changedBy: "system",
        },
      });

      logger.info(`Claim ${claimId} submitted to Stedi`);
    } catch (err) {
      logger.error("Claim submission worker error", err);
      throw err; // rethrow for pg-boss retry
    }
  });

  // Register claim status polling cron — every 2 hours
  await boss.schedule("stedi-status-poll", "0 */2 * * *");
  await boss.work("stedi-status-poll", async () => {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const submittedClaims = await prisma.insuranceClaim.findMany({
        where: {
          status: { in: ["SUBMITTED", "ACCEPTED"] },
          submittedAt: { lt: oneHourAgo },
          stediTransactionId: { not: null },
        },
        include: {
          practice: { select: { stediApiKeyEncrypted: true } },
        },
        take: 50,
      });

      if (submittedClaims.length === 0) return;

      const { checkClaimStatus, isStediError } = await import("./stedi-client");

      for (const claim of submittedClaims) {
        if (!claim.practice.stediApiKeyEncrypted) continue;

        const result = await checkClaimStatus(
          claim.practice.stediApiKeyEncrypted,
          claim.stediTransactionId!,
        );

        if (isStediError(result)) continue;
        if (result.status === claim.status) continue;

        await prisma.insuranceClaim.update({
          where: { id: claim.id },
          data: {
            status: result.status as any,
            rejectionReason: result.rejectionReason || null,
            respondedAt: new Date(),
          },
        });

        await prisma.claimStatusHistory.create({
          data: {
            claimId: claim.id,
            fromStatus: claim.status as any,
            toStatus: result.status as any,
            changedBy: "system",
            reason: result.rejectionReason,
          },
        });

        logger.info(`Claim ${claim.id} status updated: ${claim.status} -> ${result.status}`);
      }
    } catch (err) {
      logger.error("Status poll cron failed", err);
    }
  });

  // Register Stripe webhook processing worker
  await boss.work("stripe-webhook-process", async (job: any) => {
    try {
      const { eventType, eventData, practiceId } = job.data as {
        eventType: string;
        eventData: any;
        practiceId?: string;
      };

      const { handleSessionCompleted, handleSessionExpired } = await import("./stripe-checkout");

      switch (eventType) {
        case "checkout.session.completed":
          await handleSessionCompleted(eventData, practiceId || "");
          break;
        case "checkout.session.expired":
          await handleSessionExpired(eventData);
          break;
        default:
          logger.info(`Unhandled Stripe event type: ${eventType}`);
      }
    } catch (err) {
      logger.error("Stripe webhook processing failed", err);
      throw err; // rethrow for pg-boss retry
    }
  });

  // Register balance-due check worker (triggered after insurance payment)
  await boss.work("stripe-balance-due-check", async (job: any) => {
    try {
      const { invoiceId } = job.data as { invoiceId: string };
      const { checkAndCreateBalanceDue } = await import("./balance-due");
      await checkAndCreateBalanceDue(invoiceId);
    } catch (err) {
      logger.error("Balance-due check failed", err);
      throw err;
    }
  });

  logger.info("PgBoss job queue started");
  return boss;
}

export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}
