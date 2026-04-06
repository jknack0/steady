import PgBoss from "pg-boss";
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

  logger.info("PgBoss job queue started");
  return boss;
}

export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
  }
}
