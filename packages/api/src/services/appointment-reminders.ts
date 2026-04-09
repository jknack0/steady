import { prisma } from "@steady/db";
import { logger } from "../lib/logger";
import { queueNotification } from "./notifications";
import type { ReminderSettings } from "@steady/shared";
import { DEFAULT_REMINDER_SETTINGS } from "@steady/shared";

// ── Reminder Copy ──────────────────────────────────────

function getReminderCopy(minutesBefore: number, startAt: Date): { title: string; body: string } {
  if (minutesBefore >= 1440) {
    const timeStr = startAt.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return {
      title: "Appointment Tomorrow",
      body: `You have an appointment tomorrow at ${timeStr}`,
    };
  }
  if (minutesBefore >= 60) {
    const hours = Math.round(minutesBefore / 60);
    return {
      title: "Appointment Soon",
      body: `Your appointment is in ${hours} hour${hours > 1 ? "s" : ""}`,
    };
  }
  return {
    title: "Appointment Soon",
    body: `Your appointment is in ${minutesBefore} minutes`,
  };
}

// ── Settings Helpers ────────────────────────────────────

export async function getReminderSettings(clinicianId: string): Promise<ReminderSettings> {
  const config = await prisma.clinicianConfig.findUnique({
    where: { clinicianId },
    select: { reminderSettings: true },
  });

  if (!config?.reminderSettings) return DEFAULT_REMINDER_SETTINGS;

  const settings = config.reminderSettings as Record<string, unknown>;
  return {
    enableReminders: typeof settings.enableReminders === "boolean" ? settings.enableReminders : true,
    reminderTimes: Array.isArray(settings.reminderTimes) ? settings.reminderTimes : [1440, 60],
  };
}

export async function saveReminderSettings(
  clinicianId: string,
  settings: ReminderSettings,
): Promise<void> {
  await prisma.clinicianConfig.update({
    where: { clinicianId },
    data: { reminderSettings: settings as any },
  });
}

// ── Lifecycle Functions ─────────────────────────────────

export async function createRemindersForAppointment(
  appointmentId: string,
  clinicianId: string,
  startAt: Date,
  participantId?: string,
): Promise<void> {
  try {
    const settings = await getReminderSettings(clinicianId);
    if (!settings.enableReminders) return;

    const now = new Date();
    const remindersToCreate: Array<{
      appointmentId: string;
      type: "PUSH";
      scheduledFor: Date;
      status: "PENDING";
    }> = [];

    for (const minutes of settings.reminderTimes) {
      const scheduledFor = new Date(startAt.getTime() - minutes * 60 * 1000);
      if (scheduledFor > now) {
        remindersToCreate.push({
          appointmentId,
          type: "PUSH",
          scheduledFor,
          status: "PENDING",
        });
      }
    }

    if (remindersToCreate.length > 0) {
      await prisma.appointmentReminder.createMany({
        data: remindersToCreate,
      });
    }
  } catch (err) {
    logger.error("Failed to create reminders for appointment", err);
  }
}

export async function cancelRemindersForAppointment(appointmentId: string): Promise<void> {
  try {
    await prisma.appointmentReminder.updateMany({
      where: {
        appointmentId,
        status: "PENDING",
      },
      data: { status: "CANCELED" },
    });
  } catch (err) {
    logger.error("Failed to cancel reminders for appointment", err);
  }
}

export async function rescheduleReminders(
  appointmentId: string,
  clinicianId: string,
  newStartAt: Date,
): Promise<void> {
  try {
    // Delete all pending reminders
    await prisma.appointmentReminder.deleteMany({
      where: {
        appointmentId,
        status: "PENDING",
      },
    });

    // Create new ones
    await createRemindersForAppointment(appointmentId, clinicianId, newStartAt);
  } catch (err) {
    logger.error("Failed to reschedule reminders", err);
  }
}

export async function getRemindersForAppointment(
  appointmentId: string,
): Promise<Array<{
  id: string;
  type: string;
  scheduledFor: Date;
  sentAt: Date | null;
  status: string;
  createdAt: Date;
}>> {
  return prisma.appointmentReminder.findMany({
    where: { appointmentId },
    orderBy: { scheduledFor: "asc" },
    select: {
      id: true,
      type: true,
      scheduledFor: true,
      sentAt: true,
      status: true,
      createdAt: true,
    },
  });
}

// ── Cron Worker ─────────────────────────────────────────

export async function processReminders(): Promise<{ sent: number; failed: number }> {
  const now = new Date();
  let sent = 0;
  let failed = 0;

  const reminders = await prisma.appointmentReminder.findMany({
    where: {
      status: "PENDING",
      scheduledFor: { lte: now },
    },
    include: {
      appointment: {
        include: {
          participant: {
            include: {
              user: { select: { id: true, pushToken: true } },
            },
          },
          clinician: {
            include: {
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      },
    },
    take: 100,
    orderBy: { scheduledFor: "asc" },
  });

  for (const reminder of reminders) {
    try {
      const appt = reminder.appointment;

      // Skip if appointment is no longer scheduled
      if (appt.status !== "SCHEDULED") {
        await prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: { status: "CANCELED" },
        });
        continue;
      }

      const userId = appt.participant.user.id;

      if (!appt.participant.user.pushToken) {
        await prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: { status: "FAILED" },
        });
        failed++;
        continue;
      }

      // Calculate minutes before for copy
      const minutesBefore = Math.round(
        (appt.startAt.getTime() - reminder.scheduledFor.getTime()) / 60000,
      );

      const copy = getReminderCopy(
        minutesBefore > 0 ? minutesBefore : 60, // fallback
        appt.startAt,
      );

      await queueNotification(userId, copy.title, copy.body, "APPOINTMENT", {
        type: "appointment_reminder",
        appointmentId: appt.id,
      });

      await prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: { status: "SENT", sentAt: now },
      });

      sent++;
    } catch (err) {
      logger.error("Failed to process reminder", err);

      try {
        await prisma.appointmentReminder.update({
          where: { id: reminder.id },
          data: { status: "FAILED" },
        });
      } catch {
        // fire-and-forget
      }
      failed++;
    }
  }

  if (sent > 0 || failed > 0) {
    logger.info(`Reminder processing complete: ${sent} sent, ${failed} failed`);
  }

  return { sent, failed };
}
